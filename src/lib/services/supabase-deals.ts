import { supabase } from "@/integrations/supabase/client";
import { Deal } from "@/hooks/use-deals";
import { DealStatus } from "@/lib/deal-status";

const IDEMPOTENCY_ON = import.meta.env.VITE_DEAL_IDEMPOTENCY === "1";

function mapDealData(data: any, client: any): Deal {
  return {
    id: data.id,
    title: data.title,
    clientId: data.client_id,
    clientName: client?.company_name || client?.contact_name || 'Unknown',
    amount: data.amount,
    stage: data.status as DealStatus,
    expectedCloseDate: data.expected_close_date,
    notes: data.notes
  };
}

function prettyDealError(err: any): string {
  const msg = String(err?.message ?? err);
  if (msg.includes("deals_status_check")) {
    return "The selected stage isn't valid for this project. Please pick Lead, Prospecting, Qualified, Negotiation, Won, or Lost.";
  }
  if (msg.includes("date/time field value out of range")) {
    return "Please choose a valid expected close date.";
  }
  if (msg.includes("violates foreign key constraint")) {
    return "The selected contact is not valid. Please choose a different contact.";
  }
  return msg;
}

export interface CreateDealInput {
  title: string;
  clientId: string;
  amount: number;
  stage: DealStatus; // This will be the normalized status
  expectedCloseDate: string;
  notes?: string;
}

export interface UpdateDealInput extends Partial<CreateDealInput> {
  id: string;
}

export async function createDeal(input: CreateDealInput): Promise<Deal> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  // Get client info for the deal
  const { data: client } = await supabase
    .from('clients')
    .select('company_name, contact_name')
    .eq('id', input.clientId)
    .eq('user_id', user.id)
    .single();

  const request_id = crypto.randomUUID();
  const base = {
    title: input.title,
    client_id: input.clientId,
    amount: input.amount,
    status: input.stage, // Use the normalized status
    expected_close_date: input.expectedCloseDate,
    notes: input.notes || null,
    user_id: user.id,
    request_id // Always include request_id for idempotency
  };

  // console.info('[createDeal] upserting with request_id:', request_id, base)

  // Always try upsert first (idempotent)
  const { data, error } = await supabase
    .from('deals')
    .upsert(base, { onConflict: 'request_id' })
    .select()
    .single();

  // If API complains about request_id column, fall back to plain insert
  if (error && /request_id/i.test(error.message)) {
    console.warn('[createDeal] Idempotency col missing; falling back to insert', error.message);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('deals')
      .insert({
        title: input.title,
        client_id: input.clientId,
        amount: input.amount,
        status: input.stage,
        expected_close_date: input.expectedCloseDate,
        notes: input.notes || null,
        user_id: user.id
      })
      .select()
      .single();
    
    if (fallbackError) throw fallbackError;
    return mapDealData(fallbackData, client);
  } else if (error) {
    console.error("[api:createDeal] supabase error", error);
    throw new Error(prettyDealError(error));
  }

  return mapDealData(data, client);
}

export async function updateDeal(input: UpdateDealInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const updateData: any = {};
  
  if (input.title !== undefined) updateData.title = input.title;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.stage !== undefined) updateData.status = input.stage;
  if (input.expectedCloseDate !== undefined) updateData.expected_close_date = input.expectedCloseDate;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { error } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', input.id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteDeal(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getDeals(): Promise<Deal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      clients:client_id (
        company_name,
        contact_name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    clientId: row.client_id,
    clientName: row.clients?.company_name || row.clients?.contact_name || 'Unknown',
    amount: row.amount,
    stage: row.status as DealStatus,
    expectedCloseDate: row.expected_close_date,
    notes: row.notes
  }));
}