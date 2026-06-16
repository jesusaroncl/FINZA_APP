import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta
from model_recommendations import generate_recommendations

CATEGORIES = [
    {"id": "cat1", "name": "Alimentación", "type": "expense", "color": "#FF0000"},
    {"id": "cat2", "name": "Entretenimiento", "type": "expense", "color": "#0000FF"},
]

def make_tx(i, amount, cat="cat1", days_ago=0):
    date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%S")
    return {"id": str(i), "user_id": "u1", "amount": amount, "type": "expense",
            "category_id": cat, "transaction_date": date, "cuotas": 1, "monto_por_cuota": None}

TRANSACTIONS_60 = [make_tx(i, 80.0 + i % 20, "cat1", days_ago=i) for i in range(40)] + \
                  [make_tx(i + 40, 30.0 + i % 10, "cat2", days_ago=i) for i in range(20)]

RISKS_SAMPLE = [
    {"type": "GASTOS_HORMIGA", "severity": "high",
     "description": "14 micro-transacciones esta semana"}
]


def test_generate_recommendations_empty():
    result = generate_recommendations([], [], CATEGORIES)
    assert "alerts" in result
    assert "tips" in result
    assert isinstance(result["alerts"], list)
    assert isinstance(result["tips"], list)


def test_generate_recommendations_structure():
    result = generate_recommendations(RISKS_SAMPLE, TRANSACTIONS_60, CATEGORIES)
    assert "alerts" in result
    assert "tips" in result


def test_generate_recommendations_alert_has_fields():
    result = generate_recommendations(RISKS_SAMPLE, TRANSACTIONS_60, CATEGORIES)
    if result["alerts"]:
        alert = result["alerts"][0]
        assert "priority" in alert
        assert "message" in alert
        assert "triggered_by" in alert


def test_generate_recommendations_tip_has_fields():
    result = generate_recommendations(RISKS_SAMPLE, TRANSACTIONS_60, CATEGORIES)
    if result["tips"]:
        tip = result["tips"][0]
        assert "category" in tip
        assert "suggestion" in tip
        assert "potential_saving" in tip
        assert tip["potential_saving"] >= 0


def test_generate_recommendations_risk_triggers_alert():
    risks = [{"type": "VELOCIDAD_GASTO", "severity": "high",
              "description": "Ya gastaste el 90% de tu promedio"}]
    result = generate_recommendations(risks, TRANSACTIONS_60, CATEGORIES)
    triggered = [a["triggered_by"] for a in result["alerts"]]
    assert "VELOCIDAD_GASTO" in triggered
