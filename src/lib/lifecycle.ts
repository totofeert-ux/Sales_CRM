export type LifecycleStage = "qualifying" | "qualified" | "won" | "lost" | "unqualified";

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  "qualifying",
  "qualified",
  "won",
  "lost",
  "unqualified",
];

export const STAGE_LABELS: Record<LifecycleStage, string> = {
  qualifying: "Qualifying",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
  unqualified: "Unqualified",
};

export function stageBadgeClasses(stage: LifecycleStage): string {
  switch (stage) {
    case "qualified":
      return "bg-success/10 text-success";
    case "won":
      // Use chart-4 (purple) token for a distinct "Won" color
      return "bg-[hsl(var(--chart-4))/0.15] text-[hsl(var(--chart-4))]";
    case "lost":
      return "bg-destructive/10 text-destructive";
    case "unqualified":
      return "bg-muted text-muted-foreground";
    case "qualifying":
    default:
      // Orange emphasis for qualifying
      return "bg-warning/10 text-warning";
  }
}
