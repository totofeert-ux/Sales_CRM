import { useState } from "react"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useContacts } from "@/hooks/use-contacts"
import { LIFECYCLE_STAGES, STAGE_LABELS, type LifecycleStage } from "@/lib/lifecycle"

interface NewClientModalProps {
  open: boolean
  onClose: () => void
  onContactCreated?: (contact: any) => void
}

const sectorOptions = [
  "Technology",
  "Design", 
  "Marketing",
  "Consulting",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Food",
  "Real Estate",
  "Manufacturing",
  "Other"
]

const availableTags = [
  "VIP",
  "Hot", 
  "Follow-up",
  "Small Business",
  "Enterprise",
  "Q1", "Q2", "Q3", "Q4",
  "Urgent",
  "Long-term"
]

export function NewClientModal({ open, onClose, onContactCreated }: NewClientModalProps) {
  const { toast } = useToast()
  const { addContact } = useContacts()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    sector: "",
    lifecycle_stage: "qualifying",
    notes: ""
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag])
    }
  }

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      const newContact = await addContact({
        companyName: formData.companyName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        tags: selectedTags,
        lifecycle_stage: formData.lifecycle_stage as LifecycleStage,
      })
      
      toast({
        title: "Success",
        description: "Contact created successfully"
      })
      
      // Call callback if provided
      onContactCreated?.(newContact)
      
      // Reset form
      setFormData({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        sector: "",
        lifecycle_stage: "qualifying",
        notes: ""
      })
      setSelectedTags([])
      onClose()
      
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to create contact",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      sector: "",
      lifecycle_stage: "qualifying",
      notes: ""
    })
    setSelectedTags([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name - Required */}
          <div className="space-y-2">
            <Label htmlFor="companyName">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleInputChange("companyName", e.target.value)}
              placeholder="e.g., TechStart SAS"
              required
            />
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => handleInputChange("contactName", e.target.value)}
              placeholder="e.g., Marie Dubois"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="marie@techstart.fr"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          {/* Sector */}
          <div className="space-y-2">
            <Label htmlFor="sector">Sector</Label>
            <Select value={formData.sector} onValueChange={(value) => handleInputChange("sector", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a sector" />
              </SelectTrigger>
              <SelectContent>
                {sectorOptions.map(sector => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lifecycle Stage */}
          <div className="space-y-2">
            <Label htmlFor="lifecycle">Lifecycle Stage</Label>
            <Select value={formData.lifecycle_stage} onValueChange={(value) => handleInputChange("lifecycle_stage", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            {selectedTags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Select onValueChange={handleAddTag}>
              <SelectTrigger>
                <SelectValue placeholder="Add tags" />
              </SelectTrigger>
              <SelectContent>
                {availableTags
                  .filter(tag => !selectedTags.includes(tag))
                  .map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Any additional notes about this contact..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.companyName.trim()}
              className="flex-1"
            >
              {isLoading ? "Creating..." : "Create Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}