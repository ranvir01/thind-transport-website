#!/usr/bin/env python3
"""Generate clean, labeled circuit diagrams for the visual cheat sheet."""
import matplotlib
matplotlib.use("Agg")
import schemdraw
import schemdraw.elements as e
import os

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
os.makedirs(A, exist_ok=True)

def save(d, name):
    d.save(os.path.join(A, name), dpi=150)

# ---------- 1. First-order RC ----------
with schemdraw.Drawing(show=False) as d:
    d.config(unit=2.4, fontsize=15)
    V = e.SourceV().up().label("$V_s$")
    d += V
    d += e.Switch().right().label("t = 0")
    d += e.Resistor().right().label("R")
    d += e.Capacitor().down().label("C").label(("+", "$v_C(t)$", "−"), loc="bottom")
    d += e.Line().to(V.start)
    save(d, "rc.png")

# ---------- 2. First-order RL ----------
with schemdraw.Drawing(show=False) as d:
    d.config(unit=2.4, fontsize=15)
    V = e.SourceV().up().label("$V_s$")
    d += V
    d += e.Switch().right().label("t = 0")
    d += e.Resistor().right().label("R")
    d += e.Inductor().down().label("L").label("$i_L(t)\\downarrow$", loc="bottom")
    d += e.Line().to(V.start)
    save(d, "rl.png")

# ---------- 3. Series RLC ----------
with schemdraw.Drawing(show=False) as d:
    d.config(unit=2.4, fontsize=15)
    V = e.SourceV().up().label("$V_s$")
    d += V
    d += e.Inductor().right().label("L")
    d += e.Resistor().right().label("R")
    d += e.Capacitor().down().label("C").label(("+", "$v(t)$", "−"), loc="bottom")
    d += e.Line().to(V.start)
    d += e.CurrentLabelInline(direction="in").at(V).label("$i(t)$")
    save(d, "series_rlc.png")

# ---------- 4. Parallel RLC ----------
with schemdraw.Drawing(show=False) as d:
    d.config(unit=2.2, fontsize=15)
    src = e.SourceI().up().label("$i_s$")
    d += src
    d += e.Line().right().length(2.2)
    d.push(); d += e.Resistor().down().label("R"); d.pop()
    d += e.Line().right().length(2.2)
    d.push(); d += e.Inductor().down().label("L").label("$i_L\\downarrow$", loc="bottom"); d.pop()
    d += e.Line().right().length(2.2)
    d += e.Capacitor().down().label("C").label(("+", "$v(t)$", "−"), loc="bottom")
    d += e.Line().left().length(2.2)
    d += e.Line().left().length(2.2)
    d += e.Line().left().length(2.2)
    d += e.Line().to(src.start)
    save(d, "parallel_rlc.png")

# ---------- 5. Thevenin equivalent ----------
with schemdraw.Drawing(show=False) as d:
    d.config(unit=2.4, fontsize=15)
    V = e.SourceV().up().label("$V_{th}$")
    d += V
    d += e.Resistor().right().label("$R_{th}$")
    d += e.Line().right().length(1)
    da = e.Dot(open=True).label("a", loc="right"); d += da
    d += e.Resistor().down().label("$R_L$").label(("+", "$v_L$", "−"), loc="bottom")
    db = e.Dot(open=True).label("b", loc="right"); d += db
    d += e.Line().to(V.start)
    save(d, "thevenin.png")

# ---------- 6. Inverting op-amp ----------
with schemdraw.Drawing(show=False) as d:
    d.config(unit=2.0, fontsize=15)
    op = e.Opamp(leads=True)
    d += op
    d += e.Line().left().at(op.in2).length(0.6)
    d += e.Ground()
    d += e.Line().up().at(op.in1).length(1.3)
    d += (Rin := e.Resistor().left().label("$R_{in}$"))
    d += e.SourceV().down().reverse().label("$v_{in}$")
    d += e.Line().right().tox(op.in2).at(op.in2)
    # feedback
    d += e.Line().up().at(op.in1).length(1.3)
    d += (Rf := e.Resistor().right().label("$R_f$").tox(op.out))
    d += e.Line().down().toy(op.out)
    d += e.Line().left().tox(op.out).at(op.out)
    d += e.Dot()
    d += e.Line().right().at(op.out).length(0.8).label("$v_o$", loc="right")
    save(d, "opamp.png")

print("diagrams written to", A, ":", sorted(os.listdir(A)))
