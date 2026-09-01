# Portfolio registry — scale filter

What agents may work, and what they must leave alone. Filed **2026-08-28**
(D-012). Route GitHub issues with one `venture:*` label.

A venture is **active** only if it can become a multi-million business **or**
help millions of people. Local shops, games, and personal investing stay
dormant by design — same Grok out-of-charter list as FryBox / roofing /
Tabletop Village.

This file is git-writer canon. Grok never edits it. The Friday digest
(`.github/workflows/portfolio-digest.yml`, `20:41` UTC) groups open `should`
issues by the labels below.

## Active

| Venture | Label | What it is | Repo / live | Who (Grok CoS in bold) |
|---|---|---|---|---|
| **LoadOff** | `venture:loadoff` | TMS for small carriers. Primary scale bet. | `ranvir01/thind-transport-website` · thindtransport.com/hub | **Em** (Eng Mgr) + Dex/Rex Fire Cursor + Claude 9-task fleet; gogo routes |
| **AR Payments LLC** | `venture:ar-payments` | Legal holding / billing company for Thind + ATS. Not a product. Bank + remittance + two-LLC allocation. | [`AR-PAYMENTS.md`](AR-PAYMENTS.md) · Dropbox Excel SoR | **Jeff** (ops); owner (bank). LoadOff never holds funds |
| **MyConsulting Network** | `venture:myco` | Talent / business marketplace. Quiet. | `ranvir01/myco-website` · Pages at `ranvir01.github.io/myco-website` (cite the repo, not a live product, until myconsulting.network is confirmed up) | **My** (quiet CoS). Owner-fired [`EXPANSION-PROMPT.md`](EXPANSION-PROMPT.md) later. Rav may cite GitHub/Pages as proof |
| **Career OS** | `venture:career` | Personal WA hybrid/remote AI-integration hunt **now**. Scale *goal* later: the same JD → one-page PDF → tracker loop as a product for millions of applicants. **Do not productize in this repo this sprint.** Parked: [#67](https://github.com/ranvir01/thind-transport-website/issues/67) (`needs-owner`). | private `ranvir01/Job-Applications` + Rav `/workspace/career/` | **Rav** (drafts only, no outreach unless asked) |
| **BLS** | `venture:bls` | Live client site. Proof + services revenue, not millions of users. | `ranvir01/bls-website` · bluelandscapingservices.com on **Netlify** | **Bee** (quiet CoS). Steve reads GitHub commit checks; expansion paste later |

Thind Transport + ATS as *trucking companies* are the cash engine that funds
LoadOff. They are not a `venture:*` of their own — they run through
`venture:ar-payments` (billing) and `venture:loadoff` (the product they prove).

## Dormant by design (no agent coverage)

- FryBox
- Roofing
- Tabletop Village
- **Gadget Fix** (`ranvir01/MyCO_Mike`, Tukwila phone repair — local shop, fails the millions filter; not the MyCO scale bet)
- `ranvir01/stock-research` (personal investing)
- `ranvir01/you-are-a-trillionaire` (UE5 sandbox)
- empty `ranvir01/My.AI`
- Battam1111/Myco (someone else's public project — do not cite)

Grok out-of-charter names these. Do not spawn a Bot, Claude task, or Cursor
automation for any dormant row.

## How work enters the queue

1. Anyone can **open** a GitHub issue (public repo).
2. A **collaborator** applies `should` (and optional `venture:*`). That label
   is the owner-curated trigger — it is not authorization; writers keep their
   ceilings (Grok: none; Cursor agent: PR; integrator: main).
3. `needs-owner` parks the card for Ranvir (bank, Form 2290, SMTP, apply-to-job).
4. `npm run agent:backlog` prints `## Open should-issues` above `Backlog:`
   trailers and prefers a labeled issue as TOP PICK.
5. Land with `Closes #N`. GitHub closes the issue; agents do not drive a
   label state machine.

Issue template: [`.github/ISSUE_TEMPLATE/should-item.md`](../../.github/ISSUE_TEMPLATE/should-item.md).
