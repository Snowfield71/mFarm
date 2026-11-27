#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python3 scripts/check_repository.py
cargo test --locked --manifest-path Server/Cargo.toml

if [[ -f Web/temp/tsconfig.cocos.json ]]; then
  npx tsc --noEmit --skipLibCheck -p Web/tsconfig.json
else
  echo "SKIP TypeScript: open Web/ once in Cocos Creator to generate Web/temp/tsconfig.cocos.json"
fi

echo "PASS all available repository checks"
