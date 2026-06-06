# ENGR&204 — WORKED EXAMPLES (every problem type, step-by-step)

Each example mirrors a method in [`CHEATSHEET.md`](./CHEATSHEET.md). Numbers are chosen to come out clean so you can follow the mechanics. Replace with your own values on the exam.

> When you upload your real exams/HW to `course-files/`, I'll add solved versions of *those exact problems* here.

---

## A. Thévenin equivalent + Maximum power transfer  (§8)

**Circuit:** A 32 V source in series with 4 Ω feeds node **a**; a 12 Ω resistor goes from **a** to ground (**b**); a 2 A source injects current into node **a**. Find the Thévenin equivalent at a–b and the max power to a load.

**1. $V_{th}=v_{oc}$ (nodal at a, terminals open):**
$$\frac{V_a-32}{4}+\frac{V_a}{12}-2=0$$
×12: $3(V_a-32)+V_a-24=0\Rightarrow 4V_a=120\Rightarrow V_a=30\text{ V}=V_{th}.$

**2. $R_{th}$ (no dependent sources → kill independents):** 32 V→short, 2 A→open. Into a–b: $4\,\|\,12=\dfrac{4\cdot12}{16}=3\ \Omega=R_{th}.$

**3. Max power transfer:** $R_L=R_{th}=3\ \Omega$,
$$P_{max}=\frac{V_{th}^2}{4R_{th}}=\frac{30^2}{4(3)}=\frac{900}{12}=\boxed{75\text{ W}}.$$

---

## B. Nodal analysis (2 nodes)  (§6)

**Circuit:** 9 A source into node 1; 4 Ω from node 1→ground; 4 Ω from node 1→node 2; 4 Ω from node 2→ground.

Node 1: $\dfrac{V_1}{4}+\dfrac{V_1-V_2}{4}=9$
Node 2: $\dfrac{V_2-V_1}{4}+\dfrac{V_2}{4}=0\Rightarrow V_1=2V_2.$

Sub into node 1 (×4): $V_1+(V_1-V_2)=36\Rightarrow 2V_1-V_2=36\Rightarrow 2(2V_2)-V_2=36\Rightarrow 3V_2=36.$
$$\boxed{V_2=12\text{ V},\quad V_1=24\text{ V}.}$$
Check node 1: $24/4+(24-12)/4=6+3=9$ ✓.

---

## C. Op-amp (inverting summer)  (§9)

**Circuit:** Inverting summer, $R_1=10\text{k}$ ($v_1=1$ V), $R_2=20\text{k}$ ($v_2=2$ V), $R_f=20\text{k}$.
$$v_o=-R_f\!\left(\frac{v_1}{R_1}+\frac{v_2}{R_2}\right)=-20\text{k}\!\left(\frac{1}{10\text{k}}+\frac{2}{20\text{k}}\right)=-20\text{k}(0.1\text{m}+0.1\text{m})=\boxed{-4\text{ V}.}$$

---

## D. First-order RC — charging (§10)  ★

**Circuit:** Cap initially discharged. At $t=0$ a switch connects a 20 V source through $R_1=10\text{k}\Omega$ to node **a**; $R_2=10\text{k}\Omega$ runs a→ground; $C=100\,\mu$F sits a→ground (parallel with $R_2$). Find $v_C(t)$.

**Recipe:**
1. $t=0^-$: cap discharged → $v_C(0^-)=0$. Continuity → $v_C(0^+)=0.$
2. $t=\infty$: cap = open → voltage divider: $v_C(\infty)=20\cdot\dfrac{R_2}{R_1+R_2}=20\cdot\dfrac{10}{20}=10\text{ V}.$
3. $\tau$: kill 20 V (short). Cap sees $R_1\|R_2=5\text{k}\Omega$. $\tau=R_{th}C=5000\cdot100\mu=0.5\text{ s}.$
4. Assemble:
$$\boxed{v_C(t)=10\big(1-e^{-2t}\big)\text{ V},\quad t\ge0.}$$
($1/\tau=1/0.5=2$.) Sanity: $v_C(0)=0$, $v_C(\infty)=10$ ✓.

---

## E. First-order RL — discharge (§10)  ★

**Circuit:** For $t<0$ a switch has been closed a long time: 24 V source, $R_1=4\,\Omega$ in series to node **a**; $R_2=12\,\Omega$ from a→ground; inductor $L=3\,$H from a→ground (parallel with $R_2$). At $t=0$ the switch **opens** (removes source + $R_1$). Find $i_L(t)$.

**Recipe:**
1. $t=0^-$: DC steady state, $L$ = short → it shorts node a to ground, so all source current flows through $L$: $i_L(0^-)=24/4=6\text{ A}.$ Continuity → $i_L(0^+)=6\text{ A}.$
2. $t=\infty$: no source → $i_L(\infty)=0.$
3. $\tau$: for $t>0$ the inductor sees only $R_2=12\,\Omega$. $\tau=L/R_{th}=3/12=0.25\text{ s}.$
4. Assemble:
$$\boxed{i_L(t)=6\,e^{-4t}\text{ A},\quad t\ge0.}$$
Inductor voltage: $v_L=L\frac{di_L}{dt}=3(6)(-4)e^{-4t}=-72e^{-4t}\text{ V}.$

---

## F. Second-order **series** RLC — step, underdamped (§11)  ★

**Circuit:** Series loop, source steps $0\to12$ V at $t=0$ through $R=6\,\Omega$, $L=1\,$H, $C=0.04\,$F (in series); output is $v_C(t)$. Zero initial energy: $i_L(0^-)=0,\ v_C(0^-)=0$.

**1. Parameters:** $\alpha=\dfrac{R}{2L}=\dfrac{6}{2}=3.$ $\omega_0=\dfrac{1}{\sqrt{LC}}=\dfrac{1}{\sqrt{0.04}}=5.$
$\alpha<\omega_0\Rightarrow$ **underdamped.** $\omega_d=\sqrt{\omega_0^2-\alpha^2}=\sqrt{25-9}=4.$

**2. Form:** $v_C(t)=v_C(\infty)+e^{-\alpha t}(A_1\cos\omega_d t+A_2\sin\omega_d t).$
Final value (DC, cap open): $v_C(\infty)=12\text{ V}.$

**3. Initial conditions:**
- $v_C(0^+)=0\Rightarrow 12+A_1=0\Rightarrow A_1=-12.$
- Slope: $\dfrac{dv_C}{dt}\Big|_{0^+}=\dfrac{i_C(0^+)}{C}=\dfrac{i_L(0^+)}{C}=\dfrac{0}{0.04}=0.$
  Differentiate: $\dfrac{dv_C}{dt}=e^{-3t}\big[(-3)(A_1\cos4t+A_2\sin4t)+(-4A_1\sin4t+4A_2\cos4t)\big].$
  At $0^+$: $-3A_1+4A_2=0\Rightarrow -3(-12)+4A_2=0\Rightarrow A_2=-9.$

**4. Answer:**
$$\boxed{v_C(t)=12-e^{-3t}\big(12\cos4t+9\sin4t\big)\text{ V},\quad t\ge0.}$$
Checks: $v_C(0)=12-12=0$ ✓, $v_C(\infty)=12$ ✓.

---

## G. Second-order **parallel** RLC — source-free, overdamped (§11)  ★

**Circuit:** Parallel $R=4\,\Omega$, $L=2.5\,$H, $C=25\,$mF, no source for $t>0$. Initial: $v_C(0)=12$ V, $i_L(0)=0$. Find node voltage $v(t)$.

**1. Parameters:** $\alpha=\dfrac{1}{2RC}=\dfrac{1}{2(4)(0.025)}=5.$ $\omega_0=\dfrac{1}{\sqrt{LC}}=\dfrac{1}{\sqrt{2.5\cdot0.025}}=\dfrac{1}{\sqrt{0.0625}}=4.$
$\alpha>\omega_0\Rightarrow$ **overdamped.** Roots $s=-\alpha\pm\sqrt{\alpha^2-\omega_0^2}=-5\pm\sqrt{25-16}=-5\pm3=\{-2,-8\}.$

**2. Form:** $v(t)=A_1e^{-2t}+A_2e^{-8t}$ (source-free → $v(\infty)=0$).

**3. Initial conditions:**
- $v(0)=A_1+A_2=12.$
- KCL at node ($t=0^+$): $C\frac{dv}{dt}+\frac{v}{R}+i_L=0\Rightarrow \frac{dv}{dt}\Big|_{0^+}=\frac{-(v(0)/R+i_L(0))}{C}=\frac{-(12/4+0)}{0.025}=\frac{-3}{0.025}=-120.$
  Also $\frac{dv}{dt}\big|_{0^+}=-2A_1-8A_2=-120\Rightarrow A_1+4A_2=60.$
- Subtract: $3A_2=48\Rightarrow A_2=16,\ A_1=-4.$

**4. Answer:**
$$\boxed{v(t)=-4e^{-2t}+16e^{-8t}\text{ V},\quad t\ge0.}$$
Checks: $v(0)=-4+16=12$ ✓, $v'(0)=8-128=-120$ ✓.

---

## H. AC steady-state phasor analysis (series RL) (§12–13)

**Circuit:** $v_s(t)=10\cos(1000t)$ V, $R=30\,\Omega$, $L=40\,$mH in series.

1. $\omega=1000$. $Z_L=j\omega L=j(1000)(0.04)=j40\,\Omega.$ $Z=30+j40=50\angle53.13^\circ\,\Omega.$
2. $\mathbf V_s=10\angle0^\circ.$ $\mathbf I=\dfrac{\mathbf V_s}{Z}=\dfrac{10\angle0^\circ}{50\angle53.13^\circ}=0.2\angle{-53.13^\circ}\text{ A}.$
3. $i(t)=0.2\cos(1000t-53.13^\circ)$ A.
4. $\mathbf V_L=\mathbf I\,Z_L=0.2\angle{-53.13^\circ}\cdot40\angle90^\circ=8\angle36.87^\circ\Rightarrow v_L(t)=8\cos(1000t+36.87^\circ)$ V.
   $\mathbf V_R=\mathbf I\,R=6\angle{-53.13^\circ}$. KVL check: $6\angle{-53.13}+8\angle36.87=(3.6-j4.8)+(6.4+j4.8)=10\angle0^\circ$ ✓.

---

## I. AC power + power-factor correction (§14)

**Load:** $\mathbf V_{rms}=120\angle0^\circ$ V drives $Z=30+j40=50\angle53.13^\circ\,\Omega$ at $f=60$ Hz.

1. $\mathbf I_{rms}=\dfrac{120\angle0}{50\angle53.13}=2.4\angle{-53.13^\circ}$ A.
2. $\mathbf S=\mathbf V_{rms}\mathbf I_{rms}^{*}=120\angle0\cdot2.4\angle53.13^\circ=288\angle53.13^\circ=172.8+j230.4$ VA.
   - $P=172.8$ W, $Q=230.4$ VAR, $S=288$ VA.
   - $\text{pf}=\cos53.13^\circ=0.6$ **lagging** (inductive).
3. **Correct to pf = 0.95 lagging:** $\theta_{new}=\cos^{-1}0.95=18.19^\circ.$
   $$Q_C=P(\tan\theta_{old}-\tan\theta_{new})=172.8(\tan53.13^\circ-\tan18.19^\circ)=172.8(1.333-0.329)\approx173.6\text{ VAR}.$$
   $$C=\frac{Q_C}{\omega V_{rms}^2}=\frac{173.6}{(2\pi\cdot60)(120^2)}=\frac{173.6}{377\cdot14400}\approx\boxed{32\,\mu\text{F (parallel)}.}$$

---

## J. Resonance / Quality factor / Bandwidth (§15)

**Series RLC:** $R=10\,\Omega$, $L=10\,$mH, $C=1\,\mu$F.

- $\omega_0=\dfrac{1}{\sqrt{LC}}=\dfrac{1}{\sqrt{(10^{-2})(10^{-6})}}=\dfrac{1}{10^{-4}}=10{,}000\text{ rad/s}\;(f_0\approx1591\text{ Hz}).$
- $Q=\dfrac{1}{R}\sqrt{\dfrac{L}{C}}=\dfrac{1}{10}\sqrt{\dfrac{10^{-2}}{10^{-6}}}=\dfrac{1}{10}(100)=10.$
- Bandwidth $B=\dfrac{\omega_0}{Q}=\dfrac{10000}{10}=1000\text{ rad/s}.$
- Half-power freqs: $\omega_{1,2}\approx\omega_0\mp B/2=9500,\,10500$ rad/s.
- At resonance: $Z=R=10\,\Omega$ (minimum) → current is maximum and **in phase** with the source (pf = 1).

---

## K. First-order with singularity / two switches (method note)

If a switch acts at $t=0$ **and** again at $t=t_1$: solve the interval $0\le t<t_1$ with the recipe (§10). Evaluate the state variable at $t_1^-$, use continuity ($v_C$ or $i_L$) as the new initial condition, then re-run the recipe for $t\ge t_1$ with the new $\tau$ and new final value. Stitch the two pieces together.

---

*Need a specific problem solved exactly like one on your past exams? Upload it to `course-files/` (see [`README.md`](./README.md)) and re-run me.*
