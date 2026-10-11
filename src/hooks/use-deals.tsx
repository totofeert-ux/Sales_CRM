import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react"
import { createDeal, updateDeal as updateDealDB, deleteDeal, getDeals } from "@/lib/services/supabase-deals"
import { useToast } from "@/hooks/use-toast"
import { DealStatus } from "@/lib/deal-status"
import { dealsStore, type Deal as StoreDeal } from "@/lib/deals-store"
import { supabase } from "@/integrations/supabase/client"
import type { RealtimeChannel } from '@supabase/supabase-js'

export type Deal = {
  id: string
  title: string
  amount: number
  stage: DealStatus
  expectedCloseDate: string // ISO string
  clientId: string
  clientName: string
  notes?: string
}

type DealsContextValue = {
  deals: Deal[]
  loading: boolean
  addDeal: (deal: Omit<Deal, "id" | "clientName">) => Promise<Deal>
  updateDeal: (id: string, changes: Partial<Deal>) => Promise<void>
  removeDeal: (id: string) => Promise<void>
  removeOptimisticDeal: (id: string) => void
  replaceFromSnapshot: (rows: Deal[]) => void
  upsertOne: (row: Deal) => void
  removeOne: (id: string) => void
}

const DealsContext = createContext<DealsContextValue | undefined>(undefined)

const STORAGE_KEY = "deals"

export function DealsProvider({ children }: { children: React.ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  
  // Refs for realtime subscription
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mountedRef = useRef(false)

  // Load deals from Supabase on mount
  useEffect(() => {
    const loadDeals = async () => {
      try {
        const data = await getDeals()
        replaceFromSnapshot(data)
      } catch (error) {
        console.error('Failed to load deals:', error)
        toast({
          title: "Error loading deals",
          description: "Please refresh the page to try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadDeals()
  }, [toast])

  // Setup realtime subscription
  useEffect(() => {
    if (mountedRef.current) return;      // avoid StrictMode double mount in dev
    mountedRef.current = true;
    
    // (re)subscribe cleanly
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const chan = supabase
      .channel('deals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, (payload) => {
        if (import.meta.env.DEV) {
          console.count('[DEALS] REALTIME event');
        }
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // Convert store deal to context deal format
          const storeDeal = payload.new as StoreDeal;
          const contextDeal: Deal = {
            id: storeDeal.id,
            title: storeDeal.title,
            amount: storeDeal.amount,
            stage: storeDeal.status as DealStatus,
            expectedCloseDate: storeDeal.expected_close_date,
            clientId: storeDeal.client_id,
            clientName: 'Unknown', // Will be updated when we have client info
            notes: storeDeal.notes
          };
          upsertOne(contextDeal);
        } else if (payload.eventType === 'DELETE') {
          const storeDeal = payload.old as StoreDeal;
          removeOne(storeDeal.id);
        }
      })
      .subscribe();
    channelRef.current = chan;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [])

  // Store methods
  const replaceFromSnapshot = useCallback((rows: Deal[]) => {
    if (import.meta.env.DEV) {
      console.count('[DEALS] FETCH snapshot');
    }
    dealsStore.replaceAll(rows);
    setDeals(dealsStore.snapshot());
    if (import.meta.env.DEV) {
      console.log('[DEALS] size', dealsStore.snapshot().length);
    }
  }, []);

  const upsertOne = useCallback((row: Deal) => {
    dealsStore.upsert(row);
    setDeals(dealsStore.snapshot());
  }, []);

  const removeOne = useCallback((id: string) => {
    dealsStore.delete(id);
    setDeals(dealsStore.snapshot());
  }, []);

  const addDeal = useCallback(async (deal: Omit<Deal, "id" | "clientName">) => {
    try {
      const newDeal = await createDeal(deal)
      upsertOne(newDeal) // Use upsert instead of append
      toast({
        title: "Deal created",
        description: `"${newDeal.title}" has been added.`
      })
      return newDeal
    } catch (error) {
      console.error('Failed to create deal:', error)
      toast({
        title: "Error creating deal",
        description: "Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }, [toast, upsertOne])

  const updateDeal = useCallback(async (id: string, changes: Partial<Deal>) => {
    try {
      await updateDealDB({ id, ...changes })
      // Update the deal in store
      const existingDeal = deals.find(d => d.id === id);
      if (existingDeal) {
        const updatedDeal = { ...existingDeal, ...changes };
        upsertOne(updatedDeal);
      }
      toast({
        title: "Deal updated",
        description: "Changes have been saved."
      })
    } catch (error) {
      console.error('Failed to update deal:', error)
      toast({
        title: "Error updating deal",
        description: "Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }, [toast, deals, upsertOne])

  const removeDeal = useCallback(async (id: string) => {
    try {
      await deleteDeal(id)
      removeOne(id) // Use store method
      toast({
        title: "Deal deleted",
        description: "Deal has been removed."
      })
    } catch (error) {
      console.error('Failed to delete deal:', error)
      toast({
        title: "Error deleting deal",
        description: "Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }, [toast, removeOne])

  const removeOptimisticDeal = useCallback((id: string) => {
    removeOne(id) // Use store method
  }, [removeOne])

  const value = useMemo(() => ({ 
    deals, 
    loading, 
    addDeal, 
    updateDeal, 
    removeDeal, 
    removeOptimisticDeal,
    replaceFromSnapshot,
    upsertOne,
    removeOne
  }), [deals, loading, addDeal, updateDeal, removeDeal, removeOptimisticDeal, replaceFromSnapshot, upsertOne, removeOne])

  return <DealsContext.Provider value={value}>{children}</DealsContext.Provider>
}

export function useDeals() {
  const ctx = useContext(DealsContext)
  if (!ctx) throw new Error("useDeals must be used within DealsProvider")
  return ctx
}
