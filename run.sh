#!/usr/bin/env bash
# ==============================================================================
# Learnability Pro - Unified Dev Runner
# Concurrently runs Frontend (Next.js) & Backend (Spring Boot) in one terminal.
# ==============================================================================

set -euo pipefail
set -m

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

# ANSI Colors for formatted output
COLOR_BACKEND='\033[0;36m'   # Cyan
COLOR_FRONTEND='\033[0;35m'  # Magenta
COLOR_INFO='\033[0;32m'      # Green
COLOR_WARN='\033[1;33m'      # Yellow
COLOR_ERROR='\033[0;31m'     # Red
COLOR_BOLD='\033[1m'
NC='\033[0m'                 # Reset

log_runner() {
    echo -e "${COLOR_INFO}[RUNNER]${NC} $1"
}

log_warn() {
    echo -e "${COLOR_WARN}[RUNNER WARN]${NC} $1"
}

log_error() {
    echo -e "${COLOR_ERROR}[RUNNER ERROR]${NC} $1"
}

# Track running process group IDs
BACKEND_PGID=""
FRONTEND_PGID=""
SERVICES_STARTED=false

cleanup() {
    # Prevent repeated invocation
    trap - SIGINT SIGTERM EXIT
    
    if [ "$SERVICES_STARTED" = true ]; then
        echo ""
        log_runner "Gracefully stopping all services..."

        if [ -n "$FRONTEND_PGID" ]; then
            kill -- -"$FRONTEND_PGID" 2>/dev/null || true
        fi

        if [ -n "$BACKEND_PGID" ]; then
            kill -- -"$BACKEND_PGID" 2>/dev/null || true
        fi

        # Wait for processes to exit
        wait 2>/dev/null || true

        log_runner "All services stopped cleanly. Goodbye!"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

check_port() {
    local port="$1"
    local name="$2"
    if command -v lsof &>/dev/null; then
        if lsof -i :"$port" -sTCP:LISTEN -t &>/dev/null; then
            log_warn "Port $port ($name) appears to already be in use! You may need to stop any existing process."
        fi
    fi
}

start_backend() {
    SERVICES_STARTED=true
    log_runner "Starting Spring Boot Backend..."
    check_port 8080 "Backend"

    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found at $BACKEND_DIR"
        exit 1
    fi

    (
        cd "$BACKEND_DIR"

        # Load environment variables from .env.local or .env if present
        if [ -f ".env.local" ]; then
            set -a
            source ".env.local"
            set +a
        elif [ -f ".env" ]; then
            set -a
            source ".env"
            set +a
        fi

        # Execute maven spring-boot:run and prefix each line
        ./mvnw spring-boot:run 2>&1 | sed -u -e "s/^/\x1b[0;36m[backend]\x1b[0m /"
    ) &
    BACKEND_PGID=$!
}

start_frontend() {
    SERVICES_STARTED=true
    log_runner "Starting Next.js Frontend..."
    check_port 3000 "Frontend"

    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found at $FRONTEND_DIR"
        exit 1
    fi

    local pkg_manager="pnpm"
    if ! command -v pnpm &>/dev/null; then
        pkg_manager="npm run"
    fi

    (
        cd "$FRONTEND_DIR"
        $pkg_manager dev 2>&1 | sed -u -e "s/^/\x1b[0;35m[frontend]\x1b[0m /"
    ) &
    FRONTEND_PGID=$!
}

show_banner() {
    echo -e "${COLOR_BOLD}==============================================================${NC}"
    echo -e "${COLOR_BOLD}🚀 Learnability Pro - Unified Development Environment${NC}"
    echo -e "${COLOR_BOLD}==============================================================${NC}"
    echo -e "  ${COLOR_BACKEND}Backend:${NC}  http://localhost:8080 (API & Docs)"
    echo -e "  ${COLOR_FRONTEND}Frontend:${NC} http://localhost:3000 (Next.js Web UI)"
    echo -e "  ${COLOR_INFO}Control:${NC}  Press ${COLOR_BOLD}Ctrl + C${NC} anytime to stop both services"
    echo -e "${COLOR_BOLD}==============================================================${NC}\n"
}

# Parse CLI arguments
MODE="${1:-all}"

case "$MODE" in
    all|"")
        show_banner
        start_backend
        start_frontend
        ;;
    tmux|split)
        exec "$ROOT_DIR/run-tmux.sh"
        ;;
    backend)
        log_runner "Running Backend only mode..."
        start_backend
        ;;
    frontend)
        log_runner "Running Frontend only mode..."
        start_frontend
        ;;
    help|--help|-h)
        echo "Usage: ./run.sh [all|tmux|backend|frontend]"
        echo "  all      - Start both Backend & Frontend interleaved in one terminal (default)"
        echo "  tmux     - Start both in a split-pane layout using tmux"
        echo "  backend  - Start Spring Boot backend only (:8080)"
        echo "  frontend - Start Next.js frontend only (:3000)"
        exit 0
        ;;
    *)
        log_error "Unknown option: $MODE"
        echo "Usage: ./run.sh [all|backend|frontend]"
        exit 1
        ;;
esac

# Keep the script running and wait for background child processes
wait
