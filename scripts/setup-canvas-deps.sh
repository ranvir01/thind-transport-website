#!/usr/bin/env bash
# Install system libraries required by the node `canvas` devDependency
# (scripts/extract-pdf-pages.mjs, fix-legacy-signatures.mjs).
# Idempotent — safe to run before every npm install / cloud agent boot.
set -euo pipefail

readonly DEBIAN_PACKAGES=(
  build-essential
  pkg-config
  libcairo2-dev
  libpango1.0-dev
  libjpeg-dev
  libgif-dev
  librsvg2-dev
)

canvas_headers_present() {
  command -v pkg-config >/dev/null 2>&1 && pkg-config --exists cairo pango 2>/dev/null
}

install_linux() {
  if canvas_headers_present; then
    echo "setup-canvas-deps: canvas system libraries already present"
    return 0
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "setup-canvas-deps: apt-get not found — install manually: ${DEBIAN_PACKAGES[*]}" >&2
    return 1
  fi

  local sudo_cmd=()
  if [[ "$(id -u)" != "0" ]]; then
    sudo_cmd=(sudo)
  fi

  # A failed update (stale third-party PPAs 403/unsigned on cloud rigs) must not
  # abort the script — install still works from the package lists already on disk.
  if ! "${sudo_cmd[@]}" apt-get update -qq; then
    echo "setup-canvas-deps: apt-get update failed — proceeding with existing package lists" >&2
  fi
  DEBIAN_FRONTEND=noninteractive "${sudo_cmd[@]}" apt-get install -y --no-install-recommends "${DEBIAN_PACKAGES[@]}"
  echo "setup-canvas-deps: installed ${DEBIAN_PACKAGES[*]}"
}

install_macos() {
  if canvas_headers_present; then
    echo "setup-canvas-deps: canvas system libraries already present"
    return 0
  fi

  if ! command -v brew >/dev/null 2>&1; then
    echo "setup-canvas-deps: install Homebrew packages manually: pkg-config cairo pango libpng jpeg giflib librsvg"
    return 0
  fi

  brew install pkg-config cairo pango libpng jpeg giflib librsvg
  echo "setup-canvas-deps: installed canvas Homebrew packages"
}

case "$(uname -s)" in
  Linux) install_linux ;;
  Darwin) install_macos ;;
  *)
    echo "setup-canvas-deps: skipping unsupported OS ($(uname -s))"
    ;;
esac
