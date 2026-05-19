import pandas as pd
import numpy as np

def perform_eda(df: pd.DataFrame) -> dict:
    """
    Automated dataset profiling, missing value analysis, and basic statistics.
    """
    if df.empty:
        return {}

    df['date'] = pd.to_datetime(df['date'])
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')

    # Basic stats
    total_spend = df['amount'].sum()
    avg_spend = df['amount'].mean()
    count = len(df)
    
    # Missing values
    missing = df.isnull().sum().to_dict()

    # Category distribution
    cat_dist = df['category'].value_counts().to_dict()

    # Time series features (monthly aggregation)
    monthly_trend = df.set_index('date').resample('ME')['amount'].sum().to_dict()
    # Convert timestamps to strings for JSON serialization
    monthly_trend_str = {k.strftime('%Y-%m'): v for k, v in monthly_trend.items() if not pd.isna(v)}

    return {
        "summary": {
            "total_transactions": count,
            "total_spend": float(total_spend),
            "average_spend": float(avg_spend) if not np.isnan(avg_spend) else 0.0,
        },
        "missing_values": missing,
        "category_distribution": cat_dist,
        "monthly_trend": monthly_trend_str
    }
