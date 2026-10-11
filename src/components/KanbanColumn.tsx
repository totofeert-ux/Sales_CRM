import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DealCard } from "./DealCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  titleColor: string
  deals: Deal[]
  dealCount: number
  totalAmount: number
  onDealClick: (deal: Deal) => void
  onEditDeal?: (deal: Deal) => void
  onMarkWon?: (deal: Deal) => void
}

export function KanbanColumn({ 
  id, 
  title, 
  color, 
  titleColor, 
  deals, 
  dealCount, 
  totalAmount, 
  onDealClick,
  onEditDeal,
  onMarkWon
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  })

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex flex-col h-full border-r border-border last:border-r-0">
      {/* Column Header */}
      <div className="p-4 border-b border-border bg-background">
        <h3 className={`text-sm font-semibold ${titleColor} mb-2`}>
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">
            {dealCount} deal{dealCount !== 1 ? 's' : ''}
          </span>
          {totalAmount > 0 && (
            <span className="font-semibold">
              {formatAmount(totalAmount)}
            </span>
          )}
        </div>
      </div>
      
      {/* Column Content */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={setNodeRef}
          className="h-full overflow-y-auto p-3 space-y-3"
        >
          <SortableContext 
            items={deals.map(deal => deal.id)} 
            strategy={verticalListSortingStrategy}
          >
            {deals.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-8 border border-dashed border-muted-foreground/20 rounded-lg">
                No deals
              </div>
            ) : (
              deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => onDealClick(deal)}
                  onEdit={onEditDeal ? () => onEditDeal(deal) : undefined}
                  onMarkWon={onMarkWon ? () => onMarkWon(deal) : undefined}
                />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}