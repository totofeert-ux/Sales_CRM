
import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { 
  ArrowLeft,
  Edit3,
  Calendar,
  Briefcase,
  Phone,
  Mail,
  Building2,
  MapPin,
  FileText,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import { NewTaskModal } from "@/components/NewTaskModal"
import { useAddDealModal } from "@/hooks/use-add-deal-modal"
import { EditClientModal } from "@/components/EditClientModal"
import { useContacts, LifecycleStage } from "@/hooks/use-contacts"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { STAGE_LABELS, LIFECYCLE_STAGES, stageBadgeClasses } from "@/lib/lifecycle"
import { EmptyState } from "@/components/EmptyState"
import { supabase } from "@/integrations/supabase/client"
import { useTasks } from "@/hooks/use-tasks"
import { UpdateDealStageModal } from "@/components/UpdateDealStageModal"
import { dealStageBadgeClasses, DEAL_STAGE_OPTIONS } from "@/lib/deal-status"
import { useDeals } from "@/hooks/use-deals"

// Deal interface is now imported from useClientDeals hook

interface Task {
  id: string
  title: string
  due_at: string
  type: string
  priority: string
  status: string
  completed_at: string | null
  updated_at: string
}

interface HistoryEvent {
  id: string
  type: 'task' | 'deal'
  title: string
  date: string
  status?: string
}

const ClientDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("overview")
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState<{id: string, title: string, stage: string} | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const initRef = useRef(false)
  const componentId = useRef(Math.random().toString(36).substr(2, 9))
  
  console.log(`[ClientDetail-${componentId.current}] Component rendered with id:`, id)
  
  const { getById, updateLifecycle, updateContact } = useContacts()
  const { toast } = useToast()
  const { openAddDealModal } = useAddDealModal()
  const { deals: allDeals, loading: dealsLoading } = useDeals()
  
  // Filter deals for this client and add UI guard for deduplication
  const clientDeals = allDeals.filter(deal => deal.clientId === id)
  const deals = useMemo(() => {
    const seen = new Set<string>();
    return clientDeals.filter(d => !seen.has(d.id) && seen.add(d.id));
  }, [clientDeals]);

  const client = id ? getById(id) : undefined

  // Fetch tasks and build history (deals are handled by useClientDeals hook)
  const fetchClientData = async () => {
    if (!id) return
    
    // Prevent multiple simultaneous calls
    if (isFetching) {
      console.log(`[ClientDetail-${componentId.current}] fetchClientData already in progress, skipping`)
      return
    }
    
    console.log(`[ClientDetail-${componentId.current}] fetchClientData called for clientId:`, id)
    setIsFetching(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('[ClientDetail] Executing Supabase tasks query for user:', user.id, 'client:', id)
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id,title,due_at,type,priority,status,completed_at,updated_at')
        .eq('user_id', user.id)
        .eq('client_id', id)
        .order('due_at', { ascending: true, nullsFirst: true })

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError)
        toast({ 
          title: "Error fetching tasks", 
          description: tasksError.message,
          variant: "destructive" 
        })
      } else {
        setTasks(tasksData || [])
      }

      // Build history from deals (from hook) and tasks
      const historyEvents: HistoryEvent[] = []
      
      // Add deals to history (from hook state)
      deals.forEach(deal => {
        historyEvents.push({
          id: deal.id,
          type: 'deal',
          title: deal.title,
          date: deal.updated_at,
          status: deal.status
        })
      })

      // Add tasks to history
      if (tasksData) {
        tasksData.forEach(task => {
          historyEvents.push({
            id: task.id,
            type: 'task',
            title: task.title,
            date: task.completed_at || task.updated_at,
            status: task.status
          })
        })
      }

      // Sort by date descending
      historyEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setHistory(historyEvents)

    } catch (error) {
      console.error('Error fetching client data:', error)
      toast({ 
        title: "Error", 
        description: "Failed to load client data",
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    console.log(`[ClientDetail-${componentId.current}] useEffect triggered for id:`, id)
    
    // Reset initRef when id changes
    initRef.current = false
    
    console.log('[ClientDetail] Initializing fetchClientData for id:', id)
    fetchClientData()
  }, [id])
  
  // Track deals state changes from hook
  useEffect(() => {
    console.log(`[ClientDetail] rendering, deals=${deals.length}`)
    console.log(`[ClientDetail-${componentId.current}] deals state changed:`, deals.length, 'deals:', deals.map(d => ({ id: d.id, title: d.title })))
    // Rebuild history when deals change
    if (deals.length > 0 || tasks.length > 0) {
      fetchClientData()
    }
  }, [deals])

  // Update loading state based on both deals and tasks
  useEffect(() => {
    setLoading(dealsLoading || isFetching)
  }, [dealsLoading, isFetching])

  const handleTaskComplete = async (taskId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'done', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', taskId)
        .eq('user_id', user.id)

      if (error) throw error

      toast({ title: "Task completed" })
      fetchClientData() // Refresh data
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      })
    }
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Client not found</p>
        <Button onClick={() => navigate("/clients")} className="mt-4">
          Back to Contacts
        </Button>
      </div>
    )
  }

  const getStatusDisplay = (status: string) => {
    return DEAL_STAGE_OPTIONS.find(s => s.value === status)?.label || status
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "won":
      case "completed":
        return "bg-success text-success-foreground"
      case "in progress":
      case "pending":
        return "bg-warning text-warning-foreground"
      case "negotiation":
        return "bg-primary text-primary-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground"
      case "medium": 
        return "bg-warning text-warning-foreground"
      case "low":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "meeting":
        return <Users className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                {client.companyName}
                <Badge className={`px-3 py-1 text-sm ${stageBadgeClasses(client.lifecycle_stage as LifecycleStage)}`}>
                  {STAGE_LABELS[client.lifecycle_stage as LifecycleStage]}
                </Badge>
              </h1>
              <p className="text-muted-foreground">{client.contactName}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsTaskModalOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Add Task
              </Button>
              <Button 
                size="sm"
                onClick={() => openAddDealModal({ 
                  clientId: client.id, 
                  clientName: client.companyName
                  // No onSaved callback - rely on realtime subscription
                })}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Add Deal
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Tags + Stage */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="sm:ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Stage</span>
          <Select
            value={(client.lifecycle_stage as LifecycleStage) || "qualifying"}
            onValueChange={(v) => {
              updateLifecycle(client.id, v as LifecycleStage)
              toast({ title: "Stage updated", description: `Set to ${STAGE_LABELS[v as LifecycleStage]}` })
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {LIFECYCLE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="interactions">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
                 <div className="flex items-center gap-3">
                   <Building2 className="h-4 w-4 text-muted-foreground" />
                   <div>
                     <p className="text-sm text-muted-foreground">Company</p>
                     <p className="font-medium">{client.companyName}</p>
                   </div>
                 </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{deals.length}</p>
                    <p className="text-sm text-muted-foreground">Total Deals</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-success">
                      €{deals.reduce((sum, deal) => sum + deal.amount, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-lg font-bold">{tasks.filter(t => t.status === "todo").length}</p>
                  <p className="text-sm text-muted-foreground">Pending Tasks</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {client.contactName && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">Contact for {client.companyName}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading deals...</p>
            </div>
          ) : deals.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No deals yet"
              description="Create a deal to track opportunities for this contact."
              action={{
                label: "Add Deal",
                onClick: () => openAddDealModal({ 
                  clientId: client.id, 
                  clientName: client.companyName
                  // No onSaved callback - rely on realtime subscription
                })
              }}
            />
          ) : (
            <>
              {console.log('[ClientDetail] Rendering deals:', deals.length, 'deals:', deals.map(d => ({ id: d.id, title: d.title })))}
              {deals.map((deal, index) => {
                console.log(`[ClientDetail] Rendering deal ${index}:`, { id: deal.id, title: deal.title })
                return (
                <Card key={deal.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{deal.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>€{deal.amount.toLocaleString()}</span>
                          <span>•</span>
                          <span>Close: {new Date(deal.expected_close_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`cursor-pointer hover:opacity-80 ${dealStageBadgeClasses(deal.status as any)}`}
                          onClick={() => setSelectedDeal({id: deal.id, title: deal.title, stage: deal.status})}
                        >
                          {getStatusDisplay(deal.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No tasks"
              description="Plan your next action with this contact."
              action={{
                label: "Add Task",
                onClick: () => setIsTaskModalOpen(true)
              }}
            />
          ) : (
            tasks.map(task => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => task.status === 'todo' && handleTaskComplete(task.id)}
                        disabled={task.status !== 'todo'}
                        className="cursor-pointer disabled:cursor-default"
                      >
                        {task.status === "done" ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                      <div>
                        <h3 className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(task.due_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="interactions" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No history yet"
              description="When you add tasks or deals, updates will appear here."
            />
          ) : (
            history.map(event => (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-muted rounded-full p-2 mt-1">
                      {event.type === 'task' ? (
                        <Calendar className="h-4 w-4" />
                      ) : (
                        <Briefcase className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        {event.status && (
                          <Badge className={`text-xs ${getStatusColor(getStatusDisplay(event.status))}`}>
                            {getStatusDisplay(event.status)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Task Modal */}
      <NewTaskModal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        prefilledClientId={client.id}
        prefilledClientName={client.companyName}
        onSaved={fetchClientData}
      />


      {/* Edit Client Modal */}
      <EditClientModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={{
          id: client.id,
          companyName: client.companyName || '',
          contactName: client.contactName || '',
          email: client.email || '',
          phone: client.phone || '',
          sector: 'Technology', // Default sector since it's not in Contact interface
          tags: client.tags || [],
          lifecycle_stage: client.lifecycle_stage
        }}
        onSave={(updatedClient) => {
          updateContact(updatedClient.id, {
            id: updatedClient.id,
            companyName: updatedClient.companyName,
            contactName: updatedClient.contactName,
            email: updatedClient.email,
            phone: updatedClient.phone,
            tags: updatedClient.tags,
            lifecycle_stage: updatedClient.lifecycle_stage
          })
          setIsEditModalOpen(false)
        }}
      />

      {selectedDeal && (
        <UpdateDealStageModal
          dealId={selectedDeal.id}
          currentStage={selectedDeal.stage as any}
          dealTitle={selectedDeal.title}
          open={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onSuccess={() => {
            // Rely on realtime subscription to update the deal
            console.log('[ClientDetail] Deal stage updated, waiting for realtime update');
          }}
        />
      )}
    </div>
  )
}

export default ClientDetail
