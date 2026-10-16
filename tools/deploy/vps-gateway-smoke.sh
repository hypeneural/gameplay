#!/usr/bin/env bash
# Post-promotion smoke: prove gateway -> catalog works via Docker DNS.
# Read-only; must run before public/customer verification.
set -euo pipefail
if [[ ${1:-} != "--check" || ! ${2:-} =~ ^[a-f0-9]{40}$ ]]; then
  echo 'Usage: bash vps-gateway-smoke.sh --check <40-char-git-sha>' >&2
  exit 2
fi
expected="$2"
root="${CG_VPS_RELEASE_ROOT:-/srv/runtime/christmas-games}"
catalog="${CG_VPS_CATALOG_CONTAINER:-christmas-games-catalog}"
gateway="${CG_VPS_GATEWAY_CONTAINER:-christmas-games-gateway}"
[[ -L "$root/current" ]] || { echo 'NO_GO_CURRENT_SYMLINK' >&2; exit 1; }
CG_EXPECTED_GIT_SHA="$expected" node "$root/current/ops/tools/verify-vps-release.mjs" "$root/current" >/dev/null

# Parse JSON without exposing other process environment values.
docker inspect "$catalog" --format '{{json .Config.Env}}' |
  node -e '
    let s="";
    process.stdin.on("data",c=>s+=c);
    process.stdin.on("end",()=>{
      const env=JSON.parse(s);
      if (!Array.isArray(env) || !env.includes("HOST=0.0.0.0")) {
        process.stderr.write("NO_GO_CONTAINER_HOST_BIND\\n");
        process.exitCode=1;
      }
    });
  '

docker inspect "$catalog" --format '{{json .HostConfig.PortBindings}}' |
  node -e '
    let s="";
    process.stdin.on("data",c=>s+=c);
    process.stdin.on("end",()=>{
      const ports=JSON.parse(s);
      if (ports && Object.keys(ports).length) {
        process.stderr.write("NO_GO_DIRECT_CATALOG_PORT\\n");
        process.exitCode=1;
      }
    });
  '

# Check the actual inter-container path. Checking catalog loopback alone is NOT sufficient.
body="$(docker exec "$gateway" sh -c '
if command -v wget >/dev/null 2>&1; then
  wget -q -O - http://catalog:4180/healthz
elif command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 8 http://catalog:4180/healthz
else
  exit 77
fi
')" || { echo 'NO_GO_GATEWAY_TO_CATALOG' >&2; exit 1; }
printf '%s' "$body" | node -e '
let s="";
process.stdin.on("data", c=>s+=c);
process.stdin.on("end",()=>{
  let body;
  try {body=JSON.parse(s);} catch {process.stderr.write("NO_GO_HEALTH_JSON\\n");process.exitCode=1;return;}
  if (body.status !== "ok" || body.releaseStage !== "staging-demo") {
    process.stderr.write("NO_GO_GATEWAY_HEALTH\\n");
    process.exitCode=1;
  }
});
'
echo 'GATEWAY_CATALOG_SMOKE_OK'
