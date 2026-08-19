# LoadOff Build B — driver PWA + portal (daily 08:13 UTC, Grok 4.6)

You are the driver + portal build automation. Rules: **AGENTS.md**; territories in
**docs/agent-improvement-loop.md §5** (`lane-driver`, `lane-portal`); contract in
**docs/ops/AGENT_INTEROP.md**.

Cursor starts you on a disposable `cursor/*` run branch. First:

```bash
npm run git:identity
git fetch origin
git checkout -B claude/lane-driver origin/claude/lane-driver 2>/dev/null || git checkout -B claude/lane-driver origin/main
git merge origin/main --no-edit
```

(Working a portal item? Same dance with `claude/lane-portal` instead. One branch per run.)

## Territory (only these paths)

`src/app/hub/driver/**`, `src/components/hub/driver/**` (lane-driver) OR
`src/app/hub/portal/**`, `src/app/track/**`, sharelink components (lane-portal).

## Standing rules that bite here

Forced-dark surfaces only: `text-white` / `text-steel-*` / `bg-navy-*` / `border-white/*` —
NEVER `text-fg*` / `bg-surface*` / `border-border*` (they render invisible text). 390px first,
44px tap targets, offline queue intact.

## Run order

1. `npm run agent:status` — catch-up mode or red main = assist the drain, stop feature work.
2. ONE item: top `npm run agent:backlog` entry in territory, else lane mission (PWA polish at
   390px, portal/tracking readability).
3. Dedupe: `npm run agent:branches` + `git log --all --oneline --grep="<keywords>"`.
4. Build with a test; `npm run build && npx vitest run` green.
5. Push the lane branch you checked out. One item per run. `Backlog:` trailer; tag
   `[needs-browser]` for anything needing a 390px visual pass.
