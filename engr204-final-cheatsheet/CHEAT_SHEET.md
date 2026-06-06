# ENGR& 204 — Electrical Circuits: MASTER CHEAT SHEET

> Built for the final exam (4 questions, heavy on **end-of-quarter material: RL, RC, and RLC transients**).
> Ordered the way the quarter is taught. The transient sections (§6–§7) are the deepest because that's
> where the final puts the most weight. Every section has the **formulas + the step-by-step approach**.

**How to attack ANY exam problem (general playbook):**
1. Redraw the circuit cleanly. Label every node and choose a ground/reference node.
2. Mark the *unknown* you're asked for and assign reference directions for currents/voltages.
3. Identify the circuit type: pure resistive? has a switch (transient)? one storage element (1st order)? two (2nd order)? sinusoidal source (AC/phasor)?
4. Pick the lightest-weight method that works (divider → series/parallel → source transform → Thévenin → nodal/mesh).
5. Solve symbolically, then plug numbers. **Check units and sign at the end.**

---

## §0. Fundamentals, Units, Conventions

### SI prefixes (memorize)
| p | n | µ | m | (none) | k | M | G |
|---|---|---|---|---|---|---|---|
| $10^{-12}$ | $10^{-9}$ | $10^{-6}$ | $10^{-3}$ | $10^{0}$ | $10^{3}$ | $10^{6}$ | $10^{9}$ |

### Core quantities
- **Charge** $q$ in coulombs (C). Electron charge $-1.602\times10^{-19}$ C.
- **Current** $i = \dfrac{dq}{dt}$ (amps, A) = rate of charge flow. $\;q=\int i\,dt$.
- **Voltage** $v = \dfrac{dw}{dq}$ (volts, V) = energy per charge.
- **Power** $p = \dfrac{dw}{dt} = v\,i$ (watts, W). **Energy** $w=\int p\,dt$ (joules, J).

### Passive sign convention (PSC) — **the #1 source of sign errors**
Current enters the **+** terminal of an element ⟹ use $p = +vi$.
- $p > 0$ ⟹ element **absorbs** power (resistor, charging source).
- $p < 0$ ⟹ element **delivers** power (battery discharging).
- **Check:** in any circuit, $\sum p_{\text{absorbed}} = 0$ (power balances; sources deliver, loads absorb).

### Element types
- **Active**: independent voltage/current sources, dependent sources, op-amps (can deliver net energy).
- **Passive**: resistor, capacitor, inductor.
- **Independent source**: value fixed. **Dependent source**: value = constant × (some $v$ or $i$ elsewhere). Diamond symbol.

---

## §1. Basic Laws (Ohm, Kirchhoff) & Simplification

### Ohm's law
$$v = iR,\qquad i=\frac{v}{R},\qquad R=\frac{v}{i}$$
- Conductance $G = 1/R$ (siemens, S). Power in a resistor: $p = vi = i^2R = \dfrac{v^2}{R}$ (always ≥ 0).
- Short circuit: $R=0$ ($v=0$). Open circuit: $R=\infty$ ($i=0$).

### Kirchhoff's laws
- **KCL** (node): $\displaystyle\sum i_{\text{in}} = \sum i_{\text{out}}$, i.e. $\sum i = 0$ at any node. (Conservation of charge.)
- **KVL** (loop): $\displaystyle\sum v = 0$ around any closed loop. (Conservation of energy.)
  - Walk the loop; add voltage when you go **− to +** (rise), subtract when **+ to −** (drop). Be consistent.

### Series / parallel resistors
- **Series** (same current): $R_{eq} = R_1 + R_2 + \cdots$
- **Parallel** (same voltage): $\dfrac{1}{R_{eq}} = \dfrac{1}{R_1}+\dfrac{1}{R_2}+\cdots$
  - Two resistors: $R_{eq} = \dfrac{R_1R_2}{R_1+R_2}$ ("product over sum"). Notation: $R_1\,\|\,R_2$.
  - $n$ equal resistors in parallel: $R/n$.

### Voltage divider (series)
$$v_k = v_{\text{in}}\cdot\frac{R_k}{R_1+R_2+\cdots}$$

### Current divider (parallel)
$$i_k = i_{\text{in}}\cdot\frac{G_k}{G_1+G_2+\cdots}\quad\xrightarrow{\text{two resistors}}\quad i_1 = i_{\text{in}}\cdot\frac{R_2}{R_1+R_2}$$
(Two-resistor current divider: the OTHER resistor is on top.)

### Delta (Δ) ↔ Wye (Y) conversion
For converting a 3-resistor triangle to a star (e.g. unbalanced bridges):
- **Δ→Y:** $R_1 = \dfrac{R_bR_c}{R_a+R_b+R_c}$, $R_2 = \dfrac{R_cR_a}{R_a+R_b+R_c}$, $R_3 = \dfrac{R_aR_b}{R_a+R_b+R_c}$ (each Y resistor = product of the two adjacent Δ resistors ÷ sum of all three).
- **Y→Δ:** $R_a = \dfrac{R_1R_2+R_2R_3+R_3R_1}{R_1}$, etc. (numerator = sum of pairwise products; denominator = the *opposite* Y resistor).

---

## §2. Systematic Analysis: Nodal & Mesh

### Nodal analysis (uses KCL, solves for node voltages)
1. Pick a **reference node (ground)** — usually the one with the most connections / the − of a source.
2. Label remaining node voltages $v_1, v_2, \dots$
3. Write KCL at each non-reference node. For a resistor between nodes $a$ and $b$, current *leaving* $a$ is $\dfrac{v_a - v_b}{R}$.
4. Solve the linear system.

**Supernode:** if a voltage source (dependent or independent) sits *between two non-reference nodes*, enclose both nodes in a supernode.
- Write **one** KCL for the whole supernode, **plus** the constraint $v_a - v_b = V_{\text{source}}$.

### Mesh analysis (uses KVL, solves for loop/mesh currents)
*Only for planar circuits.* A mesh = a loop with nothing inside it.
1. Assign a mesh current (usually clockwise) to each mesh.
2. Write KVL around each mesh. Resistor shared by meshes $i$ and $j$ drops $R(i_{\text{this}} - i_{\text{other}})$.
3. Solve.

**Supermesh:** if a *current source* is shared between two meshes, combine them into a supermesh (KVL around the outside), **plus** the constraint from the source: $i_a - i_b = I_{\text{source}}$.

### Which to choose?
- Many **voltage sources** / fewer nodes ⟹ **nodal** is usually easier. ($\#$eqs $=$ nodes $-1$.)
- Many **current sources** / fewer meshes ⟹ **mesh**. ($\#$eqs $=$ meshes.)
- Dependent sources: write a separate equation expressing the controlling variable in node-voltage / mesh-current terms.

---

## §3. Circuit Theorems

### Linearity & Superposition
For a **linear** circuit with multiple independent sources: the response = **sum** of responses to each source acting alone.
- "Turn off" a source: **voltage source → short (0 V)**, **current source → open (0 A)**.
- **Never turn off dependent sources** — keep them in every sub-circuit.
- Good when there are a few sources of different types.

### Source transformation
A real **voltage source** $V_s$ in **series** with $R$ ⟺ a **current source** $I_s=V_s/R$ in **parallel** with the same $R$.
- Arrow of current source points toward the **+** terminal of the original voltage source.
- Use repeatedly to collapse a ladder down to what you need.

### Thévenin's theorem
Any linear two-terminal network ⟺ **$V_{Th}$ in series with $R_{Th}$**.
1. **$V_{Th}$** = open-circuit voltage $v_{oc}$ at the terminals (remove the load).
2. **$R_{Th}$**:
   - *No dependent sources:* kill all independent sources, find equivalent resistance looking into the terminals.
   - *With dependent sources:* either (a) apply a test source $v_{test}$ (or $i_{test}$) at the terminals with independent sources off, then $R_{Th}=v_{test}/i_{test}$; or (b) $R_{Th}=v_{oc}/i_{sc}$.
3. Reattach load to the simple equivalent.

### Norton's theorem
Equivalent: **$I_N$ in parallel with $R_N$**, where $I_N = i_{sc}$ (short-circuit current), $R_N = R_{Th}$.
- Relationship: $V_{Th} = I_N R_{Th}$, and $\;R_{Th}=R_N=\dfrac{v_{oc}}{i_{sc}}$.

### Maximum power transfer
A load $R_L$ draws max power from a network when $\boxed{R_L = R_{Th}}$.
$$P_{\max} = \frac{V_{Th}^{\,2}}{4R_{Th}}$$
(At match, exactly half the source power reaches the load → 50% efficiency.)

---

## §4. Operational Amplifiers (Op-Amps)

### Ideal op-amp assumptions
1. **No input current:** $i_+ = i_- = 0$ (infinite input resistance).
2. **Virtual short** (when negative feedback present): $v_+ = v_-$.
3. Infinite open-loop gain, zero output resistance.
*Output saturates at the supply rails $\pm V_{cc}$ — answers must stay within rails.*

### Standard configurations (gain = $v_o/v_{in}$)
| Circuit | Output |
|---|---|
| **Inverting** | $v_o = -\dfrac{R_f}{R_1}\,v_{in}$ |
| **Non-inverting** | $v_o = \left(1+\dfrac{R_f}{R_1}\right)v_{in}$ |
| **Voltage follower (buffer)** | $v_o = v_{in}$ (gain 1, isolates load) |
| **Summing (inverting)** | $v_o = -\left(\dfrac{R_f}{R_1}v_1+\dfrac{R_f}{R_2}v_2+\cdots\right)$ |
| **Difference (diff-amp)** | $v_o = \dfrac{R_2}{R_1}(v_2-v_1)$ when $\dfrac{R_1}{R_2}=\dfrac{R_3}{R_4}$ |
| **Integrator** ($R$ in, $C$ feedback) | $v_o = -\dfrac{1}{RC}\displaystyle\int v_{in}\,dt$ |
| **Differentiator** ($C$ in, $R$ feedback) | $v_o = -RC\dfrac{dv_{in}}{dt}$ |

**Method for any op-amp circuit:** apply $i_+=i_-=0$ and $v_+=v_-$, then write KCL at the input nodes (node before the − terminal). Cascades multiply: just chain stage outputs into the next stage's input.

---

## §5. Capacitors & Inductors (the storage elements)

### Capacitor (stores energy in E-field)
- $\displaystyle i_C = C\,\frac{dv_C}{dt}$,  $\displaystyle v_C(t) = v_C(t_0)+\frac{1}{C}\int_{t_0}^{t} i_C\,d\tau$
- Energy: $\displaystyle w_C = \tfrac12 C v_C^2$
- **Voltage across a capacitor cannot change instantly:** $v_C(0^+) = v_C(0^-)$.
- **At DC steady state** (everything constant): $\dfrac{dv}{dt}=0 ⟹ i_C=0 ⟹$ capacitor = **open circuit**.
- Series: $\dfrac{1}{C_{eq}}=\sum\dfrac{1}{C_i}$ (like resistors in parallel). Parallel: $C_{eq}=\sum C_i$.

### Inductor (stores energy in B-field)
- $\displaystyle v_L = L\,\frac{di_L}{dt}$,  $\displaystyle i_L(t)=i_L(t_0)+\frac{1}{L}\int_{t_0}^{t}v_L\,d\tau$
- Energy: $\displaystyle w_L = \tfrac12 L i_L^2$
- **Current through an inductor cannot change instantly:** $i_L(0^+) = i_L(0^-)$.
- **At DC steady state:** $\dfrac{di}{dt}=0 ⟹ v_L=0 ⟹$ inductor = **short circuit**.
- Series: $L_{eq}=\sum L_i$. Parallel: $\dfrac{1}{L_{eq}}=\sum\dfrac{1}{L_i}$.

> **The two "cannot change instantly" rules are the keys to every transient problem.**

---

## §6. FIRST-ORDER CIRCUITS — RC & RL Transients ⭐ (high-yield)

A circuit with **one** equivalent capacitor or inductor → described by a 1st-order ODE.
**Every** first-order answer fits one universal formula:

$$\boxed{\,x(t) = x(\infty) + \big[x(0^+) - x(\infty)\big]\,e^{-(t-t_0)/\tau}\,}$$

where $x$ is any voltage or current, $x(0^+)$ = value just after switching, $x(\infty)$ = final steady-state value, $\tau$ = time constant.

### Time constant $\tau$
- **RC circuit:** $\;\tau = R_{Th}C$
- **RL circuit:** $\;\tau = \dfrac{L}{R_{Th}}$

where $R_{Th}$ = Thévenin resistance seen by the C or L **for $t>0$** (kill independent sources, look in from the storage element's terminals).
- After $5\tau$ the circuit is essentially at steady state (≈99.3%).

### STEP-BY-STEP for any 1st-order switched circuit
1. **$t<0$ (before switch, old steady state):** Cap = open, Inductor = short. Find the *stored* quantity:
   - $v_C(0^-)$ for a capacitor, or $i_L(0^-)$ for an inductor.
2. **Continuity:** $v_C(0^+)=v_C(0^-)$ and $i_L(0^+)=i_L(0^-)$. ← your $x(0^+)$ for the stored variable.
   - If you need a *different* variable at $0^+$ (e.g. a resistor current), redraw the circuit at $t=0^+$ with the cap replaced by a voltage source $=v_C(0^+)$ (or inductor by a current source $=i_L(0^+)$) and solve resistively.
3. **$t\to\infty$ (new steady state, $t>0$ sources):** Cap = open, Inductor = short. Find $x(\infty)$.
4. **$\tau$:** kill independent sources active for $t>0$; find $R_{Th}$ at the storage element; $\tau=R_{Th}C$ or $L/R_{Th}$.
5. **Plug into the universal formula.** Then get any other variable from $x(t)$ via Ohm/KVL/KCL.

### Source-free (natural) response special cases ($x(\infty)=0$)
- RC discharge: $v_C(t)=V_0\,e^{-t/\tau}$, $\;\tau=RC$.
- RL decay: $i_L(t)=I_0\,e^{-t/\tau}$, $\;\tau=L/R$.

### Capacitor current / inductor voltage during transient
Once you have $v_C(t)$ or $i_L(t)$:
- $i_C(t)=C\dfrac{dv_C}{dt}$ → for the universal form, $i_C(t)=\dfrac{C\,[x(0^+)-x(\infty)]\cdot(-1)}{\tau}e^{-t/\tau}$ (it jumps then decays).
- $v_L(t)=L\dfrac{di_L}{dt}$.
- Note: while $v_C$ is continuous, **$i_C$ can jump**; while $i_L$ is continuous, **$v_L$ can jump**.

### Singularity functions (for sources that switch)
- **Unit step** $u(t)=0$ for $t<0$, $=1$ for $t>0$. A source "$V\,u(t)$" turns on at $t=0$.
- **Unit impulse** $\delta(t)$: $\int\delta(t)\,dt=1$; $\delta = du/dt$.
- **Unit ramp** $r(t)=t\,u(t)$; $r=\int u\,dt$.

---

## §7. SECOND-ORDER CIRCUITS — Series & Parallel RLC ⭐⭐ (highest-yield)

Two storage elements (an $L$ **and** a $C$) → 2nd-order ODE → oscillatory/decaying responses.
General ODE form: $\dfrac{d^2x}{dt^2}+2\alpha\dfrac{dx}{dt}+\omega_0^2\,x = f(t)$.

### Key parameters
| Quantity | Series RLC | Parallel RLC |
|---|---|---|
| Neper / damping $\alpha$ | $\dfrac{R}{2L}$ | $\dfrac{1}{2RC}$ |
| Resonant freq $\omega_0$ | $\dfrac{1}{\sqrt{LC}}$ | $\dfrac{1}{\sqrt{LC}}$ |

(Both: $\omega_0=1/\sqrt{LC}$. Only $\alpha$ differs.)

### Characteristic roots
$$s_{1,2} = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}$$

### Three damping cases (compare $\alpha$ vs $\omega_0$)
| Case | Condition | Roots | Natural response $x_n(t)$ |
|---|---|---|---|
| **Overdamped** | $\alpha > \omega_0$ | real, distinct $s_1,s_2$ | $A_1e^{s_1t}+A_2e^{s_2t}$ |
| **Critically damped** | $\alpha = \omega_0$ | real, repeated $-\alpha$ | $(A_1 + A_2 t)\,e^{-\alpha t}$ |
| **Underdamped** | $\alpha < \omega_0$ | complex $-\alpha\pm j\omega_d$ | $e^{-\alpha t}\big(A_1\cos\omega_d t + A_2\sin\omega_d t\big)$ |

**Damped frequency:** $\;\omega_d=\sqrt{\omega_0^2-\alpha^2}$ (underdamped only).

### Complete (step) response
$$x(t) = x_{ss} + x_n(t)$$
where $x_{ss}=x(\infty)$ is the forced/steady-state value (from DC analysis: cap open, inductor short). The constants $A_1,A_2$ are found from **two** initial conditions.

### STEP-BY-STEP for any 2nd-order circuit
1. **$t<0$:** old steady state. Cap = open, inductor = short. Get **$v_C(0^-)$ and $i_L(0^-)$**.
2. **$t=0^+$ initial conditions (continuity):** $v_C(0^+)=v_C(0^-)$, $i_L(0^+)=i_L(0^-)$.
3. **Initial derivative** (you need $x(0^+)$ *and* $x'(0^+)$):
   - For a **series** RLC where $x=v_C$: $\dfrac{dv_C}{dt}\Big|_{0^+}=\dfrac{i_L(0^+)}{C}$ (since $i_C=i_L$).
   - For a **parallel** RLC where $x=i_L$: $\dfrac{di_L}{dt}\Big|_{0^+}=\dfrac{v_L(0^+)}{L}=\dfrac{v_C(0^+)}{L}$.
   - General trick: at $0^+$ redraw with cap→voltage source $v_C(0^+)$, inductor→current source $i_L(0^+)$, then solve resistively for whatever derivative you need via $i_C=C\,v_C'$ or $v_L=L\,i_L'$.
4. **Compute $\alpha$, $\omega_0$**, classify damping, write $s_{1,2}$ and the matching $x_n(t)$ form.
5. **$x(\infty)$:** new DC steady state (cap open, inductor short).
6. **Solve for $A_1,A_2$** using $x(0^+)$ and $x'(0^+)$ in $x(t)=x_{ss}+x_n(t)$.
7. Write the full $x(t)$; derive any other variable from it.

### Handy constant-solving (underdamped step response)
With $x(t)=x_{ss}+e^{-\alpha t}(A_1\cos\omega_d t + A_2\sin\omega_d t)$:
- $A_1 = x(0^+) - x_{ss}$
- $A_2 = \dfrac{x'(0^+) + \alpha A_1}{\omega_d}$

### Quality factor / bandwidth (if covered)
$Q=\dfrac{\omega_0}{2\alpha}$; series: $Q=\dfrac{1}{R}\sqrt{L/C}$; parallel: $Q=R\sqrt{C/L}$. Bandwidth $B=\dfrac{\omega_0}{Q}=2\alpha$.

---

## §8. AC Sinusoidal Steady-State & Phasors (if on your final)

> Many ENGR& 204 finals stop at RLC transients; include this only if your sample exams use sinusoids/phasors.

### Sinusoid
$v(t)=V_m\cos(\omega t+\phi)$; $\omega=2\pi f$ (rad/s); period $T=1/f$. RMS: $V_{rms}=V_m/\sqrt2$.

### Phasor representation
$V_m\cos(\omega t+\phi)\;\Leftrightarrow\;\mathbf V = V_m\angle\phi$ (a complex number). Derivative → $\times j\omega$.

### Impedance $Z$ (Ohm's law generalizes to $\mathbf V = \mathbf I\,Z$)
| Element | Impedance $Z$ |
|---|---|
| Resistor | $R$ |
| Inductor | $j\omega L$ |
| Capacitor | $\dfrac{1}{j\omega C} = -\dfrac{j}{\omega C}$ |

- Series/parallel combine exactly like resistors (using complex $Z$).
- All resistive theorems (divider, nodal, mesh, Thévenin, etc.) work with $Z$ in place of $R$.

### AC power
- Complex power $\mathbf S = \mathbf V_{rms}\mathbf I_{rms}^{*} = P + jQ$ (VA). $P$ = real power (W), $Q$ = reactive (VAR).
- $P = V_{rms}I_{rms}\cos\theta$, power factor $\text{pf}=\cos\theta$ ($\theta$ = angle of $Z$ = $\angle V-\angle I$).

### Complex-number quick math
- Rectangular $a+jb$ ↔ polar $r\angle\theta$: $r=\sqrt{a^2+b^2}$, $\theta=\tan^{-1}(b/a)$ (watch quadrant); $a=r\cos\theta$, $b=r\sin\theta$.
- Multiply/divide in **polar** (mult magnitudes, add angles). Add/subtract in **rectangular**.
- $j=1\angle90°$, $1/j=-j$, $j^2=-1$.

---

## §9. Exam-Day Checklist & Common Traps
- ☐ Did you use the **passive sign convention** consistently? Re-check every power sign.
- ☐ At DC steady state: **C = open, L = short.** Before/after switching this is your best friend.
- ☐ **$v_C$ and $i_L$ are continuous** across switching — these carry info from $t<0$ to $t>0$.
- ☐ For $\tau$ / $\alpha$, use the resistance seen **after** switching (for $t>0$), with sources killed.
- ☐ Turning off sources: V-source → short, I-source → open. Never kill dependent sources.
- ☐ Current divider: the **other** resistor goes on top (two-resistor case).
- ☐ 2nd order: you need **two** ICs — the value *and* its first derivative at $0^+$.
- ☐ Classify damping by comparing $\alpha$ and $\omega_0$ **before** choosing the response form.
- ☐ Keep calculator in correct angle mode (rad vs deg) for AC/phasor work.
- ☐ Units: $\tau$ in seconds ($\Omega\cdot$F$=$s, H$/\Omega=$s), energy in J, power in W.

---

*See `WORKED_EXAMPLES.md` for fully solved problems of every type above, and drop your own exams in
`source-files/` so the unsolved ones get added here with full step-by-step solutions.*
