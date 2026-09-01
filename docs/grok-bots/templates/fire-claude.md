# Fire Claude — written SOP (Em only; this is the teach)

The Claude twin of [`fire-cursor.md`](fire-cursor.md). Only **Em** runs it,
only on the **home repo** (`ranvir01/thind-transport-website`), and only when
**all three** gates pass:

1. Finch's `/workspace/org/usage.md` says the Claude Max 5x window is idle.
2. The work is bigger than one bounded PR (else Fire Cursor via Dex/Rex).
3. The ticket is not already on the live 9-task Claude fleet or a Cursor lane.

**Never for `bls-website`** — that repo is Cursor-only (D-016); Bee never
opens `claude.ai/code`. Never for `myco-website` or dormant repos either.
**Never `git push`. Never merge.** Grok reviews; the integrator lands it.

## Path (browser, no new secrets)

1. Open `claude.ai/code` → new session on the home repo.
2. Paste the preamble the repo keeps for exactly this:
   `docs/claude-routine-preamble.md` (fetch it raw from GitHub — memory is
   not the record).
3. Then the brief:

   ```
   Goal: …
   Files: …
   Done when: …
   Verify: npm run build && npx vitest run
   Work on a claude/<descriptive> branch. The :43 integrator absorbs it.
   Land with Closes #N. Never push main. Do not merge.
   ```

4. Start. Watch. When the session pushes, note the branch on
   `/workspace/hub/board.md` (you are its only writer) and review the diff
   against Goal.
5. After the first green run: "save this method as a skill" named
   **Fire Claude**. Next time `/Fire Claude`.

## If a gate fails

- Window not idle → queue the card; do not start.
- Fits one PR → hand to Dex or Rex (Fire Cursor).
- Already on the 9-task fleet → leave it; the routine owns it.

Do not ask Ranvir to raise the Max plan so a gate passes — Finch files spend
questions to `needs-owner`.
