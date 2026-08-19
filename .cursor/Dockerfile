# Cursor background-agent image for this repo.
#
# WHY THIS FILE IS SELF-CONTAINED: `build.dockerfile` in environment.json is a
# real `docker build`, not a layer spliced onto a Cursor base image. The first
# version of this file opened with `RUN apt-get ...` and no `FROM`, on the
# assumption that Cursor would prepend its own Ubuntu stage. It does not — the
# build died at parse time ("no build stage in current context"), which is why
# the Cursor side of this repo was dead. Everything the agent needs is here.
#
# DELIBERATELY SMALL. This image builds the Next.js app and runs vitest — that
# is the whole brief. It has no browser (the puppeteer-backed design-qa /
# qa:a11y / js-budget / qa:lighthouse gates) and no Go or Rust (the
# `npm run test:sidecars` gate); run those locally or in CI until this image is
# proven green and the layers are added back deliberately. Every line below is
# either the registry or Ubuntu's own archives — no third-party downloads to
# 404, rate-limit, or rotate a signing key on us.
#
# No CMD/ENTRYPOINT on purpose: Cursor starts the container with its own
# long-running command and runs environment.json's `install` inside it, as the
# `ubuntu` user.

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8

# build-essential + pkg-config + python3 are node-gyp's requirements (bcrypt,
# canvas and sharp all compile on install); the lib*-dev set is what node-canvas
# links against — the same list scripts/setup-canvas-deps.sh probes for, so the
# install step finds it satisfied and no-ops instead of apt-getting again.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      git \
      libcairo2-dev \
      libgif-dev \
      libjpeg-dev \
      libpango1.0-dev \
      librsvg2-dev \
      pkg-config \
      python3 \
      sudo \
    && rm -rf /var/lib/apt/lists/*

# Node 22 — CI's pin and what Vercel builds with — lifted out of the official
# image instead of fetched from nodejs.org. The builder already talks to the
# registry for the base image, so this adds no new network dependency, and a
# floating `22-bookworm-slim` tag cannot 404 the way a pinned tarball URL can.
# The binary is glibc-linked against bookworm and runs fine on noble's newer
# glibc. The two symlinks are how the node image itself exposes npm/npx.
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN set -eux; \
    ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm; \
    ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx; \
    node --version; \
    npm --version

# There is no browser in this image, so puppeteer's ~130MB Chrome download would
# be 130MB of nothing — and its postinstall is a documented flake path for this
# repo (see the install step in .github/workflows/e2e-suite.yml). Drop this line
# in the same commit that adds Chrome's shared libraries back.
ENV PUPPETEER_SKIP_DOWNLOAD=1

# The agent runs as `ubuntu` (uid 1000, already present on the 24.04 base).
# Passwordless sudo so setup-canvas-deps.sh can still apt-install if this list
# ever drifts from the script's, instead of failing the install step outright.
RUN echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu \
    && chown -R ubuntu:ubuntu /home/ubuntu

USER ubuntu
WORKDIR /home/ubuntu
