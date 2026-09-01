# Fire Cursor — written SOP (this is the teach)

ICs (Dex, Rex, Bee, Steve when assigned) run this from the Grok Bot computer.
Do **not** wait for Ranvir to record a Teach a task. The paste is the click-path.
Do **not** clone or grep the repo on the Grok computer — the cloud agent already
has the code (Morgan Linton: that doubles the work and burns the Grok meter).
xAI's own PM guide has eng ICs spin Cloud Agents; Cursor exposes three launch
paths ([cloud agents](https://cursor.com/docs/cloud-agent),
[API](https://cursor.com/docs/cloud-agent/api/endpoints)). We default to the
browser so no new secret is required.

**Never `git push`. Never merge.** Review the PR; Ranvir or the integrator merges.

## Default path (browser, no new secrets)

1. Open `cursor.com/agents`. The session is already Ranvir's.
2. If a **green** agent exists on **this repo**: New agent, **same repo + same
   model**, swap only Goal / Files / Done when / Verify.
3. Else: New agent → repo named in your paste → model from
   `/workspace/org/models.md` (Finch's today-line wins if it disagrees) →
   attach `AGENTS.md` via `@` → paste:

   ```
   Goal: …
   Files: …
   Done when: …
   Verify: …
   Land with Closes #N. Do not merge.
   ```

4. Start. Watch. When the PR opens, read the diff against Goal. Write the PR
   URL to your `*-last.md`. Ping Em (hub) or gogo (other repos).
5. After the first green run: “save this method as a skill” named **Fire Cursor**.
   Next time `/Fire Cursor`. If Teach a task is offered, record this once
   (≤10 min, no secrets on screen) to lock the skill — optional, not a gate.

## Faster path (GitHub, if the Cursor GitHub app is on the repo)

Comment on the issue, then watch `cursor.com/agents`:

```
@cursor Goal / Files / Done when / Verify as above. Open a PR. Do not merge.
```

Same outcome as the browser path. Still never merge.

## Optional path (API — only if a secret card exists)

If Finch or Ranvir placed a Cursor API key on the Agent Computer **secret
card** (never in chat, never in `/workspace`):

```
POST https://api.cursor.com/v1/agents
prompt.text = the four-line brief
repos[0].url = https://github.com/<owner>/<repo>
model.id = Finch's today-line
autoCreatePR = true
```

Do **not** ask Ranvir to mint a key so you can skip the browser. Browser first.

## Claude Code

- **Hub (Em only):** `claude.ai/code` when Finch says the Max 5x window is idle
  AND the work is bigger than one PR AND the ticket is not already on the live
  9-task fleet.
- **BLS (Bee):** never open `claude.ai/code`. That site is Cursor-only.
- **gogo / Finch / Wright / Scout / Ridge / Labs / Jeff / Rav / My:** never
  start a cloud agent yourself.
