#!/usr/bin/env bash
# Preview the site over ngrok (frontend + backend tunnels).
# Restores .env files on exit (Ctrl+C or script end).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_DIR="$ROOT/backend"
FRONTEND_ENV="$FRONTEND_DIR/.env"
BACKEND_ENV="$BACKEND_DIR/.env"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-3000}"

FRONTEND_PID=""
BACKEND_PID=""
NGROK_PID=""
FRONTEND_ENV_BAK=""
BACKEND_ENV_BAK=""
NGROK_CONFIG=""
CLEANED_UP=0

die() {
  echo "Error: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not installed"
}

backup_env() {
  local src="$1"
  if [[ -f "$src" ]]; then
    local bak
    bak="$(mktemp)"
    cp "$src" "$bak"
    echo "$bak"
  else
    echo ""
  fi
}

restore_env() {
  local src="$1"
  local bak="$2"
  if [[ -n "$bak" && -f "$bak" ]]; then
    cp "$bak" "$src"
    rm -f "$bak"
    echo "Restored $src"
  elif [[ -z "$bak" && -f "$src" ]]; then
    # Script created the file; remove it on cleanup
    rm -f "$src"
    echo "Removed $src (was created for preview)"
  fi
}

set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"

  if [[ ! -f "$file" ]]; then
    printf '%s=%s\n' "$key" "$value" >"$file"
    return
  fi

  if grep -qE "^${key}[[:space:]]*=" "$file"; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' -E "s|^${key}[[:space:]]*=.*|${key}=${value}|" "$file"
    else
      sed -i -E "s|^${key}[[:space:]]*=.*|${key}=${value}|" "$file"
    fi
  else
    printf '\n%s=%s\n' "$key" "$value" >>"$file"
  fi
}

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping process(es) on port $port: $pids"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

cleanup() {
  [[ "$CLEANED_UP" -eq 1 ]] && return
  CLEANED_UP=1
  echo ""
  echo "Shutting down preview..."

  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$NGROK_PID" ]] && kill -0 "$NGROK_PID" 2>/dev/null; then
    kill "$NGROK_PID" 2>/dev/null || true
  fi

  # Best-effort: clear anything still bound to preview ports
  kill_port "$FRONTEND_PORT" >/dev/null 2>&1 || true
  kill_port "$BACKEND_PORT" >/dev/null 2>&1 || true
  pkill -f "ngrok start frontend backend" >/dev/null 2>&1 || true

  restore_env "$FRONTEND_ENV" "$FRONTEND_ENV_BAK"
  restore_env "$BACKEND_ENV" "$BACKEND_ENV_BAK"

  [[ -n "$NGROK_CONFIG" && -f "$NGROK_CONFIG" ]] && rm -f "$NGROK_CONFIG"

  echo "Preview stopped."
}

trap cleanup EXIT INT TERM

need_cmd ngrok
need_cmd curl
need_cmd lsof
need_cmd npm
need_cmd python3

echo "Backing up .env files (if present)..."
FRONTEND_ENV_BAK="$(backup_env "$FRONTEND_ENV")"
BACKEND_ENV_BAK="$(backup_env "$BACKEND_ENV")"

# Resolve default ngrok config (holds authtoken). A lone --config replaces it.
DEFAULT_NGROK_CONFIG="$(ngrok config check 2>/dev/null | sed -n 's/^Valid configuration file at //p')"
[[ -n "$DEFAULT_NGROK_CONFIG" && -f "$DEFAULT_NGROK_CONFIG" ]] \
  || die "No ngrok auth config found. Run: ngrok config add-authtoken <YOUR_TOKEN>"

# One ngrok agent, two tunnels — merge default config + temp tunnel definitions
NGROK_CONFIG="$(mktemp)"
cat >"$NGROK_CONFIG" <<EOF
version: "3"
tunnels:
  frontend:
    proto: http
    addr: ${FRONTEND_PORT}
  backend:
    proto: http
    addr: ${BACKEND_PORT}
EOF

# Avoid colliding with an already-running ngrok agent
if pgrep -x ngrok >/dev/null 2>&1; then
  echo "Stopping existing ngrok process..."
  pkill -x ngrok || true
  sleep 1
fi

echo "Starting ngrok tunnels (frontend :${FRONTEND_PORT}, backend :${BACKEND_PORT})..."
ngrok start frontend backend \
  --config "$DEFAULT_NGROK_CONFIG" \
  --config "$NGROK_CONFIG" \
  --log=stdout >/tmp/ngrok-preview.log 2>&1 &
NGROK_PID=$!

# Fail fast if ngrok dies during auth/startup
sleep 1
if ! kill -0 "$NGROK_PID" 2>/dev/null; then
  echo "ngrok log (tail):" >&2
  tail -n 40 /tmp/ngrok-preview.log >&2 || true
  die "ngrok failed to start (often missing authtoken or free-plan tunnel limits)."
fi

# Wait for local ngrok API + both public URLs
FRONTEND_URL=""
BACKEND_URL=""
API_BASE=""

parse_tunnel_url() {
  # Args: tunnels_json name
  # Prefer https public_url for the named tunnel; ignore null/missing urls
  python3 -c '
import json, sys
data = json.loads(sys.argv[1])
name = sys.argv[2]
urls = []
for t in data.get("tunnels", []):
    if t.get("name") != name:
        continue
    url = t.get("public_url") or ""
    if isinstance(url, str) and url.startswith("https://"):
        urls.append(url)
print(urls[0] if urls else "")
' "$1" "$2"
}

for _ in $(seq 1 40); do
  for port in 4040 4041; do
    if curl -sf "http://127.0.0.1:${port}/api/tunnels" >/dev/null 2>&1; then
      API_BASE="http://127.0.0.1:${port}"
      break
    fi
  done
  if [[ -n "$API_BASE" ]]; then
    TUNNELS_JSON="$(curl -sf "${API_BASE}/api/tunnels" || true)"
    if [[ -n "$TUNNELS_JSON" ]]; then
      FRONTEND_URL="$(parse_tunnel_url "$TUNNELS_JSON" "frontend")"
      BACKEND_URL="$(parse_tunnel_url "$TUNNELS_JSON" "backend")"
      if [[ -n "$FRONTEND_URL" && -n "$BACKEND_URL" ]]; then
        break
      fi
    fi
  fi
  sleep 0.5
done

if [[ -z "$FRONTEND_URL" || -z "$BACKEND_URL" ]]; then
  echo "ngrok log (tail):" >&2
  tail -n 40 /tmp/ngrok-preview.log >&2 || true
  if [[ -n "${TUNNELS_JSON:-}" ]]; then
    echo "tunnels API response:" >&2
    echo "$TUNNELS_JSON" | python3 -m json.tool >&2 || echo "$TUNNELS_JSON" >&2
  fi
  die "Could not get ngrok HTTPS URLs. Free plans may only allow one tunnel — upgrade or check 'ngrok config check'."
fi

echo "Updating env for preview..."
set_env_var "$FRONTEND_ENV" "VITE_API_BASE_URL" "$BACKEND_URL"
set_env_var "$BACKEND_ENV" "ALLOWED_ORIGINS" "${FRONTEND_URL},http://localhost:${FRONTEND_PORT}"

# Restart local servers so they pick up new env
kill_port "$FRONTEND_PORT"
kill_port "$BACKEND_PORT"

echo "Starting backend..."
(
  cd "$BACKEND_DIR"
  npm run dev
) >/tmp/backend-preview.log 2>&1 &
BACKEND_PID=$!

echo "Starting frontend..."
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host
) >/tmp/frontend-preview.log 2>&1 &
FRONTEND_PID=$!

# Wait until Vite is listening
for _ in $(seq 1 60); do
  if port_in_use "$FRONTEND_PORT"; then
    break
  fi
  sleep 0.5
done
port_in_use "$FRONTEND_PORT" || die "Frontend failed to start. See /tmp/frontend-preview.log"

for _ in $(seq 1 60); do
  if port_in_use "$BACKEND_PORT"; then
    break
  fi
  sleep 0.5
done
port_in_use "$BACKEND_PORT" || die "Backend failed to start. See /tmp/backend-preview.log"

echo ""
echo "========================================"
echo " Preview ready — share this link:"
echo " $FRONTEND_URL"
echo "========================================"
echo " Backend tunnel: $BACKEND_URL"
echo " Logs: /tmp/frontend-preview.log /tmp/backend-preview.log /tmp/ngrok-preview.log"
echo " Press Ctrl+C to stop and restore .env files."
echo ""

# Keep script alive until interrupted
while true; do
  if ! kill -0 "$NGROK_PID" 2>/dev/null; then
    die "ngrok exited unexpectedly. See /tmp/ngrok-preview.log"
  fi
  sleep 2
done
