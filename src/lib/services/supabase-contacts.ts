import { supabase } from "@/integrations/supabase/client";
import { Contact, LifecycleStage } from "@/hooks/use-contacts";

export interface CreateContactInput {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  lifecycleStage?: LifecycleStage;
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  id: string;
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const { data, error } = await supabase
    .from('clients')
    .insert({
      company_name: input.companyName || null,
      contact_name: input.contactName || null,
      email: input.email || null,
      phone: input.phone || null,
      tags: input.tags || [],
      lifecycle_stage: input.lifecycleStage || 'qualifying',
      user_id: user.id
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    companyName: data.company_name,
    contactName: data.contact_name,
    email: data.email,
    phone: data.phone,
    tags: data.tags,
    lifecycle_stage: data.lifecycle_stage as LifecycleStage
  };
}

export async function updateContact(input: UpdateContactInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const updateData: any = {};
  
  if (input.companyName !== undefined) updateData.company_name = input.companyName;
  if (input.contactName !== undefined) updateData.contact_name = input.contactName;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.lifecycleStage !== undefined) updateData.lifecycle_stage = input.lifecycleStage;

  const { error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', input.id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteContact(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getContacts(): Promise<Contact[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    tags: row.tags,
    lifecycle_stage: row.lifecycle_stage as LifecycleStage
  }));
}