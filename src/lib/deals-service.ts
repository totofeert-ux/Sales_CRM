import { supabase } from "@/integrations/supabase/client"
import { v4 as uuidv4 } from "uuid"

export type CreateDealInput = {
  title: string
  clientId: string
  amount: number
  stage: string
  expectedCloseDate: string // ISO string
  clientName: string
  notes?: string
}

export async function createDeal(input: CreateDealInput): Promise<{ id: string }> {
  // TODO: Persist to Supabase when a `deals` table exists.
  // Example (when table is available):
  // const { data, error } = await supabase
  //   .from('deals')
  //   .insert({ ...input })
  //   .select('id')
  //   .single();
  // if (error) throw error;
  // return { id: data.id };

  // For now, stub with a mock insert delay and return an id.
  await new Promise((res) => setTimeout(res, 400))
  return { id: uuidv4() }
}
