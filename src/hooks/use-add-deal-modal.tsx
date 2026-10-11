import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { AddDealModal } from "@/components/AddDealModal"
import { useDeals } from "@/hooks/use-deals"
import { useToast } from "@/hooks/use-toast"
import { createDeal } from "@/lib/services/supabase-deals"
import { v4 as uuidv4 } from "uuid"
import { useContacts } from "@/hooks/use-contacts"
import { useSearchParams } from "react-router-dom"
import { recomputeContactLifecycle } from "@/lib/lifecycle-automation"

export type OpenAddDealOptions = {
  clientId?: string
  clientName?: string
  onSaved?: (dealId: string) => void
}

interface AddDealModalContextValue {
  openAddDealModal: (opts?: OpenAddDealOptions) => void
  closeAddDealModal: () => void
}


const AddDealModalContext = createContext<AddDealModalContextValue | undefined>(undefined)

export function AddDealModalProvider({ children }: { children: React.ReactNode }) {
  const { deals, addDeal, removeDeal, removeOptimisticDeal } = useDeals()
  const { toast } = useToast()
  const { contacts, updateLifecycle } = useContacts()
  const [searchParams, setSearchParams] = useSearchParams()
  

  const [open, setOpen] = useState(false)
  const [prefilledClientId, setPrefilledClientId] = useState<string | undefined>(undefined)
  const [prefilledClientName, setPrefilledClientName] = useState<string | undefined>(undefined)
  const [onSaved, setOnSaved] = useState<((dealId: string) => void) | undefined>(undefined)

  const openAddDealModal = useCallback((opts?: OpenAddDealOptions) => {
    setPrefilledClientId(opts?.clientId)
    setPrefilledClientName(opts?.clientName)
    setOnSaved(() => opts?.onSaved)
    // Set query param for consistency / deep-linking
    const params = new URLSearchParams(searchParams)
    params.set("modal", "add-deal")
    if (opts?.clientId) params.set("clientId", opts.clientId)
    else params.delete("clientId")
    setSearchParams(params)
    setOpen(true)
  }, [searchParams, setSearchParams])

  const closeAddDealModal = useCallback(() => {
    setOpen(false)
    setOnSaved(undefined)
    setPrefilledClientId(undefined)
    setPrefilledClientName(undefined)
    // Remove modal param if present
    const params = new URLSearchParams(searchParams)
    if (params.get("modal") === "add-deal") {
      params.delete("modal")
      params.delete("clientId")
      setSearchParams(params)
    }
  }, [searchParams, setSearchParams])

  // Handle deep-link: ?modal=add-deal&clientId=...
  useEffect(() => {
    const modal = searchParams.get("modal")
    if (modal === "add-deal") {
      const cid = searchParams.get("clientId") || undefined
      let cname: string | undefined = undefined
      if (cid) {
        const found = contacts.find(c => c.id === cid)
        cname = found ? (found.companyName || found.contactName) : undefined
      }
      setPrefilledClientId(cid)
      setPrefilledClientName(cname)
      setOpen(true)
    }
  }, [searchParams, contacts])

  const handleSubmit = useCallback(async (values: {
    title: string
    amount: number
    stage: string
    expectedCloseDate: Date
    clientName: string
    linkedClientId: string
    notes?: string
  }) => {
    // Optimistic add
    const tempId = uuidv4()
    const optimistic = {
      id: tempId,
      title: values.title,
      amount: values.amount,
      stage: values.stage as any,
      expectedCloseDate: values.expectedCloseDate.toISOString(),
      clientId: values.linkedClientId,
      clientName: values.clientName,
      notes: values.notes,
    }

    addDeal(optimistic)

    // Optimistically recompute lifecycle for the linked contact
    recomputeContactLifecycle({
      contactId: values.linkedClientId,
      allDeals: [...deals, optimistic] as any,
      getContactStage: (id) => contacts.find(c => c.id === id)?.lifecycle_stage,
      updateLifecycle,
      toast: (opts) => toast({ title: opts.title, description: opts.description }),
    })

    try {
      // console.info('[use-add-deal-modal] calling createDeal')
      const realDeal = await createDeal({
        title: values.title,
        amount: values.amount,
        stage: values.stage as any,
        expectedCloseDate: values.expectedCloseDate.toISOString(),
        clientId: values.linkedClientId,
        notes: values.notes,
      })

      // Replace optimistic with real deal
      removeOptimisticDeal(tempId)
      // Don't call addDeal here - it would duplicate the createDeal call
      // The deal is already created and will be fetched by the deals list

      toast({ title: "Deal created", description: `${values.title} • €${values.amount.toLocaleString()}` })
      onSaved?.(realDeal.id)
      closeAddDealModal()
    } catch (e: any) {
      // Rollback
      removeOptimisticDeal(tempId)
      console.error('Failed to create deal:', e)
      toast({ title: "Failed to create deal", description: e?.message || "Please try again", variant: "destructive" })
      throw e
    }
  }, [addDeal, removeDeal, toast, onSaved, closeAddDealModal, deals, contacts, updateLifecycle])

  const value = useMemo(() => ({ openAddDealModal, closeAddDealModal }), [openAddDealModal, closeAddDealModal])

  return (
    <AddDealModalContext.Provider value={value}>
      {children}
      <AddDealModal
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : closeAddDealModal())}
        prefilledClientId={prefilledClientId}
        prefilledClientName={prefilledClientName}
        onSubmit={handleSubmit}
      />
    </AddDealModalContext.Provider>
  )
}

export function useAddDealModal() {
  const ctx = useContext(AddDealModalContext)
  if (!ctx) throw new Error("useAddDealModal must be used within AddDealModalProvider")
  return ctx
}
