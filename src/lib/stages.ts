export const DEAL_STAGES = [
  'lead','prospecting','qualified','negotiation','won','lost',
] as const;
export type DealStage = typeof DEAL_STAGES[number];

export const CONTACT_LIFECYCLE = [
  'lead','prospect','qualified','customer','churned',
] as const;
export type ContactLifecycle = typeof CONTACT_LIFECYCLE[number];

// label helpers (UI can import these)
export const stageLabel: Record<DealStage,string> = {
  lead: 'Lead',
  prospecting: 'Prospecting',
  qualified: 'Qualified',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export const lifecycleLabel: Record<ContactLifecycle,string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  qualified: 'Qualified',
  customer: 'Customer',
  churned: 'Churned',
};

// Helper functions for validation and normalization
export function normalizeDealStage(v?: string): DealStage {
  const s = (v ?? '').toLowerCase();
  return (DEAL_STAGES as readonly string[]).includes(s) ? (s as DealStage) : 'lead';
}

export function normalizeContactLifecycle(v?: string): ContactLifecycle {
  const s = (v ?? '').toLowerCase();
  return (CONTACT_LIFECYCLE as readonly string[]).includes(s) ? (s as ContactLifecycle) : 'lead';
}

// UI helper functions
export function getDealStageOptions() {
  return DEAL_STAGES.map(stage => ({
    value: stage,
    label: stageLabel[stage]
  }));
}

export function getContactLifecycleOptions() {
  return CONTACT_LIFECYCLE.map(stage => ({
    value: stage,
    label: lifecycleLabel[stage]
  }));
}

// Badge styling helpers
export function dealStageBadgeClasses(stage: DealStage): string {
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

export function contactLifecycleBadgeClasses(stage: ContactLifecycle): string {
  switch (stage) {
    case "lead":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "prospect":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "qualified":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "customer":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "churned":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

// Utility functions
export function isOpenDealStage(stage: DealStage): boolean {
  return !["won", "lost"].includes(stage);
}

export function isClosedDealStage(stage: DealStage): boolean {
  return ["won", "lost"].includes(stage);
}

