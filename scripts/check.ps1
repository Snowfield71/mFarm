$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $Root
try {
  python .\scripts\check_repository.py
  if ($LASTEXITCODE -ne 0) { throw "Repository layout check failed" }

  cargo test --locked --manifest-path .\Server\Cargo.toml
  if ($LASTEXITCODE -ne 0) { throw "Rust tests failed" }

  if (Test-Path -LiteralPath ".\Web\temp\tsconfig.cocos.json") {
    npx tsc --noEmit --skipLibCheck -p .\Web\tsconfig.json
    if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed" }
  } else {
    Write-Host "SKIP TypeScript: open Web/ once in Cocos Creator to generate Web/temp/tsconfig.cocos.json"
  }

  Write-Host "PASS all available repository checks"
} finally {
  Pop-Location
}
