# ML Prediction — LightGBM Regression Design

**Date**: 2026-07-01
**Scope**: `ml-service/model_prediction.py`, `ml-service/features.py`
**Goal**: Replace simple historical window sums with a real LightGBM regression model that learns per-user spending patterns.

---

## Problem

The current `predict_expenses()` just sums actual spending from the last 7/30 days and returns it as the prediction. This doesn't capture:
- Trend (is spending increasing or decreasing over time?)
- Seasonality (do they spend more at certain times of month?)
- Category-specific patterns (rent on day 1, food daily, etc.)

---

## Approach: LightGBM Regression with Sliding Window Self-Supervision

Same pattern as `model_risks.py`: train on the user's own historical data using sliding windows, then infer on the current state.

Two separate LightGBM regressors:
- `model_7d`: predicts total category spending for the next 7 days
- `model_30d`: predicts total category spending for the next 30 days

---

## Data Layer

Aggregate raw transactions to **daily totals per category**:

```
date       | category_id    | amount
2025-06-01 | alimentacion   | 45.00
2025-06-01 | transporte     | 12.00
2025-06-02 | alimentacion   | 38.50
```

This creates a sparse time series. Days with no spend in a category = 0.

---

## Feature Engineering

For each day D and each category C, build the following vector:

| Feature | Description |
|---|---|
| `rolling_7d_cat` | Sum of spending in category C in the 7 days before D |
| `rolling_30d_cat` | Sum of spending in category C in the 30 days before D |
| `rolling_7d_total` | Total spend (all categories) in the 7 days before D |
| `day_of_month` | Day number 1-31 — captures rent/salary timing |
| `month` | Month 1-12 — annual seasonality |
| `days_since_last_cat` | Days since last transaction in category C before D |
| `cat_monthly_trend` | Linear slope of monthly totals for C (positive = increasing); 0 if < 2 months of data |
| `category_encoded` | Integer encoding of category_id |

**Targets**:
- `y_7d` = sum of spending in category C from D+1 to D+7
- `y_30d` = sum of spending in category C from D+1 to D+30

---

## Sliding Window Training

For each day D in the user's history (stepping 1 day at a time):
1. Compute features vector from data up to and including D
2. Compute target from data D+1 to D+7 (or D+30)
3. Only include sample if D+7 (or D+30) <= max_date (we need ground truth)

This generates N samples where N ≈ (history_days - 37) per category.

**Minimum requirement**: 10 training samples across all categories.
If < 10 samples → fall back to current window-sum approach.

---

## Model Configuration

```python
lgb.LGBMRegressor(
    objective="regression_l1",  # MAE — robust to outliers/spikes
    num_leaves=8,               # small model, avoids overfitting
    min_child_samples=3,
    n_estimators=100,
    learning_rate=0.05,
    verbosity=-1,
)
```

L1 (MAE) loss is preferred over L2 (MSE) because expense data has occasional large outliers (cuotas, one-time purchases) that would distort an MSE model.

---

## Inference Flow

1. Compute current feature vector for each category (using all available history up to today)
2. `predicted_7d[cat] = model_7d.predict(features[cat]).clip(min=0)`
3. `predicted_30d[cat] = model_30d.predict(features[cat]).clip(min=0)`
4. Filter categories where prediction > 0
5. Sort by amount descending
6. Sum for totals

---

## Fallback Chain

```
Enough training windows (≥ 10)?
  YES → LightGBM prediction
  NO  → window sum (last 7d actual / last 30d actual with rate fallbacks)
```

The fallback logic from the current `model_prediction.py` is preserved as-is.

---

## Files Changed

| File | Change |
|---|---|
| `features.py` | Add `build_prediction_df()` — returns daily_cat_df with all features |
| `model_prediction.py` | Replace window-sum logic with LightGBM train+infer flow |

**No changes to**: `main.py`, `model_risks.py`, `model_recommendations.py`, `requirements.txt`, frontend.

The API response format is identical — only the prediction values change.

---

## Success Criteria

- Predictions reflect actual spending trends (not just last-period totals)
- Model correctly predicts lower amounts when spending has been declining
- Model predicts higher amounts when recent spending velocity is elevated
- Graceful fallback when user has insufficient history
- No changes to API contract or frontend required
