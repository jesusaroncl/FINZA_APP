import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta
from features import build_expense_df
from model_prediction import predict_expenses

CATEGORIES = [
    {"id": "cat1", "name": "Alimentación", "type": "expense", "color": "#FF0000"},
    {"id": "cat2", "name": "Transporte",   "type": "expense", "color": "#00FF00"},
]

def make_tx(i, amount, cat="cat1", days_ago=0):
    date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%S")
    return {"id": str(i), "user_id": "u1", "amount": amount, "type": "expense",
            "category_id": cat, "transaction_date": date, "cuotas": 1}

TRANSACTIONS_50 = (
    [make_tx(i, 50.0 + i % 10, "cat1", days_ago=i) for i in range(30)] +
    [make_tx(i + 30, 30.0 + i % 5, "cat2", days_ago=i) for i in range(20)]
)


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


def test_predict_expenses_totals_are_positive():
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


def test_predict_30d_total_greater_than_7d():
    df = build_expense_df(TRANSACTIONS_50, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    assert result["next_30_days"]["total"] >= result["next_7_days"]["total"]
