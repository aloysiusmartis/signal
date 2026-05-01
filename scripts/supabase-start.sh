#!/usr/bin/env bash
# Wrapper around `supabase start` that re-applies the PostgREST pre-request hook.
#
# Why: PostgREST 14.10 does not pick up `pgrst.db_pre_request` from ALTER ROLE
# in-database config at runtime. The env var must be set on the container.
# `supabase start` recreates the container without it, so this script patches it
# back in after startup.
#
# Usage:
#   ./scripts/supabase-start.sh              # normal start
#   ./scripts/supabase-start.sh --ignore-health-check  # pass-through flags

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ID=$(grep 'project_id' "$SCRIPT_DIR/../supabase/config.toml" | head -1 | sed 's/.*= *"\(.*\)".*/\1/')
CONTAINER="supabase_rest_${PROJECT_ID}"

echo "Starting Supabase (project: $PROJECT_ID)..."
supabase start "$@"

echo "Applying PostgREST pre-request hook..."

IMAGE=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER")
NETWORK=$(docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$CONTAINER")

mapfile -t env_lines < <(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" | grep -v '^PGRST_DB_PRE_REQUEST=' | grep .)
env_lines+=("PGRST_DB_PRE_REQUEST=public.pgrst_role_setter")

env_flags=()
for e in "${env_lines[@]}"; do
    env_flags+=("-e" "$e")
done

docker stop "$CONTAINER" > /dev/null
docker rm   "$CONTAINER" > /dev/null
docker run -d --name "$CONTAINER" --network "$NETWORK" "${env_flags[@]}" "$IMAGE" > /dev/null

echo "PostgREST pre-request hook applied (PGRST_DB_PRE_REQUEST=public.pgrst_role_setter)"
