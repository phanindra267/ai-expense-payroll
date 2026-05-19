from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import pymongo
import psycopg2
import os
import json

# Setup connections
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017/finai")
PG_CONN = os.getenv("PG_CONN", "postgresql://finai:finai_secret@postgres:5432/finai_dw")

default_args = {
    'owner': 'data_engineering',
    'depends_on_past': False,
    'start_date': datetime(2025, 1, 1),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

def extract_from_mongo(**kwargs):
    client = pymongo.MongoClient(MONGO_URI)
    db = client.get_default_database()
    
    # Simple extraction of yesterday's expenses
    yesterday = datetime.utcnow() - timedelta(days=1)
    expenses = list(db.expenses.find({
        "createdAt": {"$gte": yesterday}
    }))
    
    # Serialize ObjectId and Dates for Airflow XCom
    for exp in expenses:
        exp['_id'] = str(exp['_id'])
        exp['organisationId'] = str(exp.get('organisationId', ''))
        exp['employeeId'] = str(exp.get('employeeId', ''))
        if 'date' in exp:
            exp['date'] = exp['date'].isoformat()
        if 'createdAt' in exp:
            exp['createdAt'] = exp['createdAt'].isoformat()
    
    return expenses

def transform_and_load(**kwargs):
    ti = kwargs['ti']
    expenses = ti.xcom_pull(task_ids='extract_expenses_from_mongo')
    
    if not expenses:
        print("No new expenses to load.")
        return

    # Connect to Postgres Data Warehouse
    conn = psycopg2.connect(PG_CONN)
    cursor = conn.cursor()
    
    # Ensure analytical table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dim_expenses (
            expense_id VARCHAR(50) PRIMARY KEY,
            org_id VARCHAR(50),
            employee_id VARCHAR(50),
            amount DECIMAL(10,2),
            category VARCHAR(100),
            expense_date DATE,
            created_at TIMESTAMP
        )
    """)
    
    # Insert / Upsert logic
    for exp in expenses:
        cursor.execute("""
            INSERT INTO dim_expenses (expense_id, org_id, employee_id, amount, category, expense_date, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (expense_id) DO UPDATE 
            SET amount = EXCLUDED.amount, category = EXCLUDED.category
        """, (
            exp['_id'], 
            exp.get('organisationId'), 
            exp.get('employeeId'), 
            exp.get('amount', 0), 
            exp.get('category', 'Uncategorized'),
            exp.get('date'),
            exp.get('createdAt')
        ))
        
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"Successfully loaded {len(expenses)} records into Postgres Data Warehouse.")

with DAG('expense_etl_pipeline',
         default_args=default_args,
         description='Nightly ETL from MongoDB to PostgreSQL DW',
         schedule_interval='@daily',
         catchup=False) as dag:

    extract_task = PythonOperator(
        task_id='extract_expenses_from_mongo',
        python_callable=extract_from_mongo,
        provide_context=True
    )

    load_task = PythonOperator(
        task_id='transform_and_load_to_dw',
        python_callable=transform_and_load,
        provide_context=True
    )

    extract_task >> load_task
