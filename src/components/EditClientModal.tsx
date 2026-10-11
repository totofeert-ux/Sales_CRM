import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LIFECYCLE_STAGES, STAGE_LABELS, LifecycleStage } from "@/lib/lifecycle"

interface Client {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  sector: string
  tags: string[]
  lifecycle_stage: LifecycleStage
  notes?: string
}

interface EditClientModalProps {
  open: boolean
  onClose: () => void
  client: Client | null
  onSave?: (updatedClient: Client) => void
}

const sectorOptions = [
  "Technology", "Healthcare", "Finance", "Education", "Retail", 
  "Manufacturing", "Consulting", "Real Estate", "Marketing", "Other"
]

const availableTags = [
  "High Priority", "VIP", "New Client", "Returning Client", "Enterprise",
  "Small Business", "Startup", "Government", "Non-Profit", "International"
]

export function EditClientModal({ open, onClose, client, onSave }: EditClientModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    sector: "",
    lifecycle_stage: "qualifying" as LifecycleStage,
    notes: ""
  })
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Populate form when client data changes
  useEffect(() => {
    if (client) {
      setFormData({
        companyName: client.companyName || "",
        contactName: client.contactName || "",
        email: client.email || "",
        phone: client.phone || "",
        sector: client.sector || "",
        lifecycle_stage: client.lifecycle_stage ?? ("qualifying" as LifecycleStage),
        notes: client.notes || ""
      })
      setSelectedTags(client.tags || [])
    }
  }, [client])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSectorChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      sector: value
    }))
  }

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag])
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.contactName.trim()) {
      toast({
        title: "Error", 
        description: "Contact name is required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      // Simulate API call - replace with actual Supabase call when connected
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const updatedClient: Client = {
        id: client?.id || "",
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        sector: formData.sector,
        tags: selectedTags,
        lifecycle_stage: formData.lifecycle_stage,
        notes: formData.notes.trim()
      }

      onSave?.(updatedClient)

      toast({
        title: "Success",
        description: "Contact information updated successfully",
      })
      
      handleClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contact information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact Information</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              required
              autoFocus
              placeholder="Enter company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name *</Label>
            <Input
              id="contactName"
              name="contactName"
              value={formData.contactName}
              onChange={handleInputChange}
              required
              placeholder="Enter contact name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector">Sector</Label>
            <Select value={formData.sector} onValueChange={handleSectorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a sector" />
              </SelectTrigger>
              <SelectContent>
                {sectorOptions.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lifecycle Stage</Label>
            <Select value={formData.lifecycle_stage} onValueChange={(v) => setFormData((p) => ({ ...p, lifecycle_stage: v as LifecycleStage }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a stage" />
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

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
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
            <Select onValueChange={handleAddTag}>
              <SelectTrigger>
                <SelectValue placeholder="Add tags" />
              </SelectTrigger>
              <SelectContent>
                {availableTags
                  .filter(tag => !selectedTags.includes(tag))
                  .map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.companyName.trim() || !formData.contactName.trim()}
              className="sm:order-2"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}