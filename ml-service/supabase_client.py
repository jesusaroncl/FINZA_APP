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
