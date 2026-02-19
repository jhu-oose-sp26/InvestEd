"""
Strategy Models
Data models for trading strategies

TODO: Define Pydantic models for strategy data
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class StrategyStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"

class Strategy(BaseModel):
    """Strategy model"""
    id: Optional[str] = None
    userId: str
    name: str
    description: str  # Plain English description
    code: Optional[str] = None  # Generated executable code
    status: StrategyStatus = StrategyStatus.DRAFT
    createdAt: datetime
    updatedAt: datetime
    
    class Config:
        use_enum_values = True

class StrategyExecution(BaseModel):
    """Strategy execution result"""
    strategyId: str
    tradeId: str
    signal: str  # "BUY" or "SELL"
    ticker: str
    quantity: float
    price: float
    executedAt: datetime

class BacktestResult(BaseModel):
    """Backtest results"""
    strategyId: str
    startDate: datetime
    endDate: datetime
    initialBalance: float
    finalBalance: float
    totalReturn: float
    totalReturnPercent: float
    maxDrawdown: float
    sharpeRatio: Optional[float] = None
    trades: List[Dict[str, Any]]

