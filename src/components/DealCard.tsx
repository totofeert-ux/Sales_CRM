import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Calendar, Edit, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

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

interface DealCardProps {
  deal: Deal
  onClick?: () => void
  isDragging?: boolean
  onEdit?: () => void
  onMarkWon?: () => void
}

export function DealCard({ deal, onClick, isDragging = false, onEdit, onMarkWon }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const isOverdue = deal.expectedCloseDate < new Date()

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-sm hover:border-primary/30",
        "bg-background border border-border",
        (isDragging || isSortableDragging) && "shadow-lg scale-105 opacity-90",
        isDragging && "z-50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Deal Title */}
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight pr-2">
            {deal.title}
          </h3>
          {/* Action Buttons - shown on hover */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onMarkWon && deal.stage !== 'closed-won' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkWon()
                }}
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Client Name */}
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {deal.clientName}
          </span>
        </div>
        
        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">
            {formatAmount(deal.amount)}
          </span>
          
          {/* Expected Close Date with overdue badge */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className={cn(
              "text-xs",
              isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              {format(deal.expectedCloseDate, "MMM dd")}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                Overdue
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}