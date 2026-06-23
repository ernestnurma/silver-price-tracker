# Configuration and Constants for Silver Price application

SILVER_TICKER = "SI=F"

TIMEFRAME_MAP = {
    "1d": ("1d", "5m"),
    "1w": ("5d", "15m"),
    "1m": ("1mo", "1d"),
    "6m": ("6mo", "1d"),
    "1y": ("1y", "1d"),
    "5y": ("5y", "1wk"),
    "all": ("max", "1mo")
}
