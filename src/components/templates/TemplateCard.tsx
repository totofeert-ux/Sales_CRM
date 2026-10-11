import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Template } from "@/pages/Templates";

export function TemplateCard({ template, onOpen }: { template: Template; onOpen: () => void }) {
  const updated = new Date(template.updated_at);
  const categoryLabel = CATEGORY_MAP[template.category] || template.category;
  const subtypeLabel = (SUBTYPE_LABELS[template.category]?.[template.subtype || ""] || template.subtype) as string | undefined;

  return (
    <Card role="button" onClick={onOpen} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base truncate">{template.title}</CardTitle>
          <Badge variant="outline" className="shrink-0">
            {categoryLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {subtypeLabel && <span className="truncate">{subtypeLabel}</span>}
          <span className="ml-auto">Updated {updated.toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const CATEGORY_MAP: Record<string, string> = {
  "emails": "Emails",
  "call-scripts": "Call Scripts",
  "meeting-agendas": "Meeting Agendas",
  "proposals": "Proposals",
  "messaging": "Messaging",
  "documents": "Documents",
};

const SUBTYPE_LABELS: Record<string, Record<string, string>> = {
  emails: {
    "first-contact": "First contact",
    "follow-up": "Follow-up",
    "proposal-follow-up": "Proposal follow-up",
    "closing": "Closing",
    "thank-you": "Thank-you",
    "reactivation": "Reactivation",
  },
  "call-scripts": {
    "discovery": "Discovery",
    "follow-up": "Follow-up",
    "objection-handling": "Objection handling",
    "closing": "Closing",
  },
  "meeting-agendas": {
    "discovery-meeting": "Discovery meeting",
    "demo": "Demo",
    "negotiation": "Negotiation",
  },
  proposals: {
    "proposal-doc": "Proposal doc",
    "quote": "Quote/Estimate",
  },
  messaging: {
    "linkedin-connection": "LinkedIn connection",
    "linkedin-follow-up": "LinkedIn follow-up",
    "sms-reminder": "SMS reminder",
  },
  documents: {
    "contract": "Contract",
    "nda": "NDA",
    "order-form": "Order form",
  },
};
