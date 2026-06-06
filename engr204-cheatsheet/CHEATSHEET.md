# ENGR&204 — ULTIMATE CHEAT SHEET (Electrical Circuits)

> Unlimited-page, "anything goes" master sheet. Weighted toward the **end-of-quarter** material the final emphasizes: **first-order RC/RL** and **second-order RLC** transients, plus **AC steady-state / phasors / power**. Standard 4-question final.
>
> **How to use this in the exam:** find the problem *type* in the **Master Decision Tree** (Section 1), jump to that section, run the **recipe**, plug into the **formula box**. Worked numbers for every type are in [`WORKED-EXAMPLES.md`](./WORKED-EXAMPLES.md).

---

## 1. MASTER DECISION TREE — "what kind of problem is this?"

```
Is there a sinusoidal source (cos/sin, ω, "steady state", "phasor")?
├─ YES → AC. Convert to phasors (§12). Then:
│        • find a voltage/current?      → impedance + nodal/mesh/Thévenin (§12–13)
│        • "average/real/reactive power, pf"? → AC Power (§14)
│        • "resonance / cutoff / filter / bandwidth"? → Freq response (§15)
│
└─ NO (DC sources, switch at t=0, "find v(t)/i(t) for t>0")?
         How many energy-storage elements (L or C) AFTER combining?
         ├─ 0  → pure resistive: dividers / nodal / mesh / Thévenin (§5–8)
         ├─ 1  → FIRST-ORDER (RC or RL) transient (§10)  ★HIGH YIELD★
         └─ 2  → SECOND-ORDER (RLC) transient (§11)       ★HIGH YIELD★

Op-amp in the circuit? → use ideal op-amp rules first (§9), then above.
```

**The single most useful fact for transients:** at **DC steady state**, a **capacitor = open circuit** and an **inductor = short circuit**. Use this to find every initial condition $(t=0^-)$ and final condition $(t=\infty)$.

---

## 2. UNITS, PREFIXES, CONSTANTS

| Quantity | Symbol | Unit |
|---|---|---|
| Charge | $q$ | coulomb (C) |
| Current | $i=dq/dt$ | ampere (A) |
| Voltage | $v$ | volt (V) |
| Power | $p=vi$ | watt (W) |
| Energy | $w=\int p\,dt$ | joule (J) |
| Resistance / Conductance | $R$ / $G=1/R$ | Ω / S |
| Capacitance | $C$ | farad (F) |
| Inductance | $L$ | henry (H) |
| Frequency | $f$ | Hz, $\omega=2\pi f$ rad/s |

**Prefixes:** p $10^{-12}$, n $10^{-9}$, µ $10^{-6}$, m $10^{-3}$, k $10^{3}$, M $10^{6}$, G $10^{9}$.

---

## 3. MATH TOOLBOX

### 3.1 Complex numbers (the heart of AC)
- Rectangular: $z=a+jb$. Polar: $z=|z|\angle\theta$. Exponential: $z=|z|e^{j\theta}$.
- $|z|=\sqrt{a^2+b^2}$, $\theta=\operatorname{atan2}(b,a)$ (watch the quadrant!).
- $a=|z|\cos\theta,\; b=|z|\sin\theta$.
- **Add/subtract → rectangular.** **Multiply/divide → polar.**
  - $z_1 z_2=|z_1||z_2|\angle(\theta_1+\theta_2)$
  - $\dfrac{z_1}{z_2}=\dfrac{|z_1|}{|z_2|}\angle(\theta_1-\theta_2)$
- $j=1\angle90^\circ$, $\;1/j=-j$, $\;j^2=-1$, $\;j=\sqrt{-1}$.
- Conjugate $z^*=a-jb=|z|\angle(-\theta)$.

### 3.2 Euler / phasor identity
$$e^{j\theta}=\cos\theta+j\sin\theta,\qquad \cos\theta=\Re\{e^{j\theta}\},\quad \sin\theta=\Im\{e^{j\theta}\}$$

### 3.3 First-order ODE (memorize the SOLUTION, not the algebra)
For $\dfrac{dx}{dt}+\dfrac{1}{\tau}x = K$, the solution is the universal transient formula:
$$\boxed{x(t)=x(\infty)+\big[x(0^+)-x(\infty)\big]\,e^{-t/\tau}}$$

### 3.4 Second-order ODE
For $\dfrac{d^2x}{dt^2}+2\alpha\dfrac{dx}{dt}+\omega_0^2 x = f$:
- Characteristic roots $s_{1,2}=-\alpha\pm\sqrt{\alpha^2-\omega_0^2}$.
- Solution = (forced/steady-state $x_f=x(\infty)$) + (natural response from roots), see §11.

### 3.5 Trig you'll need
- $\cos(\omega t\pm90^\circ)=\mp\sin\omega t$, $\sin(\omega t\pm90^\circ)=\pm\cos\omega t$.
- $-\cos\theta=\cos(\theta\pm180^\circ)$.
- Convert sine to cosine reference: $\sin\omega t=\cos(\omega t-90^\circ)$.

---

## 4. FUNDAMENTAL LAWS

- **Ohm's law:** $v=iR$ (passive sign convention: current enters the **+** terminal).
- **Power:** $p=vi=i^2R=\dfrac{v^2}{R}$. $p>0$ → **absorbed**; $p<0$ → **delivered**.
- **Passive sign convention:** assign $i$ into the **+** marked terminal; then $p=vi$ is power absorbed.
- **KCL:** $\sum i_{in}=\sum i_{out}$ at any node (algebraic sum = 0).
- **KVL:** $\sum v=0$ around any closed loop.
- **Conservation of power:** $\sum p_{absorbed}=\sum p_{delivered}$ (total = 0).

---

## 5. RESISTIVE COMBINATIONS & DIVIDERS

| Config | Formula |
|---|---|
| Series R | $R_{eq}=R_1+R_2+\dots$ |
| Parallel R | $\dfrac{1}{R_{eq}}=\sum\dfrac{1}{R_i}$; two: $R_{eq}=\dfrac{R_1R_2}{R_1+R_2}$ |
| **Voltage divider** | $v_x=v_s\cdot\dfrac{R_x}{\sum R}$ (series) |
| **Current divider** | $i_x=i_s\cdot\dfrac{R_{other}}{R_1+R_2}$ (2 parallel: opposite R on top) |
| General current divider | $i_x=i_s\dfrac{G_x}{\sum G}$ |

**Δ↔Y conversion:**
$$R_Y=\frac{\text{product of adjacent Δ resistors}}{\text{sum of Δ resistors}},\qquad R_\Delta=\frac{\text{sum of pairwise Y products}}{\text{opposite Y resistor}}$$
Balanced: $R_\Delta=3R_Y$.

---

## 6. NODAL ANALYSIS (best when many voltage unknowns / current sources)

**Recipe:**
1. Pick a **reference (ground)** node.
2. Label remaining node voltages $v_1,v_2,\dots$
3. KCL at each non-reference node, currents *leaving* via resistors: $\sum \dfrac{v_{node}-v_{other}}{R}= \sum i_{source\,in}$.
4. **Voltage source between two nodes → supernode:** write one KCL around both, plus the constraint $v_a-v_b=V_s$.
5. Solve the linear system.

---

## 7. MESH ANALYSIS (best when many current unknowns / voltage sources, planar)

**Recipe:**
1. Define clockwise mesh currents $i_1,i_2,\dots$
2. KVL each mesh; resistor voltage = $R\times$(its own mesh current − neighbor mesh current sharing it).
3. **Current source shared by two meshes → supermesh:** KVL around the outer loop skipping the source, plus constraint $i_a-i_b=I_s$.
4. Branch current = difference of the two mesh currents through it.

---

## 8. NETWORK THEOREMS

### 8.1 Superposition
Response = sum of responses from each independent source acting alone.
- **Kill a voltage source → short it.** **Kill a current source → open it.**
- Leave dependent sources active.

### 8.2 Source transformation
A voltage source $V_s$ in series with $R$ ⇔ current source $I_s=V_s/R$ in parallel with same $R$ (and vice-versa).

### 8.3 Thévenin & Norton  ★exam favorite★
Replace everything seen from terminals **a–b** by $V_{th}$ in series with $R_{th}$ (or $I_N=V_{th}/R_{th}$ parallel $R_{th}$).
1. **$V_{th}$** = open-circuit voltage $v_{oc}$ across a–b.
2. **$I_N$** = short-circuit current $i_{sc}$ a–b.
3. **$R_{th}=V_{th}/I_N$.**
4. **If no dependent sources:** kill all independent sources and find $R_{eq}$ looking into a–b (faster).
5. **If dependent sources present:** kill independent sources, apply a test source $v_{test}=1\,V$ (or $i_{test}=1\,A$), $R_{th}=v_{test}/i_{test}$.

### 8.4 Maximum power transfer (DC)
$R_L=R_{th}$ gives $\;P_{max}=\dfrac{V_{th}^2}{4R_{th}}$.

---

## 9. IDEAL OP-AMPS

**Golden rules (ideal, negative feedback):** (1) $i_+=i_-=0$ (no input current). (2) $v_+=v_-$ (virtual short).

| Configuration | Output |
|---|---|
| Inverting | $v_o=-\dfrac{R_f}{R_1}v_i$ |
| Non-inverting | $v_o=\left(1+\dfrac{R_f}{R_1}\right)v_i$ |
| Buffer/follower | $v_o=v_i$ |
| Summing (inverting) | $v_o=-R_f\left(\dfrac{v_1}{R_1}+\dfrac{v_2}{R_2}+\dots\right)$ |
| Difference | $v_o=\dfrac{R_2}{R_1}(v_2-v_1)$ (matched ratios) |
| Integrator | $v_o=-\dfrac{1}{RC}\displaystyle\int v_i\,dt$ |
| Differentiator | $v_o=-RC\dfrac{dv_i}{dt}$ |

General method: apply golden rules, then **KCL at the inverting node**.

---

## 10. ★ FIRST-ORDER CIRCUITS — RC & RL TRANSIENTS ★ (HIGH YIELD)

> Any circuit with **one** capacitor or **one** inductor (after combining). The exam loves "switch flips at $t=0$, find $v(t)$ or $i(t)$ for $t\ge0$."

### 10.1 The ONE formula (works for every first-order problem)
$$\boxed{x(t)=x(\infty)+\big[x(0^+)-x(\infty)\big]e^{-t/\tau}\quad (t\ge0)}$$
where $x$ is **any** voltage or current in the circuit. You only need **three numbers**: $x(0^+)$, $x(\infty)$, $\tau$.

### 10.2 Time constant $\tau$
| Type | $\tau$ |
|---|---|
| RC | $\tau=R_{th}C$ |
| RL | $\tau=\dfrac{L}{R_{th}}$ |

$R_{th}$ = Thévenin resistance seen by the **C or L terminals** for $t>0$ (kill independent sources; if dependent sources, use a test source).

### 10.3 Continuity (the bridge across the switch)
$$v_C(0^+)=v_C(0^-),\qquad i_L(0^+)=i_L(0^-)$$
Capacitor voltage and inductor current **cannot jump**. (Resistor voltages/currents and $i_C$, $v_L$ **can** jump.)

### 10.4 THE RECIPE (do this every time)
1. **$t=0^-$ (before switch):** assume old circuit at DC steady state → **C = open, L = short**. Find $v_C(0^-)$ or $i_L(0^-)$.
2. **Continuity:** carry it across → $v_C(0^+)$ or $i_L(0^+)$.
3. **$t=0^+$ (just after):** redraw new circuit. Replace **C by a voltage source $=v_C(0^+)$** and **L by a current source $=i_L(0^+)$**. Solve resistive circuit for whatever variable $x$ you actually want → $x(0^+)$.
4. **$t=\infty$ (new steady state):** new circuit at DC → **C = open, L = short**. Find $x(\infty)$.
5. **$\tau$:** turn off independent sources in the $t>0$ circuit, find $R_{th}$ at the C/L terminals, $\tau=R_{th}C$ or $L/R_{th}$.
6. **Assemble:** $x(t)=x(\infty)+[x(0^+)-x(\infty)]e^{-t/\tau}$.

### 10.5 Special named cases (all are just the general formula)
- **Source-free / natural (capacitor discharge):** $x(\infty)=0$ → $x(t)=x(0^+)e^{-t/\tau}$.
- **RC charging step:** $v_C(t)=V_f(1-e^{-t/\tau})$ if starting from 0.
- **RL with step:** $i_L(t)=I_f+(I_0-I_f)e^{-t/\tau}$.

### 10.6 Element laws (you may need these directly)
$$i_C=C\frac{dv_C}{dt},\qquad v_L=L\frac{di_L}{dt}$$
Energy: $w_C=\tfrac12 Cv_C^2$, $\;w_L=\tfrac12 Li_L^2$.

### 10.7 Useful checkpoints
- $t=\tau$: response is 63.2% of the way to final (or decayed to 36.8%).
- "Settled" after $\approx 5\tau$.
- Slope at $t=0^+$: $\dfrac{dx}{dt}\Big|_{0^+}=\dfrac{x(\infty)-x(0^+)}{\tau}$.

---

## 11. ★ SECOND-ORDER CIRCUITS — SERIES & PARALLEL RLC ★ (HIGH YIELD)

> Two energy-storage elements (an L **and** a C). Look for "find $v(t)$/$i(t)$, $t>0$" with both an inductor and capacitor.

### 11.1 Key parameters
| | **Series RLC** | **Parallel RLC** |
|---|---|---|
| Neper / damping $\alpha$ | $\dfrac{R}{2L}$ | $\dfrac{1}{2RC}$ |
| Resonant freq $\omega_0$ | $\dfrac{1}{\sqrt{LC}}$ | $\dfrac{1}{\sqrt{LC}}$ |
| Char. eq. | $s^2+2\alpha s+\omega_0^2=0$ | same |

Roots: $\;s_{1,2}=-\alpha\pm\sqrt{\alpha^2-\omega_0^2}$.

### 11.2 Damping cases (compare $\alpha$ vs $\omega_0$)
| Case | Condition | Roots | Natural response form |
|---|---|---|---|
| **Overdamped** | $\alpha>\omega_0$ | real, distinct $s_1,s_2$ | $A_1e^{s_1t}+A_2e^{s_2t}$ |
| **Critically damped** | $\alpha=\omega_0$ | real, repeated $s=-\alpha$ | $(A_1+A_2t)e^{-\alpha t}$ |
| **Underdamped** | $\alpha<\omega_0$ | complex $-\alpha\pm j\omega_d$ | $e^{-\alpha t}(A_1\cos\omega_d t+A_2\sin\omega_d t)$ |

**Damped freq:** $\omega_d=\sqrt{\omega_0^2-\alpha^2}$.

### 11.3 Complete solution
$$x(t)=\underbrace{x(\infty)}_{\text{forced (DC final)}}+\underbrace{x_n(t)}_{\text{natural (table above)}}$$

### 11.4 THE RECIPE
1. **Identify topology** (series vs parallel RLC for $t>0$) → compute $\alpha$, $\omega_0$, decide case, get roots.
2. **Initial conditions at $t=0^-$** (old circuit, DC: C open, L short): get $v_C(0^-)$ and $i_L(0^-)$ → carry across by continuity.
3. **Final value $x(\infty)$** (new circuit, DC steady state).
4. **Two constants $A_1,A_2$** need **two** conditions:
   - $x(0^+)$ (value), and
   - $\dfrac{dx}{dt}\Big|_{0^+}$ (initial slope).
   Get the slope from the element laws using the OTHER state variable:
   $$\frac{dv_C}{dt}\Big|_{0^+}=\frac{i_C(0^+)}{C},\qquad \frac{di_L}{dt}\Big|_{0^+}=\frac{v_L(0^+)}{L}$$
   (Find $i_C(0^+)$ or $v_L(0^+)$ from the $t=0^+$ resistive circuit using KCL/KVL.)
5. Plug $x(0^+)$ and $x'(0^+)$ into the chosen response form to solve $A_1,A_2$.

### 11.5 Solving for $A_1, A_2$ (the algebra)
- **Overdamped:** $x(0^+)=A_1+A_2$; $\;x'(0^+)=s_1A_1+s_2A_2$.
- **Critically damped:** $x(0^+)=A_1$; $\;x'(0^+)=-\alpha A_1+A_2$.
- **Underdamped:** $x(0^+)=A_1$; $\;x'(0^+)=-\alpha A_1+\omega_d A_2$.
(Apply these to the **transient part** $x-x(\infty)$, i.e. subtract the final value first.)

### 11.6 Quality factor (links to AC resonance, §15)
$$Q=\frac{\omega_0}{2\alpha}\;\Rightarrow\; \text{series } Q=\frac{1}{R}\sqrt{\frac{L}{C}},\quad \text{parallel } Q=R\sqrt{\frac{C}{L}}$$

---

## 12. AC STEADY-STATE: PHASORS & IMPEDANCE

### 12.1 Time ↔ phasor (use COSINE reference)
$$v(t)=V_m\cos(\omega t+\phi)\;\Longleftrightarrow\;\mathbf{V}=V_m\angle\phi$$
If given a sine, convert: $\sin(\omega t)=\cos(\omega t-90^\circ)$.

### 12.2 Impedance $Z=V/I$ (Ω) and Admittance $Y=1/Z$ (S)
| Element | Impedance $Z$ | Notes |
|---|---|---|
| Resistor | $R$ | in phase |
| Inductor | $j\omega L$ | $v$ **leads** $i$ by 90° |
| Capacitor | $\dfrac{1}{j\omega C}=-\dfrac{j}{\omega C}$ | $i$ **leads** $v$ by 90° |

- $Z=R+jX$: $R$=resistance, $X$=reactance ($X_L=\omega L$, $X_C=-1/\omega C$).
- Series/parallel combine **exactly like resistors** (use complex algebra).
- "ELI the ICE man": in an inductor (L), **E** leads **I**; in a capacitor (C), **I** leads **E**.

### 12.3 Phasor-domain analysis
All DC tools work with complex numbers:
- Ohm: $\mathbf V=\mathbf I\,Z$.
- Voltage divider: $\mathbf V_x=\mathbf V_s\dfrac{Z_x}{\sum Z}$.
- **Nodal/Mesh, Superposition, Source transform, Thévenin/Norton** — all identical, just complex.
- **AC Thévenin:** $\mathbf V_{th}=\mathbf V_{oc}$, $Z_{th}$ from killed-source impedance (or test source).

### 12.4 Back to time domain
$\mathbf V=V_m\angle\phi\;\Rightarrow\;v(t)=V_m\cos(\omega t+\phi)$.

---

## 13. AC ANALYSIS CHECK-PROCEDURE
1. Note $\omega$ from the source.
2. Convert all sources to phasors (cosine ref).
3. Convert R, L, C to impedances at that $\omega$.
4. Solve with nodal/mesh/Thévenin (complex algebra; +/− in rectangular, ×/÷ in polar).
5. Convert the answer phasor back to $v(t)$/$i(t)$.

---

## 14. ★ AC POWER ★

### 14.1 RMS values
$$V_{rms}=\frac{V_m}{\sqrt2},\quad I_{rms}=\frac{I_m}{\sqrt2}\quad(\text{sinusoids only})$$

### 14.2 The power quantities
For load with voltage/current phase difference $\theta=\theta_v-\theta_i$ (= angle of $Z$):

| Quantity | Formula | Unit |
|---|---|---|
| **Average / real power** $P$ | $V_{rms}I_{rms}\cos\theta = I_{rms}^2 R$ | W |
| **Reactive power** $Q$ | $V_{rms}I_{rms}\sin\theta = I_{rms}^2 X$ | VAR |
| **Apparent power** $S$ | $V_{rms}I_{rms}=|\,\mathbf S\,|$ | VA |
| **Complex power** $\mathbf S$ | $\mathbf S=\tfrac12\mathbf V\mathbf I^{*}=\mathbf V_{rms}\mathbf I_{rms}^{*}=P+jQ$ | VA |
| **Power factor** | $\text{pf}=\cos\theta=P/S$ | — |

- $\mathbf S = P + jQ$, $\;|\mathbf S|=\sqrt{P^2+Q^2}$, $\;\theta=\angle Z$.
- **Inductive load:** $\theta>0$, $Q>0$, pf **lagging** (current lags voltage).
- **Capacitive load:** $\theta<0$, $Q<0$, pf **leading**.
- Power triangle: horizontal $P$, vertical $Q$, hypotenuse $S$, angle $\theta$.

### 14.3 Power factor correction
Add **parallel capacitor** to reduce $Q$ (improve lagging pf):
$$Q_C = P(\tan\theta_{old}-\tan\theta_{new}),\qquad C=\frac{Q_C}{\omega V_{rms}^2}$$

### 14.4 Max average power transfer (AC)
Load $\mathbf Z_L=\mathbf Z_{th}^{*}$ (complex conjugate). Then
$$P_{max}=\frac{|\mathbf V_{th}|^2}{8\,R_{th}}\quad(\text{using amplitude } V_{th};\ =\frac{V_{th,rms}^2}{4R_{th}})$$
If $Z_L$ restricted to pure resistance: $R_L=|\mathbf Z_{th}|$.

---

## 15. FREQUENCY RESPONSE, RESONANCE, FILTERS

### 15.1 Transfer function
$\mathbf H(\omega)=\dfrac{\text{output phasor}}{\text{input phasor}}$. Magnitude $|\mathbf H|$ and phase $\angle\mathbf H$ vs $\omega$. Decibels: $H_{dB}=20\log_{10}|\mathbf H|$.

### 15.2 Resonance (series & parallel RLC)
- Resonant frequency: $\omega_0=\dfrac{1}{\sqrt{LC}}$ → $X_L=X_C$, impedance is **purely resistive**, pf = 1.
- **Series RLC at resonance:** $Z$ minimum $=R$ → current maximum.
- **Parallel RLC at resonance:** $Z$ maximum → current minimum.
- Bandwidth $B=\dfrac{\omega_0}{Q}=\omega_2-\omega_1$ (half-power points, $-3$ dB).
- $Q=\dfrac{\omega_0}{B}$; high $Q$ = sharp/selective.

### 15.3 First-order passive filters
| Filter | Cutoff $\omega_c$ |
|---|---|
| RC low-pass / high-pass | $\omega_c=\dfrac{1}{RC}$ |
| RL low-pass / high-pass | $\omega_c=\dfrac{R}{L}$ |
At $\omega_c$: $|\mathbf H|=1/\sqrt2$ (−3 dB), phase $=\mp45^\circ$.

---

## 16. MUTUAL INDUCTANCE / TRANSFORMERS (if covered)
- Coupled coils: $v_1=L_1\dfrac{di_1}{dt}\pm M\dfrac{di_2}{dt}$, $\;v_2=L_2\dfrac{di_2}{dt}\pm M\dfrac{di_1}{dt}$.
- Sign from **dot convention**: + if both currents enter (or both leave) dotted terminals.
- Coupling coefficient $k=\dfrac{M}{\sqrt{L_1L_2}}$ ($0\le k\le1$).
- Phasor form: $\mathbf V_1=j\omega L_1\mathbf I_1\pm j\omega M\mathbf I_2$.
- Ideal transformer: $\dfrac{V_2}{V_1}=\dfrac{N_2}{N_1}=n$, $\;\dfrac{I_2}{I_1}=\dfrac{1}{n}$, reflected impedance $Z_{in}=Z_L/n^2$.

---

## 17. LAPLACE / s-DOMAIN (if your section covers it)
- $\mathcal L\{1\}=\frac1s$, $\mathcal L\{e^{-at}\}=\frac{1}{s+a}$, $\mathcal L\{\cos\omega t\}=\frac{s}{s^2+\omega^2}$, $\mathcal L\{\sin\omega t\}=\frac{\omega}{s^2+\omega^2}$.
- Derivative: $\mathcal L\{f'\}=sF(s)-f(0)$.
- Element impedances: $R$, $sL$ (with IC source $Li_L(0)$), $\frac{1}{sC}$ (with IC source $\frac{v_C(0)}{s}$).
- Solve algebraically in $s$, then inverse-transform (partial fractions) → $f(t)$.

---

## 18. SIGN-CONVENTION & SANITY CHECKS (don't lose easy points)
- Re-mark every element's + / − before writing KVL/Ohm.
- $v_C$ and $i_L$ are **continuous**; everything else may jump.
- At $t\to\infty$ a transient answer must be a **constant** (DC) — if it isn't, recheck $x(\infty)$.
- Units: $\tau$ in seconds (RC: Ω·F = s; L/R: H/Ω = s).
- Angles consistent in degrees vs radians.
- Power absorbed by resistors is always $\ge0$.
- After solving AC, magnitude of current through a small impedance should be large, etc. — gut-check.

---

## 19. ONE-PAGE FORMULA STRIP (last-minute glance)

```
Ohm v=iR   P=vi=i²R=v²/R   KCL Σi=0   KVL Σv=0
Vdiv vx=vs·Rx/ΣR    Idiv ix=is·Ro/(R1+R2)
Thév: Vth=voc, Rth=voc/isc (or Req); MPT RL=Rth, Pmax=Vth²/4Rth

1st order:  x(t)=x(∞)+[x(0+)-x(∞)]e^{-t/τ}
            τ_RC=RthC    τ_RL=L/Rth
            vC(0+)=vC(0-)   iL(0+)=iL(0-)
            DC steady: C=open, L=short

2nd order:  s²+2αs+ω0²=0     s=-α±√(α²-ω0²)
   series  α=R/2L     parallel α=1/2RC      ω0=1/√(LC)
   over(α>ω0): A1e^{s1t}+A2e^{s2t}
   crit(α=ω0): (A1+A2 t)e^{-αt}
   under(α<ω0): e^{-αt}(A1cosωd t+A2sinωd t), ωd=√(ω0²-α²)
   need x(0+) and x'(0+); dvC/dt=iC/C, diL/dt=vL/L

Phasors: ZR=R  ZL=jωL  ZC=1/(jωC)=-j/ωC
   Vrms=Vm/√2
   S=½VI*=Vrms·Irms*=P+jQ   pf=cosθ=P/S
   P=VrmsIrms cosθ   Q=VrmsIrms sinθ   S=VrmsIrms
   PF corr: Qc=P(tanθold-tanθnew), C=Qc/(ωV²rms)
   AC MPT: ZL=Zth*,  Pmax=|Vth|²/8Rth

Resonance: ω0=1/√(LC), B=ω0/Q, Q=ω0/B
   series Q=(1/R)√(L/C)   parallel Q=R√(C/L)
RC filter ωc=1/RC   RL filter ωc=R/L   (-3dB, |H|=1/√2)
```

---

*See [`WORKED-EXAMPLES.md`](./WORKED-EXAMPLES.md) for fully solved problems of every type above. Upload your own exams/HW to `course-files/` and I'll solve them and bolt them onto this sheet.*
