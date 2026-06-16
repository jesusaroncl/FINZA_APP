import pandas as pd
import numpy as np
from datetime import datetime, timedelta


EXPENSE_FEATURE_COLS = [
    "day_of_week", "day_of_month", "month", "is_weekend",
    "category_encoded", "rolling_avg_7d", "rolling_avg_30d",
    "category_avg_month", "days_since_last_tx",
]


def build_expense_df(transactions: list[dict], categories: list[dict]) -> pd.DataFrame:
    """Feature DataFrame for Random Forest expense prediction."""
    if not transactions:
        return pd.DataFrame()

    df = pd.DataFrame(transactions)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    df = df[df["type"] == "expense"].copy()

    if df.empty:
        return pd.DataFrame()

    df = df.sort_values("transaction_date").reset_index(drop=True)
    df["day_of_week"] = df["transaction_date"].dt.dayofweek
    df["day_of_month"] = df["transaction_date"].dt.day
    df["month"] = df["transaction_date"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    cat_map = {c["id"]: i for i, c in enumerate(categories)}
    df["category_encoded"] = df["category_id"].map(cat_map).fillna(-1).astype(int)

    df["rolling_avg_7d"] = df["amount"].rolling(7, min_periods=1).mean()
    df["rolling_avg_30d"] = df["amount"].rolling(30, min_periods=1).mean()

    cat_monthly = df.groupby("category_id")["amount"].mean()
    df["category_avg_month"] = df["category_id"].map(cat_monthly).fillna(0)

    now = datetime.now()
    last_dates = df.groupby("category_id")["transaction_date"].transform("max")
    df["days_since_last_tx"] = pd.Series(
        [(now - d).days if hasattr((now - d), "days") else 30 for d in last_dates],
        index=df.index,
    ).clip(0, 365)

    return df


def build_risk_features(transactions: list[dict]) -> dict:
    """Scalar features for a transaction window used by LightGBM risk model."""
    if not transactions:
        return _zero_risk_features()

    df = pd.DataFrame(transactions)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])

    expenses = df[df["type"] == "expense"].copy()
    income_df = df[df["type"] == "income"].copy()

    now = datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    monthly_income = income_df[
        income_df["transaction_date"] >= pd.Timestamp(month_start)
    ]["amount"].sum()
    if monthly_income == 0 and not income_df.empty:
        monthly_income = income_df["amount"].mean() * 30
    if monthly_income == 0:
        monthly_income = 1.0

    cuotas_monthly = 0.0
    if "monto_por_cuota" in expenses.columns and "cuotas" in expenses.columns:
        active = expenses[expenses["cuotas"].fillna(1).astype(float) > 1]
        cuotas_monthly = active["monto_por_cuota"].fillna(0).sum()
    cuotas_to_income_ratio = min(cuotas_monthly / monthly_income, 3.0)

    recent = expenses[expenses["transaction_date"] >= pd.Timestamp(week_ago)]
    small_tx_count_7d = float(len(recent[recent["amount"] < 15]))

    month_exp = expenses[
        expenses["transaction_date"] >= pd.Timestamp(month_start)
    ]["amount"].sum()
    monthly_totals = (
        expenses.groupby(expenses["transaction_date"].dt.to_period("M"))["amount"].sum()
    )
    hist_avg = monthly_totals.iloc[:-1].mean() if len(monthly_totals) > 1 else month_exp
    if hist_avg == 0:
        hist_avg = 1.0
    expense_velocity = min(month_exp / hist_avg, 5.0)

    month_expenses = expenses[expenses["transaction_date"] >= pd.Timestamp(month_start)]
    total_month = month_expenses["amount"].sum()
    top_category_share = 0.0
    if total_month > 0:
        cat_totals = month_expenses.groupby("category_id")["amount"].sum()
        top_category_share = float(cat_totals.max() / total_month)

    monthly_expense_trend = 0.0
    if len(monthly_totals) >= 3:
        x = np.arange(len(monthly_totals), dtype=float)
        y = monthly_totals.values.astype(float)
        slope = float(np.polyfit(x, y, 1)[0])
        monthly_expense_trend = slope / (hist_avg + 1e-9)

    return {
        "cuotas_to_income_ratio": cuotas_to_income_ratio,
        "small_tx_count_7d": small_tx_count_7d,
        "expense_velocity": expense_velocity,
        "days_elapsed_month": float(now.day),
        "top_category_share": top_category_share,
        "monthly_expense_trend": monthly_expense_trend,
    }


def build_risk_training_data(transactions: list[dict]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Sliding-window self-supervised training data for LightGBM risk model."""
    if not transactions:
        return pd.DataFrame(), pd.DataFrame()

    df = pd.DataFrame(transactions)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    df = df.sort_values("transaction_date")

    min_date = df["transaction_date"].min().to_pydatetime()
    max_date = df["transaction_date"].max().to_pydatetime()
    window = timedelta(days=30)
    step = timedelta(days=7)

    samples_X, samples_y = [], []
    current = min_date + window

    while current <= max_date:
        w_start = current - window
        window_txs = df[
            (df["transaction_date"] >= pd.Timestamp(w_start)) &
            (df["transaction_date"] < pd.Timestamp(current))
        ].to_dict("records")

        if len(window_txs) < 5:
            current += step
            continue

        feats = build_risk_features(window_txs)
        feats["window_end_day"] = float(current.day)

        labels = {
            "SOBREENDEUDAMIENTO": int(feats["cuotas_to_income_ratio"] > 0.3),
            "GASTOS_HORMIGA": int(feats["small_tx_count_7d"] > 10),
            "VELOCIDAD_GASTO": int(
                feats["expense_velocity"] > 0.8 and feats["days_elapsed_month"] < 20
            ),
            "CATEGORIA_CRITICA": int(feats["top_category_share"] > 0.5),
        }

        samples_X.append(feats)
        samples_y.append(labels)
        current += step

    if not samples_X:
        return pd.DataFrame(), pd.DataFrame()

    return pd.DataFrame(samples_X), pd.DataFrame(samples_y)


def _zero_risk_features() -> dict:
    return {
        "cuotas_to_income_ratio": 0.0,
        "small_tx_count_7d": 0.0,
        "expense_velocity": 0.0,
        "days_elapsed_month": 1.0,
        "top_category_share": 0.0,
        "monthly_expense_trend": 0.0,
    }
