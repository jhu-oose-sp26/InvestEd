"""
InvestEd Data Science / Analytics Backend
FastAPI application for strategy processing and analytics

TODO: Initialize FastAPI app
- Set up CORS
- Register routes for strategy endpoints
- Add health check endpoint
- Configure logging
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="InvestEd Analytics API",
    description="Data science and strategy processing backend",
    version="0.1.0"
)

# TODO: Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "InvestEd Analytics API", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# TODO: Register strategy routes
# from app.routes import strategy_routes
# app.include_router(strategy_routes.router, prefix="/api/strategies", tags=["strategies"])

