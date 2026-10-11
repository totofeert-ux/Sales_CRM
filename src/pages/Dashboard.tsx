import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useContacts } from "@/hooks/use-contacts";
import { LIFECYCLE_STAGES, LifecycleStage } from "@/lib/lifecycle";
import { useTasks } from "@/hooks/use-tasks";
import { useDeals } from "@/hooks/use-deals";
import { getDashboardKPIs, getMonthlyRevenue, getWonLostData, getPipelineByStage } from "@/lib/services/dashboard-service";

function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export default function Dashboard() {
  const { deals } = useDeals();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard | Performance";
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, []);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [kpis, monthlyRevenue, wonLostData, pipelineData] = await Promise.all([
          getDashboardKPIs(),
          getMonthlyRevenue(),
          getWonLostData(),
          getPipelineByStage()
        ]);

        setDashboardData({
          kpis,
          monthlyRevenue,
          wonLostData,
          pipelineData
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const kpis = useMemo(() => {
    if (!dashboardData) return { closingRate: 0, revenueThisMonth: 0, dealsWonThisMonth: 0, forecastedRevenue: 0, totalDeals: 0 };
    
    const totalDeals = deals.length;
    const wonDeals = deals.filter((d) => d.stage === "Won");
    const lostDeals = deals.filter((d) => d.stage === "Lost");
    const decided = wonDeals.length + lostDeals.length;
    const closingRate = decided > 0 ? (wonDeals.length / decided) * 100 : 0;

    return { 
      closingRate, 
      revenueThisMonth: dashboardData.kpis.closingThisMonthValue,
      dealsWonThisMonth: dashboardData.kpis.closingThisMonthCount,
      forecastedRevenue: dashboardData.kpis.pipelineValue,
      totalDeals 
    };
  }, [dashboardData, deals, thisMonth, thisYear]);
// Tasks & Activity Metrics
  const { tasks } = useTasks();
  const taskCompletionRate = dashboardData?.kpis.taskCompletionRate || 0;
  const averageSalesCycleDays = dashboardData?.kpis.averageSalesCycleDays || 0;

  const classifyActivity = (t: { title: string; notes?: string; type: string }) => {
    const text = `${t.title} ${t.notes ?? ""}`.toLowerCase();
    if (text.includes("call") || text.includes("appel") || text.includes("phone")) return "calls";
    if (text.includes("email") || text.includes("mail")) return "emails";
    if (t.type === "meeting" || text.includes("meeting") || text.includes("rdv") || text.includes("rendez")) return "meetings";
    return "other";
  };
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(now.getDate() - 28);
  const last4wDone = tasks.filter((t) => {
    const d = new Date(t.dueAt);
    return t.status === "done" && d >= fourWeeksAgo && d <= now;
  });
  const activityCounts = last4wDone.reduce(
    (acc, t) => {
      const a = classifyActivity(t as any);
      if (a === "calls") acc.calls += 1;
      else if (a === "emails") acc.emails += 1;
      else if (a === "meetings") acc.meetings += 1;
      return acc;
    },
    { calls: 0, emails: 0, meetings: 0 }
  );
  const salesActivityData = [
    { activity: "Calls", count: activityCounts.calls },
    { activity: "Emails", count: activityCounts.emails },
    { activity: "Meetings", count: activityCounts.meetings },
  ];

  const doneThisMonth = tasks.filter((t) => {
    const d = new Date(t.dueAt);
    const startOfMonth = new Date(thisYear, thisMonth, 1);
    const endOfMonth = new Date(thisYear, thisMonth + 1, 0, 23, 59, 59);
    return t.status === "done" && d >= startOfMonth && d <= endOfMonth;
  });
  const tasksThisMonth = tasks.filter((t) => {
    const d = new Date(t.dueAt);
    const startOfMonth = new Date(thisYear, thisMonth, 1);
    const endOfMonth = new Date(thisYear, thisMonth + 1, 0, 23, 59, 59);
    return d >= startOfMonth && d <= endOfMonth;
  });

  // Build the last 6 months timeline
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = addMonths(new Date(thisYear, thisMonth, 1), -(5 - i));
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString(undefined, { month: "short" }) };
  });

  const revenueSeries = dashboardData?.monthlyRevenue || [];
  const wonLostSeries = dashboardData?.wonLostData || [];

  const pipelineByStage = useMemo(() => {
    if (!dashboardData?.pipelineData) return [];
    
    const pipelineData = dashboardData.pipelineData;
    const leadValue = pipelineData.find((p: any) => p.stage === 'lead')?.value || 0;
    const inProgressValue = pipelineData.find((p: any) => p.stage === 'in-progress')?.value || 0;
    const proposalValue = pipelineData.find((p: any) => p.stage === 'proposal-sent')?.value || 0;
    const wonValue = deals.filter(d => d.stage === 'Won').reduce((sum, d) => sum + d.amount, 0);
    
    return [{
      label: "Pipeline",
      lead: leadValue,
      inProgress: inProgressValue,
      proposal: proposalValue,
      won: wonValue,
    }];
  }, [dashboardData, deals]);

// Shared lifecycle from store
const { contacts } = useContacts();
const lifecycleStages: LifecycleStage[] = LIFECYCLE_STAGES;

const stageCounts = useMemo(() => {
  const counts: Record<LifecycleStage, number> = { qualifying: 0, qualified: 0, won: 0, lost: 0, unqualified: 0 };
  contacts.forEach((c) => { counts[c.lifecycle_stage] += 1; });
  return counts;
}, [contacts]);

const totalContacts = contacts.length;

// Lead source breakdown (from tags if available)
const sourceCounts = contacts.reduce(
  (acc, c) => {
    const tags = (c.tags || []).map((t) => t.toLowerCase());
    if (tags.some((t) => t.includes("referral"))) acc.referrals += 1;
    else if (tags.some((t) => t.includes("website") || t.includes("web"))) acc.website += 1;
    else if (tags.some((t) => t.includes("network"))) acc.networking += 1;
    else acc.other += 1;
    return acc;
  },
  { referrals: 0, website: 0, networking: 0, other: 0 }
);
const sourcesData = [
  { name: "Referrals", value: sourceCounts.referrals },
  { name: "Website", value: sourceCounts.website },
  { name: "Networking", value: sourceCounts.networking },
  { name: "Other", value: sourceCounts.other },
];
const hasSourceData = sourcesData.some((s) => s.value > 0);

const [activeStage, setActiveStage] = useState<LifecycleStage | null>(null);
const [panelOpen, setPanelOpen] = useState(false);
const navigate = useNavigate();

const labelFrom = (s: LifecycleStage) =>
  s === "qualifying" ? "Qualifying" :
  s === "qualified" ? "Qualified" :
  s === "won" ? "Won" :
  s === "lost" ? "Lost" : "Unqualified";

const euro = (v: number) => `€${v.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Sales performance insights</p>
      </header>

      {/* Top KPIs */}
<section>
        <div className="flex gap-4 overflow-x-auto pb-1 sm:pb-2 md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-4 md:overflow-visible">
          <Card onClick={() => navigate('/pipeline?filter=decided')} className="min-w-[200px] sm:min-w-[220px] md:min-w-0 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Closing Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.closingRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">vs last month</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate('/pipeline?filter=thisMonth&stage=closed-won')} className="min-w-[200px] sm:min-w-[220px] md:min-w-0 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{euro(kpis.revenueThisMonth)}</div>
              <p className="text-xs text-muted-foreground">vs last month</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate('/pipeline?filter=thisMonth&stage=closed-won')} className="min-w-[200px] sm:min-w-[220px] md:min-w-0 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Deals Won (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.dealsWonThisMonth}</div>
              <p className="text-xs text-muted-foreground">total this month</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate('/pipeline?filter=thisMonth&stage=active')} className="min-w-[200px] sm:min-w-[220px] md:min-w-0 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Forecasted Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{euro(kpis.forecastedRevenue)}</div>
              <p className="text-xs text-muted-foreground">expected to close this month</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate('/calendar?view=month')} className="min-w-[200px] sm:min-w-[220px] md:min-w-0 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Task Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(taskCompletionRate)}%</div>
              <p className="text-xs text-muted-foreground">{doneThisMonth.length} / {tasksThisMonth.length} tasks</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] sm:min-w-[220px] md:min-w-0 cursor-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg. Sales Cycle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageSalesCycleDays}d</div>
              <p className="text-xs text-muted-foreground">won deals only</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Leads & Clients Lifecycle */}
      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leads & Clients Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Distribution of your contacts by lifecycle stage.
            </p>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm">
                <span className="text-muted-foreground">Total contacts: </span>
                <span className="font-medium text-foreground">{totalContacts}</span>
              </p>
              {activeStage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full"
                  onClick={() => { setActiveStage(null); setPanelOpen(false); }}
                >
                  Clear filter
                </Button>
              )}
            </div>

            <ChartContainer
              config={{
                qualifying: { label: "Qualifying", color: "hsl(var(--warning))" },
                qualified: { label: "Qualified", color: "hsl(var(--primary))" },
                won: { label: "Won", color: "hsl(var(--success))" },
                lost: { label: "Lost", color: "hsl(var(--destructive))" },
                unqualified: { label: "Unqualified", color: "hsl(var(--muted-foreground))" },
              }}
              className="w-full"
            >
              <div className="w-full border rounded-md overflow-hidden bg-card">
                <div className="flex w-full h-10">
                  {lifecycleStages.map((stage) => {
                    const count = stageCounts[stage];
                    const pct = totalContacts ? (count / totalContacts) * 100 : 0;
                    const label = labelFrom(stage);
                    return (
                      <Tooltip key={stage}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="relative h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            style={{ width: `${pct}%`, backgroundColor: `var(--color-${stage})` }}
                            onClick={() => { setActiveStage(stage); setPanelOpen(true); }}
                            aria-label={`${label} ${Math.round(pct)}%`}
                          >
                            {pct >= 8 && (
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-background">
                                {label} {Math.round(pct)}%
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{label} {Math.round(pct)}%</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </ChartContainer>

            {/* Mobile legend */}
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              {lifecycleStages.map((stage) => {
                const count = stageCounts[stage];
                const pct = totalContacts ? Math.round((count / totalContacts) * 100) : 0;
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-[2px]"
                      style={{ backgroundColor: `var(--color-${stage})` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {labelFrom(stage)} {pct}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Side panel listing filtered contacts */}
            <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>
                    {activeStage ? `${labelFrom(activeStage)} contacts` : "Contacts"}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  {activeStage
                    ? contacts.filter((c) => c.lifecycle_stage === activeStage).map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md border p-2">
                          <span className="text-sm">{c.companyName || c.contactName || "—"}</span>
                          <span className="text-xs text-muted-foreground">{labelFrom(activeStage)}</span>
                        </div>
                      ))
                    : null}
                  {activeStage && contacts.filter((c) => c.lifecycle_stage === activeStage).length === 0 && (
                    <p className="text-sm text-muted-foreground">No contacts in this stage.</p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (activeStage) {
                        navigate(`/clients?lifecycle=${activeStage}`);
                      }
                    }}
                  >
                    Open in Contacts
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActiveStage(null);
                      setPanelOpen(false);
                    }}
                  >
                    Clear filter
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>
      </section>

      {/* Sales Activity & Task Completion */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card onClick={() => navigate('/calendar?status=done&range=4w')} className="cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sales Activity (Last 4 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                Calls: { label: "Calls", color: "hsl(var(--primary))" },
                Emails: { label: "Emails", color: "hsl(var(--warning))" },
                Meetings: { label: "Meetings", color: "hsl(var(--success))" },
              }}
              className="h-[240px]"
            >
              <BarChart data={salesActivityData} layout="vertical" margin={{ left: 24, right: 16 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="activity" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                  {salesActivityData.map((entry) => (
                    <Cell key={entry.activity} fill={
                      entry.activity === 'Calls' ? 'var(--color-Calls)' :
                      entry.activity === 'Emails' ? 'var(--color-Emails)' :
                      'var(--color-Meetings)'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card onClick={() => navigate('/calendar?view=month')} className="cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Task Completion (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{doneThisMonth.length} / {tasksThisMonth.length}</span>
            </div>
            <Progress value={Math.round(taskCompletionRate)} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{Math.round(taskCompletionRate)}% done</p>
          </CardContent>
        </Card>
      </section>

      {/* Middle: Graphs */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Revenue (Last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }}
              className="h-[280px]"
            >
              <BarChart data={revenueSeries}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deals Won/Lost (Last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ won: { label: "Won", color: "hsl(var(--success))" }, lost: { label: "Lost", color: "hsl(var(--destructive))" } }}
              className="h:[280px]"
            >
              <LineChart data={wonLostSeries}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="won" stroke="var(--color-won)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lost" stroke="var(--color-lost)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {/* Bottom: Pipeline Snapshot */}
      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                lead: { label: "Lead", color: "hsl(var(--muted-foreground))" },
                inProgress: { label: "In Progress", color: "hsl(var(--primary))" },
                proposal: { label: "Proposal Sent", color: "hsl(var(--warning))" },
                won: { label: "Won", color: "hsl(var(--success))" },
              }}
              className="h-[140px]"
            >
              <BarChart data={pipelineByStage} layout="vertical" margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="lead" stackId="a" fill="var(--color-lead)" />
                <Bar dataKey="inProgress" stackId="a" fill="var(--color-inProgress)" />
                <Bar dataKey="proposal" stackId="a" fill="var(--color-proposal)" />
                <Bar dataKey="won" stackId="a" fill="var(--color-won)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {/* Lead Source Breakdown (optional) */}
      {hasSourceData && (
        <section>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lead Source Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <PieChart width={280} height={220}>
                  <Pie data={sourcesData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {sourcesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.name === 'Referrals' ? 'hsl(var(--success))' :
                        entry.name === 'Website' ? 'hsl(var(--primary))' :
                        entry.name === 'Networking' ? 'hsl(var(--warning))' :
                        'hsl(var(--muted-foreground))'
                      } />
                    ))}
                  </Pie>
                </PieChart>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
