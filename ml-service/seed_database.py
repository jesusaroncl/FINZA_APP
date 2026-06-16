"""
Seed de base de datos Supabase — Finza
Inserta categorías y transacciones sintéticas realistas para probar el ML.

Uso:
    cd ml-service
    python seed_database.py --list-users          # ver usuarios disponibles
    python seed_database.py --user-id <UUID>      # insertar data para ese usuario
    python seed_database.py --user-id <UUID> --months 12 --clear  # limpiar y reinsertar

Requisitos en .env o variables de entorno:
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=eyJ...
"""

import argparse
import os
import sys
import uuid
from datetime import datetime, timedelta

import numpy as np
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# ─── Cliente ──────────────────────────────────────────────────────────────────

def get_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env")
        sys.exit(1)
    return create_client(url, key)

# ─── Categorías ───────────────────────────────────────────────────────────────

CATEGORY_DEFS = [
    {"name": "Alimentación",    "type": "expense", "color": "#F97316", "icon": "🍽️"},
    {"name": "Transporte",      "type": "expense", "color": "#3B82F6", "icon": "🚌"},
    {"name": "Entretenimiento", "type": "expense", "color": "#A855F7", "icon": "🎬"},
    {"name": "Salud",           "type": "expense", "color": "#EF4444", "icon": "💊"},
    {"name": "Educación",       "type": "expense", "color": "#06B6D4", "icon": "📚"},
    {"name": "Ropa",            "type": "expense", "color": "#EC4899", "icon": "👕"},
    {"name": "Hogar",           "type": "expense", "color": "#84CC16", "icon": "🏠"},
    {"name": "Servicios",       "type": "expense", "color": "#64748B", "icon": "💡"},
    {"name": "Sueldo",          "type": "income",  "color": "#22C55E", "icon": "💰"},
]

# (monto_medio, desv_std, transacciones_promedio_mes)
CAT_PATTERNS = {
    "Alimentación":    (32.0,  6.0,  18),
    "Transporte":      (7.0,   1.5,  20),
    "Entretenimiento": (65.0,  20.0,  4),
    "Salud":           (100.0, 35.0,  2),
    "Educación":       (180.0, 40.0,  1),
    "Ropa":            (80.0,  25.0,  2),
    "Hogar":           (130.0, 30.0,  3),
    "Servicios":       (85.0,   5.0,  1),
}

DESCRIPTIONS = {
    "Alimentación":    ["Almuerzo", "Supermercado", "Desayuno", "Cena", "Mercado", "Bodega"],
    "Transporte":      ["Pasaje bus", "Taxi", "Uber", "Metropolitano", "Combustible"],
    "Entretenimiento": ["Cinema", "Spotify", "Netflix", "Salida con amigos", "Videojuegos"],
    "Salud":           ["Farmacia", "Consulta médica", "Laboratorio", "Lentes"],
    "Educación":       ["Curso online", "Libros", "Universidad", "Certificación"],
    "Ropa":            ["Zapatillas", "Polo", "Jeans", "Ropa deportiva"],
    "Hogar":           ["Limpieza", "Mueble", "Electrodoméstico", "Decoración"],
    "Servicios":       ["Luz", "Agua", "Internet", "Teléfono"],
}

def ensure_categories(client, user_id: str) -> dict[str, str]:
    """Crea categorías si no existen. Devuelve {name: id}."""
    existing = client.table("categories").select("id,name").eq("user_id", user_id).execute()
    existing_names = {r["name"]: r["id"] for r in (existing.data or [])}

    for cat in CATEGORY_DEFS:
        if cat["name"] not in existing_names:
            result = client.table("categories").insert({
                "user_id": user_id,
                "name":    cat["name"],
                "type":    cat["type"],
                "color":   cat["color"],
                "icon":    cat["icon"],
            }).execute()
            if result.data:
                existing_names[cat["name"]] = result.data[0]["id"]
                print(f"  + Categoria creada: {cat['name']}")

    return existing_names

# ─── Generador de transacciones ────────────────────────────────────────────────

def generate_transactions(
    user_id: str,
    cat_ids: dict[str, str],
    months: int = 12,
    monthly_income: float = 3200.0,
    seed: int = 42,
) -> list[dict]:
    rng = np.random.RandomState(seed)
    txs = []
    start = datetime.now() - timedelta(days=months * 30)

    for m in range(months):
        # Ingreso mensual (sueldo)
        income_date = start + timedelta(days=m * 30 + 1)
        txs.append({
            "user_id":          user_id,
            "amount":           round(monthly_income + rng.normal(0, 80), 2),
            "type":             "income",
            "category_id":      cat_ids["Sueldo"],
            "description":      "Sueldo mensual",
            "transaction_date": income_date.strftime("%Y-%m-%d"),
            "cuotas":           1,
            "monto_por_cuota":  0,
        })

        # Gastos por categoría
        for cat_name, (mu, sigma, n_avg) in CAT_PATTERNS.items():
            n = max(0, int(rng.poisson(n_avg)))
            descs = DESCRIPTIONS.get(cat_name, [cat_name])

            for _ in range(n):
                day = int(rng.randint(0, 27))
                amount = max(1.0, rng.normal(mu, sigma))
                txs.append({
                    "user_id":          user_id,
                    "amount":           round(amount, 2),
                    "type":             "expense",
                    "category_id":      cat_ids[cat_name],
                    "description":      str(rng.choice(descs)),
                    "transaction_date": (start + timedelta(days=m * 30 + day)).strftime("%Y-%m-%d"),
                    "cuotas":           1,
                    "monto_por_cuota":  0,
                })

    return sorted(txs, key=lambda x: x["transaction_date"])

# ─── Insertar en Supabase ──────────────────────────────────────────────────────

def insert_transactions(client, txs: list[dict]) -> int:
    """Inserta en lotes de 100. Devuelve total insertado."""
    inserted = 0
    batch_size = 100
    for i in range(0, len(txs), batch_size):
        batch = txs[i:i + batch_size]
        result = client.table("transactions").insert(batch).execute()
        inserted += len(result.data or [])
        print(f"  Insertando... {inserted}/{len(txs)}", end="\r")
    print()
    return inserted

def clear_transactions(client, user_id: str) -> int:
    result = client.table("transactions").delete().eq("user_id", user_id).execute()
    return len(result.data or [])

# ─── Listar usuarios ───────────────────────────────────────────────────────────

def list_users(client):
    try:
        result = client.auth.admin.list_users()
        users = result if isinstance(result, list) else getattr(result, "users", [])
        print(f"\nUsuarios registrados ({len(users)}):")
        for u in users:
            print(f"  {u.id}  {u.email}")
    except Exception as e:
        print(f"ERROR listando usuarios: {e}")
        print("Obtén tu user_id en: Supabase Dashboard → Authentication → Users")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed Supabase con datos de prueba para Finza ML")
    parser.add_argument("--user-id",    help="UUID del usuario en Supabase")
    parser.add_argument("--months",     type=int,   default=12,     help="Meses de historial (default: 12)")
    parser.add_argument("--income",     type=float, default=3200.0, help="Ingreso mensual en S/ (default: 3200)")
    parser.add_argument("--list-users", action="store_true",        help="Listar usuarios disponibles")
    parser.add_argument("--clear",      action="store_true",        help="Eliminar transacciones existentes antes de insertar")
    args = parser.parse_args()

    client = get_client()

    if args.list_users:
        list_users(client)
        return

    if not args.user_id:
        print("ERROR: indica --user-id <UUID>")
        print("Usa --list-users para ver los usuarios disponibles.")
        sys.exit(1)

    user_id = args.user_id
    SEP = "=" * 55

    print(SEP)
    print("  FINZA — Seed de base de datos")
    print(SEP)
    print(f"  Usuario : {user_id}")
    print(f"  Meses   : {args.months}")
    print(f"  Ingreso : S/ {args.income:.2f}/mes")

    if args.clear:
        print(f"\nEliminando transacciones existentes...")
        deleted = clear_transactions(client, user_id)
        print(f"  {deleted} transacciones eliminadas")

    print(f"\nCreando categorías...")
    cat_ids = ensure_categories(client, user_id)
    print(f"  {len(cat_ids)} categorías listas")

    print(f"\nGenerando transacciones ({args.months} meses)...")
    txs = generate_transactions(
        user_id=user_id,
        cat_ids=cat_ids,
        months=args.months,
        monthly_income=args.income,
    )
    expense_count = sum(1 for t in txs if t["type"] == "expense")
    income_count  = sum(1 for t in txs if t["type"] == "income")
    print(f"  {len(txs)} transacciones generadas ({expense_count} gastos, {income_count} ingresos)")

    print(f"\nInsertando en Supabase...")
    inserted = insert_transactions(client, txs)

    print(f"\n{SEP}")
    print(f"  Listo: {inserted} transacciones insertadas")
    print(f"  Modo ML: {'SI (>= 30 gastos)' if expense_count >= 30 else 'NO (< 30 gastos)'}")
    print(f"  Abre /proyecciones en la app para ver el resultado")
    print(SEP)


if __name__ == "__main__":
    main()
