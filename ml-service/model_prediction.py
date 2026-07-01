import numpy as np
import pandas as pd
import lightgbm as lgb
from datetime import datetime, timedelta
from features import build_prediction_df

PRED_FEATURE_COLS = [
    "rolling_7d_cat", "rolling_30d_cat", "rolling_7d_total",
    "day_of_month", "month", "days_since_last_cat",
    "cat_monthly_trend", "category_encoded",
]

MIN_TRAIN_SAMPLES = 10

_LGBM_PARAMS = dict(
    objective="regression_l1",
    num_leaves=8,
    min_child_samples=3,
    n_estimators=100,
    learning_rate=0.05,
    verbosity=-1,
)


def predict_expenses(df: pd.DataFrame, categories: list[dict]) -> dict:
    """
    Train LightGBM regressors on historical daily spending per category
    and predict spending for the next 7 and 30 days.

    Falls back to window-sum heuristic when insufficient training data.
    """
    if df.empty or len(df) < 10:
        return _empty_prediction()

    feature_df = df[["amount", "category_id", "transaction_date"]].dropna()
    if len(feature_df) < 10:
        return _empty_prediction()

    daily = build_prediction_df(feature_df, categories)
    if daily.empty:
        return _empty_prediction()

    # Build sliding-window training samples
    max_date = daily["date"].max()
    X_7, y_7, X_30, y_30 = [], [], [], []

    for cat_id, cat_group in daily.groupby("category_id"):
        cat_group = cat_group.sort_values("date")
        for _, row in cat_group.iterrows():
            d = row["date"]
            feat = {col: float(row.get(col, 0)) for col in PRED_FEATURE_COLS}

            end_7 = d + pd.Timedelta(days=7)
            if end_7 <= max_date:
                future = cat_group[(cat_group["date"] > d) & (cat_group["date"] <= end_7)]
                X_7.append(feat)
                y_7.append(float(future["daily_amount"].sum()))

            end_30 = d + pd.Timedelta(days=30)
            if end_30 <= max_date:
                future = cat_group[(cat_group["date"] > d) & (cat_group["date"] <= end_30)]
                X_30.append(feat)
                y_30.append(float(future["daily_amount"].sum()))

    if len(X_7) < MIN_TRAIN_SAMPLES:
        return _window_sum_fallback(feature_df, categories)

    X_7_df = pd.DataFrame(X_7)[PRED_FEATURE_COLS].fillna(0)
    model_7d = lgb.LGBMRegressor(**_LGBM_PARAMS)
    model_7d.fit(X_7_df, y_7)

    model_30d = None
    if len(X_30) >= MIN_TRAIN_SAMPLES:
        X_30_df = pd.DataFrame(X_30)[PRED_FEATURE_COLS].fillna(0)
        model_30d = lgb.LGBMRegressor(**_LGBM_PARAMS)
        model_30d.fit(X_30_df, y_30)

    # Inference: latest row per category = current features
    predictions_7d: list[dict] = []
    predictions_30d: list[dict] = []

    for cat in categories:
        cat_rows = daily[daily["category_id"] == cat["id"]]
        if cat_rows.empty:
            continue

        current = cat_rows.sort_values("date").iloc[-1]
        feat_vec = pd.DataFrame(
            [{col: float(current.get(col, 0)) for col in PRED_FEATURE_COLS}]
        ).fillna(0)

        pred_7 = float(max(0.0, model_7d.predict(feat_vec)[0]))
        if pred_7 > 0:
            predictions_7d.append({
                "category": cat["name"],
                "amount": round(pred_7, 2),
                "type": _tx_type(cat_rows),
            })

        if model_30d is not None:
            pred_30 = float(max(0.0, model_30d.predict(feat_vec)[0]))
            if pred_30 > 0:
                predictions_30d.append({
                    "category": cat["name"],
                    "amount": round(pred_30, 2),
                    "type": _tx_type(cat_rows),
                })

    # 30d model didn't train → scale from 7d predictions
    if not predictions_30d and predictions_7d:
        predictions_30d = [
            {**p, "amount": round(p["amount"] / 7 * 30, 2)} for p in predictions_7d
        ]

    predictions_7d.sort(key=lambda x: x["amount"], reverse=True)
    predictions_30d.sort(key=lambda x: x["amount"], reverse=True)

    return {
        "next_7_days": {
            "total": round(sum(p["amount"] for p in predictions_7d), 2),
            "by_category": predictions_7d,
        },
        "next_30_days": {
            "total": round(sum(p["amount"] for p in predictions_30d), 2),
            "by_category": predictions_30d,
        },
    }


def _tx_type(cat_rows: pd.DataFrame) -> str:
    cv = cat_rows["daily_amount"].std() / (cat_rows["daily_amount"].mean() + 1e-9)
    return "fixed" if cv < 0.3 else "variable"


def _window_sum_fallback(feature_df: pd.DataFrame, categories: list[dict]) -> dict:
    """Fallback when insufficient training windows."""
    now = datetime.now()
    last_7  = pd.Timestamp(now - timedelta(days=7))
    last_30 = pd.Timestamp(now - timedelta(days=30))
    last_90 = pd.Timestamp(now - timedelta(days=90))

    predictions_7d: list[dict] = []
    predictions_30d: list[dict] = []

    for cat in categories:
        cat_df = feature_df[feature_df["category_id"] == cat["id"]]
        if cat_df.empty:
            continue

        r7  = cat_df[cat_df["transaction_date"] >= last_7]
        r30 = cat_df[cat_df["transaction_date"] >= last_30]
        r90 = cat_df[cat_df["transaction_date"] >= last_90]

        if not r7.empty:
            total_7 = round(float(r7["amount"].sum()), 2)
        elif not r30.empty:
            total_7 = round(float(r30["amount"].sum()) / 30.0 * 7, 2)
        else:
            dr = max((cat_df["transaction_date"].max() - cat_df["transaction_date"].min()).days, 1)
            total_7 = round(float(cat_df["amount"].sum()) / dr * 7, 2)

        if not r30.empty:
            total_30 = round(float(r30["amount"].sum()), 2)
        elif not r90.empty:
            total_30 = round(float(r90["amount"].sum()) / 90.0 * 30, 2)
        else:
            dr = max((cat_df["transaction_date"].max() - cat_df["transaction_date"].min()).days, 1)
            total_30 = round(float(cat_df["amount"].sum()) / dr * 30, 2)

        cv = cat_df["amount"].std() / (cat_df["amount"].mean() + 1e-9)
        tx_type = "fixed" if cv < 0.3 else "variable"

        if total_7 > 0:
            predictions_7d.append({"category": cat["name"], "amount": total_7, "type": tx_type})
        if total_30 > 0:
            predictions_30d.append({"category": cat["name"], "amount": total_30, "type": tx_type})

    predictions_7d.sort(key=lambda x: x["amount"], reverse=True)
    predictions_30d.sort(key=lambda x: x["amount"], reverse=True)

    return {
        "next_7_days": {
            "total": round(sum(p["amount"] for p in predictions_7d), 2),
            "by_category": predictions_7d,
        },
        "next_30_days": {
            "total": round(sum(p["amount"] for p in predictions_30d), 2),
            "by_category": predictions_30d,
        },
    }


def _empty_prediction() -> dict:
    return {
        "next_7_days": {"total": 0, "by_category": []},
        "next_30_days": {"total": 0, "by_category": []},
    }
