import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta
import pandas as pd
import pytest
from features import build_expense_df, build_risk_features, build_risk_training_data

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
