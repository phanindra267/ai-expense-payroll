#!/bin/bash
# ===========================================
# AI-Smart Expense & Payroll Management System
# Local Development Setup Script
# ===========================================

set -e

echo "🚀 Setting up AI-Smart Expense & Payroll Management System..."
echo "============================================================"

# Step 1: Copy environment file
if [ ! -f .env ]; then
  echo "📄 Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ .env created. Please update with your credentials."
else
  echo "✅ .env already exists."
fi

# Step 2: Start infrastructure services
echo ""
echo "🐳 Starting infrastructure services (MongoDB, Redis, Ollama)..."
docker-compose up -d mongodb redis ollama

# Step 3: Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."

echo -n "  MongoDB: "
until docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null; do
  echo -n "."
  sleep 2
done
echo " ✅"

echo -n "  Redis: "
until docker-compose exec -T redis redis-cli ping &>/dev/null; do
  echo -n "."
  sleep 2
done
echo " ✅"

echo -n "  Ollama: "
until curl -sf http://localhost:11434/api/tags &>/dev/null; do
  echo -n "."
  sleep 3
done
echo " ✅"

# Step 4: Pull Ollama model
echo ""
echo "🤖 Pulling Llama 3 model (this may take a while on first run)..."
docker-compose exec -T ollama ollama pull llama3
echo "✅ Llama 3 model ready."

# Step 5: Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm ci
cd ..

# Step 6: Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm ci
cd ..

# Step 7: Run migrations
echo ""
echo "🗄️  Running database migrations..."
cd backend
npm run migrate
cd ..

echo ""
echo "============================================================"
echo "✅ Setup complete! You can now run:"
echo ""
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "  Or use Docker: docker-compose up --build"
echo ""
echo "  Pull the AI model if not done: ollama pull llama3"
echo "============================================================"
