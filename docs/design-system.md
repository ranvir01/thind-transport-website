# HaulDesk Design System

HaulDesk is the operations product under `/hub/*`, the driver PWA under
`/hub/driver`, and the tracking portal under `/track/*`.

## Current implementation status

- The public recruiting site keeps the existing Thind Transport brand system.
- The Hub currently ships the inherited navy/gold operating shell from the prior
  TMS build plus the mobile sandbox additions.
- The v3 white/near-white, six-accent, token-only redesign is the next visual
  hardening phase. No production business facts depend on that redesign.

## Token intent

The target Hub token set is semantic, not brand-color-by-component:

| Token | Use |
|---|---|
| `--background` | App background |
| `--surface` | Cards, panels, table containers |
| `--surface-elevated` | Popovers, peek panels, floating bars |
| `--border` | 1px dividers and card edges |
| `--foreground` | Primary text |
| `--muted-foreground` | Secondary text |
| `--primary` | One accent at a time: primary buttons, active nav, focus |
| `--primary-foreground` | Text on accent |
| `--ring` | 2px focus ring |
| `--destructive` | Destructive/error only |
| `--status-success` | Delivered, paid, healthy |
| `--status-warning` | Expiring, late-warning, at-risk |
| `--status-danger` | Overdue, failed, critical |
| `--status-neutral` | Draft, planned, inactive |

## Accent presets

The intended presets are:

1. Graphite
2. Indigo
3. Emerald
4. Teal
5. Amber
6. Violet

Status colors stay fixed across every accent theme so “red” always means error,
overdue, failed, or destructive.

## Component rules already enforced in the mobile milestone

- 390px driver PWA layout is single-column.
- Driver PWA primary action is full-width and 56px+ tall.
- Inputs in setup forms use 16px-capable mobile sizing.
- Sandbox mode is visibly labeled with a `SANDBOX` badge.
- Money columns and KPI values use tabular/right-aligned formatting where tables
  already existed in the baseline.
- Fleet map now uses a dependency-free approximate position view instead of a
  heavy tile-map dependency, keeping the Hub faster on mobile and avoiding API
  key/vendor coupling until live ELD data is connected.
- Red/orange buttons are still inherited from the prior Hub visual system; red
  decorative cleanup remains a design-hardening task.

## Key screen evidence

Latest verified quick tunnel:

```text
https://apr-shift-scored-volunteer.trycloudflare.com
```

Manual tests were run at ~375–390px:

- `/hub/driver` — secure PWA status, SANDBOX DRIVER, camera POD button, bottom tabs.
- `/hub` — SANDBOX badge, All companies / Thind / ATS switcher, KPI cards.
- `/hub/loads` — populated lifecycle load list.
- `/hub/money` — populated AR aging buckets.
- `/hub/fleet` — populated trucks/trailers.
- `/hub/ranker` — deterministic scored candidate loads with math.

## Remaining design gates

- Convert Hub shell to white/near-white default surface.
- Add Settings → Appearance with accent picker and light/dark/system mode.
- Remove hardcoded hex/rgb/hsl from Hub components and enforce via grep.
- Verify AA contrast for six accents × light/dark.
- Capture desktop + 390px screenshots after final token pass.
