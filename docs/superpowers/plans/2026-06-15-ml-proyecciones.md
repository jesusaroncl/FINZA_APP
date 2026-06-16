# ML Proyecciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar tres módulos ML a /proyecciones: Random Forest para predicción de gastos, LightGBM para detección de riesgos, y LightGBM para recomendaciones, servidos por un FastAPI en Railway.

**Architecture:** FastAPI en Railway recibe el JWT de Supabase via un proxy en Next.js (`/api/ml/predict`), busca transacciones del usuario, entrena modelos on-request, y devuelve JSON unificado. Usuarios con < 30 transacciones reciben fallback heurístico. La página /proyecciones se rediseña con 3 secciones ML.

**Tech Stack:** Python 3.11, FastAPI, uvicorn, scikit-learn (RandomForestRegressor), lightgbm, pandas, numpy, supabase-py, python-dotenv, pytest; Next.js 16 App Router, TypeScript, Tailwind CSS.

---

## File Map

**Nuevos — Python service:**
- `ml-service/requirements.txt`
- `ml-service/Dockerfile`
- `ml-service/railway.toml`
- `ml-service/.env.example`
- `ml-service/supabase_client.py`
- `ml-service/features.py`
- `ml-service/model_prediction.py`
- `ml-service/model_risks.py`
- `ml-service/model_recommendations.py`
- `ml-service/main.py`
- `ml-service/tests/__init__.py`
- `ml-service/tests/test_features.py`
- `ml-service/tests/test_prediction.py`
- `ml-service/tests/test_risks.py`
- `ml-service/tests/test_recommendations.py`

**Nuevos — Next.js:**
- `app/api/ml/predict/route.ts`
- `components/proyecciones/prediction-section.tsx`
- `components/proyecciones/risks-section.tsx`
- `components/proyecciones/recommendations-section.tsx`

**Modificados — Next.js:**
- `app/proyecciones/page.tsx`
- `components/proyecciones/index.ts`

---

## Task 1: Project Setup

**Files:**
- Create: `ml-service/requirements.txt`
- Create: `ml-service/Dockerfile`
- Create: `ml-service/railway.toml`
- Create: `ml-service/.env.example`
- Create: `ml-service/tests/__init__.py`

- [ ] **Step 1: Crear directorio ml-service**

```bash
mkdir -p ml-service/tests
```

- [ ] **Step 2: Crear requirements.txt**

```
fastapi==0.115.0
uvicorn==0.30.6
scikit-learn==1.5.2
lightgbm==4.5.0
pandas==2.2.3
numpy==1.26.4
supabase==2.7.4
python-dotenv==1.0.1
pytest==8.3.3
httpx==0.27.2
```

- [ ] **Step 3: Crear Dockerfile**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Crear railway.toml**

```toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port 8000"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on-failure"
```

- [ ] **Step 5: Crear .env.example**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 6: Crear tests/__init__.py**

```python
```

- [ ] **Step 7: Commit**

```bash
git add ml-service/
git commit -m "feat: add ml-service project scaffold"
```

---

## Task 2: Supabase Client

**Files:**
- Create: `ml-service/supabase_client.py`

- [ ] **Step 1: Crear supabase_client.py**

```python
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def verify_jwt(token: str) -> str | None:
    """Verify Supabase JWT and return user_id, or None if invalid."""
    try:
        client = get_client()
        response = client.auth.get_user(token)
        return response.user.id if response.user else None
    except Exception:
        return None


def fetch_user_data(user_id: str) -> tuple[list[dict], list[dict]]:
    """Fetch transactions and categories for user_id."""
    client = get_client()
    tx = client.table("transactions").select("*").eq("user_id", user_id).execute()
    cats = client.table("categories").select("*").eq("user_id", user_id).execute()
    return tx.data or [], cats.data or []
```

- [ ] **Step 2: Commit**

```bash
git add ml-service/supabase_client.py
git commit -m "feat: add supabase client for ml-service"
```

---

## Task 3: Feature Engineering + Tests

**Files:**
- Create: `ml-service/features.py`
- Create: `ml-service/tests/test_features.py`

- [ ] **Step 1: Escribir tests primero**

`ml-service/tests/test_features.py`:

```python
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
    small_txs = [make_tx(i, 5.0, days_ago=i % 6) for i in range(15)]  # 15 txs < S/15
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
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
cd ml-service
pip install -r requirements.txt
pytest tests/test_features.py -v
```

Esperado: `ImportError` o `ModuleNotFoundError` porque `features.py` no existe.

- [ ] **Step 3: Implementar features.py**

```python
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
    df["transaction_date"] = pd.to_datetime(df["transaction_date"].str[:10])
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
    df["days_since_last_tx"] = (now - last_dates.dt.to_pydatetime()).apply(
        lambda d: d.days if hasattr(d, "days") else 30
    ).clip(0, 365)

    return df


def build_risk_features(transactions: list[dict]) -> dict:
    """Scalar features for a transaction window used by LightGBM risk model."""
    if not transactions:
        return _zero_risk_features()

    df = pd.DataFrame(transactions)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"].str[:10])

    expenses = df[df["type"] == "expense"].copy()
    income_df = df[df["type"] == "income"].copy()

    now = datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Monthly income estimate
    monthly_income = income_df[
        income_df["transaction_date"] >= pd.Timestamp(month_start)
    ]["amount"].sum()
    if monthly_income == 0 and not income_df.empty:
        monthly_income = income_df["amount"].mean() * 30
    if monthly_income == 0:
        monthly_income = 1.0

    # Cuotas ratio
    cuotas_monthly = 0.0
    if "monto_por_cuota" in expenses.columns and "cuotas" in expenses.columns:
        active = expenses[expenses["cuotas"].fillna(1).astype(float) > 1]
        cuotas_monthly = active["monto_por_cuota"].fillna(0).sum()
    cuotas_to_income_ratio = min(cuotas_monthly / monthly_income, 3.0)

    # Small transactions in last 7 days
    recent = expenses[expenses["transaction_date"] >= pd.Timestamp(week_ago)]
    small_tx_count_7d = float(len(recent[recent["amount"] < 15]))

    # Expense velocity
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

    # Top category share this month
    month_expenses = expenses[expenses["transaction_date"] >= pd.Timestamp(month_start)]
    total_month = month_expenses["amount"].sum()
    top_category_share = 0.0
    if total_month > 0:
        cat_totals = month_expenses.groupby("category_id")["amount"].sum()
        top_category_share = float(cat_totals.max() / total_month)

    # Monthly trend (normalized slope)
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
    """
    Sliding-window self-supervised training data for LightGBM risk model.
    Each 30-day window → features + rule-based labels.
    """
    if not transactions:
        return pd.DataFrame(), pd.DataFrame()

    df = pd.DataFrame(transactions)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"].str[:10])
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
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
pytest tests/test_features.py -v
```

Esperado: `9 passed`

- [ ] **Step 5: Commit**

```bash
git add ml-service/features.py ml-service/tests/test_features.py
git commit -m "feat: add feature engineering module with tests"
```

---

## Task 4: Random Forest Prediction Module + Tests

**Files:**
- Create: `ml-service/model_prediction.py`
- Create: `ml-service/tests/test_prediction.py`

- [ ] **Step 1: Escribir tests**

`ml-service/tests/test_prediction.py`:

```python
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
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
pytest tests/test_prediction.py -v
```

Esperado: `ImportError` porque `model_prediction.py` no existe.

- [ ] **Step 3: Implementar model_prediction.py**

```python
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

    feature_df = df[EXPENSE_FEATURE_COLS + ["amount", "category_id", "category_encoded",
                                             "transaction_date"]].dropna(subset=EXPENSE_FEATURE_COLS)
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
        days_since_base = (now - last_date.to_pydatetime()).days
        cat_encoded = cat_df["category_encoded"].iloc[-1]

        # Coefficient of variation to classify fixed vs variable
        cv = cat_df["amount"].std() / (cat_df["amount"].mean() + 1e-9)
        tx_type = "fixed" if cv < 0.3 else "variable"

        def _build_row(future_date: datetime, offset: int) -> list:
            return [
                future_date.weekday(),
                future_date.day,
                future_date.month,
                int(future_date.weekday() >= 5),
                cat_encoded,
                rolling_avg_7d,
                rolling_avg_30d,
                category_avg_month,
                float(days_since_base + offset),
            ]

        total_7 = sum(
            max(0.0, float(model.predict([_build_row(now + timedelta(days=i), i)])[0]))
            for i in range(1, 8)
        )
        total_30 = sum(
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
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
pytest tests/test_prediction.py -v
```

Esperado: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add ml-service/model_prediction.py ml-service/tests/test_prediction.py
git commit -m "feat: add Random Forest expense prediction module with tests"
```

---

## Task 5: LightGBM Risk Detection Module + Tests

**Files:**
- Create: `ml-service/model_risks.py`
- Create: `ml-service/tests/test_risks.py`

- [ ] **Step 1: Escribir tests**

`ml-service/tests/test_risks.py`:

```python
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
    txs = [make_tx(i, 5.0, days_ago=i % 6) for i in range(20)]  # many small txs
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
    txs += [make_tx(i + 100, 50.0, days_ago=i + 30) for i in range(30)]  # history
    result = detect_risks(txs)
    types = [r["type"] for r in result]
    assert "GASTOS_HORMIGA" in types


def test_detect_risks_no_false_positives_on_clean_data():
    # Normal spending, one transaction per day, S/50 each
    txs = [make_tx(i, 50.0, days_ago=i) for i in range(60)]
    txs += [make_tx(i + 200, 2000.0, type_="income", days_ago=i * 30) for i in range(2)]
    result = detect_risks(txs)
    # With clean data and income, should be 0 or 1 risk max
    assert len(result) <= 1
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
pytest tests/test_risks.py -v
```

Esperado: `ImportError` porque `model_risks.py` no existe.

- [ ] **Step 3: Implementar model_risks.py**

```python
import pandas as pd
import numpy as np
import lightgbm as lgb
from features import build_risk_features, build_risk_training_data

RISK_FEATURE_COLS = [
    "cuotas_to_income_ratio", "small_tx_count_7d", "expense_velocity",
    "days_elapsed_month", "top_category_share", "monthly_expense_trend",
    "window_end_day",
]

RISK_THRESHOLDS = {
    "SOBREENDEUDAMIENTO": (0.3, "Tus cuotas activas superan el 30% de tu ingreso mensual"),
    "GASTOS_HORMIGA":     (0.5, "Detectamos muchas micro-transacciones menores a S/15"),
    "VELOCIDAD_GASTO":    (0.5, "Tu velocidad de gasto este mes supera tu promedio histórico"),
    "CATEGORIA_CRITICA":  (0.5, "Una categoría concentra más del 50% de tus gastos del mes"),
}

SEVERITY_MAP = {
    "SOBREENDEUDAMIENTO": {0.3: "low", 0.6: "medium", 1.0: "high"},
    "GASTOS_HORMIGA":     {0.3: "low", 0.6: "medium", 1.0: "high"},
    "VELOCIDAD_GASTO":    {0.3: "low", 0.6: "medium", 1.0: "high"},
    "CATEGORIA_CRITICA":  {0.3: "low", 0.6: "medium", 1.0: "high"},
}

RISK_DESCRIPTIONS = {
    "SOBREENDEUDAMIENTO": lambda feats: (
        f"Tus cuotas representan el {feats['cuotas_to_income_ratio']*100:.0f}% de tu ingreso mensual"
    ),
    "GASTOS_HORMIGA": lambda feats: (
        f"Detectamos {int(feats['small_tx_count_7d'])} micro-transacciones (< S/15) esta semana"
    ),
    "VELOCIDAD_GASTO": lambda feats: (
        f"Ya gastaste el {feats['expense_velocity']*100:.0f}% de tu promedio mensual "
        f"(día {int(feats['days_elapsed_month'])} del mes)"
    ),
    "CATEGORIA_CRITICA": lambda feats: (
        f"Una categoría concentra el {feats['top_category_share']*100:.0f}% de tus gastos del mes"
    ),
}


def detect_risks(transactions: list[dict]) -> list[dict]:
    """
    Train one LightGBM binary classifier per risk type using sliding-window
    self-supervised data, then score the current window.
    Falls back to rule-based thresholds when training data is insufficient.
    """
    if not transactions:
        return []

    current_feats = build_risk_features(transactions)
    current_feats["window_end_day"] = float(__import__("datetime").datetime.now().day)

    X_train, y_train = build_risk_training_data(transactions)

    risks: list[dict] = []

    for risk_type, (threshold, _) in RISK_THRESHOLDS.items():
        score = _score_risk(risk_type, current_feats, X_train, y_train)

        if score >= threshold:
            severity = _get_severity(risk_type, score)
            description = RISK_DESCRIPTIONS[risk_type](current_feats)
            risks.append({
                "type": risk_type,
                "severity": severity,
                "description": description,
            })

    # Sort by severity desc
    order = {"high": 0, "medium": 1, "low": 2}
    risks.sort(key=lambda r: order[r["severity"]])
    return risks


def _score_risk(
    risk_type: str,
    current_feats: dict,
    X_train: pd.DataFrame,
    y_train: pd.DataFrame,
) -> float:
    """
    Train LightGBM binary classifier for one risk type and predict score
    for current feature vector. Falls back to rule-based score if
    insufficient training data (< 10 samples or only one class).
    """
    if X_train.empty or y_train.empty or len(X_train) < 10:
        return _rule_based_score(risk_type, current_feats)

    label_col = y_train[risk_type]
    if label_col.nunique() < 2:
        return _rule_based_score(risk_type, current_feats)

    # Ensure column alignment
    feature_cols = [c for c in RISK_FEATURE_COLS if c in X_train.columns]
    X = X_train[feature_cols].fillna(0).values
    y = label_col.values

    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "num_leaves": 4,
        "min_child_samples": 2,
        "n_estimators": 50,
        "learning_rate": 0.1,
        "verbosity": -1,
    }
    model = lgb.LGBMClassifier(**params)
    model.fit(X, y)

    current_row = np.array(
        [current_feats.get(c, 0.0) for c in feature_cols], dtype=float
    ).reshape(1, -1)
    return float(model.predict_proba(current_row)[0][1])


def _rule_based_score(risk_type: str, feats: dict) -> float:
    """Fallback: deterministic score from feature thresholds."""
    if risk_type == "SOBREENDEUDAMIENTO":
        return min(feats["cuotas_to_income_ratio"] / 0.3, 1.0)
    if risk_type == "GASTOS_HORMIGA":
        return min(feats["small_tx_count_7d"] / 10.0, 1.0)
    if risk_type == "VELOCIDAD_GASTO":
        if feats["days_elapsed_month"] < 20:
            return min(feats["expense_velocity"] / 0.8, 1.0)
        return 0.0
    if risk_type == "CATEGORIA_CRITICA":
        return min(feats["top_category_share"] / 0.5, 1.0)
    return 0.0


def _get_severity(risk_type: str, score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
pytest tests/test_risks.py -v
```

Esperado: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add ml-service/model_risks.py ml-service/tests/test_risks.py
git commit -m "feat: add LightGBM risk detection module with tests"
```

---

## Task 6: LightGBM Recommendations Module + Tests

**Files:**
- Create: `ml-service/model_recommendations.py`
- Create: `ml-service/tests/test_recommendations.py`

- [ ] **Step 1: Escribir tests**

`ml-service/tests/test_recommendations.py`:

```python
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
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
pytest tests/test_recommendations.py -v
```

Esperado: `ImportError` porque `model_recommendations.py` no existe.

- [ ] **Step 3: Implementar model_recommendations.py**

```python
import pandas as pd
import numpy as np
import lightgbm as lgb
from datetime import datetime, timedelta

ALERT_MESSAGES = {
    "SOBREENDEUDAMIENTO": "Tus cuotas activas están comprometiendo tu capacidad de ahorro",
    "GASTOS_HORMIGA":     "Los pequeños gastos frecuentes están erosionando tu presupuesto",
    "VELOCIDAD_GASTO":    "A este ritmo, superarás tu presupuesto mensual antes de fin de mes",
    "CATEGORIA_CRITICA":  "Una categoría está consumiendo más de la mitad de tu presupuesto",
}


def generate_recommendations(
    risks: list[dict],
    transactions: list[dict],
    categories: list[dict],
) -> dict:
    """
    Use LightGBM to estimate savings potential per category,
    then combine with active risks to generate alerts and tips.
    """
    alerts = _build_alerts(risks)
    tips = _build_tips(transactions, categories)

    return {"alerts": alerts, "tips": tips}


def _build_alerts(risks: list[dict]) -> list[dict]:
    alerts = []
    for priority, risk in enumerate(risks, start=1):
        alerts.append({
            "priority": priority,
            "message": ALERT_MESSAGES.get(risk["type"], risk["description"]),
            "triggered_by": risk["type"],
        })
    return alerts


def _build_tips(transactions: list[dict], categories: list[dict]) -> list[dict]:
    if not transactions or not categories:
        return []

    df = pd.DataFrame(transactions)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"].str[:10])
    expenses = df[df["type"] == "expense"].copy()

    if expenses.empty:
        return []

    now = datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    X_train, y_train, meta = _build_recommendation_training_data(expenses, categories)

    tips = []
    for cat in categories:
        cat_expenses = expenses[expenses["category_id"] == cat["id"]]
        if cat_expenses.empty:
            continue

        hist_avg = cat_expenses.groupby(
            cat_expenses["transaction_date"].dt.to_period("M")
        )["amount"].sum().mean()
        current_month = cat_expenses[
            cat_expenses["transaction_date"] >= pd.Timestamp(month_start)
        ]["amount"].sum()

        savings_potential = _predict_savings_potential(
            cat["id"], hist_avg, current_month, now.month, X_train, y_train, meta
        )

        if savings_potential > 0:
            pct = round(savings_potential / (hist_avg + 1e-9) * 100)
            tips.append({
                "category": cat["name"],
                "suggestion": f"Reducir un {pct}% en {cat['name']} te ahorraría S/{savings_potential:.0f} este mes",
                "potential_saving": round(savings_potential, 2),
            })

    tips.sort(key=lambda t: t["potential_saving"], reverse=True)
    return tips[:3]  # Top 3 tips


def _build_recommendation_training_data(
    expenses: pd.DataFrame,
    categories: list[dict],
) -> tuple[pd.DataFrame, pd.Series, dict]:
    """
    Training data: for each (category, month) pair in history,
    compute features and target = savings_potential (how much below avg was spent).
    """
    rows = []
    targets = []
    cat_map = {c["id"]: i for i, c in enumerate(categories)}

    monthly = expenses.groupby(
        [expenses["transaction_date"].dt.to_period("M"), "category_id"]
    )["amount"].sum().reset_index()
    monthly.columns = ["period", "category_id", "monthly_total"]

    for cat_id in expenses["category_id"].unique():
        cat_data = monthly[monthly["category_id"] == cat_id].copy()
        if len(cat_data) < 2:
            continue
        cat_data = cat_data.sort_values("period")
        hist_avg = cat_data["monthly_total"].mean()

        for _, row in cat_data.iterrows():
            features = {
                "category_encoded": float(cat_map.get(cat_id, -1)),
                "hist_avg": hist_avg,
                "current_month_total": row["monthly_total"],
                "month_index": float(row["period"].month),
                "spend_ratio": row["monthly_total"] / (hist_avg + 1e-9),
            }
            target = max(0.0, hist_avg * 0.15)  # 15% savings potential from avg
            rows.append(features)
            targets.append(target)

    if not rows:
        return pd.DataFrame(), pd.Series(dtype=float), {}

    X = pd.DataFrame(rows)
    y = pd.Series(targets)
    meta = {"cat_map": cat_map}
    return X, y, meta


def _predict_savings_potential(
    cat_id: str,
    hist_avg: float,
    current_month: float,
    month_index: int,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    meta: dict,
) -> float:
    """
    Train LightGBM regressor to predict savings potential for a category.
    Falls back to rule-based 15% of avg if training data is insufficient.
    """
    if X_train.empty or len(X_train) < 5:
        return round(hist_avg * 0.15, 2)

    model = lgb.LGBMRegressor(
        n_estimators=50, num_leaves=4, min_child_samples=2,
        learning_rate=0.1, verbosity=-1,
    )
    model.fit(X_train.values, y_train.values)

    cat_map = meta.get("cat_map", {})
    row = np.array([[
        float(cat_map.get(cat_id, -1)),
        hist_avg,
        current_month,
        float(month_index),
        current_month / (hist_avg + 1e-9),
    ]])
    prediction = float(model.predict(row)[0])
    return max(0.0, round(prediction, 2))
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
pytest tests/test_recommendations.py -v
```

Esperado: `5 passed`

- [ ] **Step 5: Ejecutar toda la suite**

```bash
pytest tests/ -v
```

Esperado: `19 passed`

- [ ] **Step 6: Commit**

```bash
git add ml-service/model_recommendations.py ml-service/tests/test_recommendations.py
git commit -m "feat: add LightGBM recommendations module with tests"
```

---

## Task 7: FastAPI Main App

**Files:**
- Create: `ml-service/main.py`

- [ ] **Step 1: Implementar main.py**

```python
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from supabase_client import verify_jwt, fetch_user_data
from features import build_expense_df
from model_prediction import predict_expenses
from model_risks import detect_risks
from model_recommendations import generate_recommendations

app = FastAPI(title="Finza ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    user_id = verify_jwt(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    transactions, categories = fetch_user_data(user_id)

    expense_count = sum(1 for t in transactions if t.get("type") == "expense")
    if expense_count < 30:
        return _heuristic_response(transactions, categories)

    expense_df = build_expense_df(transactions, categories)
    prediction = predict_expenses(expense_df, categories)
    risks = detect_risks(transactions)
    recommendations = generate_recommendations(risks, transactions, categories)

    return {
        "mode": "ml",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "prediction": prediction,
        "risks": risks,
        "recommendations": recommendations,
    }


def _heuristic_response(transactions: list[dict], categories: list[dict]) -> dict:
    """Simple heuristic fallback when user has < 30 expense transactions."""
    from collections import defaultdict
    now = datetime.now()
    month_start = now.replace(day=1)

    by_cat: dict = defaultdict(float)
    for t in transactions:
        if t.get("type") == "expense":
            d_str = t.get("transaction_date", "")[:10]
            try:
                d = datetime.strptime(d_str, "%Y-%m-%d")
                if d >= month_start:
                    by_cat[t.get("category_id", "sin-cat")] += t.get("amount", 0)
            except ValueError:
                pass

    cat_lookup = {c["id"]: c["name"] for c in categories}
    by_category_list = [
        {"category": cat_lookup.get(cid, "Sin categoría"), "amount": round(amt, 2), "type": "variable"}
        for cid, amt in sorted(by_cat.items(), key=lambda x: x[1], reverse=True)
    ]
    total = round(sum(by_cat.values()), 2)

    return {
        "mode": "heuristic",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "prediction": {
            "next_7_days": {"total": round(total / 4, 2), "by_category": by_category_list},
            "next_30_days": {"total": total, "by_category": by_category_list},
        },
        "risks": [],
        "recommendations": {"alerts": [], "tips": []},
    }
```

- [ ] **Step 2: Probar localmente con variables de entorno reales**

```bash
cd ml-service
cp .env.example .env
# Editar .env con las credenciales reales de Supabase
uvicorn main:app --reload --port 8000
```

Visitar: `http://localhost:8000/health` → debe devolver `{"status":"ok"}`

- [ ] **Step 3: Commit**

```bash
git add ml-service/main.py
git commit -m "feat: add FastAPI main app with /predict endpoint and heuristic fallback"
```

---

## Task 8: Deploy a Railway + Variable en Vercel

**Files:** ninguno nuevo, solo configuración externa.

- [ ] **Step 1: Push el código a GitHub si no está**

```bash
git push origin main
```

- [ ] **Step 2: Crear proyecto en Railway**

1. Ir a [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Seleccionar el repositorio FINZA_APP
3. Cambiar el **Root Directory** a `ml-service`
4. Railway detectará el `Dockerfile` automáticamente

- [ ] **Step 3: Agregar variables de entorno en Railway**

En Railway → Variables:
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

- [ ] **Step 4: Obtener la URL pública de Railway**

Formato: `https://finza-ml-service-production.up.railway.app`

- [ ] **Step 5: Agregar variable en Vercel**

En Vercel → Settings → Environment Variables:
```
ML_API_URL=https://finza-ml-service-production.up.railway.app
```

- [ ] **Step 6: Agregar al .env.local para desarrollo local**

En `FINZA_APP/.env.local` agregar:
```
ML_API_URL=http://localhost:8000
```

---

## Task 9: Next.js API Proxy Route

**Files:**
- Create: `app/api/ml/predict/route.ts`

- [ ] **Step 1: Implementar route.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ML_API_URL = process.env.ML_API_URL

export async function POST() {
  if (!ML_API_URL) {
    return NextResponse.json({ error: 'ML service not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`ML service error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[ml/predict] Error:', error)
    return NextResponse.json({ error: 'ML service unavailable' }, { status: 503 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ml/predict/route.ts
git commit -m "feat: add Next.js proxy route for ML predict endpoint"
```

---

## Task 10: PredictionSection Component

**Files:**
- Create: `components/proyecciones/prediction-section.tsx`

- [ ] **Step 1: Implementar prediction-section.tsx**

```tsx
import { formatSoles } from '@/lib/utils-currency'

interface CategoryPrediction {
  category: string
  amount: number
  type: 'fixed' | 'variable'
}

interface PredictionData {
  total: number
  by_category: CategoryPrediction[]
}

interface PredictionSectionProps {
  next7Days: PredictionData
  next30Days: PredictionData
  mode: 'ml' | 'heuristic'
}

export function PredictionSection({ next7Days, next30Days, mode }: PredictionSectionProps) {
  const maxAmount = Math.max(
    ...next7Days.by_category.map(c => c.amount),
    1
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-slate-800">Predicción de Gastos</h2>
        {mode === 'heuristic' && (
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-medium">
            Datos insuficientes para ML
          </span>
        )}
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ background: '#EFF6FF' }}>
          <p className="text-xs font-medium text-blue-500 mb-1">Próximos 7 días</p>
          <p className="text-2xl font-bold text-blue-700">{formatSoles(next7Days.total)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#F0FDF4' }}>
          <p className="text-xs font-medium text-green-600 mb-1">Próximos 30 días</p>
          <p className="text-2xl font-bold text-green-700">{formatSoles(next30Days.total)}</p>
        </div>
      </div>

      {/* Category bars */}
      {next7Days.by_category.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin datos de categorías</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Por categoría — próximos 7 días
          </p>
          {next7Days.by_category.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{cat.category}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: cat.type === 'fixed' ? '#DBEAFE' : '#FEF3C7',
                      color: cat.type === 'fixed' ? '#1D4ED8' : '#D97706',
                    }}
                  >
                    {cat.type === 'fixed' ? 'FIJO' : 'VARIABLE'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {formatSoles(cat.amount)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(cat.amount / maxAmount) * 100}%`,
                    background: cat.type === 'fixed' ? '#3B82F6' : '#F59E0B',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/proyecciones/prediction-section.tsx
git commit -m "feat: add PredictionSection component for ML proyecciones"
```

---

## Task 11: RisksSection Component

**Files:**
- Create: `components/proyecciones/risks-section.tsx`

- [ ] **Step 1: Implementar risks-section.tsx**

```tsx
interface Risk {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

interface RisksSectionProps {
  risks: Risk[]
}

const SEVERITY_STYLES = {
  high:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#EF4444', label: 'Alto' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B', label: 'Medio' },
  low:    { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', dot: '#94A3B8', label: 'Bajo' },
}

const RISK_LABELS: Record<string, string> = {
  SOBREENDEUDAMIENTO: 'Riesgo de Sobreendeudamiento',
  GASTOS_HORMIGA:     'Gastos Hormiga',
  VELOCIDAD_GASTO:    'Velocidad de Gasto',
  CATEGORIA_CRITICA:  'Categoria Critica',
}

export function RisksSection({ risks }: RisksSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-800 mb-6">Radar de Riesgos</h2>

      {risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F0FDF4' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-green-600">Sin riesgos detectados</p>
          <p className="text-xs text-slate-400">Tus finanzas están en buen camino</p>
        </div>
      ) : (
        <div className="space-y-3">
          {risks.map((risk) => {
            const style = SEVERITY_STYLES[risk.severity]
            return (
              <div
                key={risk.type}
                className="rounded-xl p-4"
                style={{ background: style.bg, border: `1px solid ${style.border}` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: style.dot }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold" style={{ color: style.text }}>
                        {RISK_LABELS[risk.type] ?? risk.type}
                      </span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: style.border, color: style.text }}
                      >
                        {style.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: style.text }}>
                      {risk.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/proyecciones/risks-section.tsx
git commit -m "feat: add RisksSection component for ML risk radar"
```

---

## Task 12: RecommendationsSection Component

**Files:**
- Create: `components/proyecciones/recommendations-section.tsx`

- [ ] **Step 1: Implementar recommendations-section.tsx**

```tsx
import { formatSoles } from '@/lib/utils-currency'

interface Alert {
  priority: number
  message: string
  triggered_by: string
}

interface Tip {
  category: string
  suggestion: string
  potential_saving: number
}

interface RecommendationsSectionProps {
  alerts: Alert[]
  tips: Tip[]
}

export function RecommendationsSection({ alerts, tips }: RecommendationsSectionProps) {
  const totalSaving = tips.reduce((sum, t) => sum + t.potential_saving, 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-800 mb-6">Recomendaciones</h2>

      {alerts.length === 0 && tips.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          Sin recomendaciones por el momento
        </p>
      ) : (
        <div className="space-y-4">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.triggered_by}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-0.5 flex-shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-xs font-medium text-amber-700">{alert.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Consejos de ahorro
              </p>
              {tips.map((tip) => (
                <div
                  key={tip.category}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-slate-600">{tip.suggestion}</p>
                  </div>
                  <span className="text-xs font-bold text-green-600 whitespace-nowrap">
                    {formatSoles(tip.potential_saving)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Total saving */}
          {totalSaving > 0 && (
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3 mt-2"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
            >
              <span className="text-sm font-semibold text-green-700">
                Ahorro potencial total
              </span>
              <span className="text-base font-bold text-green-700">
                {formatSoles(totalSaving)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/proyecciones/recommendations-section.tsx
git commit -m "feat: add RecommendationsSection component"
```

---

## Task 13: Actualizar Index de Exportaciones

**Files:**
- Modify: `components/proyecciones/index.ts`

- [ ] **Step 1: Leer el archivo actual**

Leer `components/proyecciones/index.ts` para ver los exports existentes.

- [ ] **Step 2: Agregar los nuevos exports**

Agregar al final del archivo:
```typescript
export { PredictionSection } from './prediction-section'
export { RisksSection } from './risks-section'
export { RecommendationsSection } from './recommendations-section'
```

- [ ] **Step 3: Commit**

```bash
git add components/proyecciones/index.ts
git commit -m "feat: export new ML section components from proyecciones index"
```

---

## Task 14: Rediseñar app/proyecciones/page.tsx

**Files:**
- Modify: `app/proyecciones/page.tsx`

- [ ] **Step 1: Leer el archivo actual para ver qué se elimina**

Leer `app/proyecciones/page.tsx` completamente.

- [ ] **Step 2: Reemplazar page.tsx**

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { PredictionSection } from '@/components/proyecciones/prediction-section'
import { RisksSection } from '@/components/proyecciones/risks-section'
import { RecommendationsSection } from '@/components/proyecciones/recommendations-section'

interface CategoryPrediction {
  category: string
  amount: number
  type: 'fixed' | 'variable'
}

interface PredictionData {
  total: number
  by_category: CategoryPrediction[]
}

interface Risk {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

interface Alert {
  priority: number
  message: string
  triggered_by: string
}

interface Tip {
  category: string
  suggestion: string
  potential_saving: number
}

interface MLResponse {
  mode: 'ml' | 'heuristic'
  generated_at: string
  prediction: {
    next_7_days: PredictionData
    next_30_days: PredictionData
  }
  risks: Risk[]
  recommendations: {
    alerts: Alert[]
    tips: Tip[]
  }
}

const EMPTY_PREDICTION: PredictionData = { total: 0, by_category: [] }
const EMPTY_ML: MLResponse = {
  mode: 'heuristic',
  generated_at: '',
  prediction: { next_7_days: EMPTY_PREDICTION, next_30_days: EMPTY_PREDICTION },
  risks: [],
  recommendations: { alerts: [], tips: [] },
}

export default function ProyeccionesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<MLResponse>(EMPTY_ML)

  const fetchML = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch('/api/ml/predict', { method: 'POST' })
      if (!res.ok) throw new Error('ML unavailable')
      const json: MLResponse = await res.json()
      setData(json)
    } catch {
      setError(true)
      setData(EMPTY_ML)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchML()
  }, [fetchML])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin" />
        <p className="text-sm text-slate-500">Analizando tus patrones financieros...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] px-8 pt-7 pb-8">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-[#0F172A] tracking-tight">
            Proyecciones
          </h1>
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Servicio ML no disponible — mostrando análisis básico
              </span>
            )}
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: data.mode === 'ml' ? '#EFF6FF' : '#F1F5F9',
                color: data.mode === 'ml' ? '#1D4ED8' : '#64748B',
              }}
            >
              {data.mode === 'ml' ? 'ML Activo' : 'Análisis Básico'}
            </span>
          </div>
        </div>
        <div className="flex gap-6 border-b border-gray-200 mt-4">
          <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-3 px-1">
            Mis gastos
          </button>
        </div>
      </div>

      {/* 3-column grid on large screens, stacked on small */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Predicción — left, wider */}
        <div className="lg:col-span-5">
          <PredictionSection
            next7Days={data.prediction.next_7_days}
            next30Days={data.prediction.next_30_days}
            mode={data.mode}
          />
        </div>

        {/* Riesgos — center */}
        <div className="lg:col-span-4">
          <RisksSection risks={data.risks} />
        </div>

        {/* Recomendaciones — right */}
        <div className="lg:col-span-3">
          <RecommendationsSection
            alerts={data.recommendations.alerts}
            tips={data.recommendations.tips}
          />
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar que la app compila**

```bash
cd C:/Users/gonza/Documentos/GitHub/FINZA_APP
pnpm build
```

Esperado: build exitoso sin errores de TypeScript.

- [ ] **Step 4: Commit final**

```bash
git add app/proyecciones/page.tsx components/proyecciones/index.ts
git commit -m "feat: redesign proyecciones page with 3 ML sections"
```

---

## Verificación Final

- [ ] Correr suite Python completa: `cd ml-service && pytest tests/ -v` → 19 passed
- [ ] Iniciar dev server: `pnpm dev`
- [ ] Abrir `/proyecciones` → spinner aparece → secciones cargan
- [ ] Con ML service local activo (`uvicorn main:app --port 8000`): badge muestra "ML Activo"
- [ ] Sin ML service: badge muestra "Servicio ML no disponible" y la UI no se rompe
