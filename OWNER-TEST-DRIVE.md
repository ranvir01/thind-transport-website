# LoadOff — test drive & report back

**For: Ranvir.** Updated 2026-08-11.

This is the one file to fill in and send back. Everything here is a **drill you run
yourself** — no setup, no passwords, nothing you can break. Write straight into the
blank lines and hand the whole file back to me; I work from your words.

> **Where:** <https://thindtransport.com/hub/sandbox>
> **Login:** none. Tap a seat and you're in as that person.
> **Safety:** this is a fake company (Blue Ridge Haulage). Break anything. **Reset** puts
> it all back in about 20 seconds.

**How to answer:** tick one box per drill, then use the lines. Short is fine — "map froze",
"button too small", "didn't get why". Blank lines mean you didn't get to it, which is also
useful information.

---

## Before you start — 3 things that will otherwise look like bugs

1. **The company only moves while a tab is open.** Close the tab and time stops. Come
   back and it fast-forwards to catch up. That's deliberate (it costs nothing to run
   when nobody's playing), not a freeze.
2. **Brokers keep office hours: 6am–8pm Pacific.** Test at 1am and no new rate cons will
   drop — the board goes quiet on purpose. Trucks still roll, paperwork still lands.
   If you're testing late and want action, use **Crunch day** (below).
3. **Real time means real time.** A 700-mile lane takes ~13 hours, same as life. The
   world is *staged* so something always happens within minutes — a delivery ~35 min
   out, arrivals every ~12 min — but you will not watch a truck cross a state in an
   afternoon.

**Two scenarios on the seat-picker page:**
- **Steady week** — the normal company.
- **Crunch day** — the morning goes wrong on purpose: pickups 4 hours late, a truck dead
  at inspection, invoices past due. Use this one to see whether the software *helps* when
  it matters.

---

# PART 1 — Shift Mode (the new thing)

**Seven of the nine seats can clock in** — Dispatcher, Company driver, Accountant,
Owner, Safety manager, Recruiter, and Owner-operator. Each gets its own objectives
drawn from what that job actually does, live progress while you work, and a scored
recap when you clock out. Every seat you *don't* sit in is played by the AI, so the
company runs around you either way.

The two portal seats (Broker, Shipper) deliberately have **no** shift — they're your
customers looking in, not staff doing work. They keep their guided tour.

**Budget about 15 minutes per drill.** Do at least Drill 1 and Drill 2.

---

### Drill 1 — Dispatcher (desktop or laptop)

1. Open `/hub/sandbox` → **Reset** → take the **Dispatcher** seat (Marcus).
2. Tap **Clock in**. Read the three objectives.
3. Book a quoted load onto a driver — then **stop touching it**.
4. Open **Overview → Live map** and watch. Come back to the load board a few minutes later.
5. Tap **End shift** and read the recap. Tap **Copy recap**.

**Should happen:** new rate cons arrive on their own every few minutes; the load you
booked moves itself — dispatched → at pickup → rolling → delivered — with no clicks from
you; the map shows trucks actually moving; the recap scores what you did.

☐ Worked as described ☐ Partly ☐ Broken — didn't work

What I saw: ______________________________________________________________

What felt slow, confusing, or wrong: _____________________________________

Would this save you time on a real Tuesday morning? ______________________

---

### Drill 2 — Company driver (**on your phone** — this is the one that matters)

1. On your phone, open `/hub/sandbox` → take the **Company driver** seat (Jordan).
2. **Clock in.**
3. Work the load in front of you: **I'm here** at the pickup → **I'm heading to the
   pickup** / rolling → at the receiver, mark **Delivered** → **Snap & send** the POD.
4. **End shift**, read the recap.

**Should happen:** your truck is already ~35 minutes from delivering; you get a
notification when you arrive; the buttons are big enough to hit while distracted; the
sim never does your job for you — the taps are yours.

☐ Worked as described ☐ Partly ☐ Broken

What I saw: ______________________________________________________________

Anything too small, too hidden, or awkward one-handed: ___________________

Would a driver of yours actually use this? Why / why not: ________________

---

### Drill 3 — Accountant

1. Take the **Accountant** seat (Rosa) → **Clock in**.
2. Invoice a delivered load that's waiting to be billed.
3. Watch the aging/overdue numbers — payments land on their own as the shift runs.
4. **End shift**, read the recap.

**Should happen:** PODs keep landing so there's always something to bill; money comes
back in without you doing it; the recap counts what you invoiced and how much.

☐ Worked ☐ Partly ☐ Broken

What I saw: ______________________________________________________________

Does the money math match how you actually bill? ________________________

---

### Drill 4 — Two people at once (the multiplayer check)

Do this one with a second device, or a second browser window.

1. Desktop: **Dispatcher** seat. Phone: **Company driver** seat.
2. From the desktop, book and dispatch a load onto **Jordan Reyes**.
3. Watch the phone.

**Should happen:** the load shows up on the driver's phone within about half a minute,
without a refresh. Whichever seat nobody is sitting in gets played by the AI.

☐ Worked ☐ Partly ☐ Broken ☐ Didn't try

What I saw: ______________________________________________________________

---

### Drill 5 — Crunch day (does it help when things go wrong?)

1. Seat picker → **Crunch day** → take the **Dispatcher** seat.
2. Spend five minutes trying to sort out the mess.

**Should happen:** late pickups, a truck out of service, overdue invoices — and the
software should make it *obvious* what's on fire and what to do first.

☐ It made the mess clear ☐ Somewhat ☐ I couldn't tell what mattered

What I saw: ______________________________________________________________

What would a dispatcher need that wasn't on screen: ______________________

---

# PART 2 — The rest of the app

Quick passes. Tick and comment only where something's off.

**The other four shift seats** — clock in on each, see whether the objectives match
what that job really does, then clock out. This is the honesty check: if an objective
doesn't sound like the actual work, say so and I'll change it.

| # | Seat & shift | Objectives sound right? | Notes |
|---|---|---|---|
| 6 | **Owner** (Priya, `/hub`) — approve the pay run, pay it, move money, shrink the settlement queue | ☐ yes ☐ no | |
| 7 | **Safety** (Elena) — certify a repair to release a truck, log an incident, close one out | ☐ yes ☐ no | |
| 8 | **Recruiter** (Grace) — move 2 applicants forward, get an offer signed, hire through orientation | ☐ yes ☐ no | |
| 9 | **Owner-operator** (Sam) — move your load, send a receipt, draw an advance, file a DVIR | ☐ yes ☐ no | |

**The rest of the app** — quick passes, comment only where something's off.

| # | Drill | Result | Notes |
|---|---|---|---|
| 10 | **Broker portal** (Dana) — can your broker self-serve tracking + POD? | ☐ ok ☐ off | |
| 11 | **Shipper portal** (Alex) — quotes, pickups, delivery proof | ☐ ok ☐ off | |
| 12 | **Money** — invoices, aging, settlements to the penny | ☐ ok ☐ off | |
| 13 | **Fuel → IFTA** — a quarter's worth, reefer gallons handled | ☐ ok ☐ off | |
| 14 | **Dark mode** — flip your phone to dark and re-walk the driver app | ☐ ok ☐ off | |
| 15 | **One-handed on your phone** — anything you couldn't reach or read | ☐ ok ☐ off | |

Anything in Part 2 worth its own paragraph:

__________________________________________________________________________

__________________________________________________________________________

---

# PART 3 — The decision this was built for

The whole point of the sandbox is to answer this **before** paying for ELD tracking,
load boards, and fuel cards. Those cost real money and take real time to wire up.

**1. After playing: is this worth connecting the paid integrations to?**

☐ Yes — start connecting  ☐ Not yet — fix the list below first  ☐ No — here's why

__________________________________________________________________________

**2. Which integration would earn its money first?** (rank 1–4, 1 = first)

___ ELD / truck tracking (Motive, Samsara — live positions & hours)
___ Load boards (DAT / Truckstop — find freight in-app)
___ Fuel cards (WEX / EFS / Comdata — fuel imports, fraud catching)
___ QuickBooks (accounting sync)

Why that order: ___________________________________________________________

**3. Top 3 things to fix before you'd run a real week on this**

1. ________________________________________________________________________
2. ________________________________________________________________________
3. ________________________________________________________________________

**4. Anything missing that your business does every week and the software can't do yet**

__________________________________________________________________________

__________________________________________________________________________

**5. What's the single best thing in here?** (so I don't accidentally change it)

__________________________________________________________________________

---

# PART 4 — Free notes

Anything at all — half-formed is fine. Screenshots are better than descriptions; just
tell me roughly where in this file they belong.

__________________________________________________________________________

__________________________________________________________________________

__________________________________________________________________________

__________________________________________________________________________

---

## What I already know is unfinished (don't spend your time on these)

- **Broker and shipper portals are read-only in practice.** I audited this properly:
  the broker role has **zero** write permissions — Dana can watch tracking, open PODs
  and check invoice status, but there is nothing she can *do*. The shipper has exactly
  one write: submitting a quote request. That's why those two seats have no shift.
  **This is a real product decision I need you on:** should your brokers be able to
  do more from the portal — request a quote, upload a rate con, dispute an invoice,
  book directly — or is watch-only exactly right? ☐ watch-only is right ☐ they need
  to do more, namely: ______________________________________________
- **Push notifications, invoice email, live maps, FMCSA lookups** are waiting on keys
  and accounts — see `docs/OWNER-CHECKLIST.md`. Inside the sandbox they're simulated.
- **Photos are stock.** Real truck/yard/driver photos are the biggest visual upgrade
  left and only you can supply them.
- **Late-night quiet** — see the three notes at the top.

---

*Send this file back however's easiest — the whole thing, or just the lines you filled.
Tested on: ____________ (date) Device(s): ____________________*
