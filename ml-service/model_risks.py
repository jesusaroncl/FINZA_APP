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
            severity = _get_severity(score)
            description = RISK_DESCRIPTIONS[risk_type](current_feats)
            risks.append({
                "type": risk_type,
                "severity": severity,
                "description": description,
            })

    order = {"high": 0, "medium": 1, "low": 2}
    risks.sort(key=lambda r: order[r["severity"]])
    return risks


def _score_risk(
    risk_type: str,
    current_feats: dict,
    X_train: pd.DataFrame,
    y_train: pd.DataFrame,
) -> float:
    if X_train.empty or y_train.empty or len(X_train) < 10:
        return _rule_based_score(risk_type, current_feats)

    label_col = y_train[risk_type]
    if label_col.nunique() < 2:
        return _rule_based_score(risk_type, current_feats)

    feature_cols = [c for c in RISK_FEATURE_COLS if c in X_train.columns]
    X = X_train[feature_cols].fillna(0).values
    y = label_col.values

    model = lgb.LGBMClassifier(
        objective="binary",
        metric="binary_logloss",
        num_leaves=4,
        min_child_samples=2,
        n_estimators=50,
        learning_rate=0.1,
        verbosity=-1,
    )
    model.fit(X, y)

    current_row = np.array(
        [current_feats.get(c, 0.0) for c in feature_cols], dtype=float
    ).reshape(1, -1)
    return float(model.predict_proba(current_row)[0][1])


def _rule_based_score(risk_type: str, feats: dict) -> float:
    if risk_type == "SOBREENDEUDAMIENTO":
        return min(feats["cuotas_to_income_ratio"] / 0.3, 1.0)
    if risk_type == "GASTOS_HORMIGA":
        return min(feats["small_tx_count_7d"] / 10.0, 1.0)
    if risk_type == "VELOCIDAD_GASTO":
        if feats["days_elapsed_month"] < 20:
            # Score 0.5 only when velocity clearly exceeds 100% of historical avg
            return min(feats["expense_velocity"] / 1.0, 1.0) * 0.6
        return 0.0
    if risk_type == "CATEGORIA_CRITICA":
        return min(feats["top_category_share"] / 0.5, 1.0)
    return 0.0


def _get_severity(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"
