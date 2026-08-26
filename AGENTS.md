# AGENTS.md

## Cursor Cloud specific instructions

### Product

Single **Next.js 16** full-stack app (Thind Transport recruitment + driver onboarding). No Docker Compose or separate backend. See `README.md` and `SETUP.md` for feature docs.

### Services

| Service | Command | URL |
|---------|---------|-----|
| Next.js dev (required) | `npm run dev` | http://localhost:3000 |

Optional: `npm run legacy:dev` for archived Vite site under `archive/` (not needed for main product).

### Environment

- Cloud Agent **install** creates `.env.local` when missing (`NEXTAUTH_URL=http://localhost:3000` plus a generated `NEXTAUTH_SECRET`) and then runs `npm ci`.
- Cloud Agent **start** runs `npm run dev` on http://localhost:3000.
- Copy `.env.example` → `.env.local` before driver auth flows if you are not using the Cloud Agent install path.
- Minimum for local auth: `NEXTAUTH_URL=http://localhost:3000` and `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`).
- Email (`SMTP_*` or `EMAIL_*`) is optional for browsing; required for contact/meeting/email submission APIs.
- Without `POSTGRES_URL`, driver data persists to `data/drivers.json` and `data/applications.json` (auto-created).

### Dev server notes

- `package.json` scripts prefix `PATH` with `/home/naan/.local/node/bin`; on Cloud VMs the system Node (`node`/`npm` on PATH) still works and `npm run dev` starts normally.
- Use a **tmux** session for long-running `npm run dev` (see Cloud Agent tmux conventions).
- After `npm run build`, restart `npm run dev` if you need the dev server again (build does not leave a server running).

### Local driver onboarding test data

- Valid invitation code in local JSON mode: **`THIND-2026`** (see `src/lib/driver-db.ts`).

### Lint / test

- **Lint:** `npm run lint` currently fails on ESLint 9 because the repo only has `.eslintrc.json` (no `eslint.config.js`). This is a pre-existing config mismatch, not an install issue.
- **Build:** `npm run build` is the reliable compile check.
- No automated test script is defined in `package.json`.

### Standard commands (see `package.json`)

- Install: `npm ci` (lockfile) or `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Production serve: `npm start` (after build)
