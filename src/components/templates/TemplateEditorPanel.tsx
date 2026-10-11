import { useEffect, useMemo, useRef, useState } from "react";
import { SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Copy, Save, Pencil, X, Hash, Type, List, ListOrdered, Code, Tag, Trash2, SquarePlus } from "lucide-react";
import type { Template } from "@/pages/Templates";

export function TemplateEditorPanel({
  template,
  onSave,
  onClose,
  onCopy,
  onDuplicate,
  onDelete,
}: {
  template: Template;
  onSave: (patch: Partial<Template>, opts?: { silent?: boolean; version?: boolean }) => void | Promise<void>;
  onClose: () => void;
  onCopy: (text: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description || "");
  const [content, setContent] = useState(template.content || "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedFlag, setSavedFlag] = useState<"idle" | "saving" | "saved">("idle");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(template.title);
    setDescription(template.description || "");
    setContent(template.content || "");
  }, [template.id]);

  // Autosave after 1s pause while editing
  useEffect(() => {
    if (!editing) return;
    setSavedFlag("saving");
    const id = setTimeout(async () => {
      await onSave({ title, description, content }, { silent: true, version: true });
      setSavedFlag("saved");
      setTimeout(() => setSavedFlag("idle"), 1200);
    }, 1000);
    return () => clearTimeout(id);
  }, [title, description, content, editing]);

  const subject = useMemo(() => {
    const m = content.match(/^Subject:\s*(.+)$/im);
    return m ? m[1].trim() : undefined;
  }, [content]);

  const insertAtCursor = (text: string) => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    const next = before + text + after;
    setContent(next);
    // move cursor
    const cursor = start + text.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const wrapSelection = (pre: string, post = pre) => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const sel = el.value.substring(start, end);
    insertAtCursor(pre + sel + post);
  };

  const variables = [
    "{{first_name}}",
    "{{last_name}}",
    "{{company}}",
    "{{deal_amount}}",
    "{{meeting_date}}",
    "{{my_name}}",
    "{{my_signature}}",
  ];

  const doCopy = () => onCopy(content);

  const onSaveClick = async () => {
    await onSave({ title, description, content }, { version: true });
    setEditing(false);
  };

  return (
    <SheetContent side="right" className="w-full sm:max-w-[720px] p-0 flex flex-col">
      <SheetHeader className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex items-start gap-3 flex-col sm:flex-row sm:items-center">
          <div className="flex-1">
            <SheetTitle>{editing ? "Edit Template" : template.title}</SheetTitle>
            <SheetDescription className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{template.category}</Badge>
              {template.subtype && <Badge variant="secondary">{template.subtype}</Badge>}
              {savedFlag !== "idle" && (
                <span className="text-xs text-muted-foreground">{savedFlag === "saving" ? "Saving…" : "Saved"}</span>
              )}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={doCopy} className="sm:inline-flex hidden">
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
            {!editing ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
            ) : (
              <>
                <Button onClick={onSaveClick}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
                <Button variant="ghost" onClick={() => { setEditing(false); setTitle(template.title); setDescription(template.description || ""); setContent(template.content || ""); }}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Inline subject copy */}
        {subject && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Subject:</span>
            <span className="truncate">{subject}</span>
            <Button size="sm" variant="outline" onClick={() => onCopy(subject)} className="h-7 px-2">
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy subject
            </Button>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-3">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editing} />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editing} />
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => wrapSelection("**")}> <Type className="h-4 w-4 mr-1" /> Bold</Button>
            <Button variant="outline" size="sm" onClick={() => wrapSelection("*")}> Italic</Button>
            <Button variant="outline" size="sm" onClick={() => insertAtCursor("\n- ")}> <List className="h-4 w-4 mr-1" /> Bullets</Button>
            <Button variant="outline" size="sm" onClick={() => insertAtCursor("\n1. ")}> <ListOrdered className="h-4 w-4 mr-1" /> Numbered</Button>
            <Button variant="outline" size="sm" onClick={() => insertAtCursor("\n# ")}> <Hash className="h-4 w-4 mr-1" /> Heading</Button>
            <Button variant="outline" size="sm" onClick={() => wrapSelection("`")}> <Code className="h-4 w-4 mr-1" /> Code</Button>
          </div>

          {/* Variables helper */}
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {variables.map((v) => (
              <Button key={v} size="sm" variant="secondary" onClick={() => insertAtCursor(v)} className="h-7">
                {v}
              </Button>
            ))}
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Content</label>
            <Textarea ref={taRef} value={content} onChange={(e) => setContent(e.target.value)} disabled={!editing} className="min-h-[320px]" />
          </div>
        </div>
      </div>

      <SheetFooter className="p-4 border-t flex items-center gap-2 justify-between sticky bottom-0 bg-background">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onDuplicate}>
            <SquarePlus className="h-4 w-4 mr-2" /> Duplicate
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
        <Button onClick={() => onCopy(content)} className="sm:hidden"> <Copy className="h-4 w-4 mr-2" /> Copy </Button>
        <Button variant="outline" onClick={onClose} className="hidden sm:inline-flex">Close</Button>
      </SheetFooter>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SheetContent>
  );
}
