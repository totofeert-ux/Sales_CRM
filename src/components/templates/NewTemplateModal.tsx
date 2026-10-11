import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_LABELS: Record<string, string> = {
  "emails": "Emails",
  "call-scripts": "Call Scripts",
  "meeting-agendas": "Meeting Agendas",
  "proposals": "Proposals & Quotes",
  "messaging": "Messaging",
  "documents": "Documents",
};

const SUBTYPES: Record<string, { key: string; label: string }[]> = {
  emails: [
    { key: "first-contact", label: "First contact" },
    { key: "follow-up", label: "Follow-up" },
    { key: "proposal-follow-up", label: "Proposal follow-up" },
    { key: "closing", label: "Closing" },
    { key: "thank-you", label: "Thank-you" },
    { key: "reactivation", label: "Reactivation" },
  ],
  "call-scripts": [
    { key: "discovery", label: "Discovery" },
    { key: "follow-up", label: "Follow-up" },
    { key: "objection-handling", label: "Objection handling" },
    { key: "closing", label: "Closing" },
  ],
  "meeting-agendas": [
    { key: "discovery-meeting", label: "Discovery meeting" },
    { key: "demo", label: "Demo" },
    { key: "negotiation", label: "Negotiation" },
  ],
  proposals: [
    { key: "proposal-doc", label: "Proposal doc" },
    { key: "quote", label: "Quote/Estimate" },
  ],
  messaging: [
    { key: "linkedin-connection", label: "LinkedIn connection" },
    { key: "linkedin-follow-up", label: "LinkedIn follow-up" },
    { key: "sms-reminder", label: "SMS reminder" },
  ],
  documents: [
    { key: "contract", label: "Contract" },
    { key: "nda", label: "NDA" },
    { key: "order-form", label: "Order form" },
  ],
};

export function NewTemplateModal({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (p: { title: string; category: string; subtype?: string; description?: string; content?: string; tags?: string[] }) => void | Promise<void>; }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [subtype, setSubtype] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle(""); setCategory(undefined); setSubtype(undefined); setDescription(""); setContent(""); setTags("");
    }
  }, [open]);

  const canSubmit = title.trim().length > 0 && !!category;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>New Template</DialogTitle>
          <DialogDescription>Fill in the details and content. You can always edit later.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Proposal follow-up" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setSubtype(undefined); }}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Subtype</label>
              <Select value={subtype} onValueChange={setSubtype} disabled={!category}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {category && SUBTYPES[category]?.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Short description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Content</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[240px]" />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="proposal, follow-up" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={async () => {
            await onCreate({ title: title.trim(), category: category!, subtype, description, content, tags: tags.split(",").map(t => t.trim()).filter(Boolean) });
            onOpenChange(false);
          }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
