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
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], utc=True).dt.tz_localize(None)
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
    return tips[:3]


def _build_recommendation_training_data(
    expenses: pd.DataFrame,
    categories: list[dict],
) -> tuple[pd.DataFrame, pd.Series, dict]:
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
            target = max(0.0, hist_avg * 0.15)
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
