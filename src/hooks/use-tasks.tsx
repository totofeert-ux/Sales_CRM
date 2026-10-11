import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createTask, updateTask as updateTaskDB, deleteTask, getTasks } from "@/lib/services/supabase-tasks";
import { useToast } from "@/hooks/use-toast";

export type TaskType = "task" | "meeting";
export type TaskStatus = "pending" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  dueAt: string; // ISO string
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  clientId?: string;
  notes?: string;
  durationMinutes?: number; // optional duration for calendar sizing
}

interface CreateTaskInput {
  title: string;
  dueAt: Date; // combine date + time before calling
  priority?: TaskPriority;
  clientId?: string;
  notes?: string;
  type?: TaskType;
  durationMinutes?: number;
}

interface UpdateTaskInput extends Partial<Omit<Task, "id">> {
  id: string;
}

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  addTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  moveTask: (id: string, newDate: Date) => Promise<void>;
  getById: (id: string) => Task | undefined;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

const STORAGE_KEY = "solocrm.tasks";

const seedTasks = (): Task[] => {
  const now = new Date();
  const today9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  const today14 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30, 0);
  const tomorrow11 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0, 0);
  return [
    {
      id: uuidv4(),
      title: "Follow up with TechStart",
      dueAt: today9.toISOString(),
      type: "task",
      status: "pending",
      priority: "medium",
      clientId: "1",
      notes: "Call about proposal feedback",
      durationMinutes: 30,
    },
    {
      id: uuidv4(),
      title: "Project kickoff meeting",
      dueAt: today14.toISOString(),
      type: "meeting",
      status: "pending",
      priority: "high",
      clientId: "2",
      durationMinutes: 60,
    },
    {
      id: uuidv4(),
      title: "Send contract",
      dueAt: tomorrow11.toISOString(),
      type: "task",
      status: "pending",
      priority: "low",
      clientId: "3",
      durationMinutes: 30,
    },
  ];
};

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load tasks from Supabase on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await getTasks();
        setTasks(data);
      } catch (error) {
        console.error('Failed to load tasks:', error);
        toast({
          title: "Error loading tasks",
          description: "Please refresh the page to try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [toast]);

  const addTask = useCallback(async (input: CreateTaskInput) => {
    try {
      const newTask = await createTask(input);
      setTasks((prev) => [newTask, ...prev]);
      toast({
        title: "Task created",
        description: `"${newTask.title}" has been added.`
      });
      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: "Error creating task",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const updateTask = useCallback(async (input: UpdateTaskInput) => {
    try {
      await updateTaskDB(input);
      setTasks((prev) => prev.map((t) => (t.id === input.id ? { ...t, ...input, dueAt: input.dueAt ?? t.dueAt } : t)));
      toast({
        title: "Task updated",
        description: "Changes have been saved."
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({
        title: "Error updating task",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const removeTask = useCallback(async (id: string) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast({
        title: "Task deleted",
        description: "Task has been removed."
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({
        title: "Error deleting task",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const toggleStatus = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const newStatus = task.status === "done" ? "pending" : "done";
    try {
      await updateTaskDB({ id, status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
      toast({
        title: newStatus === "done" ? "Task completed" : "Task reopened",
        description: `"${task.title}" status updated.`
      });
    } catch (error) {
      console.error('Failed to toggle task status:', error);
      toast({
        title: "Error updating task",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  }, [tasks, toast]);

  const moveTask = useCallback(async (id: string, newDate: Date) => {
    try {
      await updateTaskDB({ id, dueAt: newDate.toISOString() });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, dueAt: newDate.toISOString() } : t)));
    } catch (error) {
      console.error('Failed to move task:', error);
      toast({
        title: "Error moving task",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const getById = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);

  const value = useMemo(
    () => ({ tasks, loading, addTask, updateTask, removeTask, toggleStatus, moveTask, getById }),
    [tasks, loading, addTask, updateTask, removeTask, toggleStatus, moveTask, getById]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};

export const useTasks = () => {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
};
