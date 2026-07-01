import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import pytest
from features import build_expense_df, build_risk_features, build_risk_training_data, build_prediction_df

CATEGORIES = [
    {"id": "cat1", "name": "Alimentación", "type": "expense", "color": "#FF0000"},
    {"id": "cat2", "name": "Transporte",   "type": "expense", "color": "#00FF00"},
]

def make_tx(i, amount, type_="expense", cat="cat1", days_ago=0):
    date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%S")
    return {"id": str(i), "user_id": "u1", "amount": amount, "type": type_,
            "category_id": cat if type_ == "expense" else None,
            "transaction_date": date, "cuotas": 1, "monto_por_cuota": None}

TRANSACTIONS_30 = [make_tx(i, 50.0 + i, days_ago=i) for i in range(30)]
TRANSACTIONS_WITH_INCOME = TRANSACTIONS_30 + [make_tx(99, 2000.0, type_="income", days_ago=1)]


def test_build_expense_df_empty():
    df = build_expense_df([], CATEGORIES)
    assert df.empty


def test_build_expense_df_returns_expense_rows_only():
    txs = [make_tx(1, 100.0, "expense"), make_tx(2, 500.0, "income")]
    df = build_expense_df(txs, CATEGORIES)
    assert len(df) == 1
    assert (df["type"] == "expense").all()


def test_build_expense_df_has_required_columns():
    df = build_expense_df(TRANSACTIONS_30, CATEGORIES)
    for col in ["day_of_week", "day_of_month", "month", "is_weekend",
                "category_encoded", "rolling_avg_7d", "rolling_avg_30d",
                "category_avg_month", "days_since_last_tx"]:
        assert col in df.columns, f"Missing column: {col}"


def test_build_risk_features_empty():
    result = build_risk_features([])
    assert result["cuotas_to_income_ratio"] == 0.0
    assert result["small_tx_count_7d"] == 0.0


def test_build_risk_features_detects_small_transactions():
    small_txs = [make_tx(i, 5.0, days_ago=i % 6) for i in range(15)]
    result = build_risk_features(small_txs)
    assert result["small_tx_count_7d"] >= 6


def test_build_risk_features_keys():
    result = build_risk_features(TRANSACTIONS_30)
    for key in ["cuotas_to_income_ratio", "small_tx_count_7d", "expense_velocity",
                "days_elapsed_month", "top_category_share", "monthly_expense_trend"]:
        assert key in result, f"Missing key: {key}"


def test_build_risk_training_data_returns_dataframes():
    txs = [make_tx(i, 50.0, days_ago=i) for i in range(90)]
    X, y = build_risk_training_data(txs)
    assert isinstance(X, pd.DataFrame)
    assert isinstance(y, pd.DataFrame)


def test_build_risk_training_data_not_empty_with_90_days():
    txs = [make_tx(i, 50.0, days_ago=i) for i in range(90)]
    X, y = build_risk_training_data(txs)
    assert len(X) > 0
    assert len(y) > 0
    assert len(X) == len(y)


def test_build_risk_training_data_y_has_risk_columns():
    txs = [make_tx(i, 50.0, days_ago=i) for i in range(90)]
    _, y = build_risk_training_data(txs)
    for col in ["SOBREENDEUDAMIENTO", "GASTOS_HORMIGA", "VELOCIDAD_GASTO", "CATEGORIA_CRITICA"]:
        assert col in y.columns


# --- build_prediction_df tests ---

PRED_CATS = [
    {"id": "food", "name": "Alimentación"},
    {"id": "trans", "name": "Transporte"},
]


def _make_expense_df(n_days: int = 60, seed: int = 42) -> pd.DataFrame:
    """Synthetic expense df as would come from build_expense_df()."""
    rng = np.random.default_rng(seed)
    rows = []
    base = datetime.now() - timedelta(days=n_days)
    for day in range(n_days):
        d = base + timedelta(days=day)
        for cat in PRED_CATS:
            if rng.random() > 0.3:
                rows.append({
                    "amount": float(rng.uniform(10, 100)),
                    "category_id": cat["id"],
                    "transaction_date": pd.Timestamp(d),
                })
    return pd.DataFrame(rows)


def test_build_prediction_df_empty_returns_empty():
    result = build_prediction_df(pd.DataFrame(), PRED_CATS)
    assert result.empty


def test_build_prediction_df_columns():
    df = _make_expense_df(60)
    result = build_prediction_df(df, PRED_CATS)
    required = {
        "date", "category_id", "daily_amount",
        "category_encoded", "rolling_7d_cat", "rolling_30d_cat",
        "rolling_7d_total", "day_of_month", "month",
        "days_since_last_cat", "cat_monthly_trend",
    }
    assert required.issubset(set(result.columns))


def test_build_prediction_df_rolling_nonnegative():
    df = _make_expense_df(60)
    result = build_prediction_df(df, PRED_CATS)
    assert (result["rolling_7d_cat"] >= 0).all()
    assert (result["rolling_30d_cat"] >= 0).all()
    assert (result["rolling_7d_total"] >= 0).all()


def test_build_prediction_df_category_encoded_valid():
    df = _make_expense_df(60)
    result = build_prediction_df(df, PRED_CATS)
    assert set(result["category_encoded"].unique()).issubset({0, 1, -1})


def test_build_prediction_df_day_of_month_range():
    df = _make_expense_df(60)
    result = build_prediction_df(df, PRED_CATS)
    assert result["day_of_month"].between(1, 31).all()
    assert result["month"].between(1, 12).all()


def test_build_prediction_df_trend_zero_single_month():
    """Single calendar month of data -> cat_monthly_trend must be 0."""
    now = datetime.now()
    month_start = now.replace(day=1)
    rows = [
        {
            "amount": 50.0,
            "category_id": "food",
            "transaction_date": pd.Timestamp(month_start + timedelta(days=i)),
        }
        for i in range(10)
    ]
    df = pd.DataFrame(rows)
    result = build_prediction_df(df, PRED_CATS)
    food_rows = result[result["category_id"] == "food"]
    assert (food_rows["cat_monthly_trend"] == 0.0).all()
