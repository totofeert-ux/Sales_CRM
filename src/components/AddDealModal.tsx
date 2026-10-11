import { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Briefcase, AlertCircle, Euro, StickyNote } from "lucide-react"
import { format, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { useContacts } from "@/hooks/use-contacts"
import { ContactPicker } from "@/components/ContactPicker"
import { DEAL_STAGE_OPTIONS, toDealStatus, type DealStatus } from "@/lib/deal-status"

export type AddDealFormValues = {
  title: string
  amount: string
  stage: string
  expectedCloseDate?: Date
  clientName: string
  linkedClientId: string
  notes?: string
}

export interface AddDealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefilledClientId?: string
  prefilledClientName?: string
  onSubmit: (values: Required<Omit<AddDealFormValues, 'amount' | 'expectedCloseDate'>> & {
    amount: number
    expectedCloseDate: Date
  }) => Promise<void> | void
}

const dealStages = DEAL_STAGE_OPTIONS

export function AddDealModal({ open, onOpenChange, prefilledClientId, prefilledClientName, onSubmit }: AddDealModalProps) {
  const { contacts } = useContacts()

  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSubmittingRef = useRef(false)

  const [errors, setErrors] = useState({ 
    title: false, 
    stage: false, 
    client: false,
    amount: false,
    expectedCloseDate: false,
  })

  const [formData, setFormData] = useState<AddDealFormValues>({
    title: "",
    amount: "",
    stage: "lead",
    expectedCloseDate: addDays(new Date(), 14),
    clientName: prefilledClientName || "",
    linkedClientId: prefilledClientId || "",
    notes: "",
  })

  useEffect(() => {
    if (open) {
      setFormData({
        title: "",
        amount: "",
        stage: "lead",
        expectedCloseDate: addDays(new Date(), 14),
        clientName: prefilledClientName || "",
        linkedClientId: prefilledClientId || "",
        notes: "",
      })
      setErrors({ title: false, stage: false, client: false, amount: false, expectedCloseDate: false })
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open, prefilledClientId, prefilledClientName])

  const handleInputChange = (field: keyof AddDealFormValues, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const amountNumber = Number(formData.amount)
    const newErrors = {
      title: !formData.title.trim(),
      stage: !formData.stage,
      client: !(formData.linkedClientId && formData.clientName),
      amount: !(formData.amount !== "" && !Number.isNaN(amountNumber) && amountNumber >= 0),
      expectedCloseDate: !formData.expectedCloseDate,
    }
    setErrors(newErrors)
    return Object.values(newErrors).every(v => !v)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // console.info('[AddDeal] submit fired', Date.now())
    
    if (!validateForm()) return
    
    // Re-entry guard to prevent double submit
    if (isSubmittingRef.current) {
      console.warn('[AddDeal] blocked re-entry')
      return
    }
    isSubmittingRef.current = true
    setIsLoading(true)
    
    try {
      // Normalize stage to status for DB
      const status = toDealStatus(formData.stage)
      // console.info('[AddDeal] calling onSubmit with status:', status)
      
      await onSubmit({
        title: formData.title.trim(),
        amount: Number(formData.amount),
        stage: status, // Use normalized status
        expectedCloseDate: formData.expectedCloseDate as Date,
        clientName: formData.clientName,
        linkedClientId: formData.linkedClientId,
        notes: formData.notes?.trim() || undefined,
      })
      onOpenChange(false)
    } catch (err: any) {
      console.error('Submit error:', err)
      // Handle normalization errors
      if (err.message?.includes('Invalid stage/status')) {
        // This shouldn't happen with our select, but just in case
        console.error('Invalid stage selected:', formData.stage)
      }
    } finally {
      setIsLoading(false)
      isSubmittingRef.current = false
    }
  }

  const isFormValid = useMemo(() => {
    const amountNumber = Number(formData.amount)
    const amountValid = formData.amount !== "" && !Number.isNaN(amountNumber) && amountNumber >= 0
    const valid = (
      !!formData.title.trim() &&
      !!formData.stage &&
      !!formData.expectedCloseDate &&
      !!formData.linkedClientId &&
      !!formData.clientName &&
      amountValid
    )
    
    return valid
  }, [formData])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && isFormValid) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const clientLocked = !!prefilledClientId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="h-5 w-5 text-primary" />
            Add New Deal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" onKeyDown={handleKeyDown}>
          {/* Deal Name */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="title" className="text-sm font-semibold text-foreground">
                Deal Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                ref={inputRef}
                value={formData.title}
                onChange={(e) => {
                  handleInputChange("title", e.target.value)
                  if (errors.title) setErrors(prev => ({ ...prev, title: false }))
                }}
                placeholder="e.g., Premium Package Q1"
                className={cn("w-full text-base", errors.title && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.title && (
                <div className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  Deal name is required
                </div>
              )}
            </div>
          </div>

          {/* Client Combobox */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-foreground">
              Client / Contact <span className="text-destructive">*</span>
            </Label>
            {clientLocked ? (
              <Input value={prefilledClientName} disabled />
            ) : (
              <ContactPicker
                value={formData.linkedClientId}
                onChange={(id, contact) => {
                  handleInputChange("linkedClientId", id)
                  handleInputChange("clientName", contact?.company_name || contact?.contact_name || "")
                  setErrors(prev => ({ ...prev, client: false }))
                }}
                contacts={contacts.map(c => ({
                  id: c.id,
                  company_name: c.companyName,
                  contact_name: c.contactName,
                  email: c.email
                }))}
                placeholder="Search or select a contact"
              />
            )}
            {errors.client && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                Please select a contact
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label htmlFor="amount" className="text-sm font-semibold text-foreground">
              Amount (€) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => {
                  handleInputChange("amount", e.target.value)
                  if (errors.amount) setErrors(prev => ({ ...prev, amount: false }))
                }}
                placeholder="25000"
                className={cn("pl-10", errors.amount && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
            {errors.amount && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                Please enter a valid amount
              </div>
            )}
          </div>

          {/* Stage */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-foreground">
              Stage <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.stage}
              onValueChange={(value) => {
                handleInputChange("stage", value)
                if (errors.stage) setErrors(prev => ({ ...prev, stage: false }))
              }}
            >
              <SelectTrigger className={cn("w-full", errors.stage && "border-destructive")}> 
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {dealStages.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.stage && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                Deal stage is required
              </div>
            )}
          </div>

          {/* Expected Close Date */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-foreground">
              Expected Close Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expectedCloseDate && "text-muted-foreground",
                    errors.expectedCloseDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expectedCloseDate ? format(formData.expectedCloseDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expectedCloseDate}
                  onSelect={(date) => {
                    handleInputChange("expectedCloseDate", date)
                    if (errors.expectedCloseDate) setErrors(prev => ({ ...prev, expectedCloseDate: false }))
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.expectedCloseDate && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                Expected close date is required
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-sm font-semibold text-foreground">
              Notes
            </Label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Optional notes for this deal"
                className="pl-10 min-h-[80px]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isFormValid || isSubmittingRef.current}
              className="w-full sm:flex-1 sm:ml-auto"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Save Deal
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
