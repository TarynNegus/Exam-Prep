import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/lib/elements";
import { displayMass, elementPosition, groupLabel } from "@/lib/periodic-table";

describe("elementPosition", () => {
  it.each([
    [1, 1, 1],
    [2, 1, 18],
    [3, 2, 1],
    [5, 2, 13],
    [10, 2, 18],
    [11, 3, 1],
    [17, 3, 17],
    [19, 4, 1],
    [26, 4, 8],
    [36, 4, 18],
    [54, 5, 18],
    [55, 6, 1],
    [56, 6, 2],
    [57, 9, 3],
    [71, 9, 17],
    [72, 6, 4],
    [79, 6, 11],
    [86, 6, 18],
    [87, 7, 1],
    [89, 10, 3],
    [103, 10, 17],
    [104, 7, 4],
    [118, 7, 18],
  ])("places element %i in row %i, column %i", (z, row, col) => {
    expect(elementPosition(z)).toEqual({ row, col });
  });

  it("gives every element its own cell", () => {
    const cells = new Set(ELEMENTS.map(([z]) => JSON.stringify(elementPosition(z))));
    expect(cells.size).toBe(118);
  });
});

describe("displayMass", () => {
  it("uses whole numbers for IGCSE, with chlorine as 35.5", () => {
    expect(displayMass(63.546, 29, "IGCSE")).toBe("64");
    expect(displayMass(35.45, 17, "IGCSE")).toBe("35.5");
    expect(displayMass(1.008, 1, "IGCSE")).toBe("1");
  });
  it("uses one decimal place for AS & A Level", () => {
    expect(displayMass(63.546, 29, "AS_A_LEVEL")).toBe("63.5");
    expect(displayMass(35.45, 17, "AS_A_LEVEL")).toBe("35.5");
  });
  it("shows a dash when there is no standard value", () => {
    expect(displayMass(null, 43, "IGCSE")).toBe("–");
  });
});

describe("groupLabel", () => {
  it("uses Roman numerals for IGCSE and numbers for A Level", () => {
    expect(groupLabel(1, "IGCSE")).toBe("I");
    expect(groupLabel(18, "IGCSE")).toBe("VIII");
    expect(groupLabel(8, "IGCSE")).toBe("");
    expect(groupLabel(8, "AS_A_LEVEL")).toBe("8");
  });
});
