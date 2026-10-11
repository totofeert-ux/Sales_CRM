// src/lib/deal-status.ts
export const DEAL_STATUSES = [
  'lead',
  'prospecting',
  'qualified',
  'negotiation',
  'won',
  'lost',
] as const;

export type DealStatus = typeof DEAL_STATUSES[number];

export const DEAL_STAGE_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: 'lead',         label: 'Lead' },
  { value: 'prospecting',  label: 'Prospecting' },
  { value: 'qualified',    label: 'Qualified' },
  { value: 'negotiation',  label: 'Negotiation' },
  { value: 'won',          label: 'Won' },
  { value: 'lost',         label: 'Lost' },
];

/** Lowercases and validates a status string at runtime */
export function toDealStatus(input: string | undefined | null): DealStatus {
  const s = (input ?? 'lead').trim().toLowerCase();
  if ((DEAL_STATUSES as readonly string[]).includes(s)) {
    return s as DealStatus;
  }
  // Fallback to 'lead' if the input isn't valid
  return 'lead';
}

// Badge styling helpers
export function dealStageBadgeClasses(stage: DealStatus): string {
  switch (stage) {
    case "lead":
      return "bg-muted text-muted-foreground";
    case "prospecting":
      return "bg-chart-1/15 text-[hsl(var(--chart-1))]";
    case "qualified":
      return "bg-warning/15 text-warning";
    case "negotiation":
      return "bg-chart-5/15 text-[hsl(var(--chart-5))]";
    case "won":
      return "bg-chart-2/15 text-[hsl(var(--chart-2))]";
    case "lost":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// Utility functions
export function isOpenDealStage(stage: DealStatus): boolean {
  return !["won", "lost"].includes(stage);
}

export function isClosedDealStage(stage: DealStatus): boolean {
  return ["won", "lost"].includes(stage);
}
