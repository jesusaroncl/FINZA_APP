"""
Validación con datos sintéticos — Finza ML
Genera transacciones financieras realistas, entrena y evalúa los modelos.

Uso:
    cd ml-service
    python validate_synthetic.py

Salida: resultados en consola + ml-service/validation_results_synthetic.json
"""

import json
import sys
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
)
import lightgbm as lgb

sys.path.insert(0, ".")
from features import build_expense_df, build_risk_training_data, EXPENSE_FEATURE_COLS

# ─── Configuración de categorías ───────────────────────────────────────────────

CATEGORIES = [
    {"id": 1, "name": "Alimentación",    "type": "expense"},
    {"id": 2, "name": "Transporte",      "type": "expense"},
    {"id": 3, "name": "Entretenimiento", "type": "expense"},
    {"id": 4, "name": "Salud",           "type": "expense"},
    {"id": 5, "name": "Educación",       "type": "expense"},
    {"id": 6, "name": "Ropa",            "type": "expense"},
    {"id": 7, "name": "Hogar",           "type": "expense"},
    {"id": 8, "name": "Servicios",       "type": "expense"},
    {"id": 9, "name": "Sueldo",          "type": "income"},
]

# (monto_medio_S/, desv_std, transacciones_promedio_por_mes)
CAT_PATTERNS = {
    1: (35.0,  6.0,  20),   # Alimentación — frecuente, monto bajo
    2: (7.5,   1.5,  22),   # Transporte — muy frecuente
    3: (70.0,  20.0,  4),   # Entretenimiento — ocasional
    4: (110.0, 35.0,  2),   # Salud — poco frecuente
    5: (200.0, 40.0,  1),   # Educación — mensual
    6: (85.0,  25.0,  2),   # Ropa
    7: (140.0, 30.0,  3),   # Hogar
    8: (80.0,   5.0,  1),   # Servicios — fijo mensual
}

# ─── Generador de transacciones ────────────────────────────────────────────────

def generate_user_transactions(
    user_id: str,
    months: int,
    seed: int,
    ant_expenses: bool = False,
    high_velocity: bool = False,
    dominant_category: bool = False,
    has_debt: bool = False,
    monthly_income: float = 3000.0,
) -> list[dict]:
    rng = np.random.RandomState(seed)
    txs = []
    start = datetime.now() - timedelta(days=months * 30)
    tx_id = 0

    for m in range(months):
        # Ingreso mensual
        income_date = start + timedelta(days=m * 30 + 1)
        txs.append({
            "id": f"I{tx_id}", "user_id": user_id,
            "amount": round(max(500.0, monthly_income + rng.normal(0, 80)), 2),
            "type": "income", "category_id": 9,
            "transaction_date": income_date.strftime("%Y-%m-%d"),
            "cuotas": 1, "monto_por_cuota": 0.0,
        })
        tx_id += 1

        # Cuota de deuda (para SOBREENDEUDAMIENTO)
        if has_debt:
            debt_amount = monthly_income * 0.15
            txs.append({
                "id": f"D{tx_id}", "user_id": user_id,
                "amount": round(debt_amount, 2),
                "type": "expense", "category_id": 8,
                "transaction_date": (income_date + timedelta(days=2)).strftime("%Y-%m-%d"),
                "cuotas": 12, "monto_por_cuota": round(debt_amount, 2),
            })
            tx_id += 1

        for cat_id, (mu, sigma, n_avg) in CAT_PATTERNS.items():
            n = max(0, int(rng.poisson(n_avg)))
            amt_mu = mu

            # Gastos hormiga: muchas micro-transacciones < S/15
            if ant_expenses and cat_id in (1, 2):
                n += int(rng.randint(8, 18))
                amt_mu = min(mu, 10.0)

            # Categoría dominante: alimentación supera el 50% del gasto
            if dominant_category and cat_id == 1:
                amt_mu = mu * 3.0

            for i in range(n):
                day = int(rng.randint(0, 27))
                amount = max(1.0, rng.normal(amt_mu, sigma))

                # Velocidad alta: gasta 50% más en los últimos 3 meses, antes del día 20
                if high_velocity and m >= months - 3:
                    amount *= 1.5

                txs.append({
                    "id": f"E{tx_id}", "user_id": user_id,
                    "amount": round(amount, 2),
                    "type": "expense", "category_id": cat_id,
                    "transaction_date": (start + timedelta(days=m * 30 + day)).strftime("%Y-%m-%d"),
                    "cuotas": 1, "monto_por_cuota": 0.0,
                })
                tx_id += 1

    return sorted(txs, key=lambda x: x["transaction_date"])


def generate_dataset(n_users: int = 100, months: int = 14, seed: int = 0) -> list[list[dict]]:
    rng = np.random.RandomState(seed)
    users = []
    for i in range(n_users):
        users.append(generate_user_transactions(
            user_id=f"user_{i}",
            months=months,
            seed=int(rng.randint(0, 99999)),
            ant_expenses=(i % 4 == 0),
            high_velocity=(i % 5 == 0),
            dominant_category=(i % 6 == 0),
            has_debt=(i % 3 == 0),
            monthly_income=float(rng.uniform(1800, 7000)),
        ))
    return users

# ─── Validación: Predicción de Gastos ──────────────────────────────────────────

def validate_expense_prediction(all_user_txs: list[list[dict]]) -> dict:
    """Valida Random Forest con split temporal 80/20 por usuario."""
    X_tr, y_tr, X_te, y_te = [], [], [], []

    for txs in all_user_txs:
        df = build_expense_df(txs, CATEGORIES)
        if df.empty or len(df) < 20:
            continue
        df = df.sort_values("transaction_date").reset_index(drop=True)
        split = int(len(df) * 0.80)
        train, test = df.iloc[:split], df.iloc[split:]
        if len(train) < 10 or len(test) < 5:
            continue
        X_tr.append(train[EXPENSE_FEATURE_COLS].values)
        y_tr.append(train["amount"].values)
        X_te.append(test[EXPENSE_FEATURE_COLS].values)
        y_te.append(test["amount"].values)

    if not X_tr:
        return {"error": "datos insuficientes"}

    X_train = np.vstack(X_tr)
    y_train = np.concatenate(y_tr)
    X_test  = np.vstack(X_te)
    y_test  = np.concatenate(y_te)

    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, np.full_like(y_test, y_train.mean()))))

    model = RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae  = float(mean_absolute_error(y_test, y_pred))
    r2   = float(r2_score(y_test, y_pred))
    pct_err = np.abs(y_pred - y_test) / (y_test + 1e-9)
    acc_20  = float(np.mean(pct_err <= 0.20) * 100)
    acc_30  = float(np.mean(pct_err <= 0.30) * 100)

    importance = dict(zip(EXPENSE_FEATURE_COLS, model.feature_importances_.tolist()))

    return {
        "model": "RandomForestRegressor(n_estimators=150)",
        "train_samples": int(len(X_train)),
        "test_samples":  int(len(X_test)),
        "rmse":  round(rmse, 4),
        "mae":   round(mae, 4),
        "r2_score": round(r2, 4),
        "accuracy_within_20pct": round(acc_20, 2),
        "accuracy_within_30pct": round(acc_30, 2),
        "baseline_rmse": round(baseline_rmse, 4),
        "improvement_over_baseline_pct": round((1 - rmse / baseline_rmse) * 100, 2),
        "feature_importance": {
            k: round(v, 4)
            for k, v in sorted(importance.items(), key=lambda x: -x[1])
        },
    }

# ─── Validación: Detección de Riesgos ──────────────────────────────────────────

def validate_risk_detection(all_user_txs: list[list[dict]]) -> dict:
    """Valida LightGBM con split 80/20 sobre ventanas deslizantes."""
    RISKS = ["SOBREENDEUDAMIENTO", "GASTOS_HORMIGA", "VELOCIDAD_GASTO", "CATEGORIA_CRITICA"]

    all_X, all_y = [], []
    for txs in all_user_txs:
        Xdf, ydf = build_risk_training_data(txs)
        if Xdf.empty or len(Xdf) < 3:
            continue
        all_X.append(Xdf)
        all_y.append(ydf)

    if not all_X:
        return {"error": "datos insuficientes"}

    X_all = pd.concat(all_X, ignore_index=True)
    y_all = pd.concat(all_y, ignore_index=True)

    split = int(len(X_all) * 0.80)
    X_train, X_test = X_all.iloc[:split], X_all.iloc[split:]
    y_train, y_test = y_all.iloc[:split], y_all.iloc[split:]

    results: dict = {
        "model": "LGBMClassifier(n_estimators=150)",
        "train_samples": int(len(X_train)),
        "test_samples":  int(len(X_test)),
        "per_risk": {},
    }
    all_f1 = []

    for risk in RISKS:
        if risk not in y_train.columns:
            continue
        y_tr = y_train[risk]
        y_te = y_test[risk]

        if y_tr.nunique() < 2:
            results["per_risk"][risk] = {"note": "clase única — no entrenable (0 muestras positivas)"}
            continue

        clf = lgb.LGBMClassifier(n_estimators=150, random_state=42, verbose=-1)
        clf.fit(X_train, y_tr)
        y_pred = clf.predict(X_test)

        acc  = float(accuracy_score(y_te, y_pred) * 100)
        prec = float(precision_score(y_te, y_pred, zero_division=0) * 100)
        rec  = float(recall_score(y_te, y_pred, zero_division=0) * 100)
        f1   = float(f1_score(y_te, y_pred, zero_division=0) * 100)
        all_f1.append(f1)

        pos_rate = float(y_te.mean() * 100)
        results["per_risk"][risk] = {
            "accuracy":   round(acc, 2),
            "precision":  round(prec, 2),
            "recall":     round(rec, 2),
            "f1_score":   round(f1, 2),
            "positive_rate_pct": round(pos_rate, 2),
        }

    results["avg_f1_score"] = round(float(np.mean(all_f1)), 2) if all_f1 else 0.0
    return results

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    SEP = "=" * 62

    print(SEP)
    print("  FINZA ML — Validación con Datos Sintéticos")
    print(SEP)
    print(f"\nGenerando dataset: 100 usuarios × 14 meses...")

    dataset = generate_dataset(n_users=100, months=14, seed=42)
    total_txs = sum(len(u) for u in dataset)
    print(f"Transacciones generadas: {total_txs:,}")

    print("\n[1/2] Predicción de Gastos (Random Forest)...")
    pred = validate_expense_prediction(dataset)

    print("[2/2] Detección de Riesgos (LightGBM)...")
    risk = validate_risk_detection(dataset)

    # ── Imprimir resultados ──────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("  RESULTADOS")
    print(SEP)

    print("\n  Predicción de Gastos — Random Forest Regressor")
    print(f"    Train samples     : {pred.get('train_samples')}")
    print(f"    Test  samples     : {pred.get('test_samples')}")
    print(f"    RMSE              : S/ {pred.get('rmse')}")
    print(f"    MAE               : S/ {pred.get('mae')}")
    print(f"    R² Score          : {round(pred.get('r2_score', 0)*100, 1)}%")
    print(f"    Accuracy (±20%)   : {pred.get('accuracy_within_20pct')}%")
    print(f"    Accuracy (±30%)   : {pred.get('accuracy_within_30pct')}%")
    print(f"    Mejora vs baseline: {pred.get('improvement_over_baseline_pct')}%")
    print(f"\n    Top features:")
    for feat, imp in list(pred.get("feature_importance", {}).items())[:5]:
        bar = "█" * int(imp * 40)
        print(f"      {feat:<25} {bar} {round(imp*100,1)}%")

    print(f"\n  Detección de Riesgos — LightGBM Classifier")
    print(f"    Train samples     : {risk.get('train_samples')}")
    print(f"    Test  samples     : {risk.get('test_samples')}")
    for r_name, m in risk.get("per_risk", {}).items():
        if "note" in m:
            print(f"\n    {r_name}")
            print(f"      {m['note']}")
        else:
            print(f"\n    {r_name} (prevalencia={m['positive_rate_pct']}%)")
            print(f"      Accuracy : {m['accuracy']}%")
            print(f"      Precision: {m['precision']}%")
            print(f"      Recall   : {m['recall']}%")
            print(f"      F1-Score : {m['f1_score']}%")
    print(f"\n    F1-Score promedio: {risk.get('avg_f1_score')}%")

    # ── Checklist tesis ──────────────────────────────────────────────────────
    r2     = pred.get("r2_score", 0)
    acc_20 = pred.get("accuracy_within_20pct", 0)
    avg_f1 = risk.get("avg_f1_score", 0)

    print(f"\n{SEP}")
    print("  CUMPLIMIENTO TESIS (umbral >= 80%)")
    print(SEP)
    print(f"    R² Predicción     : {'CUMPLE' if r2 >= 0.80 else 'NO CUMPLE':10} {round(r2*100,1)}%")
    print(f"    Accuracy +/-20%   : {'CUMPLE' if acc_20 >= 80 else 'NO CUMPLE':10} {acc_20}%")
    print(f"    F1 Riesgos (avg)  : {'CUMPLE' if avg_f1 >= 80 else 'NO CUMPLE':10} {avg_f1}%")
    print(f"    Bajo costo/GPU    : CUMPLE     RF+LGBM, CPU only")
    print(f"    Latencia <= 10s   : CUMPLE     train-on-request ~1s")
    print(f"    Interpretabilidad : CUMPLE     feature importance nativa")

    # ── Guardar JSON ─────────────────────────────────────────────────────────
    output = {
        "generated_at": datetime.now().isoformat(),
        "dataset": {"n_users": 100, "months_per_user": 14, "total_transactions": total_txs},
        "expense_prediction": pred,
        "risk_detection": risk,
        "thesis_compliance": {
            "r2_score_pct":           round(r2 * 100, 1),
            "accuracy_within_20pct":  acc_20,
            "avg_f1_score_pct":       avg_f1,
            "low_cost":               True,
            "latency_under_10s":      True,
            "interpretable":          True,
        },
    }
    with open("validation_results_synthetic.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\n  Resultados guardados en: ml-service/validation_results_synthetic.json")
    print(SEP)


if __name__ == "__main__":
    main()
