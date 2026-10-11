import { DealStage } from "@/hooks/use-deals";
import { LifecycleStage } from "@/hooks/use-contacts";

// Active pipeline stages map to a "qualified" lifecycle
const ACTIVE_STAGES: DealStage[] = [
  "Prospecting",
  "Qualification",
  "Proposal Sent",
  "Negotiation",
  "Verbal Commitment",
];

export function computeLifecycleFromDealStages(statuses: DealStage[]): LifecycleStage | null {
  const hasWon = statuses.includes("Won");
  const hasActive = statuses.some((s) => ACTIVE_STAGES.includes(s));
  const hasLost = statuses.includes("Lost");

  if (hasWon) return "won";
  if (hasActive) return "qualified";
  if (hasLost) return "lost";
  return null; // No deals: keep existing lifecycle
}

export function recomputeContactLifecycle(params: {
  contactId: string;
  allDeals: { clientId: string; stage: DealStage }[];
  getContactStage: (id: string) => LifecycleStage | undefined;
  updateLifecycle: (id: string, stage: LifecycleStage) => void;
  toast?: (opts: { title: string; description?: string }) => void;
}): LifecycleStage | null {
  const { contactId, allDeals, getContactStage, updateLifecycle, toast } = params;
  const current = getContactStage(contactId);
  const statuses = allDeals.filter((d) => d.clientId === contactId).map((d) => d.stage);
  const next = computeLifecycleFromDealStages(statuses);

  if (next && next !== current) {
    updateLifecycle(contactId, next);
    toast?.({ title: `Lifecycle updated to ${capitalize(next)}`, description: "After deal status change" });
    return next;
  }
  return null;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
