import React, { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useTasks, Task } from "@/hooks/use-tasks";
import { useContacts } from "@/hooks/use-contacts";
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { Plus, ChevronLeft, ChevronRight, Phone, Mail, Calendar as CalendarIcon, StickyNote } from "lucide-react";
import { NewTaskModal } from "@/components/NewTaskModal";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
const typeColors: Record<string, string> = {
  task: "bg-primary/10 text-primary border-primary/30",
  meeting: "bg-accent/10 text-accent border-accent/30",
};

function TaskItem({ task }: { task: Task }) {
  const { toggleStatus } = useTasks();
  const { getById: getContact } = useContacts();
  const contact = task.clientId ? getContact(task.clientId) : undefined;
  const due = parseISO(task.dueAt);
  return (
    <div className="flex items-start gap-2 p-2 rounded-md border hover:bg-accent/40 transition-colors">
      <Checkbox checked={task.status === "done"} onCheckedChange={() => toggleStatus(task.id)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={"truncate font-medium" + (task.status === "done" ? " line-through text-muted-foreground" : "")}>{task.title}</span>
          <Badge className={`border ${typeColors[task.type]}`}>{task.type === "task" ? "Task" : "Meeting"}</Badge>
          {contact && (
            <Link to={`/clients/${contact.id}`} className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline truncate">
              {contact.companyName || contact.contactName}
            </Link>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{format(due, "p")}</div>
      </div>
    </div>
  );
}

// Day time grid with 30-min slots, drag/resize, all-day row
function DayTimeGrid({ date, items, onEdit }: { date: Date; items: Task[]; onEdit: (id: string) => void }) {
  const { updateTask } = useTasks();
  const { toast } = useToast();
  const gridRef = useRef<HTMLDivElement>(null);
  const SLOT_MIN = 30;
  const SLOT_H = 28; // px per 30 min
  const isAllDay = (t: Task) => {
    const d = parseISO(t.dueAt);
    return d.getHours() === 0 && d.getMinutes() === 0;
  };
  const allDay = items.filter(isAllDay);
  const timed = items.filter((t) => !isAllDay(t)).sort((a, b) => parseISO(a.dueAt).getTime() - parseISO(b.dueAt).getTime());

  type Temp = Record<string, { top: number; height: number; leftPct?: number; widthPct?: number }>;
  const [temp, setTemp] = React.useState<Temp>({});

  // current time line
  const [nowTop, setNowTop] = useState<number | null>(null);
  useEffect(() => {
    if (!isToday(date)) return setNowTop(null);
    const tick = () => {
      const n = new Date();
      const mins = n.getHours() * 60 + n.getMinutes();
      setNowTop((mins / SLOT_MIN) * SLOT_H);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [date]);

  // simple overlap columns assignment
  const layout = timed.map((t) => {
    const d = parseISO(t.dueAt);
    const start = d.getHours() * 60 + d.getMinutes();
    const dur = t.durationMinutes ?? (t.type === "meeting" ? 60 : 30);
    const end = start + dur;
    return { t, start, end };
  });
  layout.sort((a, b) => a.start - b.start);
  const activeEnds: number[] = [];
  const cols: Record<string, { col: number; group: number }> = {};
  layout.forEach(({ t, start, end }) => {
    // free columns where ended
    for (let i = 0; i < activeEnds.length; i++) {
      if (activeEnds[i] <= start) activeEnds[i] = -1;
    }
    // find first free col
    let col = activeEnds.findIndex((x) => x === -1 || x === undefined);
    if (col === -1) col = activeEnds.length;
    activeEnds[col] = end;
    const group = activeEnds.filter((x) => x !== -1).length;
    cols[t.id] = { col, group };
  });

  const onDragStart = (
    e: React.PointerEvent,
    t: Task,
    kind: "move" | "resize"
  ) => {
    const container = gridRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const d = parseISO(t.dueAt);
    const start = d.getHours() * 60 + d.getMinutes();
    const dur = t.durationMinutes ?? (t.type === "meeting" ? 60 : 30);
    const top = (start / SLOT_MIN) * SLOT_H;
    const height = (dur / SLOT_MIN) * SLOT_H;
    const startY = e.clientY;
    const handler = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      if (kind === "move") {
        let newTop = top + dy;
        newTop = Math.max(0, Math.min(newTop, 48 * SLOT_H - height));
        setTemp((prev) => ({ ...prev, [t.id]: { top: newTop, height } }));
      } else {
        let newHeight = Math.max(SLOT_H, height + dy);
        newHeight = Math.min(newHeight, 48 * SLOT_H - top);
        setTemp((prev) => ({ ...prev, [t.id]: { top, height: newHeight } }));
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", handler);
      window.removeEventListener("pointerup", up);
      const ov = temp[t.id] ?? { top, height };
      const newTop = ov.top;
      const newHeight = ov.height;
      const snappedTop = Math.round(newTop / SLOT_H) * SLOT_H;
      const snappedH = Math.round(newHeight / SLOT_H) * SLOT_H;
      const startMin = (snappedTop / SLOT_H) * SLOT_MIN;
      const durMin = (snappedH / SLOT_H) * SLOT_MIN;
      const base = new Date(date);
      base.setHours(0, 0, 0, 0);
      const hours = Math.floor(startMin / 60);
      const minutes = startMin % 60;
      base.setHours(hours, minutes, 0, 0);
      const patch: any = { id: t.id };
      if (kind === "move") patch.dueAt = base.toISOString();
      else patch.durationMinutes = durMin;
      updateTask(patch);
      setTemp((prev) => {
        const n = { ...prev };
        delete n[t.id];
        return n;
      });
      toast({ title: "Updated", description: kind === "move" ? "Time changed" : "Duration updated" });
    };
    window.addEventListener("pointermove", handler);
    window.addEventListener("pointerup", up, { once: true });
  };

  return (
    <div className="space-y-3">
      {/* All-day */}
      <div className="rounded-md border p-2 bg-accent/20">
        <div className="text-xs font-medium text-muted-foreground mb-2">All-day</div>
        <div className="flex flex-wrap gap-2">
          {allDay.length ? (
            allDay.map((t) => (
              <button
                key={t.id}
                onClick={() => onEdit(t.id)}
                className={`px-2 py-1 rounded-md border text-xs ${typeColors[t.type]}`}
              >
                {t.title}
              </button>
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">No all-day items</div>
          )}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex">
        <div className="w-14 pr-2 text-xs text-muted-foreground select-none">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="h-14 relative">
              <div className="absolute -top-2">{String(h).padStart(2, "0")}:00</div>
            </div>
          ))}
        </div>
        <div ref={gridRef} className="relative flex-1 border rounded-md bg-background" style={{ height: 48 * SLOT_H }}>
          {/* hour lines */}
          {Array.from({ length: 24 }).map((_, h) => (
            <React.Fragment key={h}>
              <div className="absolute left-0 right-0 border-t border-border/70" style={{ top: h * 2 * SLOT_H }} />
              <div className="absolute left-0 right-0 border-t border-border/40" style={{ top: h * 2 * SLOT_H + SLOT_H }} />
            </React.Fragment>
          ))}

          {/* now line */}
          {nowTop !== null && (
            <div className="absolute left-0 right-0 h-0.5 bg-primary z-20" style={{ top: nowTop }} />
          )}

          {/* items */}
          {timed.map((t) => {
            const d = parseISO(t.dueAt);
            const start = d.getHours() * 60 + d.getMinutes();
            const dur = t.durationMinutes ?? (t.type === "meeting" ? 60 : 30);
            const defTop = (start / SLOT_MIN) * SLOT_H;
            const defH = (dur / SLOT_MIN) * SLOT_H;
            const ov = temp[t.id];
            const top = ov?.top ?? defTop;
            const height = ov?.height ?? defH;
            const col = cols[t.id]?.col ?? 0;
            const group = cols[t.id]?.group ?? 1;
            const widthPct = 100 / group;
            const leftPct = col * widthPct;
            return (
              <div
                key={t.id}
                className={`absolute rounded-md border shadow-sm overflow-hidden select-none ${typeColors[t.type]}`}
                style={{ top, height, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }}
                onClick={() => onEdit(t.id)}
              >
                <div className="px-2 py-1 text-xs font-medium truncate" onPointerDown={(e) => onDragStart(e, t, "move")}>{t.title}</div>
                <div className="px-2 pb-1 text-[10px] text-muted-foreground truncate">{format(d, "p")} • {t.type}</div>
                <div
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onDragStart(e, t, "resize");
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Week agenda with DnD between days
function WeekAgenda({ days, tasksByDay, onEdit }: { days: Date[]; tasksByDay: Map<string, Task[]>; onEdit: (id: string) => void }) {
  const { updateTask, toggleStatus, getById } = useTasks();
  const { toast } = useToast();
  const today = new Date();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const init: Record<string, boolean> = {};
    days.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      init[key] = d < startOfWeek(today, { weekStartsOn: 1 }) ? false : d < new Date(today.getFullYear(), today.getMonth(), today.getDate())
        ? true
        : false;
    });
    setCollapsed(init);
  }, [days]);

  const DroppableDay: React.FC<{ day: Date; children: React.ReactNode }> = ({ day, children }) => {
    const key = format(day, "yyyy-MM-dd");
    const { setNodeRef } = useDroppable({ id: `day-${key}` });
    return (
      <div ref={setNodeRef} className="py-2">
        {children}
      </div>
    );
  };

  const DraggableItem: React.FC<{ t: Task }> = ({ t }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id });
    const d = parseISO(t.dueAt);
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`group flex items-start justify-between gap-2 rounded-md border p-2 hover:bg-accent/40 ${isDragging ? "opacity-50" : ""}`}
      >
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{format(d, "p")}</div>
          <button onClick={() => onEdit(t.id)} className={`truncate text-sm font-medium text-left ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
            {t.title}
          </button>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => toggleStatus(t.id)} className="h-7 px-2">Done</Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(t.id)} className="h-7 px-2">Edit</Button>
        </div>
      </div>
    );
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("day-")) return;
    const targetKey = overId.replace("day-", "");
    const t = getById(String(active.id));
    if (!t) return;
    const d = parseISO(t.dueAt);
    const [y, m, dayStr] = targetKey.split("-").map((v) => parseInt(v, 10));
    const newDate = new Date(y, m - 1, dayStr, d.getHours(), d.getMinutes(), 0, 0);
    updateTask({ id: t.id, dueAt: newDate.toISOString() });
    toast({ title: "Updated", description: "Moved task to new day" });
  };

  return (
    <DndContext onDragEnd={onDragEnd}>
      <Card className="p-0">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const items = (tasksByDay.get(key) || []).sort((a, b) => parseISO(a.dueAt).getTime() - parseISO(b.dueAt).getTime());
          const isCollapsed = collapsed[key];
          return (
            <div key={key} className="border-b last:border-b-0">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-3 py-2">
                <div className={`text-sm ${isToday(day) ? "text-primary font-semibold" : "text-muted-foreground"}`}>{format(day, "EEE d")}</div>
                <Button variant="ghost" size="sm" onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))} className="h-7">
                  {isCollapsed ? "Expand" : "Collapse"}
                </Button>
              </div>
              {!isCollapsed && (
                <div className="px-3 pb-2">
                  <DroppableDay day={day}>
                    <div className="space-y-2">
                      {items.length ? items.map((t) => <DraggableItem key={t.id} t={t} />) : (
                        <div className="text-xs text-muted-foreground text-center py-4">No tasks this day</div>
                      )}
                    </div>
                  </DroppableDay>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </DndContext>
  );
}

export default function CalendarPage() {
  const isMobile = useIsMobile();
  const { tasks } = useTasks();
  const { getById: getContact } = useContacts();
  const [openNew, setOpenNew] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [monthOpenKey, setMonthOpenKey] = useState<string | null>(null);

  const [view, setView] = useState<"day" | "week" | "month">(isMobile ? "day" : "week");
  const [cursor, setCursor] = useState(new Date());
const [typeFilter, setTypeFilter] = useState<"all" | "task" | "meeting">("all");
const [priorityFilter, setPriorityFilter] = useState<"focus" | "all">("focus");

  useEffect(() => {
    document.title = "Calendar – SoloCRM";
  }, []);

const filtered = useMemo(() => {
  return tasks.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    return true;
  });
}, [tasks, typeFilter]);

  const daysInWeek = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    const end = endOfWeek(cursor, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

const tasksByDay = useMemo(() => {
  const map = new Map<string, Task[]>();
  const list = filtered.filter((t) => !(view === "month" && priorityFilter === "focus") || t.priority !== "low");
  list.forEach((t) => {
    const d = parseISO(t.dueAt);
    const key = format(d, "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  });
  map.forEach((arr) => arr.sort((a, b) => parseISO(a.dueAt).getTime() - parseISO(b.dueAt).getTime()));
  return map;
}, [filtered, view, priorityFilter]);

  const headerLabel = useMemo(() => {
    if (view === "day") return format(cursor, "EEEE, MMM d");
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
    }
    return format(cursor, "MMMM yyyy");
  }, [cursor, view]);

  return (
    <section>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(addDays(cursor, view === "month" ? -30 : view === "week" ? -7 : -1))}>
            <ChevronLeft />
          </Button>
          <div className="min-w-[160px] text-center font-medium">{headerLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor(addDays(cursor, view === "month" ? 30 : view === "week" ? 7 : 1))}>
            <ChevronRight />
          </Button>
          <Button onClick={() => setOpenNew(true)} className="ml-2">
            <Plus className="mr-2" /> Add Task
          </Button>
        </div>
      </header>

<div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
  <div className="flex gap-2 items-center">
    <Select value={view} onValueChange={(v: any) => setView(v)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="View" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">Day</SelectItem>
        <SelectItem value="week">Week</SelectItem>
        <SelectItem value="month">Month</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div className="flex gap-2">
    <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Task type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All types</SelectItem>
        <SelectItem value="task">Tasks</SelectItem>
        <SelectItem value="meeting">Meetings</SelectItem>
      </SelectContent>
    </Select>
    <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Priority" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="focus">High & Medium</SelectItem>
        <SelectItem value="all">All priorities</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>

      {view === "day" && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-lg font-semibold">{format(cursor, "EEEE, MMM d")}</div>
          </div>
          <DayTimeGrid
            date={cursor}
            items={tasksByDay.get(format(cursor, "yyyy-MM-dd")) || []}
            onEdit={(id) => {
              setEditingId(id);
              setOpenNew(true);
            }}
          />
        </Card>
      )}

      {view === "week" && (
        <WeekAgenda
          days={daysInWeek}
          tasksByDay={tasksByDay}
          onEdit={(id) => {
            setEditingId(id);
            setOpenNew(true);
          }}
        />
      )}

      {view === "month" && (
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day, idx) => {
              const key = format(day, "yyyy-MM-dd");
              const items = tasksByDay.get(key) || [];
              const firstTwo = items.slice(0, 2);
              return (
                <Card
                  key={key + idx}
                  className={`p-2 min-h-[110px] ${!isSameMonth(day, cursor) ? "opacity-60" : ""} hover:bg-accent/50 transition-colors cursor-pointer`}
                  onClick={() => setMonthOpenKey(key)}
                >
                  <div className={`mb-1 text-xs ${isToday(day) ? "text-primary font-medium" : "text-muted-foreground"}`}>{format(day, "d EEE")}</div>
                  <div className="flex flex-wrap gap-2">
                    {firstTwo.map((t) => {
                      const titleLower = t.title.toLowerCase();
                      const Icon = t.type === "meeting"
                        ? CalendarIcon
                        : (/\b(call|phone|dial|ring)\b/.test(titleLower)
                          ? Phone
                          : (/\b(mail|email|inbox|reply|send)\b/.test(titleLower) ? Mail : StickyNote));
                      const dotCls = t.priority === "high" ? "bg-destructive" : t.priority === "medium" ? "bg-warning" : "bg-muted-foreground";
                      return (
                        <Tooltip key={t.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingId(t.id); setOpenNew(true); }}
                              className="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs hover:bg-accent/60"
                            >
                              <span className={`h-2 w-2 rounded-full ${dotCls}`} aria-hidden />
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm font-medium truncate max-w-[240px]">{t.title}</div>
                            <div className="text-xs text-muted-foreground">{format(parseISO(t.dueAt), "p")}</div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {items.length > 2 && (
                      <button
                        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                        onClick={(e) => { e.stopPropagation(); setMonthOpenKey(key); }}
                      >
                        +{items.length - 2} more
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      <NewTaskModal open={openNew} onClose={() => { setOpenNew(false); setEditingId(undefined); }} editingTaskId={editingId} />

      {/* Month list dialog */}
      <Dialog open={!!monthOpenKey} onOpenChange={(o) => !o && setMonthOpenKey(null)}>
<DialogContent>
  <DialogHeader>
    <DialogTitle>{monthOpenKey ? format(parseISO(monthOpenKey), "EEEE, PPP") : "Day items"}</DialogTitle>
  </DialogHeader>
  {monthOpenKey && (
    <div className="space-y-2">
      {(tasksByDay.get(monthOpenKey) || []).map((t) => {
        const d = parseISO(t.dueAt);
        const contact = t.clientId ? getContact(t.clientId) : undefined;
        const titleLower = t.title.toLowerCase();
        const Icon = t.type === "meeting"
          ? CalendarIcon
          : (/\b(call|phone|dial|ring)\b/.test(titleLower)
            ? Phone
            : (/\b(mail|email|inbox|reply|send)\b/.test(titleLower) ? Mail : StickyNote));
        const dotCls = t.priority === "high" ? "bg-destructive" : t.priority === "medium" ? "bg-warning" : "bg-muted-foreground";
        return (
          <div key={t.id} className="flex items-center justify-between rounded-md border p-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2 w-2 rounded-full ${dotCls}`} aria-hidden />
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{format(d, "p")}</div>
                <button className="truncate font-medium hover:underline" onClick={() => { setEditingId(t.id); setOpenNew(true); }}>
                  {t.title}
                </button>
                {contact && (
                  <div className="text-xs">
                    <Link to={`/clients/${contact.id}`} className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                      {contact.companyName || contact.contactName}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</DialogContent>
      </Dialog>
    </section>
  );
}
