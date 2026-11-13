#!/usr/bin/env bash
# ==============================================================================
# Learnability Pro - Split Terminal Runner (tmux)
# Launches both Frontend & Backend into split panes in a single T3 Code terminal.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
SESSION_NAME="learnability-dev"

# Ensure tmux is installed
if ! command -v tmux &>/dev/null; then
    echo "tmux is not installed. Please install tmux (e.g. sudo apt install tmux)."
    exit 1
fi

# Clean up any previous session with the same name to start fresh
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Determine frontend package manager
PKG_MANAGER="pnpm"
if ! command -v pnpm &>/dev/null; then
    PKG_MANAGER="npm run"
fi

# 1. Create a detached session running Spring Boot in the top pane
tmux new-session -d -s "$SESSION_NAME" -n "dev" -c "$BACKEND_DIR" \
    "bash -c 'echo \"[Backend] Starting Spring Boot on http://localhost:8080...\"; if [ -f .env.local ]; then set -a; source .env.local; set +a; elif [ -f .env ]; then set -a; source .env; set +a; fi; ./mvnw spring-boot:run; exec bash'"

# 2. Split the window horizontally (50/50 top & bottom panes) running Next.js in the bottom pane
tmux split-window -v -p 50 -t "$SESSION_NAME" -c "$FRONTEND_DIR" \
    "bash -c 'echo \"[Frontend] Starting Next.js on http://localhost:3000...\"; $PKG_MANAGER dev; exec bash'"

# 3. Enable mouse support (click to select pane, scroll with mouse/touchpad)
tmux set-option -t "$SESSION_NAME" mouse on

# 4. Configure pane border titles
tmux set-option -t "$SESSION_NAME" pane-border-status top 2>/dev/null || true
tmux set-option -t "$SESSION_NAME" pane-border-format " #[bold]#{pane_title}#[default] " 2>/dev/null || true
tmux select-pane -t "$SESSION_NAME:0.0" -T " Spring Boot Backend (:8080) " 2>/dev/null || true
tmux select-pane -t "$SESSION_NAME:0.1" -T " Next.js Frontend (:3000) " 2>/dev/null || true

# Focus the top pane by default
tmux select-pane -t "$SESSION_NAME:0.0" 2>/dev/null || true

# Clean up session when exiting terminal
cleanup() {
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# 5. Attach to the tmux session in the active terminal window
tmux attach-session -t "$SESSION_NAME"
