#!/bin/bash

echo "--- GraceGiver Synology Environment Check ---"

# Check for syno commands
if command -v syno >/dev/null 2>&1; then
    echo "✅ 'syno' command found."
    syno appscenter status docker
else
    echo "❌ 'syno' command not found. This may not be a Synology device or you are not in an interactive SSH session."
fi

# Check for docker-compose
if command -v docker-compose >/dev/null 2>&1; then
    echo "✅ 'docker-compose' found."
else
    echo "⚠️ 'docker-compose' not found in PATH."
fi

# Check directory structure
if [ -f "docker-compose.yml" ]; then
    echo "✅ Found docker-compose.yml in current directory."
else
    echo "⚠️ docker-compose.yml not found. Run this from the project root."
fi

echo "--------------------------------------------"
