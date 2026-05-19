from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd

from core.pipelines import perform_eda
from models.anomaly import detect_anomalies_isolation_forest
from models.forecast import forecast_prophet

app = FastAPI(title="FinAI ML & Data Science Service", version="1.0.0")

class ExpenseItem(BaseModel):
    id: str
    description: str
    amount: float
    date: str
    category: str

class ExpensesPayload(BaseModel):
    data: List[ExpenseItem]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-engine"}

@app.post("/analyze/eda")
def run_eda(payload: ExpensesPayload):
    if not payload.data:
        raise HTTPException(status_code=400, detail="No data provided")
    
    df = pd.DataFrame([vars(item) for item in payload.data])
    eda_results = perform_eda(df)
    return eda_results

@app.post("/detect/anomaly")
def run_anomaly_detection(payload: ExpensesPayload):
    if len(payload.data) < 10:
         return {"message": "Insufficient data for Isolation Forest. Need at least 10 records.", "anomalies": []}

    df = pd.DataFrame([vars(item) for item in payload.data])
    anomalies = detect_anomalies_isolation_forest(df)
    
    return {"anomalies": anomalies}

@app.post("/forecast/expenses")
def run_forecasting(payload: ExpensesPayload):
    if len(payload.data) < 30:
        return {"message": "Insufficient data for Prophet forecasting. Need at least 30 historical points.", "forecast": []}
    
    df = pd.DataFrame([vars(item) for item in payload.data])
    forecast_results = forecast_prophet(df)
    
    return {"forecast": forecast_results}
