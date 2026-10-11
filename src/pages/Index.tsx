import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TodoToday } from "@/components/TodoToday"
import { UpcomingTasks } from "@/components/UpcomingTasks"
import { RecentActivity } from "@/components/RecentActivity"
import { FloatingActionButton } from "@/components/FloatingActionButton"
import { NewTaskModal } from "@/components/NewTaskModal"
import { NewClientModal } from "@/components/NewClientModal"
import { useAddDealModal } from "@/hooks/use-add-deal-modal"
import { useTasks } from "@/hooks/use-tasks"
import { useIsMobile } from "@/hooks/use-mobile"

import { Briefcase, CalendarCheck, AlertTriangle, DollarSign, Plus, UserPlus, CheckSquare, Bug } from "lucide-react"
import { useDeals } from "@/hooks/use-deals"

const Index = () => {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { tasks } = useTasks()
  const { deals } = useDeals()
  const { openAddDealModal } = useAddDealModal()


  // Quick action modals
  const [openTask, setOpenTask] = useState(false)
  const [openContact, setOpenContact] = useState(false)

  // KPI calculations (lightweight demo values for deals)
  const now = new Date()
  const overdueTasks = useMemo(() => tasks.filter(t => t.status === "pending" && new Date(t.dueAt) < now), [tasks])

  const kpis = useMemo(() => {
    const isOpen = (stage: string) => !["closed-won", "closed-lost"].includes(stage)
    const openDeals = deals.filter(d => isOpen(d.stage))
    const openDealsCount = openDeals.length
    const openDealsValue = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0)

    const nowDate = new Date()
    const month = nowDate.getMonth()
    const year = nowDate.getFullYear()
    const closingThisMonth = openDeals.filter(d => {
      const dt = new Date(d.expectedCloseDate)
      return dt.getMonth() === month && dt.getFullYear() === year
    })
    const closingThisMonthCount = closingThisMonth.length
    const closingThisMonthValue = closingThisMonth.reduce((sum, d) => sum + (d.amount || 0), 0)

    const pipelineValue = openDealsValue

    return [
      {
        title: "Open Deals",
        value: `${openDealsCount}`,
        sub: `€${openDealsValue.toLocaleString()}`,
        icon: Briefcase,
        onClick: () => navigate("/pipeline"),
      },
      {
        title: "Closing This Month",
        value: `${closingThisMonthCount}`,
        sub: `€${closingThisMonthValue.toLocaleString()}`,
        icon: CalendarCheck,
        onClick: () => navigate("/pipeline"),
      },
      {
        title: "Overdue Tasks",
        value: `${overdueTasks.length}`,
        sub: "Click to review",
        icon: AlertTriangle,
        onClick: () => navigate("/calendar"),
      },
      {
        title: "Pipeline Value",
        value: `€${pipelineValue.toLocaleString()}`,
        sub: "Current opportunities",
        icon: DollarSign,
        onClick: () => navigate("/pipeline"),
      },
    ]
  }, [navigate, overdueTasks.length, deals])

  // Alerts: urgent follow-ups (overdue tasks)
  const urgentTasks = overdueTasks
    .slice()
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Header + Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm">Vos actions prioritaires du jour</p>
          {import.meta.env.MODE === 'development' && (
            <div className="mt-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => navigate("/dev/client-deals-debug")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Bug className="h-3 w-3 mr-1" />
                Debug Client Deals
              </Button>
            </div>
          )}
        </div>
        {!isMobile && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setOpenTask(true)}>
              <CheckSquare className="h-4 w-4 mr-2" /> Add Task
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setOpenContact(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Add Contact
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAddDealModal()}>
              <Plus className="h-4 w-4 mr-2" /> Add Deal
            </Button>
          </div>
        )}
      </div>

      {/* 1) Today */}
      <TodoToday />

      {/* 2) KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="cursor-pointer hover:shadow-md transition-shadow" onClick={kpi.onClick}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <kpi.icon className="h-4 w-4 text-primary" />
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main + Alerts layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* 1.5) Upcoming Tasks & Meetings */}
          <UpcomingTasks />

          {/* 3) Recent Activity Feed */}
          <RecentActivity />
        </div>

        {/* 4) Alerts / Red Flags */}
        <div className="lg:col-span-4">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Alerts / Red Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No urgent items. You're all caught up!</div>
              ) : (
                urgentTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-md border bg-destructive/5 hover:bg-destructive/10 cursor-pointer"
                    onClick={() => navigate("/calendar")}
                  >
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Due {new Date(t.dueAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile FAB */}
      <FloatingActionButton />

      {/* Quick Action Modals */}
      <NewTaskModal open={openTask} onClose={() => setOpenTask(false)} />
      <NewClientModal open={openContact} onClose={() => setOpenContact(false)} />
    </div>
  )
}

export default Index
