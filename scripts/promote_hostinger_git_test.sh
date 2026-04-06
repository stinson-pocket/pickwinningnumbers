#!/bin/zsh
set -euo pipefail

# Promote the Hostinger Git staging folder into the live site root.
# Defaults to a dry run so we can review exactly what would change first.

HOSTINGER_HOST="${HOSTINGER_HOST:-109.106.250.190}"
HOSTINGER_PORT="${HOSTINGER_PORT:-65002}"
HOSTINGER_USER="${HOSTINGER_USER:-u514430741}"
HOSTINGER_KEY="${HOSTINGER_KEY:-$HOME/.ssh/hostinger_pickwinningnumbers}"
HOSTINGER_DOMAIN_PATH="${HOSTINGER_DOMAIN_PATH:-domains/pickwinningnumbers.com/public_html}"
SOURCE_DIR="${HOSTINGER_DOMAIN_PATH}/git-test/"
DEST_DIR="${HOSTINGER_DOMAIN_PATH}/"

MODE="dry-run"
if [[ "${1:-}" == "--apply" ]]; then
  MODE="apply"
fi

SSH_OPTS=(
  -i "$HOSTINGER_KEY"
  -o StrictHostKeyChecking=yes
  -p "$HOSTINGER_PORT"
)

RSYNC_FLAGS=(
  -av
  --itemize-changes
  '--prune-empty-dirs'
  '--include=/articles/***'
  '--include=/social/***'
  '--include=/watch/***'
  '--include=/*.html'
  '--include=/*.js'
  '--include=/*.css'
  '--include=/*.xml'
  '--include=/*.txt'
  '--include=/*.png'
  '--include=/*.svg'
  '--exclude=*'
)

if [[ "$MODE" == "dry-run" ]]; then
  RSYNC_FLAGS+=(--dry-run)
fi

echo "Mode: $MODE"
echo "Remote: ${HOSTINGER_USER}@${HOSTINGER_HOST}:${HOSTINGER_PORT}"
echo "Source: ${SOURCE_DIR}"
echo "Destination: ${DEST_DIR}"

ssh "${SSH_OPTS[@]}" "${HOSTINGER_USER}@${HOSTINGER_HOST}" "test -d '$SOURCE_DIR' && test -d '$DEST_DIR'"

REMOTE_RSYNC_CMD=(
  rsync
  "${RSYNC_FLAGS[@]}"
  "$SOURCE_DIR"
  "$DEST_DIR"
)

ssh "${SSH_OPTS[@]}" "${HOSTINGER_USER}@${HOSTINGER_HOST}" "$(printf '%q ' "${REMOTE_RSYNC_CMD[@]}")"
