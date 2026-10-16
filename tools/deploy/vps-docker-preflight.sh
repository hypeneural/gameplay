#!/usr/bin/env bash
# Read-only: inspect Docker Compose, release SHA and existing rollback target.
set -euo pipefail
[[ ${1:-} == "--check" && -n ${2:-} && -n ${3:-} ]] || {
  echo 'Usage: bash vps-docker-preflight.sh --check <release-id> <40-char-sha>' >&2; exit 2;
}
id="$2"; sha="$3"
[[ "$id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{3,90}$ && "$sha" =~ ^[a-f0-9]{40}$ ]] || {
  echo 'Invalid release ID or SHA' >&2; exit 2;
}
root="${CG_VPS_RELEASE_ROOT:-/srv/runtime/christmas-games}"
compose="${CG_VPS_COMPOSE_FILE:-/srv/platform/stacks/christmas-games/compose.yaml}"
cat_container="${CG_VPS_CATALOG_CONTAINER:-christmas-games-catalog}"
gw_container="${CG_VPS_GATEWAY_CONTAINER:-christmas-games-gateway}"
for bin in docker node realpath; do command -v "$bin" >/dev/null || {
  echo "Missing $bin" >&2; exit 1; }; done
[[ -L "$root/current" && -f "$compose" && -d "$root/releases/$id" ]] || {
  echo 'Current symlink, Compose file or release missing' >&2; exit 1;
}
old="$(realpath -e "$root/current")"
release_root="$(realpath -e "$root/releases")"
[[ "$old" == "$release_root/"* ]] || { echo 'Unsafe current path' >&2; exit 1; }
CG_EXPECTED_GIT_SHA="$sha" node "$root/releases/$id/ops/tools/verify-vps-release.mjs" "$root/releases/$id"
project="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$cat_container")"
project2="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$gw_container")"
cat_service="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$cat_container")"
gw_service="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$gw_container")"
[[ -n "$project" && "$project" != '<no value>' && "$project" == "$project2" &&
  -n "$cat_service" && "$cat_service" != '<no value>' && -n "$gw_service" &&
  "$gw_service" != '<no value>' ]] || { echo 'Invalid Compose labels' >&2; exit 1; }
cd "$(dirname "$compose")"
docker compose -p "$project" -f "$compose" config --quiet
docker compose -p "$project" -f "$compose" config --services | grep -Fx "$cat_service" >/dev/null
docker compose -p "$project" -f "$compose" config --services | grep -Fx "$gw_service" >/dev/null
docker compose -p "$project" -f "$compose" config --format json |
  node -e '
    let s="";
    process.stdin.on("data", chunk => s += chunk);
    process.stdin.on("end", () => {
      const cfg = JSON.parse(s);
      for (const name of [process.argv[2], process.argv[3]]) {
        const vols=cfg.services?.[name]?.volumes ?? [];
        if (!vols.some(v => typeof v.source === "string" &&
            (v.source === process.argv[1] || v.source.startsWith(process.argv[1]+"/")))) {
          throw Error("Service is not bound to current: " + name);
        }
      }
    });
  ' "$root/current" "$cat_service" "$gw_service"
printf 'PREFLIGHT_OK release=%s sha=%s previous=%s project=%s services=%s,%s\n' \
  "$id" "$sha" "$(basename "$old")" "$project" "$cat_service" "$gw_service"
