import pandas as pd
from prophet import Prophet

def forecast_prophet(df: pd.DataFrame, periods: int = 30) -> list:
    """
    Time series forecasting using Facebook Prophet.
    Aggregates data daily and forecasts the next `periods` days.
    """
    df['date'] = pd.to_datetime(df['date'])
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')

    # Aggregate by day
    daily_df = df.groupby(df['date'].dt.date)['amount'].sum().reset_index()
    
    # Prophet requires columns 'ds' (date) and 'y' (value)
    prophet_df = pd.DataFrame({
        'ds': daily_df['date'],
        'y': daily_df['amount']
    })

    model = Prophet(daily_seasonality=True, yearly_seasonality=False, weekly_seasonality=True)
    model.fit(prophet_df)

    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)

    # Return only the future predictions
    future_forecast = forecast.tail(periods)
    
    results = []
    for _, row in future_forecast.iterrows():
        results.append({
            "date": row['ds'].strftime('%Y-%m-%d'),
            "predicted_amount": max(0, float(row['yhat'])), # Avoid negative forecasts
            "lower_bound": max(0, float(row['yhat_lower'])),
            "upper_bound": max(0, float(row['yhat_upper']))
        })

    return results
