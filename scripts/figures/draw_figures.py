"""Draws original diagrams into public/figures/. Values here are the source of truth
for the questions that use them (see add_figure_questions.py)."""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

OUT = "public/figures"
INK, GRID, ACCENT, ACCENT2 = "#1f2937", "#d1d5db", "#1d5fd1", "#b45309"
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 11, "axes.edgecolor": INK, "axes.labelcolor": INK,
    "xtick.color": INK, "ytick.color": INK, "svg.fonttype": "path", "figure.dpi": 100,
})


def save(fig, path):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    fig.savefig(full, format="svg", bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", full)


def axes(xlabel, ylabel, xlim, ylim, xticks, yticks, size=(6, 4)):
    fig, ax = plt.subplots(figsize=size)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim)
    ax.set_xticks(xticks); ax.set_yticks(yticks)
    ax.set_xlabel(xlabel); ax.set_ylabel(ylabel)
    ax.grid(True, color=GRID, linewidth=0.6)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    return fig, ax


def write_svg(path, body, width, height):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" '
                f'font-family="DejaVu Sans, Arial, sans-serif" font-size="15" fill="none" stroke="{INK}" stroke-width="2">'
                f'<rect width="100%" height="100%" fill="white" stroke="none"/>{body}</svg>\n')
    print("wrote", full)


def text(x, y, s, anchor="middle", size=15, weight="normal"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{INK}" stroke="none">{s}</text>'


def battery(x, y, label):
    """Cell symbol centred at (x, y) on a horizontal wire: long thin plate then short thick plate."""
    return (f'<line x1="{x-6}" y1="{y-18}" x2="{x-6}" y2="{y+18}"/>'
            f'<line x1="{x+6}" y1="{y-9}" x2="{x+6}" y2="{y+9}" stroke-width="5"/>'
            + text(x, y - 26, label))


def resistor(x, y, label, vertical=False):
    if vertical:
        return f'<rect x="{x-11}" y="{y-28}" width="22" height="56" fill="white"/>' + text(x + 22, y + 5, label, "start")
    return f'<rect x="{x-28}" y="{y-11}" width="56" height="22" fill="white"/>' + text(x, y - 20, label)


def meter(x, y, letter):
    return f'<circle cx="{x}" cy="{y}" r="16" fill="white"/>' + text(x, y + 5, letter, size=15, weight="bold")


# ---------- Physics 0625 ----------
# Series circuit: 12 V battery, 4 Ω and 2 Ω in series, ammeter.
body = ('<polyline points="60,60 360,60 360,220 60,220 60,60"/>'
        + battery(110, 60, "12 V").replace('<line x1="104"', '<line x1="104"')
        + resistor(220, 60, "4.0 Ω") + resistor(360, 140, "2.0 Ω", vertical=True) + meter(210, 220, "A"))
# Break the wire behind symbols.
body = body.replace('<polyline points="60,60 360,60 360,220 60,220 60,60"/>',
                    '<polyline points="104,60 60,60 60,220 194,220"/><polyline points="226,220 360,220 360,168"/>'
                    '<polyline points="360,112 360,60 248,60"/><polyline points="192,60 116,60"/>')
write_svg("0625/series-circuit.svg", body, 460, 260)

# Parallel circuit: 6 V battery, 3 Ω and 6 Ω in parallel, ammeter in main line.
body = ('<polyline points="104,50 50,50 50,250 160,250"/><polyline points="192,250 300,250"/>'
        '<polyline points="116,50 300,50"/>'
        '<polyline points="300,50 300,90"/><polyline points="300,90 220,90 220,122"/><polyline points="220,178 220,210 300,210"/>'
        '<polyline points="300,90 380,90 380,122"/><polyline points="380,178 380,210 300,210"/><polyline points="300,210 300,250"/>'
        + battery(110, 50, "6.0 V") + resistor(220, 150, "3.0 Ω", vertical=True) + resistor(380, 150, "6.0 Ω", vertical=True)
        + meter(176, 250, "A")
        + '<circle cx="300" cy="90" r="3.5" fill="#1f2937"/><circle cx="300" cy="210" r="3.5" fill="#1f2937"/>')
write_svg("0625/parallel-circuit.svg", body, 460, 290)

# Speed–time graph: 0→10 m/s in 4 s, steady 6 s, 10→0 in 2 s.
fig, ax = axes("time / s", "speed / m/s", (0, 13), (0, 12), range(0, 14, 1), range(0, 13, 2))
ax.plot([0, 4, 10, 12], [0, 10, 10, 0], color=ACCENT, linewidth=2.2)
save(fig, "0625/speed-time-graph.svg")

# Radioactive decay: 800 counts/min, half-life 2.0 h.
fig, ax = axes("time / hours", "count rate / counts per minute", (0, 8), (0, 900), range(0, 9), range(0, 901, 100))
t = np.linspace(0, 8, 200)
ax.plot(t, 800 * 0.5 ** (t / 2.0), color=ACCENT, linewidth=2.2)
save(fig, "0625/decay-curve.svg")

# ---------- Chemistry 0620 ----------
# Heating curve: solid warms to 80 °C, melts (plateau 4–9 min), liquid warms.
fig, ax = axes("time / minutes", "temperature / °C", (0, 14), (0, 140), range(0, 15, 2), range(0, 141, 20))
ax.plot([0, 4, 9, 14], [20, 80, 80, 130], color=ACCENT, linewidth=2.2)
save(fig, "0620/heating-curve.svg")

# Gas volume against time: v = 60(1 − e^(−t/12)), levels off at 60 cm³.
fig, ax = axes("time / s", "volume of gas / cm³", (0, 80), (0, 70), range(0, 81, 10), range(0, 71, 10))
t = np.linspace(0, 80, 300)
ax.plot(t, 60 * (1 - np.exp(-t / 12)), color=ACCENT, linewidth=2.2)
save(fig, "0620/gas-volume-graph.svg")

# Chromatogram: baseline at 0 cm, solvent front 8.0 cm; spots A 2.0 cm, B 6.0 cm; mixture X has both.
fig, ax = plt.subplots(figsize=(4.2, 5))
ax.set_xlim(0, 4); ax.set_ylim(-1, 9.2); ax.axis("off")
ax.add_patch(plt.Rectangle((0.2, -0.6), 3.6, 9.4, fill=False, edgecolor=INK, linewidth=1.5))
ax.plot([0.2, 3.8], [0, 0], color=INK, linestyle="--", linewidth=1)
ax.plot([0.2, 3.8], [8, 8], color=INK, linewidth=1)
ax.text(3.9, 0, "baseline", va="center", fontsize=10); ax.text(3.9, 8, "solvent front", va="center", fontsize=10)
for x, ys, name in [(1.0, [2.0], "A"), (2.0, [6.0], "B"), (3.0, [2.0, 6.0], "X")]:
    ax.plot([x], [0], marker="x", color=INK)
    for yv in ys:
        ax.add_patch(plt.Circle((x, yv), 0.18, color=ACCENT))
    ax.text(x, -0.45, name, ha="center", va="top", fontsize=11, fontweight="bold")
ax.annotate("", xy=(0.45, 8), xytext=(0.45, 0), arrowprops=dict(arrowstyle="<->", color=INK, lw=1))
ax.text(0.55, 4, "8.0 cm", rotation=90, va="center", fontsize=10)
save(fig, "0620/chromatogram.svg")

# ---------- Mathematics 0580 ----------
# Right-angled triangle: legs 5 cm and 12 cm, hypotenuse x.
body = ('<polygon points="60,240 360,240 60,115" fill="white"/>'
        '<polyline points="60,222 78,222 78,240" stroke-width="1.5"/>'
        + text(210, 266, "12 cm") + text(38, 182, "5 cm", "end") + text(225, 165, "x cm", size=16)
        + text(60, 105, "A") + text(48, 258, "B", "end") + text(372, 258, "C", "start")
        + text(180, 290, "Not to scale", size=12))
write_svg("0580/right-triangle.svg", body, 420, 300)

# Circle theorem: centre O, angle AOB = 110°, C on major arc.
cx, cy, rad = 200, 170, 120
def pt(deg):
    a = np.radians(deg)
    return cx + rad * np.cos(a), cy - rad * np.sin(a)
A, B, C = pt(215), pt(325), pt(90)
body = (f'<circle cx="{cx}" cy="{cy}" r="{rad}" fill="white"/>'
        f'<polyline points="{A[0]:.1f},{A[1]:.1f} {cx},{cy} {B[0]:.1f},{B[1]:.1f}"/>'
        f'<polyline points="{A[0]:.1f},{A[1]:.1f} {C[0]:.1f},{C[1]:.1f} {B[0]:.1f},{B[1]:.1f}"/>'
        f'<circle cx="{cx}" cy="{cy}" r="3.5" fill="#1f2937"/>'
        + text(cx + 14, cy + 4, "O", "start") + text(cx, cy + 34, "110°", size=14)
        + text(A[0] - 10, A[1] + 18, "A", "end") + text(B[0] + 10, B[1] + 18, "B", "start") + text(C[0], C[1] - 10, "C")
        + text(200, 320, "Not to scale", size=12))
write_svg("0580/circle-theorem.svg", body, 400, 330)

# Bar chart: number of pets owned by 30 students.
fig, ax = axes("number of pets", "frequency", (-0.6, 4.6), (0, 12), range(0, 5), range(0, 13, 2), size=(5.5, 3.8))
ax.bar(range(5), [6, 11, 8, 3, 2], color=ACCENT, width=0.6, zorder=3)
ax.xaxis.grid(False)
save(fig, "0580/pets-bar-chart.svg")

# ---------- Biology 0610 ----------
# Enzyme activity: rises to a peak at 40 °C, falls to zero by 60 °C.
fig, ax = axes("temperature / °C", "rate of reaction / arbitrary units", (0, 70), (0, 100), range(0, 71, 10), range(0, 101, 20))
t = np.array([0, 10, 20, 30, 40, 50, 60, 70])
ax.plot(t, [5, 18, 40, 70, 90, 45, 0, 0], color=ACCENT, linewidth=2.2, marker="o", markersize=4)
save(fig, "0610/enzyme-temperature.svg")

# Photosynthesis rate against light intensity at two CO2 concentrations.
fig, ax = axes("light intensity / arbitrary units", "rate of photosynthesis / arbitrary units", (0, 10), (0, 60), range(0, 11), range(0, 61, 10))
li = np.linspace(0, 10, 200)
ax.plot(li, np.minimum(10 * li, 30), color=ACCENT, linewidth=2.2, label="0.04% carbon dioxide")
ax.plot(li, np.minimum(10 * li, 50), color=ACCENT2, linewidth=2.2, linestyle="--", label="0.10% carbon dioxide")
ax.legend(frameon=False, loc="lower right")
save(fig, "0610/photosynthesis-light.svg")

# ---------- Geography 0460 ----------
# Climate graph for a tropical location.
months = list("JFMAMJJASOND")
rain = [10, 15, 40, 110, 220, 260, 240, 230, 180, 90, 25, 10]
temp = [24, 26, 29, 31, 30, 28, 27, 27, 27, 27, 26, 24]
fig, ax = plt.subplots(figsize=(6.5, 4))
ax.bar(range(12), rain, color=ACCENT, width=0.7, label="rainfall")
ax.set_ylabel("rainfall / mm"); ax.set_ylim(0, 300); ax.set_yticks(range(0, 301, 50))
ax.set_xticks(range(12)); ax.set_xticklabels(months)
ax2 = ax.twinx()
ax2.plot(range(12), temp, color=ACCENT2, marker="o", linewidth=2.2, label="temperature")
ax2.set_ylabel("temperature / °C"); ax2.set_ylim(0, 35); ax2.set_yticks(range(0, 36, 5))
ax.grid(True, axis="y", color=GRID, linewidth=0.6)
fig.legend(loc="lower center", bbox_to_anchor=(0.5, -0.06), ncol=2, frameon=False)
save(fig, "0460/climate-graph.svg")

# Population pyramid (percentages of total population).
groups = ["0–14", "15–29", "30–44", "45–59", "60–74", "75+"]
male = [21, 13, 8, 5, 2.5, 0.5]
female = [20, 13, 8, 5.5, 3, 0.5]
assert round(sum(male) + sum(female), 6) == 100
fig, ax = plt.subplots(figsize=(6, 4))
y = np.arange(len(groups))
ax.barh(y, [-m for m in male], color=ACCENT, height=0.8, label="male")
ax.barh(y, female, color=ACCENT2, height=0.8, label="female")
ax.set_yticks(y); ax.set_yticklabels(groups); ax.set_ylabel("age group")
ax.set_xlim(-25, 25); ax.set_xticks(range(-25, 26, 5)); ax.set_xticklabels([str(abs(v)) for v in range(-25, 26, 5)])
ax.set_xlabel("percentage of total population")
ax.axvline(0, color=INK, linewidth=0.8); ax.legend(frameon=False, loc="upper right")
for side in ("top", "right"):
    ax.spines[side].set_visible(False)
save(fig, "0460/population-pyramid.svg")

# Grid map: eastings 20–24, northings 40–44, with symbols in known squares.
fig, ax = plt.subplots(figsize=(5, 5))
ax.set_xlim(20, 24); ax.set_ylim(40, 44); ax.set_aspect("equal")
ax.set_xticks(range(20, 25)); ax.set_yticks(range(40, 45))
ax.grid(True, color=INK, linewidth=0.8)
ax.plot([20, 21.2, 22.4, 24], [42.6, 42.2, 41.5, 41.1], color="#2563eb", linewidth=3)  # river
ax.text(20.3, 42.75, "river", color="#2563eb", fontsize=10)
ax.plot([21.5], [43.5], marker="P", markersize=14, color=INK)  # church (cross) in square 2143
ax.text(21.62, 43.5, "church", va="center", fontsize=10)
ax.plot([23.4], [40.6], marker="s", markersize=10, color=ACCENT2)  # school in square 2340
ax.text(23.1, 40.25, "school", fontsize=10)
ax.set_title("Scale 1 : 50 000", fontsize=10)
save(fig, "0460/grid-map.svg")
