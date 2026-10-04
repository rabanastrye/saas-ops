import { describe, expect, it } from "vitest";

import { auditSeverity, incidentTransition, uptimePercent } from "./incidents";

describe("incidentTransition", () => {
  it("abre, resolve ou mantém", () => {
    expect(incidentTransition(false, true)).toBe("open");
    expect(incidentTransition(true, false)).toBe("resolve");
    expect(incidentTransition(true, true)).toBe("keep");
    expect(incidentTransition(false, false)).toBe("keep");
  });
});

describe("auditSeverity", () => {
  it("escolhe a pior severidade", () => {
    expect(auditSeverity({ critical: 1, high: 3 })).toBe("critical");
    expect(auditSeverity({ high: 2 })).toBe("high");
    expect(auditSeverity({})).toBeNull();
  });
});

describe("uptimePercent", () => {
  it("calcula com uma casa decimal", () => {
    expect(uptimePercent([])).toBeNull();
    expect(uptimePercent([{ up: true }, { up: true }, { up: false }])).toBe(66.7);
    expect(uptimePercent([{ up: true }])).toBe(100);
  });
});
