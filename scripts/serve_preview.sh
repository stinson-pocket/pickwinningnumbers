#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${1:-4173}"

cd "$PROJECT_DIR"
echo "Serving Pick Winning Numbers at http://127.0.0.1:$PORT"
python3 -m http.server "$PORT"
