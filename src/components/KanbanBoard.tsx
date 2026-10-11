import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { KanbanColumn } from "./KanbanColumn"
import { DealCard } from "./DealCard"
import { DEAL_STAGE_OPTIONS, dealStageBadgeClasses } from "@/lib/deal-status"

const stages = [
  { 
    id: "lead", 
    title: "Lead", 
    color: "bg-slate-50 border-slate-200",
    titleColor: "text-slate-700"
  },
  { 
    id: "prospecting", 
    title: "Prospecting", 
    color: "bg-blue-50 border-blue-200",
    titleColor: "text-blue-700"
  },
  { 
    id: "qualified", 
    title: "Qualified", 
    color: "bg-indigo-50 border-indigo-200",
    titleColor: "text-indigo-700"
  },
  { 
    id: "negotiation", 
    title: "Negotiation", 
    color: "bg-purple-50 border-purple-200",
    titleColor: "text-purple-700"
  },
  { 
    id: "won", 
    title: "Won", 
    color: "bg-emerald-50 border-emerald-200",
    titleColor: "text-emerald-700"
  },
  { 
    id: "lost", 
    title: "Lost", 
    color: "bg-red-50 border-red-200",
    titleColor: "text-red-700"
  }
]

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

interface KanbanBoardProps {
  deals: Deal[]
  onDealMove: (dealId: string, newStage: string) => void
  onDealClick: (deal: Deal) => void
  onEditDeal?: (deal: Deal) => void
  onMarkWon?: (deal: Deal) => void
}

export function KanbanBoard({ deals, onDealMove, onDealClick, onEditDeal, onMarkWon }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const findDeal = (id: string) => {
    return deals.find(deal => deal.id === id)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) return

    const dealId = active.id as string
    const newStage = over.id as string
    
    // Only update if the stage actually changed
    const deal = findDeal(dealId)
    if (deal && deal.stage !== newStage) {
      onDealMove(dealId, newStage)
    }
    
    setActiveId(null)
  }

  const getDealsForStage = (stage: string) => {
    return deals.filter(deal => deal.stage === stage)
  }

  const getStageTotal = (stage: string) => {
    const stageDeals = getDealsForStage(stage)
    return stageDeals.reduce((total, deal) => total + deal.amount, 0)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 h-[calc(100vh-12rem)]">
        {stages.map((stage) => {
          const stageDeals = getDealsForStage(stage.id)
          const stageTotal = getStageTotal(stage.id)
          
          return (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.title}
              color={stage.color}
              titleColor={stage.titleColor}
              deals={stageDeals}
              dealCount={stageDeals.length}
              totalAmount={stageTotal}
              onDealClick={onDealClick}
              onEditDeal={onEditDeal}
              onMarkWon={onMarkWon}
            />
          )
        })}
      </div>
      
      <DragOverlay>
        {activeId ? (
          <DealCard deal={findDeal(activeId)!} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}