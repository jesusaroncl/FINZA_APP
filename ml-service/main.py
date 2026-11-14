from datetime import date, datetime
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


def _tx_date(t) -> date | None:
    try:
        return datetime.strptime(t.get("transaction_date", "")[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


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

    today = datetime.now().date()
    expense_count = sum(
        1 for t in transactions
        if t.get("type") == "expense" and (d := _tx_date(t)) is not None and d <= today
    )
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
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    by_cat: dict = defaultdict(float)
    for t in transactions:
        if t.get("type") == "expense":
            d = _tx_date(t)
            if d is not None and month_start.date() <= d <= now.date():
                by_cat[t.get("category_id", "sin-cat")] += t.get("amount", 0)

    cat_lookup = {c["id"]: c["name"] for c in categories}
    total = sum(by_cat.values())

    # Use daily rate extrapolation instead of dividing the past total
    days_elapsed = max((now - month_start).days, 1)
    daily_rate = total / days_elapsed
    next_7_total = round(daily_rate * 7, 2)
    next_30_total = round(daily_rate * 30, 2)

    def scale_categories(target_total: float) -> list:
        if total == 0:
            return []
        return sorted(
            [
                {
                    "category": cat_lookup.get(cid, "Sin categoría"),
                    "amount": round(amt / total * target_total, 2),
                    "type": "variable",
                }
                for cid, amt in by_cat.items()
            ],
            key=lambda x: x["amount"],
            reverse=True,
        )

    try:
        risks = detect_risks(transactions)
    except Exception as e:
        print(f"[heuristic] detect_risks failed: {e!r}")
        risks = []
    try:
        recommendations = generate_recommendations(risks, transactions, categories)
    except Exception as e:
        print(f"[heuristic] recommendations failed: {e!r}")
        recommendations = {"alerts": [], "tips": []}

    return {
        "mode": "heuristic",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "prediction": {
            "next_7_days": {"total": next_7_total, "by_category": scale_categories(next_7_total)},
            "next_30_days": {"total": next_30_total, "by_category": scale_categories(next_30_total)},
        },
        "risks": risks,
        "recommendations": recommendations,
    }
