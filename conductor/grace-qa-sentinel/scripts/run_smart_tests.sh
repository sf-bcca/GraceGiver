#!/bin/bash

# GraceQA Sentinel: Smart Test Runner
# Identifies changed files and runs relevant tests.

echo "--- GraceGiver Smart Test Runner ---"

# Get changed files in staging or workspace
CHANGED_FILES=$(git diff --name-only HEAD)

if [ -z "$CHANGED_FILES" ]; then
    echo "No changes detected. Running all backend unit tests by default."
    cd server && npm test
    exit 0
fi

RUN_BACKEND=false
RUN_INTEGRATION=false
RUN_E2E=false

for file in $CHANGED_FILES; do
    if [[ $file == server/*.js ]] && [[ $file != server/tests/* ]]; then
        RUN_BACKEND=true
        RUN_INTEGRATION=true
    fi
    if [[ $file == src/* ]] || [[ $file == components/* ]]; then
        RUN_E2E=true
    fi
done

if [ "$RUN_BACKEND" = true ]; then
    echo "🚀 Changes in server detected. Running Vitest unit tests..."
    cd server && npm test
    cd ..
fi

if [ "$RUN_INTEGRATION" = true ]; then
    echo "🚀 Running integration tests..."
    cd server && npm run test:integration
    cd ..
fi

if [ "$RUN_E2E" = true ]; then
    echo "🚀 Changes in UI detected. Suggesting Playwright E2E tests..."
    echo "Run manually with: npm run test:e2e"
fi

echo "--- Smart Test Audit Complete ---"
