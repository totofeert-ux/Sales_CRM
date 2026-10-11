/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import { computeLifecycleFromDealStages } from "./lifecycle-automation";

// Deal stages used in app
const L = {
  lead: "Prospecting",
  inProgress: "Qualification",
  proposal: "Proposal Sent",
  negoti: "Negotiation",
  won: "Won",
  lost: "Lost",
} as const;

describe("computeLifecycleFromDealStages", () => {
  it("prioritizes won if any won present", () => {
    expect(computeLifecycleFromDealStages([L.lead, L.won, L.lost])).toBe("won");
  });

  it("returns qualified if any active and no won", () => {
    expect(computeLifecycleFromDealStages([L.lead, L.proposal])).toBe("qualified");
    expect(computeLifecycleFromDealStages([L.negoti])).toBe("qualified");
  });

  it("returns lost if only lost present", () => {
    expect(computeLifecycleFromDealStages([L.lost])).toBe("lost");
  });

  it("returns null when no deals (keep existing)", () => {
    expect(computeLifecycleFromDealStages([])).toBeNull();
  });
});
