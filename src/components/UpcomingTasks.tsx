import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, CalendarDays, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTasks } from "@/hooks/use-tasks"
import { useContacts } from "@/hooks/use-contacts"
import { format, addDays, endOfDay } from "date-fns"
import { EmptyState } from "./EmptyState"
import { useState } from "react"
import { NewTaskModal } from "./NewTaskModal"

const priorityColors = {
  high: "destructive",
  medium: "secondary",
  low: "secondary"
} as const

export function UpcomingTasks() {
  const { tasks } = useTasks()
  const { getById: getContact } = useContacts()
  const navigate = useNavigate()
  const [openNewTask, setOpenNewTask] = useState(false)

  const now = new Date()
  const next7Days = endOfDay(addDays(now, 7))
  
  const upcoming = tasks
    .filter(t => {
      const dueDate = new Date(t.dueAt)
      return t.status === "pending" && dueDate > now && dueDate <= next7Days
    })
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Upcoming Tasks & Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming tasks"
              description="No tasks scheduled for the next 7 days."
              action={{
                label: "Add Task",
                onClick: () => setOpenNewTask(true)
              }}
            />
          ) : (
            upcoming.map((task) => {
              const contact = task.clientId ? getContact(task.clientId) : null
              
              return (
                <div
                  key={task.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate("/calendar")}
                >
                  <Checkbox checked={task.status === "done"} className="mt-1" disabled />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium truncate">{task.title}</h4>
                      <Badge variant={priorityColors[task.priority]} className="text-xs capitalize">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">
                        {contact?.companyName || contact?.contactName || "No client"} • {task.type === "meeting" ? "Meeting" : "Task"}
                      </span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.dueAt), "PPp")}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          <div className="pt-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/calendar")}>
              View All Tasks
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <NewTaskModal 
        open={openNewTask} 
        onClose={() => setOpenNewTask(false)} 
      />
    </>
  )
}
