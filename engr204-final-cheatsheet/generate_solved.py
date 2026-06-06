#!/usr/bin/env python3
"""Numbered circuit diagrams (with real values) for SOLVED_PROBLEMS.md."""
import matplotlib; matplotlib.use("Agg")
import schemdraw, schemdraw.elements as e
import os, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets", "solved")
os.makedirs(A, exist_ok=True)
ok, bad = [], []

def draw(name, fn, unit=2.4, fs=14):
    try:
        with schemdraw.Drawing(show=False) as d:
            d.config(unit=unit, fontsize=fs)
            fn(d)
            d.save(os.path.join(A, name), dpi=150)
        ok.append(name)
    except Exception as ex:
        bad.append((name, str(ex))); traceback.print_exc()

# ---- BASIC ----
def ohm(d):
    V = e.SourceV().up().label("12 V", loc="left"); d += V
    d += e.Line().right().length(2.6)
    d += e.CurrentLabelInline(direction="in").label("$I$")
    d += e.Resistor().down().label("4 Ω", loc="right")
    d += e.Line().to(V.start)
draw("ohm.png", ohm)

def series_div(d):
    V = e.SourceV().up().label("12 V", loc="left"); d += V
    d += e.Line().right().length(2.4)
    d += e.Resistor().down().length(1.2).label("R₁ = 2 kΩ", loc="right")
    d += e.Resistor().down().length(1.2).label("R₂ = 4 kΩ", loc="right").label(("+", "$v_2$", "−"), loc="left")
    d += e.Line().left().length(2.4)
draw("series_div.png", series_div)

def parallel_div(d):
    I = e.SourceI().up().label("6 A"); d += I
    d += e.Line().right().length(2)
    d.push(); d += e.Resistor().down().label("R₁\n2 Ω").label("$i_1$", loc="bot"); d.pop()
    d += e.Line().right().length(2)
    d += e.Resistor().down().label("R₂\n4 Ω").label("$i_2$", loc="bot")
    d += e.Line().left().length(2); d += e.Line().to(I.start)
draw("parallel_div.png", parallel_div)

def kcl2(d):
    n = e.Dot(radius=0.12)
    d += e.Arrow().at((-2.6, 0)).to((-0.12, 0)).label("5 A", loc="left")
    d += e.Arrow().at((0, 2.6)).to((0, 0.12)).label("2 A", loc="top")
    d += e.Arrow().at((0.12, 0)).to((2.6, 0)).label("$i_1$", loc="right")
    d += e.Arrow().at((0, -0.12)).to((0, -2.6)).label("$i_2$", loc="bottom")
    d += n
draw("kcl.png", kcl2)

def req(d):
    a = e.Dot(open=True).label("a", loc="left"); d += a
    d += e.Resistor().right().label("6 Ω")
    j = e.Dot(); d += j
    d.push(); d += e.Resistor().down().label("3 Ω"); d.pop()
    d += e.Line().right().length(1.6)
    d += e.Resistor().down().label("6 Ω")
    d += e.Line().left().length(1.6)
    bot = e.Dot(); d += bot
    d += e.Line().left().tox(a.center)
    d += e.Dot(open=True).label("b", loc="left")
draw("req.png", req)

def energy(d):
    V = e.SourceV().up().label("10 V", loc="left"); d += V
    d += e.Line().right().length(2.6)
    d += e.Capacitor().down().label("C = 2 µF", loc="right").label(("+", "$v_C$", "−"), loc="left")
    d += e.Line().to(V.start)
draw("energy.png", energy)

# ---- MID ----
def nodal(d):
    # node V1: current source 3A in, R1 to ground, R2 to ground
    I = e.SourceI().up().label("3 A"); d += I
    d += e.Line().right().length(1.8)
    top = e.Dot().label("$V_1$", loc="top"); d += top
    d.push(); d += e.Resistor().down().label("6 Ω"); d.pop()
    d += e.Line().right().length(1.8)
    d += e.Resistor().down().label("3 Ω")
    d += e.Line().left().length(1.8); d += e.Line().to(I.start)
draw("nodal.png", nodal)

def mesh(d):
    V = e.SourceV().up().label("10 V"); d += V
    d += e.Resistor().right().label("2 Ω")
    t = e.Dot(); d += t
    d.push(); d += e.Resistor().down().label("6 Ω").label("$i_1$  $i_2$", loc="bottom"); d.pop()
    d += e.Resistor().right().label("6 Ω")
    d += e.Line().down().length(2.4)
    d += e.Line().left().tox(t.center)
    d += e.Line().to(V.start)
draw("mesh.png", mesh)

def superpos(d):
    V = e.SourceV().up().label("12 V", loc="left"); d += V
    d += e.Resistor().right().label("6 Ω")
    t = e.Dot().label("$V$", loc="top"); d += t
    d.push(); d += e.Resistor().down().label("3 Ω"); d.pop()
    d += e.Line().right().length(2)
    d += e.SourceI().down().label("2 A")
    d += e.Line().left().length(2)
    d += e.Line().to(V.start)
draw("superpos.png", superpos)

def thev_src(d):
    V = e.SourceV().up().label("12 V"); d += V
    d += e.Resistor().right().label("R₁ = 4 Ω")
    a = e.Dot(open=True).label("a", loc="right"); d += a
    d += e.Resistor().down().label("R₂ = 12 Ω")
    b = e.Dot(open=True); d += b
    d += e.Line().left().tox(V.start); d += e.Line().to(V.start)
draw("thev_src.png", thev_src)

def maxpower(d):
    V = e.SourceV().up().label("$V_{th}$ = 24 V"); d += V
    d += e.Resistor().right().label("$R_{th}$ = 6 Ω")
    a = e.Dot(open=True).label("a", loc="right"); d += a
    d += e.Resistor().down().label("$R_L$").label(("+","$v_L$","−"), loc="right")
    b = e.Dot(open=True).label("b", loc="right"); d += b
    d += e.Line().to(V.start)
draw("maxpower.png", maxpower)

def opamp_inv(d):
    op = e.Opamp(leads=True); d += op
    d += e.Line().left().at(op.in2).length(0.5); d += e.Ground()
    d += e.Line().up().at(op.in1).length(1.3)
    d += (Rin := e.Resistor().left().label("R_in = 2 kΩ"))
    d += e.SourceV().down().reverse().label("1 V")
    d += e.Line().up().at(op.in1).length(1.3)
    d += e.Resistor().right().label("R_f = 10 kΩ").tox(op.out)
    d += e.Line().down().toy(op.out); d += e.Dot()
    d += e.Line().right().at(op.out).length(0.8).label("$v_o$", loc="right")
draw("opamp_inv.png", opamp_inv, fs=12)

def opamp_noninv(d):
    op = e.Opamp(leads=True); d += op
    d += e.Line().left().at(op.in1).length(0.5)
    d += e.Line().up().length(1.0)
    d += (Rf := e.Resistor().right().label("R_f = 8 kΩ").tox(op.out))
    d += e.Line().down().toy(op.out); d += e.Dot()
    d += e.Resistor().down().at(Rf.start).label("R₁ = 2 kΩ"); d += e.Ground()
    d += e.Line().right().at(op.out).length(0.8).label("$v_o$", loc="right")
    d += e.Line().left().at(op.in2).length(1.2)
    d += e.SourceV().down().reverse().label("1 V")
draw("opamp_noninv.png", opamp_noninv, fs=12)

# ---- TRANSIENTS / AC / POWER ----
def rc_charge(d):
    V = e.SourceV().up().label("10 V", loc="left"); d += V
    d += e.Switch().right().label("t=0")
    d += e.Resistor().right().label("R = 1 kΩ")
    d += e.Capacitor().down().label("C = 1 mF", loc="right").label(("+", "$v_C$", "−"), loc="left")
    d += e.Line().to(V.start)
draw("rc_charge.png", rc_charge)

def rc_discharge(d):
    C = e.Capacitor().up().label("C = 1 mF", loc="left").label(("+", "$V_0$=10 V", "−"), loc="right"); d += C
    d += e.Line().right().length(2.2)
    d += e.Resistor().down().label("R = 1 kΩ", loc="right")
    d += e.Line().to(C.start)
draw("rc_discharge.png", rc_discharge)

def rl_step(d):
    V = e.SourceV().up().label("12 V", loc="left"); d += V
    d += e.Switch().right().label("t=0")
    d += e.Resistor().right().label("R = 4 Ω")
    d += e.Inductor().down().label("L = 2 H", loc="right").label("$i_L\\downarrow$", loc="left")
    d += e.Line().to(V.start)
draw("rl_step.png", rl_step)

def series_rlc_num(d):
    V = e.SourceV().up().label("$V_0$=10 V", loc="left"); d += V
    d += e.Inductor().right().label("L = 1 H")
    d += e.Resistor().right().label("R = 2 Ω")
    d += e.Capacitor().down().label("C = ¼ F", loc="right").label(("+","$v_C$","−"), loc="left")
    d += e.Line().to(V.start)
    d += e.CurrentLabelInline(direction="in").at(V).label("$i$")
draw("series_rlc_num.png", series_rlc_num)

def parallel_rlc_num(d):
    src = e.SourceI().up().label("$i_s$"); d += src
    d += e.Line().right().length(2)
    d.push(); d += e.Resistor().down().label("R\n10 Ω"); d.pop()
    d += e.Line().right().length(2)
    d.push(); d += e.Inductor().down().label("L\n½ H"); d.pop()
    d += e.Line().right().length(2)
    d += e.Capacitor().down().label("C\n5 mF").label(("+","$v$","−"), loc="right")
    d += e.Line().left().length(2); d += e.Line().left().length(2); d += e.Line().left().length(2)
    d += e.Line().to(src.start)
draw("parallel_rlc_num.png", parallel_rlc_num, fs=13)

def ac_num(d):
    V = e.SourceSin().up().label("20cos2000t", loc="left"); d += V
    d += e.Resistor().right().label("R = 10 Ω")
    d += e.Inductor().down().label("L = 5 mH", loc="right")
    d += e.Line().to(V.start)
    d += e.CurrentLabelInline(direction="in").at(V).label("$i$")
draw("ac_num.png", ac_num, fs=13)

def deltay(d):
    # delta drawn as triangle with labeled resistors
    p1 = (0, 2.6); p2 = (-2.2, -1); p3 = (2.2, -1)
    d += e.Dot().at(p1).label("a", loc="top")
    d += e.Dot().at(p2).label("b", loc="left")
    d += e.Dot().at(p3).label("c", loc="right")
    d += e.Resistor().at(p1).to(p2).label("$R_{ab}$=10")
    d += e.Resistor().at(p2).to(p3).label("$R_{bc}$=20", loc="bottom")
    d += e.Resistor().at(p3).to(p1).label("$R_{ca}$=30")
draw("deltay.png", deltay, fs=13)

print("ALL -> OK:", sorted(ok))
print("FAILED:", bad)
