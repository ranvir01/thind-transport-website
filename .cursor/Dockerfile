# Cursor background-agent image for this repo.
#
# WHY THIS FILE IS SELF-CONTAINED: `build.dockerfile` in environment.json is a
# real `docker build`, not a layer spliced onto a Cursor base image. The first
# version of this file opened with `RUN apt-get ...` and no `FROM`, on the
# assumption that Cursor would prepend its own Ubuntu stage. It does not — every
# environment build failed at parse time ("no build stage in current context"),
# which is why the Cursor side of this repo was dead. Anything the agent needs
# (node, git, native headers) has to be installed here.
#
# No CMD/ENTRYPOINT on purpose: Cursor starts the container with its own
# long-running command and runs the `install` step from environment.json inside
# it, as the `ubuntu` user.

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8

# Base toolchain. build-essential + pkg-config + python3 are node-gyp's
# requirements (bcrypt, canvas, sharp all compile); the lib*-dev set is what
# node-canvas links against — kept in sync with scripts/setup-canvas-deps.sh,
# which the install step re-checks and finds already satisfied here.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      git \
      gnupg \
      jq \
      libcairo2-dev \
      libgif-dev \
      libjpeg-dev \
      libpango1.0-dev \
      librsvg2-dev \
      openssh-client \
      pkg-config \
      python3 \
      sudo \
      unzip \
      xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Chrome's shared-library set, for the puppeteer devDependency that backs
# design-qa / qa:a11y / js-budget / qa:lighthouse. `npm install` downloads the
# browser binary; without these the launch dies with a bare "error while loading
# shared libraries" that reads like a puppeteer bug. Noble renamed several of
# these to a `t64` suffix (the 64-bit time_t transition) — try that name first
# and fall back, so this image still builds on a pre-24.04 base.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      fonts-liberation \
      libdrm2 \
      libgbm1 \
      libnspr4 \
      libnss3 \
      libpangocairo-1.0-0 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
      libxshmfence1; \
    for pkg in libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64; do \
      apt-get install -y --no-install-recommends "$pkg" \
        || apt-get install -y --no-install-recommends "${pkg%t64}"; \
    done; \
    rm -rf /var/lib/apt/lists/*

# Node 22 — the version CI pins (.github/workflows/*) and Vercel builds with.
# Straight from nodejs.org rather than a third-party apt repo: one fetch, no
# extra signing key to expire, and the exact patch is reproducible.
ARG NODE_VERSION=22.22.2
RUN set -eux; \
    curl -fsSL --retry 3 \
      "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
      -o /tmp/node.tar.xz; \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner; \
    rm /tmp/node.tar.xz; \
    node --version; \
    npm --version

# --- sidecar toolchains -----------------------------------------------------
# Go and Rust are here for one reason: `npm run test:sidecars` (make go-test +
# rust-test) is a gate whenever services/go or services/rust is touched, and an
# agent that cannot run the gate will ship past it. Both layers are droppable if
# this environment is ever narrowed to the Next.js app alone.

# Lifted out of the official Go image rather than fetched from go.dev: the
# builder already pulls from the registry for the base image, and a floating
# `1.23-bookworm` tag can't 404 the way a pinned tarball URL can. services/go
# declares `go 1.22`; the toolchain only has to be at least that.
COPY --from=golang:1.23-bookworm /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}" \
    GOPATH=/home/ubuntu/go

# Rust with clippy — the Makefile's rust-test runs `cargo clippy -D warnings`.
# Installed into /usr/local so the ubuntu user shares one toolchain; CARGO_HOME
# stays writable because cargo writes its registry cache there.
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH="/usr/local/cargo/bin:${PATH}"
RUN set -eux; \
    curl -fsSL --retry 3 https://sh.rustup.rs -o /tmp/rustup-init.sh; \
    sh /tmp/rustup-init.sh -y --no-modify-path --profile minimal \
      --default-toolchain stable --component clippy; \
    rm /tmp/rustup-init.sh; \
    chmod -R a+w "$CARGO_HOME" "$RUSTUP_HOME"; \
    rustc --version; \
    cargo clippy --version

# The agent runs as `ubuntu` (uid 1000, already present on the 24.04 base).
# Passwordless sudo so setup-canvas-deps.sh can still apt-install if this image
# ever drifts from the package list above instead of failing the install step.
RUN echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu \
    && mkdir -p /home/ubuntu/go \
    && chown -R ubuntu:ubuntu /home/ubuntu

USER ubuntu
WORKDIR /home/ubuntu
