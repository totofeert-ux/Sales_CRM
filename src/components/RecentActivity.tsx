import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar,
  CheckCircle,
  DollarSign,
  Activity
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTasks } from "@/hooks/use-tasks"
import { useDeals } from "@/hooks/use-deals"
import { useContacts } from "@/hooks/use-contacts"
import { formatDistanceToNow } from "date-fns"
import { useMemo } from "react"
import { EmptyState } from "./EmptyState"

const statusColors = {
  completed: "default",
  done: "default",
  won: "default",
  "closed-won": "default",
  todo: "secondary",
  pending: "secondary"
} as const

export function RecentActivity() {
  const { tasks } = useTasks()
  const { deals } = useDeals()
  const { contacts, getById: getContact } = useContacts()
  const navigate = useNavigate()

  const activities = useMemo(() => {
    const items: Array<{
      id: string
      type: "task" | "deal" | "contact"
      title: string
      description: string
      time: string
      clientName: string
      status: string
      icon: typeof CheckCircle
      updatedAt: Date
    }> = []

    // Recent completed tasks
    const recentTasks = tasks
      .filter(task => task.status === "done")
      .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime())
      .slice(0, 3)

    recentTasks.forEach(task => {
      const contact = task.clientId ? getContact(task.clientId) : null
      items.push({
        id: task.id,
        type: "task",
        title: `Completed: ${task.title}`,
        description: task.type === "meeting" ? "Meeting completed" : "Task completed",
        time: formatDistanceToNow(new Date(task.dueAt), { addSuffix: true }),
        clientName: contact?.companyName || contact?.contactName || "No client",
        status: "done",
        icon: task.type === "meeting" ? Calendar : CheckCircle,
        updatedAt: new Date(task.dueAt)
      })
    })

    // Recent deals
    const recentDeals = deals
      .sort((a, b) => new Date(b.expectedCloseDate).getTime() - new Date(a.expectedCloseDate).getTime())
      .slice(0, 3)

    recentDeals.forEach(deal => {
      items.push({
        id: deal.id,
        type: "deal",
        title: deal.stage === "Won" ? `Deal won: ${deal.title}` : `Deal updated: ${deal.title}`,
        description: `€${deal.amount.toLocaleString()} • ${deal.stage.replace('-', ' ')}`,
        time: formatDistanceToNow(new Date(deal.expectedCloseDate), { addSuffix: true }),
        clientName: deal.clientName,
        status: deal.stage,
        icon: DollarSign,
        updatedAt: new Date(deal.expectedCloseDate)
      })
    })

    // Recent contacts
    const recentContacts = contacts
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 2)

    recentContacts.forEach(contact => {
      items.push({
        id: contact.id,
        type: "contact",
        title: `Contact updated: ${contact.companyName || contact.contactName}`,
        description: `Lifecycle: ${contact.lifecycle_stage}`,
        time: formatDistanceToNow(new Date(contact.updatedAt || 0), { addSuffix: true }),
        clientName: contact.companyName || contact.contactName || "Unnamed",
        status: contact.lifecycle_stage,
        icon: MessageSquare,
        updatedAt: new Date(contact.updatedAt || 0)
      })
    })

    return items
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10)
  }, [tasks, deals, contacts, getContact])

  const goTo = (type: string) => {
    if (type === "deal") navigate("/pipeline")
    else if (type === "task") navigate("/calendar")
    else navigate("/clients")
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Activity will appear here as you work with tasks, deals, and contacts."
          />
        ) : (
          activities.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => goTo(activity.type)}
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <activity.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{activity.title}</h4>
                  <Badge variant={statusColors[activity.status as keyof typeof statusColors] || "secondary"} className="text-xs">
                    {activity.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium">{activity.clientName}</span>
                  <span className="text-muted-foreground">{activity.time}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}