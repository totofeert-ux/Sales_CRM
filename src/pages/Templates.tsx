import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  FileText,
  Plus,
  Search as SearchIcon,
  Copy,
  Pencil,
  Save,
  X,
  Trash2,
  SquarePlus,
  Tags,
} from "lucide-react";
import { TemplateEditorPanel } from "@/components/templates/TemplateEditorPanel";
import { NewTemplateModal } from "@/components/templates/NewTemplateModal";
import { TemplateCard } from "@/components/templates/TemplateCard";

export type Template = {
  id: string;
  user_id: string;
  category: string;
  subtype: string | null;
  title: string;
  description: string | null;
  content: string;
  tags: string[] | null;
  updated_at: string;
  created_at: string;
};

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

function normalizeSubtype(param?: string | null): string | undefined {
  if (!param) return undefined;
  const map: Record<string, string> = {
    followup: "follow-up",
    proposal: "proposal-doc",
    quote: "quote",
  };
  return map[param] || param;
}

export default function TemplatesPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Template[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [subtype, setSubtype] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<"recent" | "az">("recent");

  const [panelOpen, setPanelOpen] = useState(false);
  const [active, setActive] = useState<Template | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    document.title = "Templates & Documents – SoloCRM";
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, []);

  useEffect(() => {
    // Apply pre-filter from query params
    const cat = searchParams.get("cat") || undefined;
    const type = normalizeSubtype(searchParams.get("type"));
    if (cat && CATEGORY_LABELS[cat]) setCategory(cat);
    if (type) setSubtype(type);
  }, [searchParams]);

  useEffect(() => {
    // Load templates for current user
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to load templates", variant: "destructive" as any });
      } else {
        setItems(data as Template[]);
      }
      setLoading(false);
    };
    load();
  }, [toast]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (category) list = list.filter((t) => t.category === category);
    if (subtype) list = list.filter((t) => (t.subtype || "") === subtype);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((t) =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.content || "").toLowerCase().includes(q)
    );
    if (sort === "az") list.sort((a, b) => a.title.localeCompare(b.title));
    else list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return list;
  }, [items, category, subtype, query, sort]);

  const openTemplate = (t: Template) => {
    setActive(t);
    setPanelOpen(true);
  };

  const handleCreate = async (payload: {
    title: string;
    category: string;
    subtype?: string;
    description?: string;
    content?: string;
    tags?: string[];
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", description: "You must be logged in to create templates.", variant: "destructive" as any });
      return;
    }
    const { data, error } = await supabase.from("templates").insert({
      user_id: user.id,
      title: payload.title,
      category: payload.category,
      subtype: payload.subtype ?? null,
      description: payload.description ?? null,
      content: payload.content ?? "",
      tags: payload.tags ?? [],
    }).select("*").single();
    if (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not create template", variant: "destructive" as any });
      return;
    }
    setItems((prev) => [data as Template, ...prev]);
    toast({ title: "Created", description: "New template added" });
  };

  const handleUpdate = async (id: string, patch: Partial<Template>, opts?: { silent?: boolean; version?: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (!opts?.silent) toast({ title: "Sign in required", description: "Log in to save changes.", variant: "destructive" as any });
      return;
    }
    const { data, error } = await supabase.from("templates").update({
      title: patch.title,
      description: patch.description,
      content: patch.content,
      category: patch.category,
      subtype: patch.subtype,
      tags: patch.tags,
    }).eq("id", id).eq("user_id", user.id).select("*").single();

    if (error) {
      console.error(error);
      if (!opts?.silent) toast({ title: "Error", description: "Could not save changes", variant: "destructive" as any });
      return;
    }
    setItems((prev) => prev.map((t) => (t.id === id ? (data as Template) : t)));

    // Save a version snapshot if requested
    if (opts?.version && patch.content !== undefined) {
      await supabase.from("template_versions").insert({ template_id: id, content: patch.content });
    }

    if (!opts?.silent) toast({ title: "Saved", description: "Template updated" });
  };

  const handleDuplicate = async (t: Template) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to duplicate.", variant: "destructive" as any });
      return;
    }
    const { data, error } = await supabase.from("templates").insert({
      user_id: user.id,
      title: `${t.title} (Copy)`,
      category: t.category,
      subtype: t.subtype,
      description: t.description,
      content: t.content,
      tags: t.tags ?? [],
    }).select("*").single();
    if (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not duplicate", variant: "destructive" as any });
      return;
    }
    setItems((prev) => [data as Template, ...prev]);
    toast({ title: "Duplicated", description: "Template duplicated" });
  };

  const handleDelete = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to delete.", variant: "destructive" as any });
      return;
    }
    const { error } = await supabase.from("templates").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not delete", variant: "destructive" as any });
      return;
    }
    setItems((prev) => prev.filter((t) => t.id !== id));
    if (active?.id === id) setPanelOpen(false);
    toast({ title: "Deleted", description: "Template removed" });
  };

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked copying", variant: "destructive" as any });
    }
  };

  const onCategoryChange = (value: string) => {
    setCategory(value || undefined);
    setSubtype(undefined);
    const params: any = {};
    if (value) params.cat = value;
    setSearchParams(params);
  };

  const onSubtypeSelect = (value?: string) => {
    setSubtype(value);
    const params: any = {};
    if (category) params.cat = category;
    if (value) params.type = value;
    setSearchParams(params);
  };

  const sidebar = (
    <aside className="hidden md:block md:col-span-3 lg:col-span-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div key={key}>
              <button
                className={`w-full text-left px-2 py-1.5 rounded-md hover:bg-accent ${category === key ? "bg-accent/60" : ""}`}
                onClick={() => onCategoryChange(key)}
              >
                {label}
              </button>
              {category === key && SUBTYPES[key] && (
                <div className="mt-1 ml-2 space-y-1">
                  {SUBTYPES[key].map((s) => (
                    <button
                      key={s.key}
                      className={`w-full text-left px-2 py-1 rounded-md text-xs hover:bg-accent ${subtype === s.key ? "bg-accent/70" : ""}`}
                      onClick={() => onSubtypeSelect(s.key)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </aside>
  );

  return (
    <section className="space-y-4">
      <header className="flex items-start gap-3 flex-col sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-5 w-5" /> Templates & Documents</h1>
        <div className="flex-1" />
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </header>

      {/* Top controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {sidebar}
        <div className="md:col-span-9 lg:col-span-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Mobile category dropdown */}
            <div className="sm:min-w-[180px] md:hidden">
              <Select value={category} onValueChange={onCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:min-w-[160px]">
              <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently updated</SelectItem>
                  <SelectItem value="az">A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter breadcrumb */}
          {category && (
            <div className="text-sm text-muted-foreground mb-2">
              {CATEGORY_LABELS[category]}
              {subtype && SUBTYPES[category] && (
                <> › {SUBTYPES[category].find((s) => s.key === subtype)?.label || subtype}</>
              )}
            </div>
          )}

          {/* Templates grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} onOpen={() => openTemplate(t)} />
            ))}
            {!loading && filtered.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No templates yet. Click "New Template" to create your first one.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Editor Panel */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        {active && (
          <TemplateEditorPanel
            template={active}
            onClose={() => setPanelOpen(false)}
            onCopy={onCopy}
            onSave={async (patch, opts) => {
              await handleUpdate(active.id, patch as any, opts);
              setActive((prev) => (prev ? { ...prev, ...patch, updated_at: new Date().toISOString() } as any : prev));
            }}
            onDuplicate={() => handleDuplicate(active)}
            onDelete={() => handleDelete(active.id)}
          />
        )}
      </Sheet>

      {/* Create Modal */}
      <NewTemplateModal
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={handleCreate}
      />

      {/* Auth notice if needed */}
      <AuthNotice />
    </section>
  );
}

function AuthNotice() {
  const [needsAuth, setNeedsAuth] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setNeedsAuth(!user));
  }, []);
  if (!needsAuth) return null;
  return (
    <Card className="border-dashed">
      <CardContent className="py-4 text-sm text-muted-foreground">
        You are not signed in. Templates are private per user. Please enable authentication to use this feature.
      </CardContent>
    </Card>
  );
}
