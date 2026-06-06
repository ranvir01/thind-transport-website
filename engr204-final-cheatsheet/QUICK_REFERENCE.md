# ENGR& 204 — QUICK REFERENCE (one-page formula card)

**Basics:** $i=dq/dt$ · $p=vi$ · $w=\int p\,dt$ · PSC: current into **+** ⇒ $p=+vi$ (absorb).

**Ohm/divider:** $v=iR$, $p=i^2R=v^2/R$ · V-div $v_k=v\frac{R_k}{\sum R}$ · I-div (2R) $i_1=i\frac{R_2}{R_1+R_2}$.

**Combine:** series $R$ add; parallel $\frac1{R_{eq}}=\sum\frac1{R_i}$, two: $\frac{R_1R_2}{R_1+R_2}$. (Caps: opposite. Inductors: like R.)

**KCL** $\sum i=0$ at node · **KVL** $\sum v=0$ around loop.

**Kill sources:** V-src→short, I-src→open (never dependent).

**Thévenin:** $V_{Th}=v_{oc}$, $R_{Th}=v_{oc}/i_{sc}$ (or kill-sources resistance). **Norton:** $I_N=i_{sc}$, $R_N=R_{Th}$.

**Max power:** $R_L=R_{Th}$, $P_{\max}=\dfrac{V_{Th}^2}{4R_{Th}}$.

**Op-amp (ideal):** $i_\pm=0$, $v_+=v_-$. Inverting $v_o=-\frac{R_f}{R_1}v_{in}$ · Non-inv $v_o=(1+\frac{R_f}{R_1})v_{in}$.

---
### Storage elements
| | Capacitor | Inductor |
|---|---|---|
| law | $i=C\,dv/dt$ | $v=L\,di/dt$ |
| energy | $\frac12Cv^2$ | $\frac12Li^2$ |
| **continuous** | $v_C$ | $i_L$ |
| DC steady state | **open** | **short** |

---
### First-order (RC / RL) — ONE formula
$$x(t)=x(\infty)+[x(0^+)-x(\infty)]e^{-t/\tau}$$
$\tau_{RC}=R_{Th}C$ · $\tau_{RL}=L/R_{Th}$ ($R_{Th}$ seen by element for $t>0$).
Steps: (1) $t<0$ get $v_C(0^-)$/$i_L(0^-)$ → (2) continuity → (3) $x(\infty)$ → (4) $\tau$ → (5) plug in.

---
### Second-order (RLC)
$$s_{1,2}=-\alpha\pm\sqrt{\alpha^2-\omega_0^2},\quad \omega_0=\tfrac{1}{\sqrt{LC}}$$
$\alpha$: **series** $\frac{R}{2L}$ · **parallel** $\frac{1}{2RC}$.

| Case | Cond. | Response (add to $x_{ss}$) |
|---|---|---|
| Over | $\alpha>\omega_0$ | $A_1e^{s_1t}+A_2e^{s_2t}$ |
| Crit | $\alpha=\omega_0$ | $(A_1+A_2t)e^{-\alpha t}$ |
| Under | $\alpha<\omega_0$ | $e^{-\alpha t}(A_1\cos\omega_dt+A_2\sin\omega_dt)$, $\omega_d=\sqrt{\omega_0^2-\alpha^2}$ |

Need **2 ICs**: $x(0^+)$ and $x'(0^+)$. Series: $v_C'(0^+)=i_L(0^+)/C$. Parallel: $i_L'(0^+)=v_C(0^+)/L$.
Underdamped consts: $A_1=x(0^+)-x_{ss}$, $A_2=\dfrac{x'(0^+)+\alpha A_1}{\omega_d}$.

---
### AC / phasors
$Z_R=R$, $Z_L=j\omega L$, $Z_C=\frac{1}{j\omega C}$ · $\mathbf V=\mathbf I Z$ · combine $Z$ like resistors.
$P=V_{rms}I_{rms}\cos\theta$, pf$=\cos\theta$, $\theta=\angle Z$. Polar: mult/÷ (×mag, ±angle); rect: add/sub.

---
**Traps:** sign convention · C-open/L-short at DC · $v_C,i_L$ continuous · $R_{Th}$ for $t>0$ · 2nd-order needs derivative IC · calculator angle mode.
