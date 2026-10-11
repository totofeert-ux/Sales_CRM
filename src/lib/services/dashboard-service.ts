import { supabase } from "@/integrations/supabase/client";

export interface DashboardKPIs {
  openDealsCount: number;
  openDealsValue: number;
  closingThisMonthCount: number;
  closingThisMonthValue: number;
  overdueTasks: number;
  pipelineValue: number;
  taskCompletionRate: number;
  averageSalesCycleDays: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface WonLostData {
  month: string;
  won: number;
  lost: number;
}

export interface PipelineByStage {
  stage: string;
  value: number;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be authenticated");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get deals
  const { data: deals } = await supabase
    .from('deals')
    .select('amount, status, expected_close_date, created_at')
    .eq('user_id', user.id);

  // Get tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status, due_at, created_at')
    .eq('user_id', user.id);

  const openDeals = (deals || []).filter(d => !['closed-won', 'closed-lost'].includes(d.status));
  const openDealsCount = openDeals.length;
  const openDealsValue = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

  const closingThisMonth = openDeals.filter(d => {
    const closeDate = new Date(d.expected_close_date);
    return closeDate >= startOfMonth && closeDate <= endOfMonth;
  });
  const closingThisMonthCount = closingThisMonth.length;
  const closingThisMonthValue = closingThisMonth.reduce((sum, d) => sum + (d.amount || 0), 0);

  const overdueTasks = (tasks || []).filter(t => 
    t.status === 'todo' && new Date(t.due_at) < now
  ).length;

  const pipelineValue = openDealsValue;

  // Task completion rate for this month
  const tasksThisMonth = (tasks || []).filter(t => {
    const dueDate = new Date(t.due_at);
    return dueDate >= startOfMonth && dueDate <= endOfMonth;
  });
  const completedThisMonth = tasksThisMonth.filter(t => t.status === 'done');
  const taskCompletionRate = tasksThisMonth.length > 0 
    ? (completedThisMonth.length / tasksThisMonth.length) * 100 
    : 0;

  // Average sales cycle
  const wonDeals = (deals || []).filter(d => d.status === 'closed-won' && d.created_at);
  const averageSalesCycleDays = wonDeals.length > 0
    ? Math.round(
        wonDeals.reduce((sum, d) => {
          const created = new Date(d.created_at);
          const closed = new Date(d.expected_close_date);
          const days = Math.max(1, (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / wonDeals.length
      )
    : 0;

  return {
    openDealsCount,
    openDealsValue,
    closingThisMonthCount,
    closingThisMonthValue,
    overdueTasks,
    pipelineValue,
    taskCompletionRate,
    averageSalesCycleDays
  };
}

export async function getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: deals } = await supabase
    .from('deals')
    .select('amount, status, expected_close_date')
    .eq('user_id', user.id)
    .eq('status', 'closed-won');

  // Group by month for last 6 months
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString(undefined, { month: "short" }),
      date
    };
  });

  return months.map(month => {
    const monthRevenue = (deals || [])
      .filter(d => {
        const closeDate = new Date(d.expected_close_date);
        return closeDate.getFullYear() === month.date.getFullYear() && 
               closeDate.getMonth() === month.date.getMonth();
      })
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    return {
      month: month.label,
      revenue: monthRevenue
    };
  });
}

export async function getWonLostData(): Promise<WonLostData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: deals } = await supabase
    .from('deals')
    .select('status, expected_close_date')
    .eq('user_id', user.id)
    .in('status', ['closed-won', 'closed-lost']);

  // Group by month for last 6 months
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString(undefined, { month: "short" }),
      date
    };
  });

  return months.map(month => {
    const monthDeals = (deals || []).filter(d => {
      const closeDate = new Date(d.expected_close_date);
      return closeDate.getFullYear() === month.date.getFullYear() && 
             closeDate.getMonth() === month.date.getMonth();
    });

    const won = monthDeals.filter(d => d.status === 'closed-won').length;
    const lost = monthDeals.filter(d => d.status === 'closed-lost').length;

    return {
      month: month.label,
      won,
      lost
    };
  });
}

export async function getPipelineByStage(): Promise<PipelineByStage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: deals } = await supabase
    .from('deals')
    .select('amount, status')
    .eq('user_id', user.id)
    .not('status', 'in', '(closed-won,closed-lost)');

  const stages = ['lead', 'in-progress', 'proposal-sent', 'negotiation'];
  
  return stages.map(stage => {
    const stageValue = (deals || [])
      .filter(d => d.status === stage)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    return {
      stage,
      value: stageValue
    };
  });
}