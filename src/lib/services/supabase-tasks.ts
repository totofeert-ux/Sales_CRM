import { supabase } from "@/integrations/supabase/client";
import { Task, TaskType, TaskStatus, TaskPriority } from "@/hooks/use-tasks";

export interface CreateTaskInput {
  title: string;
  dueAt: Date;
  priority?: TaskPriority;
  clientId?: string;
  dealId?: string;
  notes?: string;
  type?: TaskType;
  durationMinutes?: number;
}

export interface UpdateTaskInput extends Partial<Omit<Task, "id">> {
  id: string;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      due_at: input.dueAt.toISOString(),
      type: input.type || 'task',
      priority: input.priority || 'medium',
      status: 'todo',
      client_id: input.clientId || null,
      deal_id: input.dealId || null,
      notes: input.notes || null,
      duration_minutes: input.durationMinutes || (input.type === 'meeting' ? 60 : 30),
      user_id: user.id
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    dueAt: data.due_at,
    type: data.type as TaskType,
    status: data.status === 'todo' ? 'pending' : 'done',
    priority: data.priority as TaskPriority,
    clientId: data.client_id,
    notes: data.notes,
    durationMinutes: data.duration_minutes
  };
}

export async function updateTask(input: UpdateTaskInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const updateData: any = {};
  
  if (input.title !== undefined) updateData.title = input.title;
  if (input.dueAt !== undefined) updateData.due_at = input.dueAt;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.status !== undefined) {
    updateData.status = input.status === 'pending' ? 'todo' : 'done';
    if (input.status === 'done') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }
  }
  if (input.clientId !== undefined) updateData.client_id = input.clientId;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.durationMinutes !== undefined) updateData.duration_minutes = input.durationMinutes;

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', input.id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getTasks(): Promise<Task[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('due_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    dueAt: row.due_at,
    type: row.type as TaskType,
    status: row.status === 'todo' ? 'pending' : 'done',
    priority: row.priority as TaskPriority,
    clientId: row.client_id,
    notes: row.notes,
    durationMinutes: row.duration_minutes
  }));
}