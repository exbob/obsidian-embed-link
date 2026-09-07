#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

usage() {
  printf '用法: %s [clean]\n' "$0" >&2
  exit 2
}

if [[ "${1:-}" == "clean" ]]; then
  if [[ $# -ne 1 ]]; then
    usage
  fi
  rm -f main.js main.js.map
  rm -rf embed-link
  exit 0
fi

if [[ $# -ne 0 ]]; then
  usage
fi

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$node_major" -lt 18 ]]; then
  printf '错误: 需要 Node.js 18 或更高版本（当前: %s）\n' "$(node -v)" >&2
  exit 1
fi

# Call esbuild via node so Git Bash does not depend on the Windows `npm` shim
# (`npm` can fail with "No such file or directory"; `npm.cmd` is PowerShell/cmd).
node esbuild.config.mjs production

STAGING_DIR="$(mktemp -d "$ROOT_DIR/embed-link.staging.XXXXXX")"
BACKUP_DIR=""
published=0

cleanup() {
  if [[ "$published" -eq 0 ]]; then
    rm -rf "$STAGING_DIR"
    if [[ -n "$BACKUP_DIR" && -e "$BACKUP_DIR" && ! -e embed-link ]]; then
      mv "$BACKUP_DIR" embed-link || true
    fi
  else
    if [[ -n "$BACKUP_DIR" && -e "$BACKUP_DIR" ]]; then
      rm -rf "$BACKUP_DIR"
    fi
  fi
}
trap cleanup EXIT

cp main.js manifest.json styles.css "$STAGING_DIR/"

if [[ -e embed-link ]]; then
  BACKUP_DIR="$(mktemp -d "$ROOT_DIR/embed-link.backup.XXXXXX")"
  rmdir "$BACKUP_DIR"
  mv embed-link "$BACKUP_DIR"
fi

mv "$STAGING_DIR" embed-link
published=1

trap - EXIT
if [[ -n "$BACKUP_DIR" ]]; then
  rm -rf "$BACKUP_DIR"
fi
printf 'Embed Link 发布文件已写入 ./embed-link/\n'
