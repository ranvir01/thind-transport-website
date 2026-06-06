#!/usr/bin/env python3
"""Extra circuit diagrams + plots for the maxed-out visual cheat sheet."""
import matplotlib
matplotlib.use("Agg")
import schemdraw
import schemdraw.elements as e
import matplotlib.pyplot as plt
import numpy as np
import os, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
os.makedirs(A, exist_ok=True)
ok, bad = [], []

def draw(name, fn):
    try:
        with schemdraw.Drawing(show=False) as d:
            d.config(unit=2.2, fontsize=14)
            fn(d)
            d.save(os.path.join(A, name), dpi=150)
        ok.append(name)
    except Exception as ex:
        bad.append((name, str(ex)))
        traceback.print_exc()

# --- two-position switch (charge on 1, discharge through R on 2) ---
def f_twopos(d):
    V = e.SourceV().up().label("12 V")
    d += V
    d += e.Line().up().length(0.4)
    d += e.Line().right().length(1.4)
    d += e.Dot(open=True).label("1", loc="left")
    sw = e.SwitchSpdt2().right().label("t=0", loc="top"); d += sw
    d += e.Line().right().at(sw.c).length(0.6)
    cap = e.Capacitor().down().label("C", loc="right"); d += cap
    d += e.Line().left().tox(V.start).at(cap.end)
    d += e.Line().to(V.start)
    d += e.Line().down().at(sw.b).length(0.9)
    d += e.Resistor().down().label("R")
    d += e.Line().left().tox(cap.end).at(cap.end).reverse()
draw("two_position.png", f_twopos)

# --- source-free / natural response RC ---
def f_sfrc(d):
    C = e.Capacitor().up().label("C").label(("+", "$V_0$", "−"), loc="left")
    d += C
    d += e.Line().right().length(1.5)
    d += e.Resistor().down().label("R")
    d += e.Line().to(C.start)
draw("source_free_rc.png", f_sfrc)

# --- source-free RL ---
def f_sfrl(d):
    L = e.Inductor().up().label("L").label("$I_0$", loc="left")
    d += L
    d += e.Line().right().length(1.5)
    d += e.Resistor().down().label("R")
    d += e.Line().to(L.start)
draw("source_free_rl.png", f_sfrl)

# --- Norton equivalent ---
def f_norton(d):
    I = e.SourceI().up().label("$I_N$")
    d += I
    d += e.Line().right().length(2)
    d.push(); d += e.Resistor().down().label("$R_N$"); d.pop()
    d += e.Line().right().length(2)
    da = e.Dot(open=True).label("a", loc="right"); d += da
    d += e.Resistor().down().label("$R_L$")
    db = e.Dot(open=True).label("b", loc="right"); d += db
    d += e.Line().left().length(2)
    d += e.Line().to(I.start)
draw("norton.png", f_norton)

# --- non-inverting op-amp ---
def f_noninv(d):
    op = e.Opamp(leads=True)
    d += op
    d += e.Line().left().at(op.in1).length(0.5)
    d += e.Line().up().length(1.0)
    d += (Rf := e.Resistor().right().label("$R_f$").tox(op.out))
    d += e.Line().down().toy(op.out)
    d += e.Dot()
    fbnode = e.Line().down().length(1.0).at(Rf.start)  # placeholder
    d += e.Line().left().at(Rf.start).length(0.0)
    d += e.Resistor().down().at(Rf.start).label("$R_1$")
    d += e.Ground()
    d += e.Line().right().at(op.out).length(0.8).label("$v_o$", loc="right")
    d += e.Line().left().at(op.in2).length(1.2)
    d += e.SourceV().down().reverse().label("$v_{in}$")
draw("noninverting_opamp.png", f_noninv)

# --- summing op-amp (two inputs into virtual-ground node) ---
def f_sum(d):
    op = e.Opamp(leads=True); d += op
    d += e.Line().up().at(op.in1).length(0.7)
    node = e.Dot(); d += node
    d += e.Line().up().length(0.9)
    d += e.Resistor().right().label("$R_f$").tox(op.out)
    d += e.Line().down().toy(op.out); d += e.Dot()
    d += e.Resistor().left().at(node.center).label("$R_1$")
    d += e.SourceV().down().reverse().label("$v_1$")
    d += e.Line().up().at(node.center).length(1.6)
    d += e.Resistor().left().label("$R_2$")
    d += e.SourceV().down().reverse().label("$v_2$")
    d += e.Line().left().at(op.in2).length(0.5); d += e.Ground()
    d += e.Line().right().at(op.out).length(0.7).label("$v_o$", loc="right")
draw("summing_opamp.png", f_sum)

# --- AC series circuit with impedances ---
def f_ac(d):
    V = e.SourceSin().up().label("$V_m\\angle\\phi$")
    d += V
    d += e.Resistor().right().label("R")
    d += e.Inductor().right().label("$j\\omega L$")
    d += e.Capacitor().down().label("$1/j\\omega C$")
    d += e.Line().to(V.start)
    d += e.CurrentLabelInline(direction="in").at(V).label("$I$")
draw("ac_series.png", f_ac)

# --- voltage divider (clean rectangle, matched heights) ---
def f_vdiv(d):
    V = e.SourceV().up().label("$V_s$"); d += V
    d += e.Line().right().length(1.6)
    d += e.Resistor().down().length(1.2).label("$R_1$")
    d += e.Resistor().down().length(1.2).label("$R_2$").label(("+", "$v_2$", "−"), loc="right")
    d += e.Line().left().length(1.6)
draw("voltage_divider.png", f_vdiv)

# --- current divider ---
def f_idiv(d):
    I = e.SourceI().up().label("$I_s$")
    d += I
    d += e.Line().right().length(1.8)
    d.push(); d += e.Resistor().down().label("$R_1$"); d.pop()
    d += e.Line().right().length(1.8)
    d += e.Resistor().down().label("$R_2$")
    d += e.Line().left().length(1.8)
    d += e.Line().to(I.start)
draw("current_divider.png", f_idiv)

# --- Wheatstone bridge ---
def f_bridge(d):
    d += (L := e.Line().right().length(0.01))
    top = e.Dot(); d += top
    d.push()
    d += e.Resistor().theta(-45).label("$R_1$")
    right = e.Dot(); d += right
    d += e.Resistor().theta(-135).label("$R_3$")
    bot = e.Dot(); d += bot
    d += e.Resistor().theta(135).label("$R_4$")
    left = e.Dot(); d += left
    d += e.Resistor().theta(45).label("$R_2$")
    d += e.Line().at(left.center).left().length(0.6)
    d += e.SourceV().down().label("$V_s$").length(2.83)
    d += e.Line().right().length(0.6).tox(bot.center)
    d += e.Galvanometer().at(left.center).right().tox(right.center).label("G") if hasattr(e, "Galvanometer") else e.Line().at(left.center).right().tox(right.center).label("$v_g$")
draw("wheatstone.png", f_bridge)

# ===================== matplotlib plots =====================
def save_plt(name):
    plt.tight_layout(); plt.savefig(os.path.join(A, name), dpi=150); plt.close(); ok.append(name)

# Power triangle
fig, ax = plt.subplots(figsize=(4.2, 3.0))
P, Q = 4, 3
ax.annotate("", xy=(P, 0), xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="#06c", lw=2))
ax.annotate("", xy=(P, Q), xytext=(P, 0), arrowprops=dict(arrowstyle="->", color="#0a7", lw=2))
ax.annotate("", xy=(P, Q), xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="#d33", lw=2))
ax.text(P/2, -0.4, "P (W) = real", color="#06c", ha="center")
ax.text(P+0.1, Q/2, "Q (VAR)\nreactive", color="#0a7")
ax.text(P/2-0.6, Q/2+0.3, "S (VA)\napparent", color="#d33")
ax.text(0.5, 0.18, "θ", fontsize=12)
ax.set_xlim(-0.5, 6); ax.set_ylim(-0.8, 4); ax.axis("off")
ax.set_title("Power triangle:  S = P + jQ,  pf = cosθ = P/S")
save_plt("power_triangle.png")

# Resonance curve
w = np.linspace(0.2, 3, 500)
fig, ax = plt.subplots(figsize=(5, 2.6))
for Q, c in [(1, "#0a7"), (3, "#06c"), (8, "#d33")]:
    H = 1/np.sqrt(1 + (Q*(w - 1/w))**2)
    ax.plot(w, H, lw=2, label=f"Q={Q}")
ax.axvline(1, ls=":", color="gray"); ax.axhline(0.707, ls="--", color="gray")
ax.text(1.02, 0.72, "−3dB (0.707)", fontsize=8, color="gray")
ax.set_xlabel("ω / ω₀"); ax.set_ylabel("|H|"); ax.set_title("Series resonance (higher Q = sharper)")
ax.legend(fontsize=8); ax.grid(alpha=0.3)
save_plt("resonance.png")

# Bode-style filter magnitude (low/high/band)
f = np.logspace(0, 5, 500); fc1, fc2 = 1e3, 3e4
fig, ax = plt.subplots(figsize=(5.2, 2.6))
ax.semilogx(f, 20*np.log10(1/np.sqrt(1+(f/fc1)**2)), lw=2, label="Low-pass")
ax.semilogx(f, 20*np.log10((f/fc1)/np.sqrt(1+(f/fc1)**2)), lw=2, label="High-pass")
bp = (f/fc1)/np.sqrt(1+(f/fc1)**2) * 1/np.sqrt(1+(f/fc2)**2)
ax.semilogx(f, 20*np.log10(bp), lw=2, label="Band-pass")
ax.axhline(-3, ls="--", color="gray"); ax.set_ylim(-40, 3)
ax.set_xlabel("frequency (Hz, log)"); ax.set_ylabel("gain (dB)")
ax.set_title("Filter magnitude (cutoff at −3 dB,  fc = 1/2πRC)")
ax.legend(fontsize=8); ax.grid(alpha=0.3, which="both")
save_plt("filters.png")

print("OK:", sorted(ok))
print("FAILED:", bad)
