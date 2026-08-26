# Working with AI properly — the owner's engineering workflow

For Ranvir. This is the durable version of "how do I use AI heavily AND run a
professional repo," written for how this project actually works — an agent
fleet that builds autonomously, plus you, learning to work alongside it. It
sets you up for the long run: the habits here are exactly the ones that
transfer to any job, team, or codebase later.

---

## 1. Authorship — the honest rule (read this first)

There are two kinds of commits in this repo, and they carry different names
because different parties are responsible for them:

- **Agent commits** (the autonomous sessions) carry an AI attribution trailer.
  That stays. It is an honest record of who did the work, and in THIS repo
  it's also your evidence: the "family carrier built its own TMS with an agent
  fleet" story is your differentiator for the fellowship and the launch
  narrative. This repo is *visibly* agent-built — hundreds of `claude/*`
  branches, CLAUDE.md, the routines docs. Stripping trailers wouldn't hide
  that; it would just make the history dishonest and inconsistent. Never
  rewrite pushed history to remove attribution.

- **Your commits** are yours, full stop. When you review a diff, understand
  it, test it, and commit it yourself, **you are the author** — no AI trailer
  needed, and that is the industry norm, not a trick. Nobody credits their
  compiler, their IDE, or Copilot. Authorship follows responsibility: the
  person who can defend the change in review is the author.

The line between the two is responsibility, not who typed. If you can't
explain a change, it isn't yours yet — keep reviewing (or let the agent
commit it under its own name).

**For other people's repos later** (a job, open source): follow that team's
AI policy, never paste private code into tools the team hasn't approved, and
always be able to defend every line you ship. Do that, and committing under
your own name is exactly right.

## 2. Your daily loop (the commands)

```bash
# 1. Always start from fresh main, on YOUR branch namespace
git fetch origin main
git checkout -b ranvir/<topic> origin/main   # ranvir/*, never claude/*
                                             # (the branch reaper only ever
                                             #  touches claude/* branches)

# 2. Build with AI as hard as you like — but YOU apply the changes.

# 3. Before anything is committed, in this order:
git status                       # what files changed? any surprises?
git diff                         # read EVERY hunk until you can say why it's there
npm test                         # 2,600+ tests — the fleet's safety net is yours too
node scripts/typecheck-gate.mjs  # zero type errors, app AND tests
npm run build                    # it must actually build
# UI change in the marketing pages? also: node scripts/token-lint.mjs

# 4. Stage by NAME (know what you're shipping; avoid `git add .`)
git add src/lib/foo.ts src/lib/__tests__/foo.test.ts

# 5. Commit with YOUR message — imperative subject, then the why
git commit
# subject: what the change does, ≤70 chars, imperative ("Add X", "Fix Y")
# body: why it's needed and anything a reviewer would ask about

# 6. Push your branch; never push main directly
git push -u origin ranvir/<topic>
```

Then either open a PR, or tell an agent: *"review and drain ranvir/<topic>"*
— the fleet's norm is that main only moves after the gates pass, and that
protects your commits exactly like it protects the agents'.

One-time local setup worth copying to your machine:

```bash
git config --global pull.rebase true          # linear history on pull
git config --global push.autoSetupRemote true # push -u without thinking
git config --global core.editor "code --wait" # commit messages in VS Code
```

## 3. House rules your commits must honor (same as the agents)

These are non-negotiable in this codebase — the test suite enforces most of
them, and reviewers (human or agent) will bounce anything that breaks them:

1. **Money is integer cents.** Never floats, never dollars in the database.
2. **Every hub query is tenant-scoped** — `carrier_id = $1` on every
   `hub.*` table touch. The cross-tenant harness will catch you if you forget.
3. **Migrations are append-only and idempotent** — read
   `migrations/hub/README.md` before writing one; never renumber.
4. **No secrets, ever** — not in code, tests, fixtures, or commit messages.
   Env-var *names* are fine; values never.
5. **No unverifiable marketing claims** — the guard test will fail the build.
6. Office screens use semantic tokens; no new heavy dependencies; MIT/BSD/
   Apache-2.0 dependencies only (see AGENTS.md).

## 4. How to review AI output (the skill that compounds)

Treat every AI diff as a draft from a fast, overconfident junior engineer:

- **Read until you can explain each hunk's "why."** If you can't, don't
  commit — ask the AI to explain it, then re-read. Explanation-then-review
  is how you learn the codebase for free.
- **Trust tests over vibes.** For a bug fix, ask for the failing test FIRST,
  see it fail, then the fix. A fix without a test is a rumor.
- **One concern per commit.** If the diff does two things, split it.
- **Red flags to bounce on sight:** invented APIs or config keys (verify
  against the real docs), `catch` blocks that swallow errors, changed
  constants nobody asked about, deleted or weakened tests, drive-by "while I
  was here" edits, and comments that narrate the AI's process instead of the
  code's constraints.
- **When something breaks, make the AI reproduce it before fixing it.** A
  fix for an unreproduced bug is usually a fix for the wrong bug.

## 5. What stays out of the repo

Prompts, scratch notes, and conversation logs are working materials, not
code. `.gitignore` now covers `scratch/`, `prompts/`, and `*.local.md` — put
personal notes there freely. (CLAUDE.md, AGENTS.md, and `docs/` stay
committed on purpose: they're the fleet's operating system, not scratch.)

## 6. The long-run growth path

Using AI well is a skill ladder — climb it deliberately:

1. **Now — review everything.** Your job on every change is the diff read,
   the gate run, and the commit message. That alone puts you ahead of most
   people using AI.
2. **Weekly — read one agent commit end to end** (`git log --stat`, pick
   one, read the full diff and its message). The commit messages in this
   repo are written to teach; twenty minutes a week compounds fast.
3. **Soon — write the tricky part yourself** and let AI fill in the
   boilerplate around it, instead of the reverse. You learn 10x more editing
   AI code than reading it, and 10x more than that writing the core.
4. **Always — you own the outcome.** The AI is never the reason something
   shipped broken; the review was. That mindset is what "using AI properly"
   actually means, and it's what a future team will actually judge.
