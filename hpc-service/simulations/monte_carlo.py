import numpy as np

def run_expense_simulation(base_amount: float, volatility: float, days: int, iterations: int = 10000) -> dict:
    """
    Monte Carlo simulation for budget/expense forecasting.
    Uses Geometric Brownian Motion (GBM) to simulate possible future expenses.
    """
    # Assuming daily drift is 0 for simplicity, only volatility matters
    drift = 0.0
    
    # Generate random shocks for all iterations and days at once (Vectorized)
    # Shape: (iterations, days)
    shocks = np.random.normal(loc=drift, scale=volatility, size=(iterations, days))
    
    # Calculate daily multipliers: e^(shock)
    multipliers = np.exp(shocks)
    
    # Cumulative product along the days axis to simulate compounding paths
    paths = base_amount * np.cumprod(multipliers, axis=1)
    
    # Final day values across all iterations
    final_values = paths[:, -1]
    
    # Calculate Risk Metrics (Percentiles)
    p10 = np.percentile(final_values, 10) # Best Case (Lowest expense)
    p50 = np.percentile(final_values, 50) # Expected Case
    p90 = np.percentile(final_values, 90) # Worst Case (Highest expense)
    
    return {
        "best_case_p10": float(p10),
        "expected_case_p50": float(p50),
        "worst_case_p90": float(p90),
        "risk_spread": float(p90 - p10)
    }
