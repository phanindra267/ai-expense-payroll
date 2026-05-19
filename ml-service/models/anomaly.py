import pandas as pd
from sklearn.ensemble import IsolationForest

def detect_anomalies_isolation_forest(df: pd.DataFrame) -> list:
    """
    Uses Isolation Forest to detect anomalies based on the 'amount' feature.
    """
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
    
    # We only use 'amount' for basic anomaly detection here. 
    # In a real scenario, we might one-hot encode 'category' and add it.
    X = df[['amount']].fillna(0)

    # Train Isolation Forest
    clf = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    clf.fit(X)
    
    # Predict (-1 is anomaly, 1 is normal)
    preds = clf.predict(X)
    scores = clf.decision_function(X)

    anomalies = []
    for i, pred in enumerate(preds):
        if pred == -1:
            anomalies.append({
                "id": df.iloc[i]['id'],
                "description": df.iloc[i]['description'],
                "amount": float(df.iloc[i]['amount']),
                "category": df.iloc[i]['category'],
                "anomaly_score": float(scores[i])
            })

    return anomalies
