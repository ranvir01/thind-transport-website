# Spawn registry — bots Wright may create

Wright writes a ≤4000 paste from [`templates/`](templates/) and creates the Bot
in the Grok app **only after gogo quotes Ranvir and Ranvir replies yes**.
This file is the bench. It is not a license to spawn.

Live seats (14) are listed in [`SETUP.md`](SETUP.md). Do not duplicate them.

## Reuse before spawn

1. Is there already a bot whose job covers this? Assign that bot.
2. Would a new **skill** on an existing bot do it? Teach that instead.
3. Would a GitHub `should` issue + Fire Cursor do it? File the issue.
4. Only then propose a seat, and only if the target group still has a slot
   (product max 6 bots per channel).

## Week-2 bench (do not pre-create)

Propose only when Finch reports Cursor first-party **and** Grok week both
under 50%, and Ranvir says yes.

| Seat | Template | Group | Job |
|---|---|---|---|
| **Max** | [`templates/eng-ic.md`](templates/eng-ic.md) | LoadOff | Third IC (tests / integrations) |
| **Ash** | venture-cos shaped as data | LoadOff | Warehouse / KPI charts (PM-guide Ashley analog) |
| **Pete** | venture-cos shaped as PM | LoadOff | RFCs / product notes (PM-guide Pete analog) |

## Hard no

- Dormant ventures in [`docs/ops/PORTFOLIO.md`](../ops/PORTFOLIO.md) (FryBox,
  roofing, Tabletop, Gadget Fix, personal investing).
- Random public Grok templates (they inherit someone else's logins).
- OpenBot or any second runtime.
- Spawn during a Finch hard-stop (90% on any meter).
- A 15th seat without a retired unused routine in the same change.

Git writers update this file when a seat is created or retired. Wright drafts
the patch in `/workspace/org/spawn/` and cannot `git push`.
