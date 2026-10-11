import { useState, useEffect } from "react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Clock, CheckCircle, AlertCircle, Users, Plus } from "lucide-react"
import { format, addHours } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useTasks } from "@/hooks/use-tasks"
import { useContacts } from "@/hooks/use-contacts"
import { NewClientModal } from "@/components/NewClientModal"
interface NewTaskModalProps {
  open: boolean
  onClose: () => void
  prefilledClientId?: string
  prefilledClientName?: string
  editingTaskId?: string
  onSaved?: () => void
}

export function NewTaskModal({ open, onClose, prefilledClientId, prefilledClientName, editingTaskId, onSaved }: NewTaskModalProps) {
  const { toast } = useToast()
  const { addTask, updateTask, getById } = useTasks()
  const { contacts, loading: contactsLoading, addContact } = useContacts()
  const [isLoading, setIsLoading] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [errors, setErrors] = useState({ title: false, dueDate: false, client: false })
  
  // Initialize with default date (today + 1 hour) and time
  const getDefaultDateTime = () => {
    const defaultDate = addHours(new Date(), 1)
    return {
      date: defaultDate,
      time: format(defaultDate, "HH:mm")
    }
  }

  const [formData, setFormData] = useState(() => {
    const { date, time } = getDefaultDateTime()
    return {
      title: "",
      dueDate: date,
      dueTime: time,
      priority: "medium" as "low" | "medium" | "high",
      type: "task" as "task" | "meeting",
      clientId: prefilledClientId || "",
      notes: "",
      durationMinutes: 30
    }
  })

  // Pre-fill client if provided
  useEffect(() => {
    if (prefilledClientId) {
      setFormData(prev => ({
        ...prev,
        clientId: prefilledClientId
      }))
    }
  }, [prefilledClientId])

  // Reset form when modal opens
  useEffect(() => {
    if (open && !editingTaskId) {
      const { date, time } = getDefaultDateTime()
      setFormData({
        title: "",
        dueDate: date,
        dueTime: time,
        priority: "medium",
        type: "task",
        clientId: prefilledClientId || "",
        notes: "",
        durationMinutes: 30
      })
      setErrors({ title: false, dueDate: false, client: false })
    }
  }, [open, prefilledClientId, editingTaskId])

  // Prefill when editing
  useEffect(() => {
    if (open && editingTaskId) {
      const t = getById(editingTaskId)
      if (t) {
        const dt = new Date(t.dueAt)
        setFormData({
          title: t.title,
          dueDate: dt,
          dueTime: format(dt, "HH:mm"),
          priority: t.priority,
          type: t.type,
          clientId: t.clientId || "",
          notes: t.notes || "",
          durationMinutes: t.durationMinutes || 30
        })
        setErrors({ title: false, dueDate: false, client: false })
      }
    }
  }, [open, editingTaskId, getById])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = () => {
    const newErrors = {
      title: !formData.title.trim(),
      dueDate: !formData.dueDate,
      client: !formData.clientId.trim()
    }
    setErrors(newErrors)
    return !newErrors.title && !newErrors.dueDate && !newErrors.client
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      // Create datetime from date + time
      const [hours, minutes] = formData.dueTime.split(':').map(Number)
      const dueDateTime = new Date(formData.dueDate as Date)
      dueDateTime.setHours(hours, minutes)

      if (editingTaskId) {
        await updateTask({
          id: editingTaskId,
          title: formData.title,
          dueAt: dueDateTime.toISOString(),
          priority: formData.priority,
          type: formData.type,
          clientId: formData.clientId,
          notes: formData.notes,
          durationMinutes: formData.durationMinutes
        })
        toast({
          title: "Task updated",
          description: "Changes have been saved"
        })
      } else {
        await addTask({
          title: formData.title,
          dueAt: dueDateTime,
          priority: formData.priority,
          type: formData.type,
          clientId: formData.clientId,
          notes: formData.notes,
          durationMinutes: formData.durationMinutes
        })
        toast({
          title: "Task added",
          description: "Task has been created successfully"
        })
      }

      onSaved?.()
      onClose()
    } catch (error: any) {
      console.error('Failed to save task:', error)
      toast({
        title: "Error saving task",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    const { date, time } = getDefaultDateTime()
    setFormData({
      title: "",
      dueDate: date,
      dueTime: time,
      priority: "medium",
      type: "task",
      clientId: prefilledClientId || "",
      notes: "",
      durationMinutes: 30
    })
    setErrors({ title: false, dueDate: false, client: false })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && formData.title.trim() && formData.dueDate && formData.clientId) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const isFormValid = formData.title.trim() && formData.dueDate && formData.clientId

  const handleContactCreated = (newContact: any) => {
    setFormData(prev => ({ ...prev, clientId: newContact.id }))
    setShowNewClientModal(false)
    toast({
      title: "Contact created",
      description: "Contact created and linked to this task"
    })
  }

  const getContactDisplayName = (contact: any) => {
    if (contact.companyName && contact.contactName) {
      return `${contact.companyName} — ${contact.contactName}`
    }
    if (contact.companyName) {
      return contact.companyName
    }
    if (contact.contactName) {
      return contact.contactName
    }
    return contact.email || 'Unnamed Contact'
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto" aria-label="Add Task - SoloCRM">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-5 w-5 text-primary" />
            {editingTaskId ? "Edit Task" : "Add New Task"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6" onKeyDown={handleKeyDown}>
          {/* Task Title Section */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="title" className="text-sm font-semibold text-foreground">
                📋 Task Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  handleInputChange("title", e.target.value)
                  if (errors.title) setErrors(prev => ({...prev, title: false}))
                }}
                placeholder="e.g., Follow up with client about proposal"
                className={cn(
                  "w-full text-base",
                  errors.title && "border-destructive focus-visible:ring-destructive"
                )}
                autoFocus
              />
              {errors.title && (
                <div className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  Task title is required
                </div>
              )}
            </div>
          </div>

          {/* Due Date & Time Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              📅 Due Date & Time <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.dueDate && "text-muted-foreground",
                        errors.dueDate && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => {
                        handleInputChange("dueDate", date)
                        if (errors.dueDate) setErrors(prev => ({...prev, dueDate: false}))
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => handleInputChange("dueTime", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            {errors.dueDate && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                Due date is required
              </div>
            )}
          </div>

          {/* Type Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">📋 Type</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => handleInputChange("type", value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="task" id="task-type" />
                <Label htmlFor="task-type" className="text-sm font-medium cursor-pointer">Task</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="meeting" id="meeting-type" />
                <Label htmlFor="meeting-type" className="text-sm font-medium cursor-pointer">Meeting</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Priority Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">⚡ Priority</Label>
            <RadioGroup
              value={formData.priority}
              onValueChange={(value) => handleInputChange("priority", value)}
              className="grid grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="text-sm font-medium cursor-pointer">🟢 Low</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="text-sm font-medium cursor-pointer">🟡 Medium</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="text-sm font-medium cursor-pointer">🔴 High</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contact Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              👤 Contact <span className="text-destructive">*</span>
            </Label>
            
            {contactsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading contacts...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 space-y-4 border rounded-lg bg-muted/20">
                <div className="space-y-2">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-medium">No contacts yet</h3>
                  <p className="text-sm text-muted-foreground">Create a contact before adding a task.</p>
                </div>
                <Button 
                  onClick={() => setShowNewClientModal(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Contact
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Select 
                  value={formData.clientId} 
                  onValueChange={(value) => {
                    handleInputChange("clientId", value)
                    if (errors.client) setErrors(prev => ({...prev, client: false}))
                  }}
                  disabled={!!prefilledClientId}
                >
                  <SelectTrigger 
                    className={cn(
                      "w-full",
                      errors.client && "border-destructive focus-visible:ring-destructive"
                    )}
                  >
                    <SelectValue 
                      placeholder={prefilledClientName ? `${prefilledClientName} (locked)` : "Select a contact"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {getContactDisplayName(contact)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {!prefilledClientId && (
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowNewClientModal(true)}
                    className="w-full gap-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Create New Contact
                  </Button>
                )}
                
                {errors.client && (
                  <div className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Please select a contact for this task
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-semibold text-muted-foreground">📝 Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Add any additional context, reminders, or details about this task..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isFormValid || (contacts.length === 0 && !contactsLoading)}
              className="w-full sm:flex-1 sm:ml-auto"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {editingTaskId ? "Update Task" : "Save Task"}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* New Client Modal */}
        <NewClientModal
          open={showNewClientModal}
          onClose={() => setShowNewClientModal(false)}
          onContactCreated={handleContactCreated}
        />
      </DialogContent>
    </Dialog>
  )
}