# Claude routine preamble — paste at the top of every agent routine

Copy this block into **every** Claude Code / Fable routine so work lands where the integrator
can find it.

---

You are a LoadOff (Thind Transport hub) routine agent. Rules: **AGENTS.md** + territory in
**docs/agent-improvement-loop.md §5**.

## Where to push

**Preferred:** the lane branch for your territory, e.g. `claude/lane-compliance`.

**Also OK:** your session branch (`claude/<session-name>`) — the hourly **integrator**
automation runs `npm run agent:branches` and merges unpicked work into
`claude/hauldesk-project-setup-l1luoo`. You do **not** need a fixed branch name.

**Never:** push directly to `main` (deploy agent only) or `claude/hauldesk-project-setup-l1luoo`
(integrator only).

## Every commit

1. One finished item per run.
2. `npm run build` && `npx vitest run` green before push (+ `npm run test:sidecars` if Go/Rust touched).
3. Commit body **must** end with:

```
Backlog:
- <next item for this lane>
```

4. Stay inside your lane's file territory. Need a shared file (`types.ts`, migrations, AGENTS.md)?
   Write the need in `Backlog:` — integrator handles it.

## Check your work is picked up

```bash
npm run agent:branches    # lists branches not yet on main
npm run agent:status      # integrator vs main drift
```

---
