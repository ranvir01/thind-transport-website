# ENGR& 204 — WORKED EXAMPLES (full step-by-step)

One fully solved problem per major type. Numbers are chosen to be clean and are arithmetic-checked.
Use these as templates — match your exam problem to the closest type and follow the same steps.
**The RC / RL / RLC examples (§E6–§E9) are the ones the final hits hardest.**

---

## E1. Series/parallel + dividers + power
**Q:** A 24 V source feeds $R_1=2\,\Omega$ in series with the parallel combo $R_2=6\,\Omega \,\|\, R_3=3\,\Omega$. Find the current from the source and the power in $R_2$.

1. $R_2\|R_3 = \dfrac{6\cdot3}{6+3}=2\,\Omega$. Total $R=2+2=4\,\Omega$.
2. Source current $i=\dfrac{24}{4}=6\,\text{A}$.
3. Voltage across the parallel combo: $v=i\cdot2=12\,\text{V}$.
4. $P_{R_2}=\dfrac{v^2}{R_2}=\dfrac{12^2}{6}=24\,\text{W}.$

---

## E2. Nodal analysis (with a current source)
**Q:** Node A connects: $R_1=6\,\Omega$ to a 12 V source, $R_2=3\,\Omega$ to ground, and a 2 A source injecting into A. Find $v_A$.

KCL at A (currents leaving = 0):
$$\frac{v_A-12}{6}+\frac{v_A}{3}-2=0 \;\;\xrightarrow{\times6}\;\; (v_A-12)+2v_A-12=0 \Rightarrow 3v_A=24 \Rightarrow \boxed{v_A=8\,\text{V}}$$

---

## E3. Mesh analysis
**Q:** Two meshes. Mesh 1 has a 20 V source and $R_1=5\,\Omega$; the shared branch is $R_3=10\,\Omega$; mesh 2 has only $R_2=10\,\Omega$. Find the current in $R_3$.

- Mesh 1: $-20 + 5i_1 + 10(i_1-i_2)=0 \Rightarrow 15i_1-10i_2=20$.
- Mesh 2: $10(i_2-i_1)+10i_2=0 \Rightarrow i_1=2i_2$.
- Sub: $15(2i_2)-10i_2=20 \Rightarrow 20i_2=20 \Rightarrow i_2=1\,\text{A},\; i_1=2\,\text{A}$.
- $i_{R_3}=i_1-i_2=\boxed{1\,\text{A}}$.

---

## E4. Superposition (proves E2)
Same circuit as E2.
- **12 V alone** (open the 2 A source): $i=\dfrac{12}{6+3}=1.333\,\text{A}$, $v_{A,1}=i\cdot3=4\,\text{V}$.
- **2 A alone** (short the 12 V source): $R_1\|R_2=6\|3=2\,\Omega$, $v_{A,2}=2\,\text{A}\cdot2\,\Omega=4\,\text{V}$.
- Total $v_A=4+4=\boxed{8\,\text{V}}$ ✓ (matches nodal).

---

## E5. Thévenin + Maximum Power Transfer
**Q:** A 12 V source in series with $R_1=2\,\Omega$ reaches node $a$; $R_2=4\,\Omega$ runs from $a$ to ground $b$. Find the Thévenin equiv at $a$–$b$, and the max power deliverable to a load.

1. **$V_{Th}$ (open circuit):** current $=\dfrac{12}{2+4}=2\,\text{A}$, $V_{Th}=v_{ab}=2\cdot4=8\,\text{V}$.
2. **$R_{Th}$** (short the 12 V source): $R_1\|R_2=2\|4=\dfrac{8}{6}=1.333\,\Omega$.
3. **Max power** at $R_L=R_{Th}=1.333\,\Omega$: $P_{\max}=\dfrac{V_{Th}^2}{4R_{Th}}=\dfrac{64}{4(1.333)}=\boxed{12\,\text{W}}$.

---

## E6. Op-amp (inverting + summing)
**Q1 (inverting):** $R_1=10\,\text{k}\Omega$, $R_f=40\,\text{k}\Omega$, $v_{in}=0.5\,\text{V}$.
$$v_o=-\frac{R_f}{R_1}v_{in}=-\frac{40}{10}(0.5)=\boxed{-2\,\text{V}}$$
**Q2 (summing):** inputs $v_1=1\,\text{V}$ ($R_1=10\,\text{k}$), $v_2=2\,\text{V}$ ($R_2=20\,\text{k}$), $R_f=20\,\text{k}$:
$$v_o=-\Big(\tfrac{20}{10}(1)+\tfrac{20}{20}(2)\Big)=-(2+2)=\boxed{-4\,\text{V}}$$

---

## E7. FIRST-ORDER RC — step (charging) ⭐
**Q:** Switch closes at $t=0$. A 20 V source feeds $R_1=2\,\text{k}\Omega$ to node A; from A, $R_2=2\,\text{k}\Omega$ to ground in parallel with $C=1\,\mu\text{F}$. Capacitor initially uncharged. Find $v_C(t)$.

1. **$v_C(0^+)=v_C(0^-)=0$** (uncharged, continuity).
2. **$v_C(\infty)$** (cap = open): voltage divider $v_A=20\cdot\dfrac{R_2}{R_1+R_2}=20\cdot\dfrac{2}{4}=10\,\text{V}$.
3. **$\tau$:** kill source (short), $R_{Th}=R_1\|R_2=2\text{k}\|2\text{k}=1\,\text{k}\Omega$. $\tau=R_{Th}C=(1000)(1\!\times\!10^{-6})=1\,\text{ms}$.
4. **Universal formula:**
$$\boxed{v_C(t)=10+\big(0-10\big)e^{-t/1\text{ms}}=10\left(1-e^{-t/0.001}\right)\text{V}}$$
Capacitor current: $i_C=C\dfrac{dv_C}{dt}=10^{-6}\cdot10\cdot\dfrac{1}{0.001}e^{-t/\tau}=10\,e^{-t/1\text{ms}}\,\text{mA}$ (jumps to 10 mA, decays to 0).

---

## E8. FIRST-ORDER RL — step ⭐
**Q:** Switch closes at $t=0$: 24 V source in series with $R=6\,\Omega$ and $L=2\,\text{H}$. Inductor initially de-energized. Find $i_L(t)$ and $v_L(t)$.

1. **$i_L(0^+)=i_L(0^-)=0$** (continuity).
2. **$i_L(\infty)$** (inductor = short): $i=\dfrac{24}{6}=4\,\text{A}$.
3. **$\tau=\dfrac{L}{R_{Th}}=\dfrac{2}{6}=\dfrac13\,\text{s}$** (so $1/\tau=3$).
4. $$\boxed{i_L(t)=4\left(1-e^{-3t}\right)\text{A}}$$
5. $v_L=L\dfrac{di_L}{dt}=2\cdot4\cdot3\,e^{-3t}=24\,e^{-3t}\,\text{V}$ (jumps to 24 V at $t=0$, decays to 0). ✓ sanity: at $t=0$, all 24 V is across $L$ because $i=0$ ⇒ no drop on $R$.

---

## E9. SECOND-ORDER SERIES RLC — step, underdamped ⭐⭐
**Q:** Series circuit: 24 V step source, $R=6\,\Omega$, $L=1\,\text{H}$, $C=0.04\,\text{F}$, all initially at rest ($v_C(0)=0$, $i_L(0)=0$). Find $v_C(t)$.

1. **Parameters:** $\alpha=\dfrac{R}{2L}=\dfrac{6}{2}=3$; $\;\omega_0=\dfrac{1}{\sqrt{LC}}=\dfrac{1}{\sqrt{0.04}}=5$.
2. $\alpha<\omega_0$ ⟹ **underdamped.** $\omega_d=\sqrt{\omega_0^2-\alpha^2}=\sqrt{25-9}=4$. Roots $-3\pm j4$.
3. **Final value** $v_C(\infty)=24\,\text{V}$ (cap open at DC ⇒ full source across $C$).
4. **Form:** $v_C(t)=24+e^{-3t}(A_1\cos4t+A_2\sin4t)$.
5. **ICs:** $v_C(0)=0 \Rightarrow 24+A_1=0\Rightarrow A_1=-24$.
   $\;v_C'(0)=\dfrac{i_L(0)}{C}=0$. With $A_1$: $v_C'(0)=-\alpha A_1+\omega_d A_2 = -3(-24)+4A_2=0\Rightarrow A_2=-18$.
6. $$\boxed{v_C(t)=24-e^{-3t}\big(24\cos4t+18\sin4t\big)\ \text{V}}$$
   Check: $t=0\Rightarrow24-24=0$ ✓; $t\to\infty\Rightarrow24\,\text{V}$ ✓.

---

## E10. SECOND-ORDER PARALLEL RLC — source-free, overdamped ⭐⭐
**Q:** Parallel $R=0.8\,\Omega$, $L=1\,\text{H}$, $C=0.25\,\text{F}$. Initial conditions $v(0)=10\,\text{V}$, $i_L(0)=2\,\text{A}$ (inductor current leaving the top node). Find $v(t)$.

1. **Parameters:** $\alpha=\dfrac{1}{2RC}=\dfrac{1}{2(0.8)(0.25)}=2.5$; $\;\omega_0=\dfrac{1}{\sqrt{LC}}=\dfrac{1}{\sqrt{0.25}}=2$.
2. $\alpha>\omega_0$ ⟹ **overdamped.** $s_{1,2}=-2.5\pm\sqrt{2.5^2-2^2}=-2.5\pm1.5$ ⟹ $s_1=-1,\;s_2=-4$.
3. **Form:** $v(t)=A_1e^{-t}+A_2e^{-4t}$.
4. **ICs:** $v(0)=A_1+A_2=10$.
   $\;\dfrac{dv}{dt}(0)=\dfrac{-v(0)/R-i_L(0)}{C}=\dfrac{-(10/0.8)-2}{0.25}=\dfrac{-14.5}{0.25}=-58$. So $-A_1-4A_2=-58$.
5. Solve: from $A_1=10-A_2$: $-(10-A_2)-4A_2=-58\Rightarrow-10-3A_2=-58\Rightarrow A_2=16,\;A_1=-6$.
6. $$\boxed{v(t)=-6e^{-t}+16e^{-4t}\ \text{V}}$$
   Check: $v(0)=-6+16=10$ ✓; $v'(0)=6-64=-58$ ✓.

---

## E11. AC / Phasor (if your final includes sinusoids)
**Q:** $v_s(t)=10\cos(2000t)\,\text{V}$ drives $R=3\,\Omega$ in series with $L=2\,\text{mH}$. Find the steady-state current $i(t)$.

1. $\omega=2000\,\text{rad/s}$. $Z_L=j\omega L=j(2000)(0.002)=j4\,\Omega$.
2. $Z=R+Z_L=3+j4=5\angle53.13^\circ\,\Omega$.
3. Phasor $\mathbf V=10\angle0^\circ$. $\;\mathbf I=\dfrac{\mathbf V}{Z}=\dfrac{10\angle0^\circ}{5\angle53.13^\circ}=2\angle{-53.13^\circ}\,\text{A}$.
4. $$\boxed{i(t)=2\cos(2000t-53.13^\circ)\ \text{A}}$$
   (current lags voltage — inductive circuit, power factor $\cos53.13^\circ=0.6$ lagging).

---

*Want more of a particular type, or your exact exam problems solved? Drop them in `source-files/`
(see `README.md` for the upload link) and they'll be added here with full step-by-step solutions.*
