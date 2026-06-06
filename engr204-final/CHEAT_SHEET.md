# ENGR&204 — THE ULTIMATE FINAL EXAM CHEAT SHEET

**Circuit Analysis · Green River College**
Unlimited pages — everything you need to solve any problem. RL / RC / RLC sections are expanded because the final weights end-of-quarter material most.

How to read the math: `*` = multiply, `^` = power, `sqrt()` = square root, `||` = "in parallel with". Angles for phasors written like `V∠θ`. `j = sqrt(-1)`.

---

## §0. "WHICH METHOD DO I USE?" — DECISION GUIDE

Read the problem, match the trigger, jump to the section.

| If the problem… | Use | Section |
|---|---|---|
| Has a switch / says "at t = 0" / asks for `v(t)` or `i(t)` with **one** C or L | First-order transient (RC/RL) | **§9** |
| Has **both** an L and a C and a switch / asks for transient response | Second-order (RLC) | **§10** |
| Says "sinusoidal", "60 Hz", "cos(ωt)", gives impedances, steady-state AC | Phasors + impedance | **§11** |
| Asks for average/real/reactive power, power factor, kVA | AC power | **§12** |
| Has only resistors + sources, asks node voltages | Nodal analysis | **§5** |
| Has only resistors + sources, asks loop/branch currents (planar) | Mesh analysis | **§6** |
| Asks for "equivalent circuit seen by RL" / "Thévenin / Norton" | Thévenin/Norton | **§8** |
| Asks "what R_L gives max power?" | Max power transfer | **§8** |
| Has op-amps (triangle symbol) | Ideal op-amp rules | **§13** |
| "Find power delivered by source", multiple sources, linear | Superposition or direct | **§7** |
| Resistors in a triangle/star you can't reduce | Δ–Y transform | **§4** |

**Universal first moves on ANY problem:**
1. Label every node, pick a reference (ground) node.
2. Mark current directions and voltage polarities (be consistent — passive sign convention).
3. Note what's asked and the units.
4. For transient: find the state **before** the switch (`t = 0⁻`) and **long after** (`t = ∞`).

---

## §1. FUNDAMENTALS, UNITS & SIGN CONVENTIONS

**Quantities & SI units**

| Quantity | Symbol | Unit |
|---|---|---|
| Charge | q | coulomb (C) |
| Current | i | ampere (A) = C/s |
| Voltage | v | volt (V) = J/C |
| Power | p | watt (W) = J/s |
| Energy | w | joule (J) |
| Resistance | R | ohm (Ω) |
| Conductance | G = 1/R | siemens (S) |
| Capacitance | C | farad (F) |
| Inductance | L | henry (H) |
| Frequency | f | hertz (Hz) |

**Metric prefixes:** p=10⁻¹², n=10⁻⁹, µ=10⁻⁶, m=10⁻³, k=10³, M=10⁶, G=10⁹.

**Core definitions**
- Current: `i = dq/dt` → `q = ∫ i dt`.
- Voltage (energy per charge): `v = dw/dq`.
- Power: `p = v·i`. Energy: `w = ∫ p dt`.

**Passive Sign Convention (PSC) — memorize this:**
Current enters the **+** terminal of an element → `p = +v·i` is power **absorbed**.
- `p > 0`: element **absorbs** power (resistor, charging C/L).
- `p < 0`: element **delivers** power (a source).
- Conservation of power: `Σ p_absorbed = Σ p_delivered` (total = 0).

**Ohm's Law:** `v = i·R`, `i = v/R`, `R = v/i`.
Power in a resistor (always absorbed, ≥ 0): `p = v·i = i²·R = v²/R`.

---

## §2. SOURCES

- **Independent voltage source:** fixed `v`, any current. Symbol: circle with + / −.
- **Independent current source:** fixed `i`, any voltage. Symbol: circle with arrow.
- **Dependent (controlled) sources:** diamond symbol. Value depends on another `v` or `i`:
  - VCVS `v = µ·v_x`, CCCS `i = β·i_x`, VCCS `i = g·v_x`, CCVS `v = r·i_x`.
- **Ideal vs practical:** practical voltage source = ideal source + series R; practical current source = ideal source + parallel R.

**Source killing (for superposition / Thévenin):**
- Kill a **voltage** source → replace with a **short** (wire, 0 V).
- Kill a **current** source → replace with an **open** (gap, 0 A).
- **Never kill dependent sources** — keep them active.

---

## §3. KIRCHHOFF'S LAWS & SERIES/PARALLEL

**KCL (Current Law):** sum of currents **into** a node = sum **out**. (`Σ i = 0` at a node.) Based on charge conservation.

**KVL (Voltage Law):** sum of voltage drops around any closed loop = 0. (`Σ v = 0`.) Based on energy conservation.

**Series resistors** (same current): `R_eq = R1 + R2 + …`
**Parallel resistors** (same voltage): `1/R_eq = 1/R1 + 1/R2 + …`
- Two in parallel: `R_eq = (R1·R2)/(R1 + R2)` ("product over sum").
- `N` equal resistors `R` in parallel: `R/N`.

**Voltage divider** (series resistors, source `V` across them):
`V_k = V · R_k / (R1 + R2 + … )`

**Current divider** (two parallel resistors, total current `I` in):
`I_1 = I · R2/(R1+R2)`, `I_2 = I · R1/(R1+R2)`
(current prefers the smaller resistor — note the **opposite** resistor is on top.)

Capacitors/inductors combine like this (see §9 for derivations):
- Inductors: series add, parallel reciprocal (like resistors).
- Capacitors: **opposite** — parallel add, series reciprocal.

---

## §4. DELTA–WYE (Δ–Y / π–T) TRANSFORMATION

Use when no two resistors are purely series or parallel.

**Δ → Y** (Δ resistors `R_a, R_b, R_c`; product of the two adjacent over the sum of all three):
```
R1 = (R_b·R_c)/(R_a+R_b+R_c)
R2 = (R_c·R_a)/(R_a+R_b+R_c)
R3 = (R_a·R_b)/(R_a+R_b+R_c)
```
**Y → Δ** (Y resistors `R1, R2, R3`; sum of pairwise products over the opposite resistor):
```
R_a = (R1·R2 + R2·R3 + R3·R1)/R1
R_b = (R1·R2 + R2·R3 + R3·R1)/R2
R_c = (R1·R2 + R2·R3 + R3·R1)/R3
```
Balanced case: `R_Y = R_Δ/3`, `R_Δ = 3·R_Y`.

---

## §5. NODAL ANALYSIS (node voltages)

Best when the circuit has many parallel branches / current sources.

**Steps**
1. Pick a **reference node** (ground, 0 V) — choose the one with most connections.
2. Label remaining node voltages `v1, v2, …`.
3. Write **KCL at each non-reference node**, expressing branch currents via Ohm's law:
   current **leaving** node A through R to node B = `(v_A − v_B)/R`.
4. Solve the linear system for the node voltages.

General term (sum of currents leaving node = injected source current):
`Σ (v_node − v_other)/R = I_in`

**Supernode:** when a voltage source sits **between two non-reference nodes** (no resistor isolates it):
- Enclose both nodes in a "supernode," write one KCL around the whole thing.
- Add the **constraint equation:** `v_a − v_b = V_source`.

If a voltage source connects a node to **ground**, that node voltage is simply known (= source value).

---

## §6. MESH ANALYSIS (loop currents)

Best for planar circuits with many series elements / voltage sources.

**Steps**
1. Assign **clockwise** mesh currents `i1, i2, …` to each window.
2. Write **KVL around each mesh**. A resistor shared by meshes `i1` and `i2` has voltage `R·(i1 − i2)` (use the mesh you're summing first).
3. Solve for mesh currents. Branch current in a shared element = difference of the two mesh currents.

**Supermesh:** when a **current source is shared between two meshes**:
- Combine the two meshes into a supermesh (skip the branch with the source) and write one KVL.
- Add the **constraint:** `i_a − i_b = I_source` (sign by the source's direction).

If a current source is only in **one** mesh, that mesh current is known (= source value).

---

## §7. SUPERPOSITION & SOURCE TRANSFORMATION

**Superposition** (linear circuits only): the response = sum of responses from each **independent** source acting alone.
- Turn on one independent source, **kill all others** (V→short, I→open). Keep dependent sources.
- Solve, repeat for each source, **add** results (with sign).
- ⚠️ Does **not** apply directly to power (power is nonlinear, `∝ i²`). Find total `v` or `i` first, then compute power.

**Source transformation** (equivalent between terminals):
- Voltage source `V` in series with `R` ⇄ Current source `I = V/R` in parallel with the **same** `R`.
- Arrow of current source points toward the **+** terminal of the voltage source.
- Great for simplifying a circuit step-by-step before nodal/mesh. Works with impedances in AC too.

---

## §8. THÉVENIN, NORTON & MAXIMUM POWER TRANSFER

Replace any linear two-terminal network with a simple equivalent at terminals a–b.

- **Thévenin:** voltage source `V_th` in **series** with `R_th`.
- **Norton:** current source `I_N` in **parallel** with `R_N`. (`R_th = R_N`.)
- Relationship: `V_th = I_N · R_th`.

**Finding V_th (open-circuit voltage):** remove the load, find `V_oc` across a–b. That's `V_th`.

**Finding I_N (short-circuit current):** short a–b, find the current through the short `I_sc`. That's `I_N`.

**Finding R_th — three methods:**
1. **No dependent sources:** kill all independent sources (V→short, I→open), find equivalent resistance looking into a–b.
2. **Has dependent sources:** kill independent sources only, apply a test source `V_test` (e.g. 1 V) at a–b, find `I_test`; `R_th = V_test / I_test`. (Or inject 1 A, find V.)
3. **Always works:** `R_th = V_oc / I_sc`.

**Maximum Power Transfer:** a load `R_L` draws maximum power when
`R_L = R_th`.
Then `P_max = V_th² / (4·R_th)`.
(AC version: `Z_L = conj(Z_th)`, i.e. `R_L = R_th`, `X_L = −X_th`; `P_max = |V_th|²/(8·R_th)` using amplitudes / `V_th,rms²/(4R_th)` using RMS.)

---

## §9. FIRST-ORDER CIRCUITS — RC & RL (★ HIGH YIELD ★)

These are the most common transient problems. **Memorize the master formula.**

### 9.1 Element i–v laws, energy, combinations

**Capacitor** (stores energy in E-field; voltage can't change instantly):
- `i = C · dv/dt` → `v(t) = v(0) + (1/C)∫₀ᵗ i dτ`
- Energy: `w = ½·C·v²`
- DC steady state: `i = 0` → capacitor acts like an **OPEN** circuit.
- **`v_C` is continuous:** `v_C(0⁺) = v_C(0⁻)`.
- Combine: parallel `C_eq = C1 + C2 + …`; series `1/C_eq = 1/C1 + 1/C2 + …`.

**Inductor** (stores energy in B-field; current can't change instantly):
- `v = L · di/dt` → `i(t) = i(0) + (1/L)∫₀ᵗ v dτ`
- Energy: `w = ½·L·i²`
- DC steady state: `v = 0` → inductor acts like a **SHORT** circuit (wire).
- **`i_L` is continuous:** `i_L(0⁺) = i_L(0⁻)`.
- Combine: series `L_eq = L1 + L2 + …`; parallel `1/L_eq = 1/L1 + 1/L2 + …`.

### 9.2 The MASTER FORMULA (any first-order, DC switching)

For **any** voltage or current `x(t)` in a first-order circuit after a switch at t = 0:

```
x(t) = x(∞) + [ x(0⁺) − x(∞) ] · e^(−t/τ)      , for t ≥ 0
```

You need three things:
1. **`x(0⁺)`** = initial value (just after switching).
2. **`x(∞)`** = final / steady-state value (long after switching).
3. **`τ`** = time constant.

**Time constant τ:**
- **RC circuit:** `τ = R_th · C`
- **RL circuit:** `τ = L / R_th`
where `R_th` = Thévenin resistance seen by the C or L **with all independent sources killed and the switch in its t>0 position** (the C/L is the "load").

### 9.3 Step-by-step recipe (use this every time)

1. **t = 0⁻ (before switch):** assume DC steady state. Capacitor = open, inductor = short. Find `v_C(0⁻)` or `i_L(0⁻)`.
2. **Apply continuity:** `v_C(0⁺) = v_C(0⁻)`, `i_L(0⁺) = i_L(0⁻)`. These are your *only* guaranteed continuous quantities — everything else can jump.
3. **t = ∞ (after switch, new steady state):** capacitor = open, inductor = short again. Find `x(∞)`.
4. **τ:** kill independent sources (in the t>0 circuit), find `R_th` across the C/L terminals. `τ = R_th·C` or `L/R_th`.
5. **Plug into master formula.** Done.
6. If they ask for a quantity that *isn't* the state variable (e.g. resistor voltage, capacitor current), find it from the state variable using Ohm's/KVL/KCL at the relevant instant, or use the master formula directly with that quantity's own `(0⁺)`, `(∞)` values.

**Time-constant intuition:** after `1τ` the response has moved ~63% to final; after `5τ` it's ~99% done (treated as "steady state").

### 9.4 Natural vs step response (terminology)
- **Natural / source-free response:** no source for t>0, `x(∞)=0` → `x(t)=x(0)·e^(−t/τ)` (pure decay).
- **Step response:** a DC source is switched in → the full master formula with nonzero `x(∞)`.

### 9.5 WORKED EXAMPLE — RC step response
> 12 V source in series with R1 = 4 kΩ, then node connects to C = 250 µF and the switch. For t<0 the switch has left the cap uncharged; at t=0 the source is connected through R1 to the capacitor (R1 = 4 kΩ is the only resistance in the charging path). Find `v_C(t)` for t ≥ 0.

1. `v_C(0⁻) = 0` → `v_C(0⁺) = 0`.
2. `t=∞`: cap = open, no current, no drop across R1 → `v_C(∞) = 12 V`.
3. `τ = R·C = 4000 · 250e-6 = 1.0 s`.
4. `v_C(t) = 12 + (0 − 12)e^(−t/1) = 12(1 − e^(−t))` V.
- Charging current: `i(t) = C·dv/dt = 250e-6·12·e^(−t) = 3·e^(−t) mA` (jumps to 3 mA at t=0⁺, decays to 0).

### 9.6 WORKED EXAMPLE — RL natural response
> An inductor L = 2 H carries `i_L = 5 A` in steady state through a network. At t=0 the source is removed and the inductor sees R = 10 Ω. Find `i_L(t)`.

1. `i_L(0⁻) = 5 A` → `i_L(0⁺) = 5 A`.
2. Source removed, `i_L(∞) = 0`.
3. `τ = L/R = 2/10 = 0.2 s`.
4. `i_L(t) = 0 + (5−0)e^(−t/0.2) = 5·e^(−5t)` A.
- Voltage across L: `v_L = L·di/dt = 2·(−25)e^(−5t) = −50·e^(−5t)` V (note it jumps instantly — only current is continuous).

### 9.7 Common traps
- Forgetting that at `t=0⁻` you must solve a **full DC circuit** (cap open / ind short) to get the initial condition.
- Using the wrong `R_th` for τ (must be resistance seen by the element in the **t>0** configuration with sources killed).
- Assuming `v_C` or `i_L` can jump — they can't. (Resistor voltages, cap currents, ind voltages CAN jump.)
- Mixing units (µF, kΩ → check τ).

---

## §10. SECOND-ORDER CIRCUITS — RLC (★ HIGH YIELD ★)

A circuit with **both** an inductor and a capacitor → described by a 2nd-order ODE. Expect at least one of these on the final.

### 10.1 Two standard topologies

**Series RLC** (R, L, C in one loop):
- `α = R / (2L)` (neper frequency / damping coefficient)
- `ω₀ = 1 / sqrt(L·C)` (undamped natural / resonant frequency)

**Parallel RLC** (R, L, C across same two nodes):
- `α = 1 / (2·R·C)`
- `ω₀ = 1 / sqrt(L·C)`

(Note: ω₀ is the same for both; only α's formula differs. **Series uses R/(2L); parallel uses 1/(2RC).**)

### 10.2 Damping — compare α to ω₀

| Condition | Name | Roots `s = −α ± sqrt(α²−ω₀²)` | Response form (for t≥0) |
|---|---|---|---|
| `α > ω₀` | **Overdamped** | two real `s1, s2` | `x(t) = A1·e^(s1 t) + A2·e^(s2 t)` |
| `α = ω₀` | **Critically damped** | repeated `s = −α` | `x(t) = (A1 + A2·t)·e^(−α t)` |
| `α < ω₀` | **Underdamped** | complex `−α ± jω_d` | `x(t) = e^(−α t)(A1·cos ω_d t + A2·sin ω_d t)` |

**Damped frequency (underdamped):** `ω_d = sqrt(ω₀² − α²)`.

For a **step response**, add the forced/final value: total `x(t) = x(∞) + (transient terms above)`. For a **source-free (natural)** response, `x(∞)=0`.

### 10.3 Finding the constants A1, A2

You need **two** initial conditions: the value and the **derivative** at t=0⁺.

1. Find `x(0⁺)` (use continuity of `v_C` and `i_L`).
2. Find `dx/dt|₀⁺`. Get this from the element laws:
   - `dv_C/dt|₀⁺ = i_C(0⁺)/C`  (because `i_C = C dv_C/dt`)
   - `di_L/dt|₀⁺ = v_L(0⁺)/L`  (because `v_L = L di_L/dt`)
   You usually find `i_C(0⁺)` or `v_L(0⁺)` from KCL/KVL at the instant t=0⁺.
3. Plug t=0 into `x(t)` and into `dx/dt` (differentiate the chosen response form) → two equations, solve for A1, A2. Remember to include `x(∞)` for step responses.

### 10.4 Step-by-step recipe
1. Identify **series or parallel** RLC → pick the right α formula.
2. Compute `α` and `ω₀`; compare → classify damping; get the roots.
3. Find **initial conditions:** `v_C(0⁺)`, `i_L(0⁺)` (from t=0⁻ DC circuit, then continuity).
4. Find `x(∞)` (new DC steady state: cap open, ind short).
5. Compute the needed **derivative** at 0⁺ (§10.3).
6. Write the response form, apply both ICs, solve A1, A2.

### 10.5 WORKED EXAMPLE — source-free series RLC
> Series loop: R = 8 Ω, L = 0.5 H, C = 1/24 F. At t=0: `v_C(0)=10 V`, `i_L(0)=0`. Find `i(t)` for t≥0 (i = loop current).

1. `α = R/(2L) = 8/(2·0.5) = 8`. `ω₀ = 1/sqrt(LC) = 1/sqrt(0.5·(1/24)) = 1/sqrt(1/48) = sqrt(48) ≈ 6.93`.
2. `α > ω₀` → **overdamped**. Roots: `s = −8 ± sqrt(64−48) = −8 ± 4` → `s1 = −4`, `s2 = −12`.
3. Source-free → `i(∞)=0` → `i(t) = A1 e^(−4t) + A2 e^(−12t)`.
4. IC1: `i(0)=i_L(0)=0` → `A1 + A2 = 0`.
5. IC2: `di/dt|₀ = v_L(0)/L`. KVL around loop at t=0⁺: `v_L = −R·i(0) − v_C(0) = −8·0 − 10 = −10 V`. So `di/dt|₀ = −10/0.5 = −20`.
   `di/dt = −4A1 e^(−4t) −12A2 e^(−12t)` → at 0: `−4A1 −12A2 = −20`.
6. From `A1=−A2`: `−4(−A2) −12A2 = −20` → `4A2 −12A2 = −20` → `−8A2 = −20` → `A2 = 2.5`, `A1 = −2.5`.
   **`i(t) = −2.5 e^(−4t) + 2.5 e^(−12t)` A.**

### 10.6 WORKED EXAMPLE — underdamped check
> Parallel RLC: R = 25 Ω, L = 0.5 H, C = 1 mF. Classify.

`α = 1/(2RC) = 1/(2·25·1e-3) = 20`. `ω₀ = 1/sqrt(0.5·1e-3) = 1/sqrt(5e-4) ≈ 44.7`.
`α < ω₀` → **underdamped**, `ω_d = sqrt(44.7² − 20²) = sqrt(2000 − 400) = sqrt(1600) = 40 rad/s`.
Response: `x(t) = x(∞) + e^(−20t)(A1 cos40t + A2 sin40t)`.

### 10.7 Quality factor (if covered)
`Q = ω₀/(2α)`. Series: `Q = (1/R)·sqrt(L/C)`. Parallel: `Q = R·sqrt(C/L)`.

---

## §11. AC STEADY-STATE — PHASORS & IMPEDANCE

For sinusoidal sources at a single frequency ω, in steady state.

### 11.1 Sinusoids
`v(t) = Vm·cos(ωt + φ)`; `ω = 2πf` (rad/s); `T = 1/f`; `φ` in degrees/radians.
Convert sine to cosine: `sin(ωt) = cos(ωt − 90°)`.

### 11.2 Phasors
Represent `Vm·cos(ωt+φ)` as phasor `V = Vm∠φ` (a complex number). Work the algebra with complex numbers, then convert back: multiply by `e^(jωt)` and take the real part.

**Rectangular ⇄ polar:**
`a + jb = M∠θ`, where `M = sqrt(a²+b²)`, `θ = atan2(b, a)`; `a = M cosθ`, `b = M sinθ`.
- Add/subtract → use rectangular.
- Multiply/divide → use polar (`M1∠θ1 · M2∠θ2 = M1M2∠(θ1+θ2)`; divide → divide magnitudes, subtract angles).

### 11.3 Impedance Z (the AC version of resistance), in ohms
| Element | Impedance Z | Notes |
|---|---|---|
| Resistor R | `Z_R = R` | in phase |
| Inductor L | `Z_L = jωL` | voltage **leads** current 90° |
| Capacitor C | `Z_C = 1/(jωC) = −j/(ωC)` | current **leads** voltage 90° |

`Z = R + jX` (R = resistance, X = reactance). Admittance `Y = 1/Z = G + jB` (siemens).

**Ohm's law (phasor):** `V = I·Z`. Impedances combine **exactly like resistors** (series add, parallel product-over-sum). All of nodal, mesh, Thévenin/Norton, source transformation, dividers work the same — just with complex Z.

### 11.4 Recipe for AC steady-state problems
1. Convert all sources to phasors; convert L and C to impedances at the given ω.
2. Solve the circuit using any DC technique (series/parallel, dividers, nodal, mesh, Thévenin) with complex arithmetic.
3. Convert the phasor answer back to the time domain: `V=Vm∠φ → v(t)=Vm cos(ωt+φ)`.

### 11.5 Mini example
> Source `10∠0° V`, ω = 1000, R = 1 kΩ in series with C = 1 µF. Find current.
`Z_C = 1/(j·1000·1e-6) = 1/(j·1e-3) = −j1000 Ω`. `Z = 1000 − j1000 = 1414∠−45° Ω`.
`I = V/Z = 10∠0° / 1414∠−45° = 7.07∠45° mA` → `i(t)=7.07cos(1000t+45°) mA`.

---

## §12. AC POWER

Use **RMS** values for power. For a sinusoid, `V_rms = Vm/sqrt(2)`, `I_rms = Im/sqrt(2)`.

Let `θ = θ_v − θ_i` = phase angle of the load impedance (angle of Z).

| Quantity | Formula | Unit |
|---|---|---|
| **Average / Real power** | `P = V_rms·I_rms·cos θ = I_rms²·R = (1/2)Vm Im cosθ` | W |
| **Reactive power** | `Q = V_rms·I_rms·sin θ = I_rms²·X` | VAR |
| **Apparent power** | `S = V_rms·I_rms = sqrt(P²+Q²)` | VA |
| **Complex power** | `S = P + jQ = V_rms·I_rms* = I_rms²·Z` | VA |
| **Power factor** | `pf = cos θ = P/S` | — |

- `pf` **lagging** = inductive load (current lags voltage, θ>0, Q>0).
- `pf` **leading** = capacitive load (θ<0, Q<0).
- Power in resistor only: `P = I_rms²R`; inductors/capacitors absorb **zero average power** (only reactive).

**Power factor correction:** add a parallel capacitor to reduce reactive power / raise pf.
Required capacitor: `C = (Q_old − Q_new)/(ω·V_rms²)`, where `Q_new = P·tan(θ_new)`.

**Maximum average power transfer (AC):** `Z_L = Z_th*` → `P_max = |V_th,rms|² / (4·R_th)`.

---

## §13. IDEAL OP-AMPS

**Two golden rules (ideal op-amp with negative feedback):**
1. **No current into inputs:** `i₊ = i₋ = 0`.
2. **Virtual short:** `v₊ = v₋` (if there's negative feedback).

Solve by applying KCL at the inverting node `v₋` using rule 1, and setting `v₋ = v₊` using rule 2.

| Configuration | Output |
|---|---|
| Inverting (`R_f` feedback, `R_in` input, +in grounded) | `v_o = −(R_f/R_in)·v_in` |
| Non-inverting | `v_o = (1 + R_f/R_in)·v_in` |
| Voltage follower (buffer) | `v_o = v_in` (gain 1) |
| Summing (inverting) | `v_o = −R_f·(v1/R1 + v2/R2 + …)` |
| Difference (matched R) | `v_o = (R_f/R1)·(v2 − v1)` |
| Integrator (C in feedback) | `v_o = −(1/RC)∫ v_in dt` |
| Differentiator (C at input) | `v_o = −RC·(dv_in/dt)` |

---

## §14. QUICK REFERENCE CARD (cram the night before)

**State variables that CAN'T jump:** `v_C`, `i_L`. Everything else can.
**DC steady state:** C = open, L = short.

**First-order master formula:** `x(t) = x(∞) + [x(0⁺) − x(∞)]·e^(−t/τ)`
- RC: `τ = RC`. RL: `τ = L/R`. (R = Thévenin R seen by element, sources killed, t>0 config.)

**Second-order RLC:**
- Series: `α = R/(2L)`. Parallel: `α = 1/(2RC)`. Both: `ω₀ = 1/sqrt(LC)`.
- `α>ω₀` overdamped (2 real roots) · `α=ω₀` critical · `α<ω₀` underdamped (`ω_d=sqrt(ω₀²−α²)`).
- Roots: `s = −α ± sqrt(α²−ω₀²)`.

**Phasor impedances:** `Z_R=R`, `Z_L=jωL`, `Z_C=1/(jωC)=−j/(ωC)`. `ω=2πf`.

**AC power:** `S=P+jQ=V_rms I_rms*`; `P=V_rms I_rms cosθ`; `pf=cosθ`; `P_max,xfer=|V_th|²/(4R_th)` (rms).

**DC tools:** voltage divider `V·Rk/ΣR`; current divider (opposite R on top); `R_th=V_oc/I_sc`; max power `R_L=R_th`, `P=V_th²/(4R_th)`.

**Useful identities:**
- `e^0 = 1`, `e^(−∞)=0`. At `t=τ`, `e^(−1)≈0.368` (63% complete).
- `cos(A±B)=cosA cosB ∓ sinA sinB`. `sinθ=cos(θ−90°)`.
- atan2 / check quadrant when going rectangular→polar.

---

## §15. WORKED PROBLEM-TYPE INDEX (fill in from your uploaded files)

> After you drop your sample exams / HW into `uploads/`, this section gets populated with **your instructor's actual problem styles**, each with a full step-by-step solution and a pointer to the relevant section above. Placeholders below show the structure:

- **Q-Type A — First-order RC switch problem** → §9 recipe. *(worked solution added from your files)*
- **Q-Type B — First-order RL switch problem** → §9 recipe. *(worked solution added)*
- **Q-Type C — Series/Parallel RLC transient** → §10 recipe. *(worked solution added)*
- **Q-Type D — Nodal/Mesh DC** → §5/§6. *(worked solution added)*
- **Q-Type E — Thévenin + Max Power** → §8. *(worked solution added)*
- **Q-Type F — AC phasor / power** → §11/§12. *(worked solution added)*

---

*End of cheat sheet. Verify every formula against your own course notes/syllabus — instructors vary in conventions (e.g. sign of currents, RMS vs amplitude). Upload your files and I'll tailor + extend this.*
