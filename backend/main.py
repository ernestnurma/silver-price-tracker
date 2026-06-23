import logging
from datetime import datetime, timedelta
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Silver Price API", description="API to fetch silver prices and stats")

# Enable CORS for Next.js development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Period to (period, interval) mapping for yfinance
TIMEFRAME_MAP = {
    "1d": ("1d", "5m"),
    "1w": ("5d", "15m"),
    "1m": ("1mo", "1d"),
    "6m": ("6mo", "1d"),
    "1y": ("1y", "1d"),
    "5y": ("5y", "1wk"),
    "all": ("max", "1mo")
}

def generate_mock_data(timeframe: str):
    """
    Generates realistic mock silver data as a fallback when Yahoo Finance is unreachable.
    Silver spot price is around $25-$35 per ounce in recent years. Let's use a base price of $30.0.
    """
    logger.warning(f"Generating mock data for timeframe: {timeframe}")
    now = datetime.utcnow()
    points = []
    base_price = 31.50
    
    if timeframe == "1d":
        steps = 288  # 5-minute intervals in 24 hours
        delta = timedelta(minutes=5)
        volatility = 0.05
    elif timeframe == "1w":
        steps = 168  # 1-hour intervals in 7 days
        delta = timedelta(hours=1)
        volatility = 0.15
    elif timeframe == "1m":
        steps = 30
        delta = timedelta(days=1)
        volatility = 0.3
    elif timeframe == "6m":
        steps = 180
        delta = timedelta(days=1)
        volatility = 0.8
    elif timeframe == "1y":
        steps = 365
        delta = timedelta(days=1)
        volatility = 1.5
    elif timeframe == "5y":
        steps = 260  # Weekly points
        delta = timedelta(weeks=1)
        volatility = 3.0
    else:  # all
        steps = 240  # Monthly points
        delta = timedelta(days=30)
        volatility = 5.0
        
    start_time = now - (steps * delta)
    current_price = base_price
    
    # We will generate a random walk
    import random
    random.seed(42)  # Deterministic mock data
    
    for i in range(steps):
        date_val = start_time + (i * delta)
        change = random.normalvariate(0, volatility / 10)
        current_price += change
        
        # Prevent price going below 5
        if current_price < 5:
            current_price = 5.0
            
        high = current_price + abs(random.normalvariate(0, volatility / 20))
        low = current_price - abs(random.normalvariate(0, volatility / 20))
        open_val = current_price - change / 2
        volume = int(random.uniform(5000, 50000))
        
        points.append({
            "date": date_val.isoformat() + "Z",
            "open": round(open_val, 3),
            "high": round(high, 3),
            "low": round(low, 3),
            "close": round(current_price, 3),
            "volume": volume
        })
        
    return points

@app.get("/api/silver-price")
def get_silver_price(timeframe: str = Query("1m", pattern="^(1d|1w|1m|6m|1y|5y|all)$")):
    """
    Fetches historical silver price data and calculates summary metrics.
    Attempts to fetch from Yahoo Finance ('SI=F'). Falls back to generated mock data.
    """
    period, interval = TIMEFRAME_MAP.get(timeframe, ("1mo", "1d"))
    
    try:
        logger.info(f"Fetching silver price data for period={period}, interval={interval} using Yahoo Finance")
        ticker = yf.Ticker("SI=F")
        df = ticker.history(period=period, interval=interval)
        
        if df.empty:
            logger.warning("Yahoo Finance returned empty DataFrame. Falling back to mock data.")
            history = generate_mock_data(timeframe)
        else:
            history = []
            for index, row in df.iterrows():
                # Format date string
                if isinstance(index, pd.Timestamp):
                    date_str = index.isoformat()
                else:
                    date_str = str(index)
                
                history.append({
                    "date": date_str,
                    "open": round(float(row["Open"]), 3),
                    "high": round(float(row["High"]), 3),
                    "low": round(float(row["Low"]), 3),
                    "close": round(float(row["Close"]), 3),
                    "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0
                })
    except Exception as e:
        logger.error(f"Error fetching from Yahoo Finance: {str(e)}. Falling back to mock data.")
        history = generate_mock_data(timeframe)
        
    if not history:
        raise HTTPException(status_code=500, detail="Unable to retrieve or generate price data")
        
    # Calculate stats
    closes = [pt["close"] for pt in history]
    opens = [pt["open"] for pt in history]
    highs = [pt["high"] for pt in history]
    lows = [pt["low"] for pt in history]
    
    current_price = closes[-1]
    highest_price = max(highs)
    lowest_price = min(lows)
    
    # Calculate price change
    # For a day, let's compare with previous close or first open
    start_price = opens[0]
    price_change = current_price - start_price
    price_change_percent = (price_change / start_price) * 100 if start_price != 0 else 0
    
    # Silver status - whether it's up or down in the timeframe
    is_up = price_change >= 0
    
    return {
        "symbol": "SI=F",
        "name": "Silver Futures",
        "timeframe": timeframe,
        "currentPrice": round(current_price, 3),
        "change": round(price_change, 3),
        "changePercent": round(price_change_percent, 2),
        "high": round(highest_price, 3),
        "low": round(lowest_price, 3),
        "isUp": is_up,
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "history": history
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "time": datetime.utcnow().isoformat() + "Z"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
