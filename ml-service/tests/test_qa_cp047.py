import os
import sys
from datetime import datetime, timedelta

import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from features import build_risk_features
from main import _heuristic_response
from model_risks import _rule_based_score


def tx(id, amount, type_, cat, date: datetime, desc="", cuotas=1, monto_por_cuota=None):
    return {
        "id": str(id),
        "user_id": "u1",
        "amount": amount,
        "type": type_,
        "category_id": cat,
        "transaction_date": date.strftime('%Y-%m-%dT%H:%M:%S'),
        "description": desc,
        "cuotas": cuotas,
        "monto_por_cuota": monto_por_cuota,
    }


def this_month():
    now = datetime.now()
    start = now.replace(day=1, hour=10, minute=0, second=0, microsecond=0)
    return start if start <= now else start.replace(hour=0)


def test_rule_score_overindebtedness_boundaries():
    assert _rule_based_score('SOBREENDEUDAMIENTO', {"cuotas_to_income_ratio": 0.29}) < 0.5
    assert _rule_based_score('SOBREENDEUDAMIENTO', {"cuotas_to_income_ratio": 0.30}) >= 0.5
    assert _rule_based_score('SOBREENDEUDAMIENTO', {"cuotas_to_income_ratio": 0.45}) >= 0.75


def test_rule_score_critical_category_boundaries():
    assert _rule_based_score('CATEGORIA_CRITICA', {"top_category_share": 0.49}) < 0.5
    assert _rule_based_score('CATEGORIA_CRITICA', {"top_category_share": 0.5}) >= 0.5


def test_cuota_rows_count_as_cuotas():
    start = this_month()
    transactions = [
        tx(i, 1000, "expense", "tech", start + pd.DateOffset(months=i), f"Laptop ({i + 1}/3)")
        for i in range(3)
    ]
    transactions.append(tx(10, 1500, "income", None, start))
    feats = build_risk_features(transactions)
    assert feats["cuotas_to_income_ratio"] == pytest.approx(1000 / 1500, rel=1e-2)


def test_invalid_cuota_patterns_ignored():
    start = this_month()
    transactions = [
        tx(i, 1000, "expense", "tech", start, desc)
        for i, desc in enumerate(["X (0/0)", "X (4/3)", "X (1/1)"])
    ]
    transactions.append(tx(10, 1500, "income", None, start))
    assert build_risk_features(transactions)["cuotas_to_income_ratio"] == 0


def test_legacy_cuota_window_calendar_months():
    start = this_month()
    income = tx(10, 1500, "income", None, start)
    expired = tx(1, 600, "expense", "tech", start - pd.DateOffset(months=2),
                 cuotas=2, monto_por_cuota=300)
    active = tx(1, 600, "expense", "tech", start - pd.DateOffset(months=1),
                cuotas=2, monto_por_cuota=300)
    assert build_risk_features([income, expired])["cuotas_to_income_ratio"] == 0
    assert build_risk_features([income, active])["cuotas_to_income_ratio"] > 0


def test_no_double_count_legacy_and_pattern():
    start = this_month()
    transactions = [
        tx(1, 500, "expense", "tech", start, "Tv (1/2)", cuotas=2, monto_por_cuota=500),
        tx(2, 1000, "income", None, start),
    ]
    assert build_risk_features(transactions)["cuotas_to_income_ratio"] == pytest.approx(0.5)


def test_future_rows_excluded_from_velocity():
    start = this_month()
    base = [
        tx(1, 100, "expense", "food", start),
        tx(2, 200, "expense", "food", start - pd.DateOffset(months=1)),
        tx(3, 1500, "income", None, start),
    ]
    future = tx(4, 5000, "expense", "tech", datetime.now() + timedelta(days=40))
    assert build_risk_features(base)["expense_velocity"] == build_risk_features(base + [future])["expense_velocity"]


def test_heuristic_response_large_debt_returns_critical_category():
    start = this_month()
    transactions = [tx(1, 1500, "income", None, start)]
    transactions.extend(tx(i + 2, 20, "expense", "food", start) for i in range(4))
    transactions.append(tx(6, 30000, "expense", "debt", start))
    categories = [{"id": "food", "name": "Comida"}, {"id": "debt", "name": "Deudas"}]
    result = _heuristic_response(transactions, categories)
    assert result["mode"] == 'heuristic'
    assert 'CATEGORIA_CRITICA' in [r['type'] for r in result["risks"]]
    assert result["recommendations"]["alerts"]


def test_heuristic_includes_first_day_of_month():
    start = this_month().replace(hour=0)
    result = _heuristic_response(
        [tx(1, 20, "expense", "food", start)],
        [{"id": "food", "name": "Comida"}],
    )
    assert result["prediction"]["next_30_days"]["total"] > 0
