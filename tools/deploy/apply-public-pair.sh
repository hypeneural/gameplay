#!/usr/bin/env bash
# P0: one-shot, service-scoped public Gameplay deployment. NOT called by CI.
# Usage:
#   sudo bash tools/deploy/apply-public-pair.sh --execute \
#     /srv/runtime/christmas-games/releases/APPROVED_NEW \
#     /srv/runtime/christmas-games/releases/VERIFIED_ROLLBACK \
#     EXACT_40_CHAR_TARGET_GIT_SHA EXACT_40_CHAR_ROLLBACK_GIT_SHA
# This script never performs a generic platform deploy or touches catalog-reader.
set -Eeuo pipefail
umask 077

ROOT='/srv/runtime/christmas-games/releases'
STACK='/srv/platform/stacks/christmas-games'
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
LOCK='/run/lock/stackctl-christmas-games.lock'
READER_LOCK='/run/lock/stackctl-reader-christmas-games.lock'
READER_NAME='christmas-games-catalog-reader'
CURRENT='/srv/runtime/christmas-games/current'
PUBLIC_NAMES=(christmas-games-catalog christmas-games-gateway)
SERVICES=(catalog gateway)
rollback_required=0
rollback_done=0
project=''
reader_release=''
target=''
previous=''

fail() { printf 'BLOCKED_PUBLIC_CUT:%s\n' "$1" >&2; exit 2; }
release_dir() {
  local directory="$1"
  [[ "$directory" =~ ^/srv/runtime/christmas-games/releases/[A-Za-z0-9][A-Za-z0-9._-]*$ ]] ||
    fail 'BAD_RELEASE_PATH'
  [[ -d "$directory" && ! -L "$directory" ]] || fail 'RELEASE_NOT_DIRECTORY'
  [[ "$(realpath -e -- "$directory")" == "$directory" ]] || fail 'RELEASE_SYMLINK_CHAIN'
}

[[ "$#" -eq 5 && "$1" == '--execute' ]] ||
  fail 'USAGE_EXECUTE_TARGET_ROLLBACK_TWO_EXACT_SHAS'
target="$2"
previous="$3"
expected_sha="$4"
rollback_sha="$5"
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$rollback_sha" =~ ^[a-f0-9]{40}$ ]] ||
  fail 'INVALID_SHA'
[[ "$target" != "$previous" ]] || fail 'ROLLBACK_EQUALS_TARGET'
release_dir "$target"
release_dir "$previous"
# Never overwrite an unrelated directory or an unexpected public pointer.
[[ -L "$CURRENT" ]] || fail 'CURRENT_POINTER_NOT_SYMLINK'
original_pointer="$(readlink -f -- "$CURRENT")"
[[ "$original_pointer" == "$previous" || "$original_pointer" == "$target" ]] ||
  fail 'CURRENT_POINTER_UNEXPECTED'
[[ -d "$STACK" && -f "$STACK/compose.yaml" && -f "$STACK/compose.private-audit.yaml" ]] ||
  fail 'CANONICAL_STACK_NOT_FOUND'
command -v docker >/dev/null && command -v node >/dev/null &&
  command -v flock >/dev/null || fail 'REQUIRED_RUNTIME_MISSING'

# Coordinate with BOTH generic stack deployment and private reader workflows.
exec 290>"$LOCK"
flock -n 290 || fail 'STACK_DEPLOY_IN_PROGRESS'
exec 291>"$READER_LOCK"
flock -n 291 || fail 'READER_DEPLOY_IN_PROGRESS'

node "$SCRIPT_DIR/verify-vps-release.mjs" "$target" >/dev/null ||
  fail 'TARGET_MANIFEST_FAILED'
node "$SCRIPT_DIR/verify-vps-release.mjs" "$previous" >/dev/null ||
  fail 'ROLLBACK_MANIFEST_FAILED'
actual_sha="$(node -p "JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8')).gitSha" "$target/RELEASE.json")"
[[ "$actual_sha" == "$expected_sha" ]] || fail 'TARGET_SHA_NOT_PINNED'
actual_rollback_sha="$(node -p "JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8')).gitSha" "$previous/RELEASE.json")"
[[ "$actual_rollback_sha" == "$rollback_sha" ]] || fail 'ROLLBACK_SHA_NOT_PINNED'
[[ "$rollback_sha" != 37190a8* ]] || fail 'INSECURE_ROLLBACK_RELEASE'

project="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "${PUBLIC_NAMES[0]}")"
[[ "$project" =~ ^[A-Za-z0-9_-]+$ ]] || fail 'INVALID_PROJECT'
reader_mount="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/server"}}{{.Source}}{{end}}{{end}}' "$READER_NAME")"
[[ "$reader_mount" == "$ROOT/"*'/server' ]] || fail 'UNVERIFIED_READER_MOUNT'
reader_release="${reader_mount%/server}"
release_dir "$reader_release"

cd "$STACK"
compose() {
  RELEASE_DIR="$1" CATALOG_READER_RELEASE_DIR="$reader_release" \
    docker compose --project-name "$project" --profile audit-private \
      -f compose.yaml -f compose.private-audit.yaml "${@:2}"
}
# Check the ACTUAL interpolated model; never print environment or secrets.
RELEASE_DIR="$target" CATALOG_READER_RELEASE_DIR="$reader_release" \
  node "$SCRIPT_DIR/verify-public-cut-plan.mjs" "$target" >/dev/null ||
  fail 'COMPOSE_PUBLIC_BOUNDARY_BLOCKED'
compose "$target" config --quiet >/dev/null || fail 'COMPOSE_CONFIG_INVALID'
node "$SCRIPT_DIR/nginx-asset-policy.mjs" >/dev/null ||
  fail 'HOST_NGINX_POLICY_NOT_STAGED'
old_ids="$(docker inspect --format '{{.Id}}' "$READER_NAME")"
before_other="$(docker ps -a --format '{{.Names}} {{.ID}}' |
  grep -vE '^christmas-games-(catalog|gateway) ' | sort)"

# Do not run a new public release until the external edge resolves.
getent ahostsv4 jogos.fotosdenatal.com >/dev/null || fail 'PUBLIC_DNS_UNAVAILABLE'

rollback() {
  if [[ "$rollback_required" != 1 || "$rollback_done" == 1 ]]; then return; fi
  rollback_done=1
  trap - EXIT ERR INT TERM
  printf 'PUBLIC_CUT_RECOVERY:ROLLING_BACK_PAIR\n' >&2
  if compose "$previous" up -d --wait --wait-timeout 90 --no-deps --no-build \
      --force-recreate "${SERVICES[@]}" >/dev/null; then
    # After a successful rollback ALWAYS align the canonical public pointer
    # to the verified previous release, including when it initially pointed
    # at the candidate new release from an earlier partial operation.
    if [[ "$(readlink -f -- "$CURRENT")" != "$previous" ]]; then
      recovery_link="$CURRENT.rollback.$BASHPID"
      if ln -s -- "$previous" "$recovery_link" &&
          mv -Tf -- "$recovery_link" "$CURRENT"; then
        printf 'PUBLIC_CUT_RECOVERY:CURRENT_POINTER_ALIGNED\n' >&2
      else
        printf 'PUBLIC_CUT_RECOVERY:CURRENT_POINTER_RESTORE_FAILED\n' >&2
      fi
    fi
    if [[ -f "$STACK/.env" ]]; then
      sed -i "s|^RELEASE_DIR=.*|RELEASE_DIR=$previous|g" "$STACK/.env" || true
    fi
    node "$SCRIPT_DIR/verify-public-runtime.mjs" >/dev/null &&
      printf 'PUBLIC_CUT_RECOVERY:PREVIOUS_RELEASE_VERIFIED\n' >&2 ||
      printf 'PUBLIC_CUT_RECOVERY:PREVIOUS_RELEASE_NOT_VERIFIED\n' >&2
  else
    printf 'PUBLIC_CUT_RECOVERY:ROLLBACK_COMMAND_FAILED\n' >&2
  fi
}
trap rollback EXIT ERR INT TERM

# The only mutation: recreation of EXACTLY catalog + gateway.
rollback_required=1
compose "$target" up -d --wait --wait-timeout 90 --no-deps --no-build \
  --force-recreate "${SERVICES[@]}" >/dev/null || fail 'PUBLIC_PAIR_RECREATE_FAILED'
node "$SCRIPT_DIR/verify-public-runtime.mjs" >/dev/null ||
  fail 'PUBLIC_RUNTIME_SMOKE_FAILED'

after_reader_id="$(docker inspect --format '{{.Id}}' "$READER_NAME")"
[[ "$old_ids" == "$after_reader_id" ]] || fail 'READER_RECREATED_UNEXPECTEDLY'
after_other="$(docker ps -a --format '{{.Names}} {{.ID}}' |
  grep -vE '^christmas-games-(catalog|gateway) ' | sort)"
[[ "$before_other" == "$after_other" ]] || fail 'NONPUBLIC_CONTAINER_CHANGED'

# Align the canonical pointer ONLY after HTTP, MIME and reader guards pass.
[[ "$(readlink -f -- "$CURRENT")" == "$original_pointer" ]] ||
  fail 'CURRENT_POINTER_CHANGED_CONCURRENTLY'
# Atomic symlink replacement; neither directory contents nor media are edited.
if [[ "$original_pointer" != "$target" ]]; then
  candidate="$CURRENT.next.$BASHPID"
  ln -s -- "$target" "$candidate" || fail 'CURRENT_POINTER_CREATE_FAILED'
  mv -Tf -- "$candidate" "$CURRENT" || fail 'CURRENT_POINTER_SWAP_FAILED'
  [[ "$(readlink -f -- "$CURRENT")" == "$target" ]] ||
    fail 'CURRENT_POINTER_VERIFY_FAILED'
fi
# Persist RELEASE_DIR in stack .env so subsequent standard Compose commands never revert.
if [[ -f "$STACK/.env" ]]; then
  sed -i "s|^RELEASE_DIR=.*|RELEASE_DIR=$target|g" "$STACK/.env" || fail 'STACK_ENV_UPDATE_FAILED'
fi
rollback_required=0
trap - EXIT ERR INT TERM
printf 'GO_PUBLIC_PAIR target_sha=%s project=%s reader_preserved=true\n' "$expected_sha" "$project"
