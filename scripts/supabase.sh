#!/usr/bin/env bash
# Wrapper around the Supabase CLI that points it at the Podman socket.
# Usage: ./scripts/supabase.sh start | stop | status | db reset | ...
set -euo pipefail

if [[ -z "${DOCKER_HOST:-}" ]] && command -v podman >/dev/null 2>&1; then
  sock="$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}' 2>/dev/null || true)"
  if [[ -n "${sock}" ]]; then
    export DOCKER_HOST="unix://${sock}"
  fi
fi

exec supabase "$@"
