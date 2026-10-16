#requires -Version 5.1
<#
.SYNOPSIS
  Focused offline verification of the private Gameplay publishing candidate.
  NO SSH, NO upload, NO WhatsApp, NO real customer media.
.EXAMPLE
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/agent/verify-gameplay-private-candidate.ps1
.EXAMPLE
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/agent/verify-gameplay-private-candidate.ps1 -Full
#>
param([switch]$Full)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Gate {
    param([string]$Name, [string]$Exe, [string[]]$Arguments)
    Write-Host ("[GATE] " + $Name)
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw ("NO_GO_" + $Name + "_EXIT_" + $LASTEXITCODE)
    }
}

$root = (& git rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0 -or -not $root) { throw 'NO_GO_NOT_A_GIT_WORKTREE' }
$root = $root.Trim()
Push-Location -LiteralPath $root
try {
    $head = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'NO_GO_UNRESOLVED_HEAD' }
    $changes = & git status --porcelain=v1 --untracked-files=all
    if ($LASTEXITCODE -ne 0 -or $changes) { throw 'NO_GO_DIRTY_WORKTREE' }
    $readiness = Get-Content -LiteralPath 'deploy/readiness.json' -Raw | ConvertFrom-Json
    if ($readiness.customerDataAllowed -ne $false -or
        $readiness.pilotReady -ne $false -or
        $readiness.automaticDeliveryAllowed -ne $false) {
        throw 'NO_GO_READINESS_POLICY_CHANGED'
    }
    $required = @(
        'apps/catalog-server/src/publication/PublicationService.ts',
        'apps/catalog-server/src/publication/SessionRepository.ts',
        'apps/catalog-server/src/storage/FileSystemStorageService.ts',
        'apps/catalog-server/src/crm/CrmEligibilityService.ts',
        'tools/deploy/publish-session.mjs',
        'apps/catalog-server/migrations/001_mvp_photo_sessions.sql'
    )
    foreach ($p in $required) {
        if (-not (Test-Path -LiteralPath $p -PathType Leaf)) {
            throw ("NO_GO_MISSING_FILE_" + $p)
        }
    }
    $tests = @(
        'apps/catalog-server/src/publication',
        'apps/catalog-server/src/storage',
        'apps/catalog-server/src/crm',
        'tools/deploy/publish-session.test.mjs',
        'tools/deploy/backup-restore-catalog.test.mjs',
        'tools/deploy/photo-session-preflight.test.mjs'
    )
    Invoke-Gate 'FOCUSED_TESTS' 'pnpm' (@('exec', 'vitest', 'run') + $tests)
    if ($Full) {
        Invoke-Gate 'CHECK' 'pnpm' @('check')
        Invoke-Gate 'ASSETS' 'pnpm' @('asset:validate:all')
        Invoke-Gate 'BUILD' 'pnpm' @('build:staging-demo')
        Invoke-Gate 'RELEASE_STAGING' 'pnpm' @('release:staging')
        Invoke-Gate 'VERIFY_ARTIFACT' 'pnpm' @('release:verify')
        Invoke-Gate 'SMOKE_RUNTIME' 'pnpm' @('release:smoke-runtime')
    }
    Write-Host ("CANDIDATE_CHECK_PASSED sha=" + $head + " full=" + [bool]$Full)
    Write-Host 'NOTE: This is not authorization to publish real photos.'
}
finally {
    Pop-Location
}
