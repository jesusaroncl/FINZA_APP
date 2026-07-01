# ML Prediction — LightGBM Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the window-sum fallback in `predict_expenses()` with a real LightGBM regression model that learns per-user spending trends per category.

**Architecture:** Aggregate raw expense transactions to daily totals per category, build sliding-window (X, y) training pairs from the user's own history, train two LightGBM regressors (7-day and 30-day horizons), and infer on current features. Fall back to the existing window-sum approach when history is insufficient.

**Tech Stack:** Python 3.12, LightGBM 4.5 (already installed), pandas 2.2, numpy 1.26, pytest 8.3

## Global Constraints

- Python 3.12
- LightGBM already in `requirements.txt` — no new dependencies
- API response format unchanged: `{ next_7_days: { total, by_category: [{category, amount, type}] }, next_30_days: ... }`
- `main.py` must not be modified
- All tests run from `ml-service/` directory: `cd ml-service && pytest tests/ -v`
- Minimum training samples constant: `MIN_TRAIN_SAMPLES = 10`
- L1 (MAE) loss for LightGBM — robust to spending spikes
- Predictions clipped to `min=0` — never negative

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `ml-service/features.py` | Modify | Add `build_prediction_df()` — daily aggregation + feature engineering |
| `ml-service/model_prediction.py` | Rewrite | LightGBM train+infer loop + fallback |
| `ml-service/tests/test_features.py` | Modify | Add tests for `build_prediction_df()` |
| `ml-service/tests/test_prediction.py` | Modify | Update tests to cover LightGBM path + fallback |

---

### Task 1: `build_prediction_df()` in features.py

**Files:**
- Modify: `ml-service/features.py` (append after existing functions)
- Modify: `ml-service/tests/test_features.py` (add new test class)

**Interfaces:**
- Produces: `build_prediction_df(expense_df: pd.DataFrame, categories: list[dict]) -> pd.DataFrame`
  - Input `expense_df`: columns `amount` (float), `category_id` (str), `transaction_date` (datetime, tz-naive) — same as output of `build_expense_df()`
  - Output columns: `date`, `category_id`, `daily_amount`, `category_encoded`, `rolling_7d_cat`, `rolling_30d_cat`, `rolling_7d_total`, `day_of_month`, `month`, `days_since_last_cat`, `cat_monthly_trend`

- [ ] **Step 1: Write the failing tests**

Add to `ml-service/tests/test_features.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from features import build_prediction_df

CATS = [
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
        for cat in CATS:
            if rng.random() > 0.3:
                rows.append({
                    "amount": float(rng.uniform(10, 100)),
                    "category_id": cat["id"],
                    "transaction_date": pd.Timestamp(d),
                })
    return pd.DataFrame(rows)


# --- build_prediction_df tests ---

def test_build_prediction_df_empty_returns_empty():
    result = build_prediction_df(pd.DataFrame(), CATS)
    assert result.empty


def test_build_prediction_df_columns():
    df = _make_expense_df(60)
    result = build_prediction_df(df, CATS)
    required = {
        "date", "category_id", "daily_amount",
        "category_encoded", "rolling_7d_cat", "rolling_30d_cat",
        "rolling_7d_total", "day_of_month", "month",
        "days_since_last_cat", "cat_monthly_trend",
    }
    assert required.issubset(set(result.columns))


def test_build_prediction_df_rolling_7d_cat_nonnegative():
    df = _make_expense_df(60)
    result = build_prediction_df(df, CATS)
    assert (result["rolling_7d_cat"] >= 0).all()
    assert (result["rolling_30d_cat"] >= 0).all()
    assert (result["rolling_7d_total"] >= 0).all()


def test_build_prediction_df_category_encoded_valid():
    df = _make_expense_df(60)
    result = build_prediction_df(df, CATS)
    # category_encoded should be 0 or 1 (index in CATS list)
    assert set(result["category_encoded"].unique()).issubset({0, 1, -1})


def test_build_prediction_df_day_of_month_range():
    df = _make_expense_df(60)
    result = build_prediction_df(df, CATS)
    assert result["day_of_month"].between(1, 31).all()
    assert result["month"].between(1, 12).all()


def test_build_prediction_df_trend_is_zero_single_month():
    """Single month of data → cat_monthly_trend must be 0."""
    rows = [
        {"amount": 50.0, "category_id": "food", "transaction_date": pd.Timestamp(datetime.now() - timedelta(days=i))}
        for i in range(15)
    ]
    df = pd.DataFrame(rows)
    result = build_prediction_df(df, CATS)
    food_rows = result[result["category_id"] == "food"]
    assert (food_rows["cat_monthly_trend"] == 0.0).all()
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ml-service && pytest tests/test_features.py -k "build_prediction_df" -v
```

Expected: `AttributeError` or `ImportError` — `build_prediction_df` not defined yet.

- [ ] **Step 3: Implement `build_prediction_df` in `features.py`**

Append this function at the end of `ml-service/features.py` (after `_zero_risk_features`):

```python
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
    def _cat_features(group: pd.DataFrame) -> pd.DataFrame:
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
        return g

    daily = daily.groupby("category_id", group_keys=False).apply(_cat_features)
    daily = daily.merge(total_daily[["date", "rolling_7d_total"]], on="date", how="left")
    daily["rolling_7d_total"] = daily["rolling_7d_total"].fillna(0)

    return daily.sort_values(["date", "category_id"]).reset_index(drop=True)
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd ml-service && pytest tests/test_features.py -k "build_prediction_df" -v
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ml-service && git add features.py tests/test_features.py
git commit -m "feat: add build_prediction_df for daily category aggregation"
```

---

### Task 2: Rewrite `predict_expenses()` with LightGBM

**Files:**
- Rewrite: `ml-service/model_prediction.py`
- Modify: `ml-service/tests/test_prediction.py`

**Interfaces:**
- Consumes: `build_prediction_df(expense_df, categories)` from Task 1
- Consumes: `build_expense_df(transactions, categories)` from existing `features.py`
- Produces: `predict_expenses(df: pd.DataFrame, categories: list[dict]) -> dict`
  - Same return signature as before: `{ "next_7_days": { "total": float, "by_category": [...] }, "next_30_days": { ... } }`

- [ ] **Step 1: Update tests in `test_prediction.py`**

Replace the entire contents of `ml-service/tests/test_prediction.py` with:

```python
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
    """LightGBM predictions should be within 10x of average daily spend * horizon."""
    df = build_expense_df(TRANSACTIONS_90, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    # Average daily spend is ~50 soles/category → 7d ≈ 350 max reasonable
    assert result["next_7_days"]["total"] < 10_000
    assert result["next_30_days"]["total"] < 50_000


def test_lgbm_path_30d_gte_7d():
    df = build_expense_df(TRANSACTIONS_90, CATEGORIES)
    result = predict_expenses(df, CATEGORIES)
    assert result["next_30_days"]["total"] >= result["next_7_days"]["total"]
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ml-service && pytest tests/test_prediction.py -v
```

Expected: Most tests FAIL because `predict_expenses` still uses the old window-sum logic (no LightGBM). Note which tests pass or fail.

- [ ] **Step 3: Rewrite `model_prediction.py`**

Replace the entire file `ml-service/model_prediction.py` with:

```python
import numpy as np
import pandas as pd
import lightgbm as lgb
from datetime import datetime, timedelta
from features import build_prediction_df

PRED_FEATURE_COLS = [
    "rolling_7d_cat", "rolling_30d_cat", "rolling_7d_total",
    "day_of_month", "month", "days_since_last_cat",
    "cat_monthly_trend", "category_encoded",
]

MIN_TRAIN_SAMPLES = 10

_LGBM_PARAMS = dict(
    objective="regression_l1",
    num_leaves=8,
    min_child_samples=3,
    n_estimators=100,
    learning_rate=0.05,
    verbosity=-1,
)


def predict_expenses(df: pd.DataFrame, categories: list[dict]) -> dict:
    """
    Train LightGBM regressors on historical daily spending per category
    and predict spending for the next 7 and 30 days.

    Falls back to window-sum heuristic when insufficient training data.
    """
    if df.empty or len(df) < 10:
        return _empty_prediction()

    feature_df = df[["amount", "category_id", "transaction_date"]].dropna()
    if len(feature_df) < 10:
        return _empty_prediction()

    daily = build_prediction_df(feature_df, categories)
    if daily.empty:
        return _empty_prediction()

    # Build sliding-window training samples
    max_date = daily["date"].max()
    X_7, y_7, X_30, y_30 = [], [], [], []

    for cat_id, cat_group in daily.groupby("category_id"):
        cat_group = cat_group.sort_values("date")
        for _, row in cat_group.iterrows():
            d = row["date"]
            feat = {col: float(row.get(col, 0)) for col in PRED_FEATURE_COLS}

            end_7 = d + pd.Timedelta(days=7)
            if end_7 <= max_date:
                future = cat_group[(cat_group["date"] > d) & (cat_group["date"] <= end_7)]
                X_7.append(feat)
                y_7.append(float(future["daily_amount"].sum()))

            end_30 = d + pd.Timedelta(days=30)
            if end_30 <= max_date:
                future = cat_group[(cat_group["date"] > d) & (cat_group["date"] <= end_30)]
                X_30.append(feat)
                y_30.append(float(future["daily_amount"].sum()))

    if len(X_7) < MIN_TRAIN_SAMPLES:
        return _window_sum_fallback(feature_df, categories)

    X_7_df = pd.DataFrame(X_7)[PRED_FEATURE_COLS].fillna(0)
    model_7d = lgb.LGBMRegressor(**_LGBM_PARAMS)
    model_7d.fit(X_7_df, y_7)

    model_30d = None
    if len(X_30) >= MIN_TRAIN_SAMPLES:
        X_30_df = pd.DataFrame(X_30)[PRED_FEATURE_COLS].fillna(0)
        model_30d = lgb.LGBMRegressor(**_LGBM_PARAMS)
        model_30d.fit(X_30_df, y_30)

    # Inference: latest row per category = current features
    predictions_7d: list[dict] = []
    predictions_30d: list[dict] = []

    for cat in categories:
        cat_rows = daily[daily["category_id"] == cat["id"]]
        if cat_rows.empty:
            continue

        current = cat_rows.sort_values("date").iloc[-1]
        feat_vec = pd.DataFrame(
            [{col: float(current.get(col, 0)) for col in PRED_FEATURE_COLS}]
        ).fillna(0)

        pred_7 = float(max(0.0, model_7d.predict(feat_vec)[0]))
        if pred_7 > 0:
            predictions_7d.append({
                "category": cat["name"],
                "amount": round(pred_7, 2),
                "type": _tx_type(cat_rows),
            })

        if model_30d is not None:
            pred_30 = float(max(0.0, model_30d.predict(feat_vec)[0]))
            if pred_30 > 0:
                predictions_30d.append({
                    "category": cat["name"],
                    "amount": round(pred_30, 2),
                    "type": _tx_type(cat_rows),
                })

    # 30d model didn't train → scale from 7d predictions
    if not predictions_30d and predictions_7d:
        predictions_30d = [
            {**p, "amount": round(p["amount"] / 7 * 30, 2)} for p in predictions_7d
        ]

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


def _tx_type(cat_rows: pd.DataFrame) -> str:
    cv = cat_rows["daily_amount"].std() / (cat_rows["daily_amount"].mean() + 1e-9)
    return "fixed" if cv < 0.3 else "variable"


def _window_sum_fallback(feature_df: pd.DataFrame, categories: list[dict]) -> dict:
    """Fallback when insufficient training windows."""
    now = datetime.now()
    last_7  = pd.Timestamp(now - timedelta(days=7))
    last_30 = pd.Timestamp(now - timedelta(days=30))
    last_90 = pd.Timestamp(now - timedelta(days=90))

    predictions_7d: list[dict] = []
    predictions_30d: list[dict] = []

    for cat in categories:
        cat_df = feature_df[feature_df["category_id"] == cat["id"]]
        if cat_df.empty:
            continue

        r7  = cat_df[cat_df["transaction_date"] >= last_7]
        r30 = cat_df[cat_df["transaction_date"] >= last_30]
        r90 = cat_df[cat_df["transaction_date"] >= last_90]

        if not r7.empty:
            total_7 = round(float(r7["amount"].sum()), 2)
        elif not r30.empty:
            total_7 = round(float(r30["amount"].sum()) / 30.0 * 7, 2)
        else:
            dr = max((cat_df["transaction_date"].max() - cat_df["transaction_date"].min()).days, 1)
            total_7 = round(float(cat_df["amount"].sum()) / dr * 7, 2)

        if not r30.empty:
            total_30 = round(float(r30["amount"].sum()), 2)
        elif not r90.empty:
            total_30 = round(float(r90["amount"].sum()) / 90.0 * 30, 2)
        else:
            dr = max((cat_df["transaction_date"].max() - cat_df["transaction_date"].min()).days, 1)
            total_30 = round(float(cat_df["amount"].sum()) / dr * 30, 2)

        cv = cat_df["amount"].std() / (cat_df["amount"].mean() + 1e-9)
        tx_type = "fixed" if cv < 0.3 else "variable"

        if total_7 > 0:
            predictions_7d.append({"category": cat["name"], "amount": total_7, "type": tx_type})
        if total_30 > 0:
            predictions_30d.append({"category": cat["name"], "amount": total_30, "type": tx_type})

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

- [ ] **Step 4: Run all tests**

```bash
cd ml-service && pytest tests/ -v
```

Expected: All tests PASS. If `test_lgbm_path_30d_gte_7d` fails, verify the 30d fallback (`/ 7 * 30`) is in place.

- [ ] **Step 5: Commit**

```bash
cd ml-service && git add model_prediction.py tests/test_prediction.py
git commit -m "feat: replace window-sum with LightGBM regression for expense prediction"
```

---

## Post-Implementation

Push changes and trigger redeploy on Render:

```bash
git push
```

Then in Render dashboard: service `finza-app` → **Manual Deploy** → **Deploy latest commit**.

Verify the `/predict` endpoint returns reasonable values by calling it directly:

```bash
curl -X POST https://finza-app.onrender.com/predict \
  -H "Authorization: Bearer <your_token>" | python -m json.tool
```

Expected: `next_7_days.total` reflects actual recent spending, not an inflated estimate.
