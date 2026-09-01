# Template — Labs idea card (Scout writes one file per bookmark)

Path: `/workspace/labs/ideas/YYYY-MM-DD-slug.md`

Also append the tweet ID to `/workspace/labs/ideas/_seen.md`.

```
# [title]

- Source: [tweet URL]
- Author: [handle] — why they are credible
- Date bookmarked:
- What they actually built: [not the tweet recap]
- Goal: one sentence
- Labs prompt (copy-paste):
  Goal: …
  Files: …
  Done when: …
  Verify: …
- Fit: hub TMS | AR Payments | MyCO | Career OS | BLS | fleet-automation | model-routing | none
- Cost: Grok turn | Cursor agent | Claude window | none
- Reject-if: [what would make us kill it]
- Status: demo | needs-owner | killed | ridge
```

If Fit is `none`, Scout marks `needs-owner` and does not send the card to Labs.
If Fit is `model-routing`, hand to Ridge, not Labs.
Never name the TMS product in the card body — write "hub TMS".
