"""Reports how many question parts each topic has for each route (paper combination).

Usage: python3 scripts/content_coverage.py content/<file>.json [minimum]
Lists every topic below the minimum (default 8) for any route, and exits 1 if there are any.
"""
import json
import sys
from collections import Counter

path = sys.argv[1]
minimum = int(sys.argv[2]) if len(sys.argv) > 2 else 8
data = json.load(open(path))
components = {c["ref"]: c.get("section", "") for c in data["components"]}
routes = data.get("routes") or [{"id": "all", "name": "All papers", "components": list(components)}]

parts_by_component = {ref: Counter() for ref in components}
for paper in data["papers"]:
    for question in paper["questions"]:
        for part in question["parts"]:
            parts_by_component[paper["component"]][part["topic"]] += 1

short = 0
for route in routes:
    chosen = route["components"]
    sections = {components[ref] for ref in chosen}
    topics = [t for t in data["topics"] if "" in sections or t.get("section", "") in sections]
    counts = {t["ref"]: sum(parts_by_component[ref][t["ref"]] for ref in chosen) for t in topics}
    low = {ref: n for ref, n in counts.items() if n < minimum}
    short += len(low)
    print(f"{route['name']}: {len(topics)} topics, min {min(counts.values(), default=0)}, "
          f"{len(low)} below {minimum}" + (f": {low}" if low else ""))
sys.exit(1 if short else 0)
