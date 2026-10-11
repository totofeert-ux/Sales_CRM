import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Briefcase, User, DollarSign, Calendar, FileText, Edit } from "lucide-react"
import { format } from "date-fns"
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

interface DealDetailsModalProps {
  deal: Deal | null
  open: boolean
  onClose: () => void
}

// Helper function to get stage label
const getStageLabel = (stage: string) => {
  return DEAL_STAGE_OPTIONS.find(s => s.value === stage)?.label || stage;
}

export function DealDetailsModal({ deal, open, onClose }: DealDetailsModalProps) {
  if (!deal) return null

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const stageLabel = getStageLabel(deal.stage)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="h-5 w-5 text-primary" />
            Deal Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Deal Title and Stage */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {deal.title}
            </h2>
            <Badge className={dealStageBadgeClasses(deal.stage as any)}>
              {stageLabel}
            </Badge>
          </div>

          <Separator />

          {/* Deal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Client</p>
                <p className="text-sm text-muted-foreground">{deal.clientName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Amount</p>
                <p className="text-lg font-semibold text-green-700">
                  {formatAmount(deal.amount)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Expected Close Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(deal.expectedCloseDate, "MMMM dd, yyyy")}
                </p>
              </div>
            </div>

            {deal.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground">
                    {deal.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button className="flex-1">
              <Edit className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}