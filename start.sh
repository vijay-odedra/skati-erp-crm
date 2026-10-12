#!/usr/bin/env bash
set -e

# Ensure ~/.local/bin is in PATH for node, npm, npx, and java
export PATH="$HOME/.local/bin:$PATH"

# Resolve project root
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "======================================================"
echo "  🚀 SKATI ERP & CRM — FULL-STACK ALL-IN-ONE RUNNER"
echo "======================================================"

# Clean up any stale processes on our ports (5173, 8080, 9099, 4000)
cleanup_ports() {
  for port in 5173 8080 9099 4000 4400 9150; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
      kill -9 $pid 2>/dev/null || true
    fi
  done
}

cleanup_ports

MODE="${1:-live}"

if [ "$MODE" = "live" ]; then
  echo "Mode: [LIVE CLOUD] Connecting to Firebase Cloud (skati-erp-crm-76657)"
  echo "Backend : Google Cloud Firestore & Auth"
  echo "Frontend: http://localhost:5173"
  echo "------------------------------------------------------"
  for env_file in .env .env.local; do
    if [ -f "$env_file" ]; then
      if grep -q "VITE_USE_FIREBASE_EMULATORS=" "$env_file"; then
        sed -i 's/VITE_USE_FIREBASE_EMULATORS=.*/VITE_USE_FIREBASE_EMULATORS=false/' "$env_file"
      else
        echo "VITE_USE_FIREBASE_EMULATORS=false" >> "$env_file"
      fi
    fi
  done
  npx vite --host 0.0.0.0 --port 5173
else
  echo "Mode: [FULL-STACK LOCAL + AUTO-SEEDED TESTING RECORDS]"
  echo "Backend Auth       : http://127.0.0.1:9099"
  echo "Backend Firestore  : http://127.0.0.1:8080"
  echo "Backend UI Console : http://127.0.0.1:4000"
  echo "Frontend Web App   : http://localhost:5173"
  echo "------------------------------------------------------"
  for env_file in .env .env.local; do
    if [ -f "$env_file" ]; then
      if grep -q "VITE_USE_FIREBASE_EMULATORS=" "$env_file"; then
        sed -i 's/VITE_USE_FIREBASE_EMULATORS=.*/VITE_USE_FIREBASE_EMULATORS=true/' "$env_file"
      else
        echo "VITE_USE_FIREBASE_EMULATORS=true" >> "$env_file"
      fi
    fi
  done

  # Auto-seed testing records 4 seconds after emulators initialize
  (
    sleep 4
    if curl -s http://127.0.0.1:8080/ >/dev/null 2>&1; then
      echo "🌱 [AUTO-SEED] Ensuring all testing records are active..."
      node scratch/seed-full-test-suite.mjs >/dev/null 2>&1 || true
      echo "✨ [AUTO-SEED] Complete! Ready to test."
    fi
  ) &

  npx concurrently \
    --kill-others \
    --prefix "[{name}]" \
    --names "BACKEND,FRONTEND" \
    --prefix-colors "yellow,cyan" \
    "npx firebase emulators:start --only auth,firestore --import=./emulator-data --export-on-exit=./emulator-data --project skati-erp-crm" \
    "npx vite --host 0.0.0.0 --port 5173"
fi
