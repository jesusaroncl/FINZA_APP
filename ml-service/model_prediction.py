import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from features import EXPENSE_FEATURE_COLS


def predict_expenses(df: pd.DataFrame, categories: list[dict]) -> dict:
    """
    Train Random Forest on historical expense data and predict
    spending per category for the next 7 and 30 days.
    """
    if df.empty or len(df) < 10:
        return _empty_prediction()

    extra_cols = [c for c in ["amount", "category_id", "category_encoded", "transaction_date"]
                  if c not in EXPENSE_FEATURE_COLS]
    feature_df = df[EXPENSE_FEATURE_COLS + extra_cols].dropna(subset=EXPENSE_FEATURE_COLS)
    if len(feature_df) < 10:
        return _empty_prediction()

    X = feature_df[EXPENSE_FEATURE_COLS].values
    y = feature_df["amount"].values

    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X, y)

    now = datetime.now()
    predictions_7d: list[dict] = []
    predictions_30d: list[dict] = []

    for cat in categories:
        cat_df = feature_df[feature_df["category_id"] == cat["id"]]
        if cat_df.empty:
            continue

        rolling_avg_7d = cat_df["amount"].tail(7).mean()
        rolling_avg_30d = cat_df["amount"].tail(30).mean()
        category_avg_month = cat_df["amount"].mean()
        last_date = cat_df["transaction_date"].max()
        days_since_base = max(0, (now - last_date.to_pydatetime()).days)
        cat_encoded = int(cat_df["category_encoded"].iloc[-1])
        rolling_avg_7d = float(rolling_avg_7d)
        rolling_avg_30d = float(rolling_avg_30d)
        category_avg_month = float(category_avg_month)

        cv = cat_df["amount"].std() / (cat_df["amount"].mean() + 1e-9)
        tx_type = "fixed" if cv < 0.3 else "variable"

        # Transaction frequency: how often (per day) does this category get a transaction
        date_range_days = max(
            (cat_df["transaction_date"].max() - cat_df["transaction_date"].min()).days, 1
        )
        tx_per_day = len(cat_df) / date_range_days

        def _build_row(future_date: datetime, offset: int) -> list:
            return [
                float(future_date.weekday()),
                float(future_date.day),
                float(future_date.month),
                float(future_date.weekday() >= 5),
                float(cat_encoded),
                rolling_avg_7d,
                rolling_avg_30d,
                category_avg_month,
                float(days_since_base + offset),
            ]

        # Multiply each daily prediction by tx_per_day to account for real frequency
        total_7 = tx_per_day * sum(
            max(0.0, float(model.predict([_build_row(now + timedelta(days=i), i)])[0]))
            for i in range(1, 8)
        )
        total_30 = tx_per_day * sum(
            max(0.0, float(model.predict([_build_row(now + timedelta(days=i), i)])[0]))
            for i in range(1, 31)
        )

        if total_7 > 0:
            predictions_7d.append({
                "category": cat["name"],
                "amount": round(total_7, 2),
                "type": tx_type,
            })
        if total_30 > 0:
            predictions_30d.append({
                "category": cat["name"],
                "amount": round(total_30, 2),
                "type": tx_type,
            })

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
