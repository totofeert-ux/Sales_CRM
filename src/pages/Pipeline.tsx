import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Filter } from "lucide-react"
import { DealTable } from "@/components/DealTable"
import { useAddDealModal } from "@/hooks/use-add-deal-modal"
import { DealDetailsModal } from "@/components/DealDetailsModal"
import { useDeals } from "@/hooks/use-deals"
import { useContacts } from "@/hooks/use-contacts"
import { useToast } from "@/hooks/use-toast"
import { recomputeContactLifecycle } from "@/lib/lifecycle-automation"
import { UpdateDealStageModal } from "@/components/UpdateDealStageModal"
import { DEAL_STAGE_OPTIONS, dealStageBadgeClasses, isOpenDealStage } from "@/lib/deal-status"


export default function Pipeline() {
  const { deals, updateDeal } = useDeals()
  const { getById, updateLifecycle } = useContacts()
  const { toast } = useToast()
  const { openAddDealModal } = useAddDealModal()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState("all")
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const [stageEditDeal, setStageEditDeal] = useState<{id: string, title: string, stage: string} | null>(null)

  // UI guard: dedupe by id before mapping (safety net)
  const uniqueDeals = useMemo(() => {
    const seen = new Set<string>();
    return deals.filter(d => !seen.has(d.id) && seen.add(d.id));
  }, [deals]);

  const dealsWithDate = useMemo(() => uniqueDeals.map(d => ({
    ...d,
    expectedCloseDate: new Date(d.expectedCloseDate)
  })), [uniqueDeals])

  const filteredDeals = dealsWithDate.filter(deal => {
    const matchesSearch = deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterBy === "all") return matchesSearch
    if (filterBy === "active") {
      return matchesSearch && isOpenDealStage(deal.stage as any)
    }
    if (filterBy === "overdue") {
      const isOverdue = deal.expectedCloseDate < new Date()
      return matchesSearch && isOverdue && isOpenDealStage(deal.stage as any)
    }
    if (filterBy === "thisWeek") {
      const oneWeekFromNow = new Date()
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
      return matchesSearch && deal.expectedCloseDate <= oneWeekFromNow
    }
    if (filterBy === "thisMonth") {
      const oneMonthFromNow = new Date()
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
      return matchesSearch && deal.expectedCloseDate <= oneMonthFromNow
    }
    return matchesSearch
  })

  const handleDealMove = (dealId: string, newStage: string) => {
    // Update stage
    updateDeal(dealId, { stage: newStage as any })
    // Recompute lifecycle for the linked contact using updated snapshot
    const deal = uniqueDeals.find(d => d.id === dealId)
    if (deal) {
      const updatedDeals = uniqueDeals.map(d => d.id === dealId ? { ...d, stage: newStage as any } : d)
      recomputeContactLifecycle({
        contactId: deal.clientId,
        allDeals: updatedDeals.map(d => ({ clientId: d.clientId, stage: d.stage })) as any,
        getContactStage: (id) => getById(id)?.lifecycle_stage,
        updateLifecycle,
        toast: (opts) => toast({ title: opts.title, description: opts.description }),
      })
    }
  }

  const handleDealClick = (deal: any) => {
    setSelectedDeal(deal)
  }

  const handleEditDeal = (deal: any) => {
    // TODO: Open edit modal
    console.log('Edit deal:', deal)
  }

  const handleMarkWon = (deal: any) => {
    updateDeal(deal.id, { stage: 'Won' as any })
    const updatedDeals = uniqueDeals.map(d => d.id === deal.id ? { ...d, stage: 'Won' as any } : d)
    recomputeContactLifecycle({
      contactId: deal.clientId,
      allDeals: updatedDeals.map(d => ({ clientId: d.clientId, stage: d.stage })) as any,
      getContactStage: (id) => getById(id)?.lifecycle_stage,
      updateLifecycle,
      toast: (opts) => toast({ title: opts.title, description: opts.description }),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground text-sm">
            Manage your deals through the sales process
          </p>
        </div>
        
        <Button onClick={() => openAddDealModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals by name or client"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deals</SelectItem>
              <SelectItem value="active">Active Deals</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Deal Table */}
      <div className="flex-1">
        <DealTable 
          deals={filteredDeals as any}
          allDeals={dealsWithDate as any}
          filterBy={filterBy}
          onDealClick={handleDealClick}
          onEditDeal={handleEditDeal}
          onMarkWon={handleMarkWon}
          onFilterChange={setFilterBy}
        />
      </div>

      {selectedDeal && (
        <DealDetailsModal
          deal={selectedDeal}
          open={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}

      {stageEditDeal && (
        <UpdateDealStageModal
          dealId={stageEditDeal.id}
          currentStage={stageEditDeal.stage as any}
          dealTitle={stageEditDeal.title}
          open={!!stageEditDeal}
          onClose={() => setStageEditDeal(null)}
          onSuccess={() => {
            setStageEditDeal(null)
          }}
        />
      )}
    </div>
  )
}