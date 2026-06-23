import logging
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.silver import router as silver_router

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

# Register routers
app.include_router(silver_router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "time": datetime.utcnow().isoformat() + "Z"}

if __name__ == "__main__":
    import uvicorn
    # Using reload=True checks for modifications across the monitored folders
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
