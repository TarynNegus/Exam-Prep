"""Original figures for AS & A Level Chemistry 9701. Run from the repository root."""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D

OUT = "public/figures/9701"
INK, GRID, ACCENT, ACCENT2 = "#1f2937", "#d1d5db", "#1d5fd1", "#b45309"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11, "axes.edgecolor": INK, "axes.labelcolor": INK,
                     "xtick.color": INK, "ytick.color": INK, "svg.fonttype": "path"})
os.makedirs(OUT, exist_ok=True)


def save(fig, name):
    fig.savefig(f"{OUT}/{name}", format="svg", bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", f"{OUT}/{name}")


def clean(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)


# Boltzmann distribution at two temperatures with the activation energy marked.
E = np.linspace(0, 10, 400)
def boltzmann(E, kT):
    f = np.sqrt(E) * np.exp(-E / kT)
    return f / np.trapezoid(f, E)
fig, ax = plt.subplots(figsize=(6.2, 4))
ax.plot(E, boltzmann(E, 1.0), color=ACCENT, linewidth=2.2, label="T₁")
ax.plot(E, boltzmann(E, 1.4), color=ACCENT2, linewidth=2.2, linestyle="--", label="T₂ (higher)")
ax.axvline(4.5, color=INK, linewidth=1)
ax.text(4.6, 0.38, "Eₐ", fontsize=12)
ax.fill_between(E, boltzmann(E, 1.4), where=E >= 4.5, color=ACCENT2, alpha=0.18)
ax.set_xlim(0, 10); ax.set_ylim(0, 0.5)
ax.set_xticks([]); ax.set_yticks([])
ax.set_xlabel("energy"); ax.set_ylabel("number of molecules with a given energy")
ax.legend(frameon=False); clean(ax)
save(fig, "boltzmann.svg")

# Mass spectrum of bromoethane: M⁺ peaks at 108 and 110 of almost equal height (⁷⁹Br and ⁸¹Br).
fig, ax = plt.subplots(figsize=(6.2, 3.8))
peaks = {15: 12, 27: 45, 28: 30, 29: 100, 79: 8, 81: 8, 93: 6, 95: 6, 108: 48, 110: 47}
ax.vlines(list(peaks), 0, list(peaks.values()), color=ACCENT, linewidth=3)
for mz, ha in ((29, "center"), (108, "right"), (110, "left")):
    ax.text(mz + (-1 if ha == "right" else 1 if ha == "left" else 0), peaks[mz] + 3, str(mz), ha=ha, fontsize=10)
ax.set_xlim(0, 120); ax.set_ylim(0, 110)
ax.set_xlabel("m/e"); ax.set_ylabel("relative abundance / %")
ax.grid(True, axis="y", color=GRID, linewidth=0.6); clean(ax)
save(fig, "mass-spectrum.svg")

# ¹H NMR spectrum of ethanol (no D₂O): CH₃ triplet at 1.2, OH singlet at 2.6, CH₂ quartet at 3.7 ppm.
fig, ax = plt.subplots(figsize=(6.5, 3.6))
def multiplet(center, n, height, spacing=0.07):
    weights = [1, 1] if n == 1 else [1, 2, 1] if n == 3 else [1, 3, 3, 1]
    if n == 1:
        weights = [1]
    offsets = (np.arange(len(weights)) - (len(weights) - 1) / 2) * spacing
    for w, o in zip(weights, offsets):
        ax.vlines(center + o, 0, height * w / max(weights), color=ACCENT, linewidth=2)
multiplet(1.2, 3, 90); multiplet(2.6, 1, 30); multiplet(3.7, 4, 60)
for x, label in [(1.2, "3H"), (2.6, "1H"), (3.7, "2H")]:
    ax.text(x, 96, label, ha="center", fontsize=10)
ax.set_xlim(5, 0); ax.set_ylim(0, 105); ax.set_yticks([])
ax.set_xlabel("δ / ppm"); clean(ax); ax.spines["left"].set_visible(False)
save(fig, "nmr-ethanol.svg")

# Skeletal structure of 2-methylbutane.
for name, smiles in {"2-methylbutane.svg": "CC(C)CC", "butan-2-ol.svg": "CC(O)CC"}.items():
    drawer = rdMolDraw2D.MolDraw2DSVG(320, 200)
    opts = drawer.drawOptions()
    opts.bondLineWidth = 2
    opts.clearBackground = True
    drawer.DrawMolecule(Chem.MolFromSmiles(smiles))
    drawer.FinishDrawing()
    with open(f"{OUT}/{name}", "w") as f:
        f.write(drawer.GetDrawingText())
    print("wrote", f"{OUT}/{name}")
