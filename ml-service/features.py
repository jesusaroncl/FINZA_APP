import pandas as pd
import numpy as np
from datetime import datetime, timedelta

CUOTA_RE = r"\(\s*(\d+)\s*/\s*(\d+)\s*\)\s*$"


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
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], utc=True).dt.tz_localize(None)
    df = df[df["type"] == "expense"].copy()
    df = df[df["transaction_date"] <= pd.Timestamp(datetime.now())]

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


def _monthly_cuotas(expenses: pd.DataFrame, month_start: datetime, now: datetime) -> float:
    next_month_start = (month_start + timedelta(days=32)).replace(day=1)
    desc = (
        expenses["description"].fillna("").astype(str)
        if "description" in expenses.columns
        else pd.Series("", index=expenses.index)
    )
    m = desc.str.extract(CUOTA_RE)
    n = pd.to_numeric(m[0], errors="coerce")
    total = pd.to_numeric(m[1], errors="coerce")
    pattern_mask = n.notna() & total.notna() & (total > 1) & (n >= 1) & (n <= total)
    in_month = (
        (expenses["transaction_date"] >= pd.Timestamp(month_start)) &
        (expenses["transaction_date"] < pd.Timestamp(next_month_start))
    )
    pattern_sum = expenses.loc[pattern_mask & in_month, "amount"].sum()

    legacy_sum = 0.0
    if "cuotas" in expenses.columns and "monto_por_cuota" in expenses.columns:
        c = expenses["cuotas"].fillna(1).astype(float)
        legacy_mask = (~pattern_mask) & (c > 1)
        legacy = expenses.loc[legacy_mask]
        if not legacy.empty:
            def is_active(row):
                d = row["transaction_date"]
                diff = (month_start.year - d.year) * 12 + (month_start.month - d.month)
                return d <= pd.Timestamp(now) and 0 <= diff < int(row["cuotas"])

            active = legacy.apply(is_active, axis=1)
            legacy_sum = legacy.loc[active, "monto_por_cuota"].fillna(0).sum()

    return float(pattern_sum + legacy_sum)


def build_risk_features(transactions: list[dict], reference_date: datetime | None = None) -> dict:
    """Scalar features for a transaction window used by LightGBM risk model.

    reference_date: the point-in-time to compute 'now' features from.
    Defaults to datetime.now() for live inference; pass window end date for training.
    """
    if not transactions:
        return _zero_risk_features()

    df = pd.DataFrame(transactions)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], utc=True).dt.tz_localize(None)

    expenses = df[df["type"] == "expense"].copy()
    income_df = df[df["type"] == "income"].copy()

    now = reference_date if reference_date is not None else datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    past_exp = expenses[expenses["transaction_date"] <= pd.Timestamp(now)]
    past_inc = income_df[income_df["transaction_date"] <= pd.Timestamp(now)]

    monthly_income = past_inc[
        past_inc["transaction_date"] >= pd.Timestamp(month_start)
    ]["amount"].sum()
    if monthly_income == 0 and not past_inc.empty:
        monthly_income = past_inc["amount"].mean() * 30
    if monthly_income == 0:
        monthly_income = 1.0

    cuotas_monthly = _monthly_cuotas(expenses, month_start, now)
    cuotas_to_income_ratio = min(cuotas_monthly / monthly_income, 3.0)

    recent = past_exp[past_exp["transaction_date"] >= pd.Timestamp(week_ago)]
    small_tx_count_7d = float(len(recent[recent["amount"] < 15]))

    month_exp = past_exp[
        past_exp["transaction_date"] >= pd.Timestamp(month_start)
    ]["amount"].sum()
    monthly_totals = (
        past_exp.groupby(past_exp["transaction_date"].dt.to_period("M"))["amount"].sum()
    )
    hist_avg = monthly_totals.iloc[:-1].mean() if len(monthly_totals) > 1 else month_exp
    if hist_avg == 0:
        hist_avg = 1.0
    expense_velocity = min(month_exp / hist_avg, 5.0)

    month_expenses = past_exp[past_exp["transaction_date"] >= pd.Timestamp(month_start)]
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
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], utc=True).dt.tz_localize(None)
    df = df.sort_values("transaction_date")
    df = df[df["transaction_date"] <= pd.Timestamp(datetime.now())]
    if df.empty:
        return pd.DataFrame(), pd.DataFrame()

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

        feats = build_risk_features(window_txs, reference_date=current)
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


def build_prediction_df(expense_df: pd.DataFrame, categories: list[dict]) -> pd.DataFrame:
    """
    Aggregate expense transactions to daily totals per category with ML features.

    Input: expense_df — columns: amount (float), category_id (str),
           transaction_date (datetime, tz-naive) — subset of build_expense_df() output.

    Returns: DataFrame with columns:
             date, category_id, daily_amount, category_encoded,
             rolling_7d_cat, rolling_30d_cat, rolling_7d_total,
             day_of_month, month, days_since_last_cat, cat_monthly_trend
    """
    if expense_df.empty:
        return pd.DataFrame()

    df = expense_df[["amount", "category_id", "transaction_date"]].dropna().copy()
    df["date"] = pd.to_datetime(df["transaction_date"]).dt.normalize()

    # Daily totals per category
    daily = df.groupby(["date", "category_id"])["amount"].sum().reset_index()
    daily = daily.rename(columns={"amount": "daily_amount"})

    if daily.empty:
        return pd.DataFrame()

    # Rolling 7d total across ALL categories (shift 1 to avoid leakage)
    total_daily = (
        df.groupby("date")["amount"].sum()
        .reset_index()
        .rename(columns={"amount": "total_daily"})
        .sort_values("date")
    )
    total_daily["rolling_7d_total"] = (
        total_daily["total_daily"].shift(1).rolling(7, min_periods=1).sum().fillna(0)
    )

    # Category encoding
    cat_map = {c["id"]: i for i, c in enumerate(categories)}
    daily["category_encoded"] = daily["category_id"].map(cat_map).fillna(-1).astype(int)
    daily["day_of_month"] = daily["date"].dt.day
    daily["month"] = daily["date"].dt.month

    # Per-category rolling features and trend
    result_groups = []
    for _, group in daily.groupby("category_id"):
        g = group.sort_values("date").copy()
        shifted = g["daily_amount"].shift(1)
        g["rolling_7d_cat"] = shifted.rolling(7, min_periods=1).sum().fillna(0)
        g["rolling_30d_cat"] = shifted.rolling(30, min_periods=1).sum().fillna(0)
        g["days_since_last_cat"] = g["date"].diff().dt.days.fillna(30).clip(0, 365)

        monthly = g.groupby(g["date"].dt.to_period("M"))["daily_amount"].sum()
        if len(monthly) >= 2:
            x = np.arange(len(monthly), dtype=float)
            slope = float(np.polyfit(x, monthly.values.astype(float), 1)[0])
        else:
            slope = 0.0
        g["cat_monthly_trend"] = slope
        result_groups.append(g)

    daily = pd.concat(result_groups)
    daily = daily.merge(total_daily[["date", "rolling_7d_total"]], on="date", how="left")
    daily["rolling_7d_total"] = daily["rolling_7d_total"].fillna(0)

    return daily.sort_values(["date", "category_id"]).reset_index(drop=True)
