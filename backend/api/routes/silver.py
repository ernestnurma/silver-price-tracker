from fastapi import APIRouter, Query, HTTPException
from services.silver import get_silver_price_history

router = APIRouter()

@router.get("/silver-price")
def get_silver_price(timeframe: str = Query("1m", pattern="^(1d|1w|1m|6m|1y|5y|all)$")):
    """
    Fetches historical silver price data and calculates summary metrics.
    Attempts to fetch from Yahoo Finance ('SI=F') and falls back to mock data.
    """
    try:
        data = get_silver_price_history(timeframe)
        return data
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
