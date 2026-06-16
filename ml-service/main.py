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
