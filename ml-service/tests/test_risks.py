import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta
from model_risks import detect_risks

def make_tx(i, amount, type_="expense", cat="cat1", days_ago=0, cuotas=1, monto_cuota=None):
    date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%S")
    return {"id": str(i), "user_id": "u1", "amount": amount, "type": type_,
            "category_id": cat if type_ == "expense" else None,
            "transaction_date": date, "cuotas": cuotas,
            "monto_por_cuota": monto_cuota}


def test_detect_risks_empty():
    result = detect_risks([])
    assert result == []


def test_detect_risks_returns_list():
    txs = [make_tx(i, 50.0, days_ago=i) for i in range(30)]
    result = detect_risks(txs)
    assert isinstance(result, list)


def test_detect_risks_item_structure():
    txs = [make_tx(i, 5.0, days_ago=i % 6) for i in range(20)]
    result = detect_risks(txs)
    if result:
        item = result[0]
        assert "type" in item
        assert "severity" in item
        assert "description" in item
        assert item["severity"] in ("low", "medium", "high")


def test_detect_risks_gastos_hormiga():
    # 12 transactions < S/15 in last 7 days
    txs = [make_tx(i, 8.0, days_ago=i % 5) for i in range(12)]
    txs += [make_tx(i + 100, 50.0, days_ago=i + 30) for i in range(30)]
    result = detect_risks(txs)
    types = [r["type"] for r in result]
    assert "GASTOS_HORMIGA" in types


def test_detect_risks_no_false_positives_on_clean_data():
    txs = [make_tx(i, 50.0, days_ago=i) for i in range(60)]
    txs += [make_tx(i + 200, 2000.0, type_="income", days_ago=i * 30) for i in range(2)]
    result = detect_risks(txs)
    assert len(result) <= 1
