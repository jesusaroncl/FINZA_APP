import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from features import build_expense_df
from model_prediction import predict_expenses

CATEGORIES = [
    {"id": "cat1", "name": "Alimentación", "type": "expense", "color": "#FF0000"},
    {"id": "cat2", "name": "Transporte",   "type": "expense", "color": "#00FF00"},
]


def make_tx(i, amount, cat="cat1", days_ago=0):
    date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%S")
    return {
        "id": str(i), "user_id": "u1", "amount": amount, "type": "expense",
        "category_id": cat, "transaction_date": date, "cuotas": 1,
    }


# 50 transactions over 30 days — enough for 7d model, fallback for 30d
TRANSACTIONS_50 = (
    [make_tx(i, 50.0 + i % 10, "cat1", days_ago=i) for i in range(30)] +
    [make_tx(i + 30, 30.0 + i % 5, "cat2", days_ago=i) for i in range(20)]
)


def make_90day_transactions():
    """90 days of daily transactions — enough for both 7d and 30d LightGBM models."""
    rng = np.random.default_rng(0)
    txs = []
    idx = 0
    for day in range(90):
        for cat_id in ("cat1", "cat2"):
            if rng.random() > 0.2:
                txs.append(make_tx(idx, float(rng.uniform(20, 80)), cat_id, days_ago=day))
                idx += 1
    return txs


TRANSACTIONS_90 = make_90day_transactions()


# --- Structure tests (both paths must produce same shape) ---

def test_predict_expenses_empty_df():
    result = predict_expenses(build_expense_df([], CATEGORIES), CATEGORIES)
    assert result["next_7_days"]["total"] == 0
    assert result["next_30_days"]["total"] == 0
    assert result["next_7_days"]["by_category"] == []


def test_predict_expenses_returns_valid_structure():
    df = build_expense_df(TRANSACTIONS_50, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    assert "next_7_days" in result
    assert "next_30_days" in result
    assert "total" in result["next_7_days"]
    assert "by_category" in result["next_7_days"]


def test_predict_expenses_totals_are_nonnegative():
    df = build_expense_df(TRANSACTIONS_50, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    assert result["next_7_days"]["total"] >= 0
    assert result["next_30_days"]["total"] >= 0


def test_predict_expenses_category_has_required_fields():
    df = build_expense_df(TRANSACTIONS_50, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    for item in result["next_7_days"]["by_category"]:
        assert "category" in item
        assert "amount" in item
        assert "type" in item
        assert item["type"] in ("fixed", "variable")
        assert item["amount"] >= 0


def test_predict_30d_total_gte_7d():
    df = build_expense_df(TRANSACTIONS_50, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    assert result["next_30_days"]["total"] >= result["next_7_days"]["total"]


# --- LightGBM path tests (90 days of data) ---

def test_lgbm_path_nonnegative_predictions():
    df = build_expense_df(TRANSACTIONS_90, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    for item in result["next_7_days"]["by_category"]:
        assert item["amount"] >= 0
    for item in result["next_30_days"]["by_category"]:
        assert item["amount"] >= 0


def test_lgbm_path_predictions_reasonable():
    """LightGBM predictions should be within reasonable bounds (not S/10,000+)."""
    df = build_expense_df(TRANSACTIONS_90, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    assert result["next_7_days"]["total"] < 10_000
    assert result["next_30_days"]["total"] < 50_000


def test_lgbm_path_30d_gte_7d():
    df = build_expense_df(TRANSACTIONS_90, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    assert result["next_30_days"]["total"] >= result["next_7_days"]["total"]
