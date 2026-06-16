"""
Validación con dataset real — Finza ML
Transforma cualquier CSV de transacciones al formato Finza y evalúa los modelos.

Uso básico (con columna de tipo):
    cd ml-service
    python validate_real_data.py \
        --file dataset.csv \
        --date-col "Date" \
        --amount-col "Amount" \
        --category-col "Category" \
        --type-col "Type" \
        --type-expense "debit" \
        --type-income "credit"

Uso sin columna tipo (todo son gastos):
    python validate_real_data.py \
        --file dataset.csv \
        --date-col "Date" --amount-col "Amount" --category-col "Category" \
        --all-expenses

Para ver columnas disponibles en el CSV:
    python validate_real_data.py --file dataset.csv --inspect
"""

import argparse
import json
import sys
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from datetime import datetime

sys.path.insert(0, ".")
from validate_synthetic import (
    validate_expense_prediction,
    validate_risk_detection,
    CATEGORIES,
)

DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
    "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y",
    "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S",
]


def _parse_date(val: str) -> str | None:
    s = str(val).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _parse_amount(val) -> float | None:
    try:
        cleaned = str(val).replace(",", ".").replace("$", "").replace("S/", "").replace(" ", "").strip()
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def inspect_csv(file_path: str) -> None:
    df = pd.read_csv(file_path, nrows=5)
    print(f"\nColumnas disponibles ({len(df.columns)}):")
    for col in df.columns:
        sample = df[col].dropna().iloc[0] if not df[col].dropna().empty else "N/A"
        print(f"  '{col}' — ejemplo: {sample}")
    print(f"\nTotal filas: {len(pd.read_csv(file_path))}")


def load_and_transform(
    file_path: str,
    date_col: str,
    amount_col: str,
    category_col: str,
    type_col: str | None,
    expense_val: str,
    income_val: str,
    all_expenses: bool,
    user_col: str | None = None,
) -> tuple[list[list[dict]], list[dict]]:
    df = pd.read_csv(file_path)
    print(f"CSV cargado: {len(df):,} filas")

    missing = [c for c in [date_col, amount_col, category_col] if c not in df.columns]
    if missing:
        print(f"\nERROR: columnas no encontradas: {missing}")
        print(f"Columnas disponibles: {list(df.columns)}")
        print("Usa --inspect para ver el CSV antes de transformar.")
        sys.exit(1)

    # Construir mapa de categorías
    unique_cats = df[category_col].dropna().astype(str).unique()
    cat_map = {name: i + 1 for i, name in enumerate(sorted(unique_cats))}
    categories = [
        {"id": cat_id, "name": name, "type": "expense"}
        for name, cat_id in cat_map.items()
    ]

    skipped = 0
    rows: list[dict] = []

    for idx, row in df.iterrows():
        date_str = _parse_date(row[date_col])
        if not date_str:
            skipped += 1
            continue

        amount = _parse_amount(row[amount_col])
        if amount is None or amount <= 0:
            skipped += 1
            continue

        if all_expenses:
            tx_type = "expense"
        elif type_col and type_col in df.columns:
            raw = str(row[type_col]).strip().lower()
            if raw == expense_val.lower():
                tx_type = "expense"
            elif raw == income_val.lower():
                tx_type = "income"
            else:
                skipped += 1
                continue
        else:
            tx_type = "expense"

        cat_name = str(row[category_col]).strip() if pd.notna(row[category_col]) else "Otros"
        if cat_name not in cat_map:
            cat_map[cat_name] = len(cat_map) + 1
            categories.append({"id": cat_map[cat_name], "name": cat_name, "type": tx_type})

        user_id = str(row[user_col]).strip() if user_col and user_col in df.columns else "user_0"

        rows.append({
            "id": str(idx),
            "user_id": user_id,
            "amount": amount,
            "type": tx_type,
            "category_id": cat_map[cat_name],
            "transaction_date": date_str,
            "cuotas": 1,
            "monto_por_cuota": 0.0,
        })

    print(f"Transacciones válidas: {len(rows):,} (omitidas: {skipped})")
    print(f"Categorías detectadas: {len(categories)}")

    # Agrupar por usuario
    if user_col:
        user_groups: dict[str, list[dict]] = {}
        for tx in rows:
            uid = tx["user_id"]
            user_groups.setdefault(uid, []).append(tx)
        all_user_txs = list(user_groups.values())
        print(f"Usuarios detectados : {len(all_user_txs)}")
    else:
        all_user_txs = [rows]

    return all_user_txs, categories


def main():
    parser = argparse.ArgumentParser(description="Validar modelos Finza ML con dataset real")
    parser.add_argument("--file",         required=True,  help="Ruta al archivo CSV")
    parser.add_argument("--date-col",     default=None,   help="Columna de fecha")
    parser.add_argument("--amount-col",   default=None,   help="Columna de monto")
    parser.add_argument("--category-col", default=None,   help="Columna de categoría")
    parser.add_argument("--type-col",     default=None,   help="Columna de tipo (gasto/ingreso)")
    parser.add_argument("--type-expense", default="expense", help="Valor para gastos en type-col")
    parser.add_argument("--type-income",  default="income",  help="Valor para ingresos en type-col")
    parser.add_argument("--user-col",     default=None,   help="Columna de user_id (si el CSV es multi-usuario)")
    parser.add_argument("--all-expenses", action="store_true", help="Tratar todas las filas como gastos")
    parser.add_argument("--inspect",      action="store_true", help="Solo mostrar columnas del CSV y salir")
    args = parser.parse_args()

    if args.inspect:
        inspect_csv(args.file)
        return

    if not args.date_col or not args.amount_col or not args.category_col:
        print("ERROR: debes indicar --date-col, --amount-col y --category-col")
        print("Usa --inspect primero para ver las columnas disponibles.")
        sys.exit(1)

    SEP = "=" * 62
    print(SEP)
    print("  FINZA ML — Validación con Dataset Real")
    print(SEP)

    all_user_txs, categories = load_and_transform(
        file_path=args.file,
        date_col=args.date_col,
        amount_col=args.amount_col,
        category_col=args.category_col,
        type_col=args.type_col,
        expense_val=args.type_expense,
        income_val=args.type_income,
        all_expenses=args.all_expenses,
        user_col=args.user_col,
    )

    total_txs = sum(len(u) for u in all_user_txs)
    if total_txs < 50:
        print("\nERROR: dataset muy pequeño (< 50 transacciones). Agrega más datos.")
        sys.exit(1)

    print(f"\n[1/2] Predicción de Gastos (Random Forest)...")
    pred = validate_expense_prediction(all_user_txs)

    print("[2/2] Detección de Riesgos (LightGBM)...")
    risk = validate_risk_detection(all_user_txs)

    # ── Imprimir resultados ──────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("  RESULTADOS")
    print(SEP)

    print("\n  Predicción de Gastos — Random Forest Regressor")
    print(f"    Train samples     : {pred.get('train_samples')}")
    print(f"    Test  samples     : {pred.get('test_samples')}")
    print(f"    RMSE              : {pred.get('rmse')}")
    print(f"    MAE               : {pred.get('mae')}")
    print(f"    R² Score          : {round(pred.get('r2_score', 0)*100, 1)}%")
    print(f"    Accuracy (±20%)   : {pred.get('accuracy_within_20pct')}%")
    print(f"    Accuracy (±30%)   : {pred.get('accuracy_within_30pct')}%")
    print(f"    Mejora vs baseline: {pred.get('improvement_over_baseline_pct')}%")

    print(f"\n  Detección de Riesgos — LightGBM Classifier")
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

    # ── Guardar JSON ─────────────────────────────────────────────────────────
    output = {
        "generated_at": datetime.now().isoformat(),
        "source": args.file,
        "dataset": {
            "total_transactions": total_txs,
            "n_users": len(all_user_txs),
            "n_categories": len(categories),
        },
        "expense_prediction": pred,
        "risk_detection": risk,
        "thesis_compliance": {
            "r2_score_pct":          round(r2 * 100, 1),
            "accuracy_within_20pct": acc_20,
            "avg_f1_score_pct":      avg_f1,
        },
    }
    out_file = "validation_results_real.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\n  Resultados guardados en: ml-service/{out_file}")
    print(SEP)


if __name__ == "__main__":
    main()
