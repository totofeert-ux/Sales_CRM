import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2,
  Edit3,
  Clock,
  Phone,
  FileText,
  Mail,
  Plus
} from "lucide-react"
import { useTasks } from "@/hooks/use-tasks"
import { useContacts } from "@/hooks/use-contacts"
import { format, startOfDay, endOfDay } from "date-fns"
import { EmptyState } from "./EmptyState"
import { useState } from "react"
import { NewTaskModal } from "./NewTaskModal"

const getTaskIcon = (type: string) => {
  switch (type) {
    case "meeting": return Phone
    case "task": return FileText
    default: return CheckCircle2
  }
}

const priorityColors = {
  high: "destructive",
  medium: "secondary",
  low: "secondary"
} as const

export function TodoToday() {
  const { tasks, toggleStatus } = useTasks()
  const { getById: getContact } = useContacts()
  const [openNewTask, setOpenNewTask] = useState(false)

  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)

  const todayTasks = tasks
    .filter(task => {
      const dueDate = new Date(task.dueAt)
      return task.status === 'pending' && 
             dueDate >= startOfToday && 
             dueDate <= endOfToday
    })
    .sort((a, b) => {
      // Sort by priority (high first) then by due time
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority] || 1
      const bPriority = priorityOrder[b.priority] || 1
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    })
    .slice(0, 4)

  return (
    <>
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            À faire aujourd'hui
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayTasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing due today"
              description="You're all caught up! No tasks are due today."
              action={{
                label: "Add Task",
                onClick: () => setOpenNewTask(true)
              }}
            />
          ) : (
            todayTasks.map((task) => {
              const TaskIcon = getTaskIcon(task.type)
              const contact = task.clientId ? getContact(task.clientId) : null
              const dueTime = format(new Date(task.dueAt), "HH:mm")
              
              return (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TaskIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {contact?.companyName || contact?.contactName || "No client"}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-primary font-medium">{dueTime}</span>
                      </div>
                    </div>
                    <Badge variant={priorityColors[task.priority]} className="text-xs capitalize">
                      {task.priority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0"
                      onClick={() => toggleStatus(task.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
      
      <NewTaskModal 
        open={openNewTask} 
        onClose={() => setOpenNewTask(false)} 
      />
    </>
  )
}