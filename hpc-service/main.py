from fastapi import FastAPI
import multiprocessing
import torch

from simulations.monte_carlo import run_expense_simulation

app = FastAPI(title="FinAI HPC Engine", version="1.0.0")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "cpu_cores": multiprocessing.cpu_count(),
        "cuda_available": torch.cuda.is_available(),
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
    }

@app.post("/simulate/expenses")
def simulate_expenses(base_amount: float, volatility: float, days: int = 30):
    """Runs a Monte Carlo simulation for expense forecasting."""
    results = run_expense_simulation(base_amount, volatility, days, iterations=10000)
    return {"simulation_results": results}
