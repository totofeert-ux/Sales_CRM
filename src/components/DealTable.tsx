import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ArrowUpDown, ArrowUp, ArrowDown, Edit, CheckCircle, Calendar, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DEAL_STAGE_OPTIONS, dealStageBadgeClasses } from "@/lib/deal-status"

interface Deal {
  id: string
  title: string
  amount: number
  stage: string
  expectedCloseDate: Date
  clientId: string
  clientName: string
  notes?: string
}

interface DealTableProps {
  deals: Deal[]
  allDeals: Deal[]
  filterBy: string
  onDealClick: (deal: Deal) => void
  onEditDeal?: (deal: Deal) => void
  onMarkWon?: (deal: Deal) => void
  onFilterChange: (filter: string) => void
}

type SortField = 'title' | 'clientName' | 'amount' | 'stage' | 'expectedCloseDate'
type SortDirection = 'asc' | 'desc' | null

// Helper function to get stage label
const getStageLabel = (stage: string) => {
  return DEAL_STAGE_OPTIONS.find(s => s.value === stage)?.label || stage;
}

export function DealTable({ deals, allDeals, filterBy, onDealClick, onEditDeal, onMarkWon, onFilterChange }: DealTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')
      if (sortDirection === 'desc') {
        setSortField(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedDeals = [...deals].sort((a, b) => {
    if (!sortField || !sortDirection) return 0

    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    if (sortField === 'expectedCloseDate') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
  }

  const isOverdue = (date: Date) => date < new Date()

  const getTotalPipelineValue = () => {
    return allDeals
      .filter(deal => !["closed-won", "closed-lost"].includes(deal.stage))
      .reduce((total, deal) => total + deal.amount, 0)
  }

  const getActiveDealsCount = () => {
    return allDeals.filter(deal => ["lead", "in-progress", "proposal-sent"].includes(deal.stage)).length
  }

  const getOverdueDealsCount = () => {
    return allDeals.filter(deal => {
      const isOverdueDeal = isOverdue(deal.expectedCloseDate)
      const isNotClosed = !["closed-won", "closed-lost"].includes(deal.stage)
      return isOverdueDeal && isNotClosed
    }).length
  }

  const getTotalDealsCount = () => {
    return allDeals.length
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-md">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Pipeline Value</p>
              <p className="text-lg font-bold">{formatAmount(getTotalPipelineValue())}</p>
            </div>
          </div>
        </Card>
        <Card 
          className={cn(
            "p-4 cursor-pointer transition-colors hover:bg-muted/50",
            filterBy === "active" && "ring-2 ring-primary"
          )}
          onClick={() => onFilterChange(filterBy === "active" ? "all" : "active")}
        >
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 rounded-md">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Deals</p>
              <p className="text-lg font-bold">{getActiveDealsCount()}</p>
            </div>
          </div>
        </Card>
        <Card 
          className={cn(
            "p-4 cursor-pointer transition-colors hover:bg-muted/50",
            filterBy === "overdue" && "ring-2 ring-primary",
            getOverdueDealsCount() > 0 && "border-destructive"
          )}
          onClick={() => onFilterChange(filterBy === "overdue" ? "all" : "overdue")}
        >
          <div className="flex items-center space-x-2">
            <div className={cn(
              "p-2 rounded-md",
              getOverdueDealsCount() > 0 ? "bg-destructive/10" : "bg-orange-100"
            )}>
              <Calendar className={cn(
                "h-4 w-4",
                getOverdueDealsCount() > 0 ? "text-destructive" : "text-orange-600"
              )} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overdue Deals</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{getOverdueDealsCount()}</p>
                {getOverdueDealsCount() > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-5">
                    !
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-slate-100 rounded-md">
              <DollarSign className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Number of Deals</p>
              <p className="text-lg font-bold">{getTotalDealsCount()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter indicator */}
      {filterBy !== "all" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">
            Filtered by: <span className="font-medium">{
              filterBy === "active" ? "Active Deals" : 
              filterBy === "overdue" ? "Overdue Deals" : 
              filterBy
            }</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onFilterChange("all")}
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* Deals Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 font-semibold text-left justify-start"
                  onClick={() => handleSort('title')}
                >
                  Deal Name
                  {getSortIcon('title')}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 font-semibold text-left justify-start"
                  onClick={() => handleSort('clientName')}
                >
                  Client
                  {getSortIcon('clientName')}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 font-semibold text-left justify-start"
                  onClick={() => handleSort('amount')}
                >
                  Amount
                  {getSortIcon('amount')}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 font-semibold text-left justify-start"
                  onClick={() => handleSort('stage')}
                >
                  Stage
                  {getSortIcon('stage')}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 font-semibold text-left justify-start"
                  onClick={() => handleSort('expectedCloseDate')}
                >
                  Expected Close
                  {getSortIcon('expectedCloseDate')}
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No deals found
                </TableCell>
              </TableRow>
            ) : (
              sortedDeals.map((deal) => (
                <TableRow 
                  key={deal.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onDealClick(deal)}
                >
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-semibold text-sm">{deal.title}</p>
                      {deal.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {deal.notes}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{deal.clientName}</TableCell>
                  <TableCell className="font-semibold text-sm">
                    {formatAmount(deal.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={dealStageBadgeClasses(deal.stage as any)}
                    >
                      {getStageLabel(deal.stage)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm",
                        isOverdue(deal.expectedCloseDate) ? "text-destructive font-medium" : "text-foreground"
                      )}>
                        {format(deal.expectedCloseDate, "MMM dd, yyyy")}
                      </span>
                      {isOverdue(deal.expectedCloseDate) && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-5">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEditDeal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditDeal(deal)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onMarkWon && deal.stage !== 'closed-won' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onMarkWon(deal)
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}