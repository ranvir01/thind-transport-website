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
  # node-canvas compiles against all of these, not just cairo/pango — a rig
  # with cairo+pango but no giflib/jpeg/rsvg headers still fails `npm install`
  # (fatal error: gif_lib.h). giflib ships no .pc file, so probe the header
  # through the preprocessor instead of pkg-config.
  command -v pkg-config >/dev/null 2>&1 || return 1
  pkg-config --exists cairo pango pangocairo libjpeg librsvg-2.0 2>/dev/null || return 1
  command -v cpp >/dev/null 2>&1 || return 1
  echo 'int main(void){return 0;}' | cpp -include gif_lib.h - >/dev/null 2>&1
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

  "${sudo_cmd[@]}" apt-get update -qq
  DEBIAN_FRONTEND=noninteractive "${sudo_cmd[@]}" apt-get install -y --no-install-recommends "${DEBIAN_PACKAGES[@]}"

  if ! canvas_headers_present; then
    echo "setup-canvas-deps: headers still missing after apt install — node-canvas will not compile" >&2
    return 1
  fi
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
