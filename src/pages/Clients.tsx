import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Search, 
  Plus, 
  Eye, 
  Calendar,
  Filter,
  Building2,
  Users,
  ChevronDown,
  ArrowUpDown
} from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { NewClientModal } from "@/components/NewClientModal"
import { NewTaskModal } from "@/components/NewTaskModal"
import { useContacts, LifecycleStage, type Contact } from "@/hooks/use-contacts"
import { LIFECYCLE_STAGES, STAGE_LABELS } from "@/lib/lifecycle"
import { stageBadgeClasses } from "@/lib/lifecycle"
import { useToast } from "@/hooks/use-toast"
import { SavedViewsBar } from "@/components/clients/SavedViewsBar"
import { useSavedViews } from "@/hooks/use-saved-views"

// Using contacts from shared store via useContacts hook



type SortOption = "az" | "recent" | "activity"

const sortOptions = [
  { value: "az" as const, label: "A–Z" },
  { value: "recent" as const, label: "Recently Added" },
  { value: "activity" as const, label: "Last Activity" },
]

const Clients = () => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [searchQuery, setSearchQuery] = useState("")
  
  const [sortBy, setSortBy] = useState<SortOption>("az")
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ReturnType<typeof useContacts>["contacts"][number] | null>(null)
  const { contacts, loading, updateLifecycle } = useContacts()
  const { toast } = useToast()
  const [selectedStages, setSelectedStages] = useState<LifecycleStage[]>([])

  const {
    views,
    addView,
    renameView,
    deleteView,
    updateViewStages,
    getViewById,
  } = useSavedViews()

  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)

  // Filter and sort contacts
  const filteredClients = contacts
    .filter(client => {
      const matchesSearch = 
        (client.companyName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.contactName || "").toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStages = selectedStages.length === 0 || selectedStages.includes(client.lifecycle_stage)
      
      return matchesSearch && matchesStages
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "az":
          return (a.companyName || "").localeCompare(b.companyName || "")
        case "recent":
          return 0
        case "activity":
          return 0
        default:
          return (a.companyName || "").localeCompare(b.companyName || "")
      }
    })


  // Helper to compare stages regardless of order
  const stagesEqual = (a: LifecycleStage[], b: LifecycleStage[]) => {
    if (a.length !== b.length) return false
    const sa = [...a].sort()
    const sb = [...b].sort()
    return sa.every((v, i) => v === sb[i])
  }

  // Keep selectedViewId in sync with current filters
  useEffect(() => {
    const match = views.find((v) => stagesEqual(v.stages, selectedStages))
    setSelectedViewId(match ? match.id : null)
  }, [selectedStages, views])

  const handleViewClient = (clientId: string) => {
    navigate(`/clients/${clientId}`)
  }

  const handleAddTask = (client: Contact) => {
    setSelectedClient(client)
    setIsTaskModalOpen(true)
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground text-sm">
            Manage your contacts
          </p>
        </div>
        <Button onClick={() => setIsNewClientModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Contact
        </Button>
      </div>

      {/* Saved Views */}
      <SavedViewsBar
        views={views}
        selectedViewId={selectedViewId}
        currentSelectedStages={selectedStages}
        onSelect={(id) => {
          if (id) {
            const view = getViewById(id)
            if (view) {
              setSelectedStages(view.stages)
              setSelectedViewId(id)
            }
          } else {
            setSelectedStages([])
            setSelectedViewId(null)
          }
        }}
        onCreate={(name) => {
          addView(name, selectedStages)
        }}
        onRename={renameView}
        onDelete={(id) => {
          if (selectedViewId === id) setSelectedViewId(null)
          deleteView(id)
        }}
        onUpdateStages={(id) => updateViewStages(id, selectedStages)}
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-fit">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map(option => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={sortBy === option.value ? "bg-accent" : ""}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filters dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-fit">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {selectedStages.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {selectedStages.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by stage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LIFECYCLE_STAGES.map(stage => (
                <div key={stage} className="flex items-center space-x-2 px-2 py-1.5">
                  <Checkbox
                    id={stage}
                    checked={selectedStages.includes(stage)}
                    onCheckedChange={() =>
                      setSelectedStages(prev =>
                        prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
                      )
                    }
                  />
                  <label htmlFor={stage} className="text-sm cursor-pointer flex-1">
                    {STAGE_LABELS[stage]}
                  </label>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      ) : filteredClients.length === 0 && searchQuery === "" && selectedStages.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to start managing your relationships."
          action={{
            label: "Add Your First Contact",
            onClick: () => setIsNewClientModalOpen(true)
          }}
        />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No contacts match your search"
          description="Try adjusting your search criteria or filters."
        />
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Client Info */}
                  <div className="space-y-3 flex-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h3 className="font-semibold text-lg leading-tight">{client.companyName}</h3>
                      </div>
                      <p className="text-muted-foreground">{client.contactName}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Last Activity: </span>
                        <span className="font-medium">{client.lastActivity}</span>
                      </div>
                      
                      {/* Tags */}
                    </div>
                  </div>

                  {/* Right side: stage + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Stage badge (click to edit) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div>
                          <Badge className={`${stageBadgeClasses(client.lifecycle_stage)} text-xs cursor-pointer`}>
                            {STAGE_LABELS[client.lifecycle_stage]}
                          </Badge>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel>Change Stage</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {LIFECYCLE_STAGES.map((stage) => (
                          <DropdownMenuItem
                            key={stage}
                            onClick={() => {
                              updateLifecycle(client.id, stage)
                              toast({ title: "Stage updated", description: `Set to ${STAGE_LABELS[stage]}` })
                            }}
                          >
                            {STAGE_LABELS[stage]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewClient(client.id)}
                        className="min-h-[40px] px-4"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTask(client)}
                        className="min-h-[40px] px-4"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewClientModal 
        open={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
      />

      <NewTaskModal
        open={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setSelectedClient(null)
        }}
        prefilledClientId={selectedClient?.id}
        prefilledClientName={selectedClient?.companyName}
      />
    </div>
  )
}

export default Clients