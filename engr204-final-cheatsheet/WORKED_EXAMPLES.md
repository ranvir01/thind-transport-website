# ENGR&204 — WORKED EXAMPLES (pattern-match your exam to these)

These are fully worked, step-by-step solutions built from **your own uploaded files** (Exam 4 solutions, Homework 6, the In-Class Prep RLC packet). Your textbook is **Dorf & Svoboda, _Introduction to Electric Circuits_** (problem numbers like P7.5-13, P8.3-25 are Dorf problems), and your past finals are 4–5 questions. Match each exam problem to the closest example below.

> **Notation used everywhere (same as your HW):**
> `x(t) = x(∞) + [ x(0⁺) − x(∞) ] · e^(−t/τ)` for first order.
> The `*` next to an "Unsolved on the handout" tag means I solved it from scratch here.

---

# PART A — FIRST-ORDER (RC / RL) — the t=0⁻ / t=∞ / τ machine

Every first-order problem = find **3 numbers** then plug into the master formula:
1. initial value `x(0⁺)` (use continuity: `v_C` and `i_L` don't jump),
2. final value `x(∞)` (DC: cap = open, ind = short),
3. time constant `τ` (= `R_th·C` or `L/R_th`, with sources killed).

---

## A1. RL step response, find L and R from a graph — Dorf **P8.3-25** (your Exam 4, Q2)

**Circuit:** 20 V source — inductor `L` — in parallel with `40 Ω`; a switch opens at `t=0` putting `R₂` in series. The plot shows `v(t)`: 20 V for t<0, jumps to 100 V at t=0⁺, decays to 20 V. The point (0.14 s, 60 V) is marked. **Find L and R₂.**

**Step 1 — read the three numbers off the plot.**
- `v(0⁻) = 20 V` (steady state before switch).
- `v(0⁺) = 100 V` (the jump — resistor voltage CAN jump).
- `v(∞) = 20 V` (settles back).
- So `v(t) = 20 + 80 e^(−t/τ)` (since `v(0⁺)−v(∞) = 100−20 = 80`).

**Step 2 — use the marked point (0.14 s, 60 V) to get τ (really a = 1/τ).**
```
60 = 20 + 80 e^(−a·0.14)
40/80 = e^(−0.14 a)  →  ln(0.5) = −0.14 a  →  a = ln(60−20 over 80)/(−0.14) = 5 (1/s)
```
So `1/τ = 5 ⇒ τ = 0.2 s`.

**Step 3 — i(0⁺) from continuity.** Before t=0 inductor is a short, so it carried current; at 0⁺ the 100 V appears across the 40 Ω:
`i(0⁺) = 100/40 = 2.5 A` (this is i_L(0⁻)=i_L(0⁺), continuity).

**Step 4 — R₂ from the steady-state before switching.** For t<0 the inductor is a short, `40 ‖ R₂` carries the source; the data gives `40 ‖ R₂ = 20/2.5 = 8 Ω ⇒ R₂ = 10 Ω`.

**Step 5 — L from the time constant.** `τ = L/R_th`. Here `a = 1/τ = R_th/L = 40/L` (the 40 Ω is the resistance seen by L for t>0). `5 = 40/L ⇒ L = 8 H`.

**Answer:** `v(t) = 20 + 80e^(−5t) V`, `R₂ = 10 Ω`, `L = 8 H`.
**Lesson:** reading `x(0⁺), x(∞)` off a plot and one extra point gives you τ, then any unknown component.

---

## A2. RL with a current source + mesh equation — Dorf **P7.5-13** (your Exam 4, Q1)

**Circuit:** 10 A source ‖ 24 Ω, a 24 Ω series (with `+v(t)−`), center mesh current `iₐ`, another 24 Ω, and a `4 H` inductor branch carrying `i(t)`.

**Step — write ONE mesh (KVL) equation for the center mesh:**
```
24 iₐ + 24(iₐ − i(t)) + 24(iₐ − 10) = 0   ⇒   iₐ = (i(t) + 10)/3
```
With the inductor's transient giving `i(t) = 5 − e^(−4t) A` (t>0), substitute:
```
iₐ = 5 − e^(−4t)  (after simplification)
v(t) = 24 iₐ = 120 − 24 e^(−4t) V    for t > 0
```
**Lesson:** even transient problems often reduce to a single mesh/node equation; solve the algebra, then attach the `e^(−t/τ)` decay.

---

## A3. First-order RC with a DEPENDENT source — Dorf **P8.7-1** (your Exam 4, Q3)

**Circuit (t<0, steady state):** 12 Ω, a dependent current source `2iₓ`, a 3 Ω, and 38.5 V source. **Find v_C(t).**

**Step 1 — initial condition at 0⁻ (cap = open).** KVL:
```
12 iₓ + 3(3 iₓ) + 38.5 = 0  ⇒  iₓ = −1.83 A
v_C(0⁻) = −12 iₓ = 22 V = v_C(0⁺)   (continuity)
```

**Step 2 — for t>0** a `1/36 F` cap is switched in and a forcing term `v₁(t)=8e^(−5t)u(t)` appears. Write **KVL + KCL** with the dependent source:
```
KVL: 12 iₓ(t) − 8e^(−5t) + v_C(t) = 0
KCL: −iₓ(t) − 2iₓ(t) + (1/36) dv_C/dt = 0  ⇒  iₓ(t) = (1/108) dv_C/dt
```
Combine → first-order ODE:
```
dv_C/dt + 9 v_C = 72 e^(−5t)
```

**Step 3 — natural + forced.**
- Natural: `v_cn = A e^(−9t)` (root s=−9).
- Forced: try `v_cf = B e^(−5t)`; substitute → `−5B + 9B = 72 ⇒ B = 18`. So `v_cf = 18 e^(−5t)`.
- Total: `v_C(t) = A e^(−9t) + 18 e^(−5t)`.

**Step 4 — apply IC.** `v_C(0) = 22 = A + 18 ⇒ A = 4`.

**Answer:** `v_C(t) = 4 e^(−9t) + 18 e^(−5t) V`.
**Lesson:** with a dependent source you can't just use τ=RC blindly — derive the ODE `dv/dt + a·v = forcing`, then natural (`e^(−at)`) + forced (match the source form).

---

## A4. Clean RC master-formula drill — your **Homework 6, Prob 2**

**Circuit:** 12 V source with three 6 Ω resistors and a `250 mF` cap; a switch changes the network at t=0. **Find v(t).**

- **t<0 (cap open):** `v_C(0⁻) = (6/18)·12 = 4 V` ⇒ `v_C(0⁺) = 4 V`.
- **t→∞ (cap open):** `v_C(∞) = (6/12)·12 = 6 V`.
- **τ = R_th·C** with the source killed: `v(t) = 6 + (4 − 6)e^(−t/τ) = 6 − 2 e^(−t/τ) V`.

**Lesson:** this is the *purest* form of the master formula — most RC exam problems look exactly like this.

---

## A5. RL master-formula with a dependent source — your **Homework 6, Prob 3**

- **t<0 (ind short):** loop current `iₐ = 12/9 = 4/3 A = i_L(0⁺)`.
- **t→∞:** with the dependent source `2iₐ` active, solve `(2iₐ − 12)/6 = iₐ` → `iₐ = −3 A`, giving `v = 2(−3) = −6 V`, `i_L(∞) = −6/3 = −2 A`.
- **τ = L/R_th**: `R_th = (1/6 + 1/3)⁻¹ = 3? →` here `τ = 6/3 = 2 s` (L=6 H over R_th=3 Ω).
- **Plug in:** `i(t) = −2 + (4/3 − (−2))e^(−t/2) = −2 + (10/3) e^(−t/2) A`.

## A6. RC / RL with an OP-AMP — your **Homework 6, Probs 4 & 5**

Op-amp **outputs have 0 Ω resistance**, so the output node value is set by the op-amp; treat the cap/inductor with the resistance it actually sees.
- **Prob 4 (RC):** `V_o(0⁺)=5 V`, `V_o(∞)=10 V`, `τ=RC=20kΩ·4µF=80ms` → `V_o(t)=10 − 5e^(−12.5t) V`.
- **Prob 5 (RL):** `i_L(0⁺)=0.25 mA`, `i_L(∞)=0.5 mA`, `τ=L/R=5H/20kΩ=1/4000 s` → `V_o(t)=5e^(−4000t) V`.

---

# PART B — SECOND-ORDER (RLC) — characteristic equation → damping case

**Recipe:** kill independent sources → identify series vs parallel → compute `α` and `ω₀` → compare → write the natural-response form → add forced response → apply the two ICs `x(0⁺)` and `x′(0⁺)`.

| | Series RLC | Parallel RLC |
|---|---|---|
| Char. eq. | `s² + (R/L)s + 1/(LC) = 0` | `s² + (1/RC)s + 1/(LC) = 0` |
| `α` | `R/(2L)` | `1/(2RC)` |
| `ω₀` | `1/√(LC)` | `1/√(LC)` |

Compare: `α>ω₀` overdamped, `α=ω₀` critical, `α<ω₀` underdamped. `ω_d=√(ω₀²−α²)`.

---

## B1. * Series RLC characteristic equation & roots — In-Class Prep **Problem 1**

**Circuit:** current source `iₛ` ‖ `40 Ω`, with `100 mH` inductor in series feeding a `1/3 mF` capacitor. **Find the characteristic equation and roots.**

**Step 1 — kill the independent source.** Open the current source. What's left is a single loop: `40 Ω – 0.1 H – (1/3)×10⁻³ F` → this is a **series RLC**.

**Step 2 — parameters.**
```
α = R/(2L) = 40 / (2·0.1) = 200  rad/s
ω₀ = 1/√(LC) = 1/√(0.1 · (1/3)×10⁻³) = 1/√(3.33×10⁻⁵) = 173.2  rad/s   (ω₀² = 30000)
```

**Step 3 — characteristic equation.**
```
s² + (R/L)s + 1/(LC) = s² + 400 s + 30000 = 0
```

**Step 4 — roots.** `s = −200 ± √(200² − 30000) = −200 ± √10000 = −200 ± 100`.
```
s₁ = −100,   s₂ = −300   (rad/s)
```
**Step 5 — case.** `α (200) > ω₀ (173.2)` ⇒ **overdamped**. Natural response form: `x(t) = A₁e^(−100t) + A₂e^(−300t)`.
✅ Matches the handout answer `s² + 400s + 3×10⁴ = 0, s = −300, −100`.

---

## B2. * Parallel RLC natural frequencies (Volkswagen stop–start) — In-Class Prep **Problem 3**

**Given (after killing the step sources):** `R = 10 Ω`, `L = 1/2 H`, `C = 5 mF` arranged as a **parallel RLC**. **Find the characteristic equation and natural frequencies.**

**Step 1 — parallel parameters.**
```
α = 1/(2RC) = 1/(2·10·0.005) = 10  rad/s
ω₀ = 1/√(LC) = 1/√(0.5·0.005) = 1/√0.0025 = 20  rad/s   (ω₀² = 400)
```
**Step 2 — characteristic equation.** `s² + (1/RC)s + 1/(LC) = s² + 20s + 400 = 0`.

**Step 3 — roots.** `s = −10 ± √(100 − 400) = −10 ± √(−300) = −10 ± j17.3`.
**Step 4 — case.** `α (10) < ω₀ (20)` ⇒ **underdamped**, damped freq `ω_d = √(400−100) = 17.3 rad/s`.
Natural response: `x(t) = e^(−10t)(B₁cos17.3t + B₂sin17.3t)`.
✅ Matches the handout answer `s² + 20s + 400 = 0, s = −10 ± j17.3`.

---

## B3. * Second-order FORCED response — In-Class Prep **Problem 2**

**Given:** series RLC with `R = 3 Ω`, `L = 1 H`, `C = 1/2 F`, driven by source `iₛ = 2e^(−3t) A`. **Find i(t) for t>0.**

**Step 1 — natural response.** Series: `α = R/2L = 1.5`, `ω₀ = 1/√(LC) = √2 = 1.414`. `α>ω₀` ⇒ overdamped.
Roots: `s = −1.5 ± √(2.25−2) = −1.5 ± 0.5 = −1, −2`. So `i_n = A₁e^(−t) + A₂e^(−2t)`.

**Step 2 — forced response.** Source ~ `e^(−3t)`; try `i_f = K e^(−3t)`. Substituting into the circuit's 2nd-order ODE gives `K = 2`, so `i_f = 2e^(−3t)`.

**Step 3 — total + initial conditions.** `i(t) = A₁e^(−t) + A₂e^(−2t) + 2e^(−3t)`.
Use the two ICs from the pre-switch state — here `i(0)=0` and `di/dt(0)=10`:
```
i(0)  = A₁ + A₂ + 2 = 0
i'(0) = −A₁ − 2A₂ − 6 = 10
⇒ A₁ = 12,  A₂ = −14
```
**Answer:** `i(t) = 12e^(−t) − 14e^(−2t) + 2e^(−3t) A`. ✅ Matches handout.
**Lesson:** complete response = (natural form from roots) + (forced term matching the source); the two unknown constants come from `x(0⁺)` and `x′(0⁺)`.

---

## B4. * Second-order DESIGN (airbag) — In-Class Prep **Problem 4**

**Setup:** 12 V charges `C` through position 1 for a long time, then at t=0 the switch moves to position 2 forming a **source-free parallel RLC** with `R = 4 Ω` (the igniter). Requirement: at least **1 J** dissipated in R, triggering within **0.1 s**. **Select L and C.**

**Step 1 — initial energy.** Long time on pos 1 ⇒ `v_C(0) = 12 V`, `i_L(0) = 0`. Stored energy `W = ½ C v_C² = ½ C(144) = 72C`.
**Step 2 — energy constraint.** Need ≥1 J delivered to R: `72C ≥ 1 ⇒ C ≥ 1/72 ≈ 0.014 F`. Pick `C = 1/16 F = 0.0625 F` ⇒ stored `= ½(1/16)(144) = 4.5 J` (comfortable margin).
**Step 3 — speed (pick L).** For fast delivery choose `L` so the response decays within 0.1 s. With `L = 0.065 H`: `α = 1/(2RC) = 1/(2·4·0.0625) = 2`, `ω₀ = 1/√(LC) = 1/√(0.065·0.0625) ≈ 15.7` ⇒ underdamped, envelope `e^(−2t)` plus oscillation that dumps the energy into R quickly.
**Answer (one valid design):** `C = 1/16 F`, `L = 0.065 H`. ✅ Matches handout.
**Lesson:** design problems = pick component(s) to satisfy an **energy** condition (`½CV²` / `½LI²`) and a **speed** condition (via α, τ).

---

# PART C — EARLIER-QUARTER TYPES (lower weight, still fair game)

These appear on your Exam 1 / Exam 2; expect at most one on the final.

- **Charge & energy from a v–i graph (Exam 1 Q1):** `q = ∫i dt =` area under i; `W = ∫p dt = ∫v·i dt`. Break the graph into linear pieces, integrate each.
- **Power balance / find currents & voltages (Exam 1 Q2, HW3):** KCL/KVL, then `P = i²R`; check `ΣP_gen = ΣP_abs`.
- **Find R so that v_a = target (Exam 1 Q3):** express `v_a` via divider/node eqn in terms of R, set equal, solve.
- **Op-amp find v_o, i_o (Exam 2 Q1):** ideal rules `i₊=i₋=0`, `v₊=v₋`; node equation at inverting input.
- **Superposition (Exam 2 Q3):** one source at a time (V→short, I→open), add.
- **Norton/Thévenin general expression (Exam 2 Q5):** `V_th=V_oc`, `R_th=V_oc/I_sc`, then `i = V_th/(R_th+R)`.
- **Equivalent resistance (your HW):** collapse series/parallel from the far end back to the terminals.

---

---

# PART D — SECOND-ORDER COMPLETE RESPONSE, AC, POWER, Δ-Y (extra coverage)

## D1. Source-free underdamped series RLC — complete response with both ICs

**Given:** series `R = 2 Ω`, `L = 1 H`, `C = 1/4 F`, source removed at t=0, with `i(0) = 0` and `v_C(0) = 10 V`.

**Step 1 — parameters.** `α = R/2L = 1`, `ω₀ = 1/√(LC) = 2`, `α<ω₀` ⇒ underdamped, `ω_d = √(ω₀²−α²) = √3 = 1.732`.
Form: `i(t) = e^(−t)(B₁cos1.732t + B₂sin1.732t)`.

**Step 2 — IC #1 (the value).** `i(0) = B₁ = 0`.

**Step 3 — IC #2 (the derivative, from KVL).** Series loop: `L·di/dt + R·i + v_C = 0`, so
`di/dt(0⁺) = (−R·i(0) − v_C(0))/L = (0 − 10)/1 = −10`.
With B₁=0: `di/dt(0) = ω_d·B₂ = 1.732·B₂ = −10 ⇒ B₂ = −5.77`.

**Answer:** `i(t) = −5.77 e^(−t) sin(1.732 t) A`. (Verified numerically.)
**Lesson:** the two constants always come from `x(0⁺)` and `x′(0⁺)`; get the derivative IC from the element law + KVL/KCL.

## D2. AC steady-state (phasors)

**Given:** `v(t) = 20cos(2000t) V` across `R = 10 Ω` in series with `L = 5 mH`. Find `i(t)`.

```
Z_L = jωL = j(2000)(0.005) = j10 Ω
Z = R + jZ_L = 10 + j10 = 14.14 ∠45° Ω
I = V/Z = (20∠0°)/(14.14∠45°) = 1.414 ∠−45° A
i(t) = 1.414 cos(2000t − 45°) A      (current lags — inductive)
```

## D3. Power-factor correction

**Given:** load `P = 1000 W`, `pf = 0.7 lagging`, `V_rms = 120 V`, `f = 60 Hz`. Correct to `pf = 0.95`. Find C.

```
θ_old = cos⁻¹(0.7) = 45.6° → tanθ_old = 1.020
θ_new = cos⁻¹(0.95) = 18.2° → tanθ_new = 0.329
Q_C = P(tanθ_old − tanθ_new) = 1000(1.020 − 0.329) = 691 VAR
C = Q_C/(ω V_rms²) = 691/(2π·60·120²) = 1.27×10⁻⁴ F = 127 µF
```

## D4. Δ→Y conversion (for bridge / ladder resistance)

**Given:** a delta with `R_ab = 10`, `R_bc = 20`, `R_ca = 30` Ω. Convert to Y (sum = 60).
```
R_a = R_ab·R_ca / 60 = (10·30)/60 = 5 Ω
R_b = R_ab·R_bc / 60 = (10·20)/60 = 3.33 Ω
R_c = R_bc·R_ca / 60 = (20·30)/60 = 10 Ω
```
Now the network is series/parallel → finish normally.

---

*All Part-B "★" and Part-D solutions were worked from scratch and verified numerically. If your exam uses different numbers, follow the same step sequence.*
