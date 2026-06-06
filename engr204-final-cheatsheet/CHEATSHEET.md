# ENGR&204 — ULTIMATE FINAL EXAM CHEAT SHEET
### Electrical Circuits (Green River College) — unlimited pages, everything you need

> Emphasis weighted toward the **end of quarter**: first-order **RC/RL** transients and second-order **RLC** circuits, plus AC steady-state. DC analysis tools (nodal/mesh/Thevenin) are included because every transient problem reduces to a DC problem at t=0⁻ and t=∞.
>
> **This is a starter built from the standard ENGR&204 curriculum. Upload your files to `source-materials/` and I will fold in your exact problem types, numbers, and instructor conventions, and solve any unsolved problems step-by-step.**

---

## 0. EXAM-DAY GAME PLAN (read first)

**4 questions, ~circuit-analysis. Likely mix:**
1. DC network analysis (nodal/mesh or Thevenin/Norton + max power).
2. First-order **RC or RL** transient (switch flips → find v(t) or i(t)).
3. Second-order **series or parallel RLC** transient (over/under/critically damped).
4. **AC steady-state** with phasors (impedance, divider, or **AC power** / power factor).

**Universal attack for ANY problem:**
1. Label every node and a ground. Mark current directions and + / − on each element (passive sign convention).
2. Identify what type it is (DC steady, transient, or AC). Pick the matching method below.
3. Reduce: combine series/parallel, kill independent sources for Thevenin R, etc.
4. Solve the smallest system you can (one node equation beats three).
5. **Sanity check:** units, signs, limiting behavior (t=0⁺, t=∞), energy ≥ 0, power balance (Σ P delivered = Σ P absorbed).

---

## 1. UNITS, CONSTANTS, SIGN CONVENTIONS

| Quantity | Symbol | Unit |
|---|---|---|
| Voltage | V | volt (V) = J/C |
| Current | I | ampere (A) = C/s |
| Resistance | R | ohm (Ω) = V/A |
| Conductance | G = 1/R | siemens (S) |
| Capacitance | C | farad (F) = C/V |
| Inductance | L | henry (H) = V·s/A |
| Power | P | watt (W) = J/s |
| Energy | W | joule (J) |
| Charge | q | coulomb (C) |
| Frequency | f | hertz (Hz) |
| Ang. freq | ω | rad/s |

**Metric prefixes:** p=10⁻¹², n=10⁻⁹, µ=10⁻⁶, m=10⁻³, k=10³, M=10⁶, G=10⁹.

**Passive sign convention:** current enters the **+** terminal of an element. Then `p = v·i` is power *absorbed* (p>0 absorbs, p<0 delivers). Sources usually deliver (p<0).

---

## 2. CORE LAWS & ELEMENT EQUATIONS

**Ohm's law:** `v = i·R`, `i = v/R`.

**Power:** `P = v·i = i²R = v²/R`.

**KCL (nodes):** Σ currents leaving a node = 0.
**KVL (loops):** Σ voltage drops around a loop = 0.

### Element v–i relationships (MEMORIZE)
| Element | v–i relation | DC steady state | Stored energy |
|---|---|---|---|
| Resistor | `v = iR` | acts as R | none (dissipates `i²R`) |
| Capacitor | `i = C dv/dt`,  `v = (1/C)∫i dt + v(0)` | **open circuit** (i=0) | `W = ½ C v²` |
| Inductor | `v = L di/dt`,  `i = (1/L)∫v dt + i(0)` | **short circuit** (v=0) | `W = ½ L i²` |

**Continuity rules (the keys to transients):**
- **Capacitor voltage cannot jump:** `v_C(0⁺) = v_C(0⁻)`.
- **Inductor current cannot jump:** `i_L(0⁺) = i_L(0⁻)`.
(Everything else — resistor voltages, source-fed currents — CAN jump instantly.)

---

## 3. SERIES / PARALLEL & DIVIDERS

**Resistors:** series add `R = R₁+R₂+…`; parallel `1/R = Σ1/Rₖ`, two: `R = R₁R₂/(R₁+R₂)`.

**Capacitors:** opposite of resistors — series `1/C = Σ1/Cₖ`; parallel `C = ΣCₖ`.

**Inductors:** like resistors — series add; parallel reciprocal.

**Voltage divider (series):** `v_k = v_total · R_k / ΣR`.

**Current divider (two parallel R):** `i₁ = i_total · R₂/(R₁+R₂)` (current favors the *smaller* R).

---

## 4. SYSTEMATIC DC ANALYSIS

### 4a. Nodal analysis (best when more voltage unknowns)
1. Pick a ground (reference) node.
2. Label node voltages v₁,v₂,…
3. Write KCL at each non-reference node: Σ currents leaving = 0, using `(v_this − v_other)/R`.
4. **Supernode:** if a voltage source sits between two non-ref nodes, enclose both; write one KCL for the pair + the constraint `v_a − v_b = V_source`.
5. Solve the linear system.

### 4b. Mesh analysis (best for planar, more current unknowns)
1. Define clockwise mesh currents i₁,i₂,…
2. KVL around each mesh; shared resistor carries `(i_this − i_adjacent)`.
3. **Supermesh:** if a current source is shared between two meshes, write KVL around the outer loop + constraint from the current source.

### 4c. Source transformation
Voltage source `V_s` in series with `R` ⇄ current source `I_s = V_s/R` in parallel with same `R`. Use to simplify before nodal/mesh.

### 4d. Superposition (linear circuits)
Response = sum of responses with **one independent source active at a time**. Deactivate others: **voltage source → short**, **current source → open**. (Leave dependent sources ON.)

---

## 5. THÉVENIN / NORTON + MAX POWER

**Goal:** replace everything seen from terminals a–b by `V_th` in series with `R_th` (Thévenin) or `I_N` in parallel with `R_th` (Norton). `I_N = V_th/R_th`.

**Find V_th:** open-circuit voltage across a–b (`V_th = V_oc`).
**Find I_N:** short-circuit current a–b (`I_N = I_sc`).
**Find R_th:**
- *No dependent sources:* deactivate all independent sources (V→short, I→open) and compute equivalent R at a–b.
- *With dependent sources:* `R_th = V_oc / I_sc`, OR apply a 1 A test source at a–b with independents off and `R_th = v_test/1`.

**Maximum power transfer:** load gets max power when `R_L = R_th`. Then
`P_max = V_th² / (4·R_th)`.

(AC version: `Z_L = Z_th*` (complex conjugate); `P_max = |V_th|² / (8·R_th)` using amplitudes, or `/(4R_th)` using RMS.)

---

## 6. OP-AMPS (ideal) — if covered

**Ideal rules:** (1) no current into inputs (i₊=i₋=0); (2) with negative feedback, `v₊ = v₋` (virtual short).

| Config | Output |
|---|---|
| Inverting | `v_o = −(R_f/R_in)·v_in` |
| Non-inverting | `v_o = (1 + R_f/R_in)·v_in` |
| Buffer/follower | `v_o = v_in` |
| Summing (inverting) | `v_o = −R_f(v₁/R₁ + v₂/R₂ + …)` |
| Difference | `v_o = (R_f/R₁)(v₂ − v₁)` (matched ratios) |
| Integrator | `v_o = −(1/RC)∫v_in dt` |
| Differentiator | `v_o = −RC·dv_in/dt` |

---

## 7. ⭐ FIRST-ORDER CIRCUITS — RC & RL TRANSIENTS (HIGH YIELD)

A first-order circuit has **one** equivalent C or L. Every such problem is solved by the **same master formula**.

### 7a. THE MASTER FORMULA (use for EVERY first-order problem)
```
x(t) = x(∞) + [ x(0⁺) − x(∞) ] · e^(−t/τ)        for t ≥ 0
```
where `x` is any voltage or current, x(0⁺)=initial value, x(∞)=final (steady-state) value, τ=time constant.

### 7b. Time constant τ
- **RC circuit:** `τ = R_th · C`
- **RL circuit:** `τ = L / R_th`

`R_th` = Thévenin/equivalent resistance seen by the C (or L) **after the switch settles**, with independent sources deactivated.

### 7c. STEP-BY-STEP RECIPE (works every time)
1. **t = 0⁻ (before switch):** assume DC steady state. Capacitor = open, inductor = short. Find `v_C(0⁻)` or `i_L(0⁻)`.
2. **Apply continuity:** `v_C(0⁺)=v_C(0⁻)`, `i_L(0⁺)=i_L(0⁻)`. (These are your initial conditions.)
3. **t = ∞ (after switch, settled):** DC again — cap open, ind short. Find `v_C(∞)` or `i_L(∞)`.
4. **τ:** kill independent sources, find `R_th` at the C/L terminals; τ = R_thC or L/R_th.
5. **Plug into master formula** for the capacitor voltage / inductor current.
6. **(If asked for another variable)** find that variable's own x(0⁺) and x(∞) and reuse the same τ, OR get it from v_C / i_L via Ohm's/KCL/KVL. *Watch out:* non-state variables may jump at t=0⁺, so compute their 0⁺ value from the circuit *after* the switch using the state variable's initial value.

### 7d. Special named responses
- **Natural (source-free) response:** x(∞)=0 ⇒ `x(t) = x(0)·e^(−t/τ)` (pure decay).
- **Step response:** general master formula with nonzero x(∞).

### 7e. Useful facts & numbers
- After `1τ`: 36.8% of initial remains (63.2% of the way to final). After `5τ`: ≈ fully settled (<1%).
- Slope at start: `dx/dt|₀ = (x(∞)−x(0))/τ`.
- **Capacitor current / inductor voltage** during transient:
  `i_C(t) = C·dv_C/dt`,  `v_L(t) = L·di_L/dt` (these decay as e^(−t/τ) too).

### 7f. Worked template — RC step (switch closes at t=0)
Given source V_s through R to capacitor C (initially uncharged):
- v_C(0⁺)=0, v_C(∞)=V_s, τ=RC.
- `v_C(t) = V_s(1 − e^(−t/RC))`  ("charging").
- `i(t) = (V_s/R)·e^(−t/RC)`  (jumps to V_s/R at 0⁺, decays to 0).

**Discharging** (cap charged to V₀, source removed): `v_C(t)=V₀·e^(−t/RC)`.

### 7g. Worked template — RL step (switch at t=0)
Source V_s, series R, inductor L:
- i_L(0⁺)=i_L(0⁻), i_L(∞)=V_s/R, τ=L/R.
- `i_L(t) = V_s/R + [i_L(0⁺) − V_s/R]e^(−tR/L)`.
- `v_L(t) = L·di_L/dt` (jumps at 0⁺, decays to 0).

---

## 8. ⭐⭐ SECOND-ORDER CIRCUITS — RLC (HIGHEST YIELD)

Has **both** L and C. The natural response is governed by a quadratic characteristic equation → three damping cases.

### 8a. Standard form & parameters
The describing ODE reduces to:
```
d²x/dt² + 2α·(dx/dt) + ω₀²·x = forcing
```
- **ω₀ = undamped natural frequency** (resonant frequency):  `ω₀ = 1/√(LC)`  (both series & parallel).
- **α = neper / damping coefficient:**
  - **Series RLC:** `α = R / (2L)`
  - **Parallel RLC:** `α = 1 / (2RC)`
- **Damping ratio:** `ζ = α/ω₀`.

### 8b. Characteristic roots
```
s = −α ± √(α² − ω₀²)
```

### 8c. THE THREE CASES (compare α vs ω₀)
| Case | Condition | Roots | Natural response form |
|---|---|---|---|
| **Overdamped** | α > ω₀ | real distinct s₁,s₂ | `x = A₁e^{s₁t} + A₂e^{s₂t}` |
| **Critically damped** | α = ω₀ | real repeated s=−α | `x = (A₁ + A₂t)e^{−αt}` |
| **Underdamped** | α < ω₀ | complex −α ± jω_d | `x = e^{−αt}(B₁cos ω_d t + B₂sin ω_d t)` |

**Damped natural frequency:** `ω_d = √(ω₀² − α²)` (underdamped only).

### 8d. Complete (total) response
`x(t) = x_forced(∞) + x_natural(t)` — add the steady-state (forced) value to the natural form, then solve for the constants using **two** initial conditions.

### 8e. STEP-BY-STEP RECIPE (RLC)
1. **t=0⁻:** DC steady state → get `v_C(0⁻)` and `i_L(0⁻)` (cap open, ind short).
2. **Initial conditions at 0⁺:** `v_C(0⁺)=v_C(0⁻)`, `i_L(0⁺)=i_L(0⁻)`.
   Get the **derivative** initial condition from the element laws:
   - `dv_C/dt|₀⁺ = i_C(0⁺)/C` (find i_C(0⁺) by KCL at 0⁺).
   - `di_L/dt|₀⁺ = v_L(0⁺)/L` (find v_L(0⁺) by KVL at 0⁺).
3. **Decide series vs parallel** → compute α and ω₀.
4. **Compare α, ω₀** → pick the case & write the natural-response form.
5. **Final value** x(∞): DC steady state after switch.
6. **Apply both ICs** [x(0⁺) and x′(0⁺)] to solve for the two constants.
7. Write x(t). Sanity check limits and continuity.

### 8f. Series vs Parallel summary
| | Series RLC | Parallel RLC |
|---|---|---|
| α | R/(2L) | 1/(2RC) |
| ω₀ | 1/√(LC) | 1/√(LC) |
| State var usually solved | loop current i(t) | node voltage v(t) |

**Memory hook:** "Series has L on the bottom of α; Parallel has C on the bottom of α."

### 8g. Source-free examples
- **Series, underdamped:** `i(t)=e^{−αt}(B₁cos ω_d t + B₂sin ω_d t)`.
- Find B₁,B₂ from i(0) and di/dt(0)= v_L(0)/L = (−R·i(0) − v_C(0))/L (from KVL).

---

## 9. AC STEADY-STATE & PHASORS

### 9a. Sinusoids
`v(t) = V_m cos(ωt + φ)`. ω = 2πf. **Phasor:** `V = V_m∠φ`. (Use cosine reference.)

**RMS:** `V_rms = V_m/√2` (for sinusoids). Power calcs use RMS.

### 9b. Impedance Z (Ohm's law becomes V = I·Z)
| Element | Impedance Z | Phase |
|---|---|---|
| Resistor | `R` | 0° (v,i in phase) |
| Inductor | `jωL` | +90° (v leads i) |
| Capacitor | `1/(jωC) = −j/(ωC)` | −90° (i leads v) |

`Z = R + jX` (X=reactance). Admittance `Y = 1/Z = G + jB`. Series/parallel and dividers work exactly like resistors but with complex Z.

**Memory hook:** "ELI the ICE man" — in an inductor (L) voltage E leads current I (ELI); in a capacitor (C) current I leads voltage E (ICE).

### 9c. Phasor analysis recipe
1. Convert sources to phasors; convert R,L,C to impedances at the given ω.
2. Solve with any DC method (nodal/mesh/Thevenin/dividers) using **complex** arithmetic.
3. Convert the phasor answer back to time domain: `V_m∠φ → V_m cos(ωt+φ)`.

**Complex arithmetic:** add/subtract in rectangular (a+jb); multiply/divide in polar (magnitudes ×/÷, angles +/−). `a+jb = r∠θ`, `r=√(a²+b²)`, `θ=atan2(b,a)`.

### 9d. Resonance (series RLC)
At `ω₀=1/√(LC)`: Z is purely real (=R), |Z| minimum, current maximum. Quality factor `Q = ω₀L/R = 1/(ω₀RC)`; bandwidth `BW = ω₀/Q`.

---

## 10. AC POWER (common Q4 topic)

For RMS phasors `V = V_rms∠θ_v`, `I = I_rms∠θ_i`, let `θ = θ_v − θ_i`:

- **Average (real) power:** `P = V_rms·I_rms·cos θ`  [W]  (`cos θ` = power factor).
- **Reactive power:** `Q = V_rms·I_rms·sin θ`  [VAR].
- **Apparent power:** `S = V_rms·I_rms`  [VA].
- **Complex power:** `S = V·I* = P + jQ`,  `|S| = √(P²+Q²)`.
- **Power factor:** `pf = cos θ = P/S`. *Lagging* (inductive, θ>0, current lags) or *leading* (capacitive, θ<0).
- Per element: `P = I_rms²·R`,  `Q = I_rms²·X`.
- Resistor only absorbs P; ideal L and C only exchange Q (P=0).

**Power-factor correction:** add a parallel **capacitor** to supply Q and reduce line current. Needed cap: `C = Q_C / (ω·V_rms²)` where `Q_C = P(tanθ_old − tanθ_new)`.

**Max average power to load (AC):** `Z_L = Z_th*`; `P_max = |V_th(rms)|²/(4R_th)`.

---

## 11. QUICK FORMULA WALL (grab-and-go)

```
Ohm:            V=IR     P=VI=I²R=V²/R
Cap:            i=C dv/dt    W=½CV²    (DC: open)
Ind:            v=L di/dt    W=½LI²    (DC: short)
Continuity:     v_C(0+)=v_C(0-)   i_L(0+)=i_L(0-)
1st-order:      x(t)=x(∞)+[x(0+)-x(∞)]e^(-t/τ)
                τ_RC=R_th C     τ_RL=L/R_th
2nd-order:      ω0=1/√(LC)
                α_series=R/2L   α_parallel=1/(2RC)
                s=-α±√(α²-ω0²)   ω_d=√(ω0²-α²)
                over: α>ω0  crit: α=ω0  under: α<ω0
Impedance:      Z_R=R  Z_L=jωL  Z_C=1/(jωC)=-j/(ωC)
Phasor power:   P=Vrms Irms cosθ   Q=Vrms Irms sinθ   S=VI*=P+jQ
                pf=cosθ=P/S
Max power (DC): R_L=R_th   P_max=V_th²/(4R_th)
Thevenin:       V_th=V_oc  R_th=V_oc/I_sc
RMS sinusoid:   Vrms=Vm/√2
```

---

## 12. COMMON MISTAKES / EXAM TRAPS
- Forgetting cap=open / ind=short at DC (both 0⁻ and ∞). This is half of transient problems.
- Letting v_C or i_L "jump" — they never do. Resistor voltages CAN jump.
- Using the wrong α formula (series vs parallel) — check L vs C in the denominator.
- Mixing peak and RMS in power formulas. Power uses RMS.
- Sign of current direction vs passive sign convention.
- Phasor answers: don't forget to convert back to time domain if asked for v(t)/i(t).
- Radians vs degrees in calculator for phasor trig.
- Time constant uses R_th seen by the element, not just the nearest resistor.

---

## 13. HOW THIS GETS CUSTOMIZED TO YOUR EXAM
Once you upload files to `source-materials/`, I will:
1. Identify the exact problem types your instructor uses (and their preferred notation/conventions).
2. Solve every unsolved problem **step-by-step** and add the worked methods here.
3. Add a "by example" section mirroring your sample exam's 4-question structure.
4. Re-weight emphasis to match what actually appears most (RL/RC/RLC as you noted).
5. Add any extra topics your class covers that aren't above (e.g., mutual inductance, transformers, Bode plots, Laplace) — just upload and I'll extend it.

*Generated as a comprehensive ENGR&204 baseline; will be tailored to your uploaded materials.*
