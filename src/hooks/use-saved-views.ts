import { useEffect, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import type { LifecycleStage } from "@/lib/lifecycle"

export type SavedView = {
  id: string
  name: string
  stages: LifecycleStage[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "crm-saved-views"

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function persist(views: SavedView[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    // ignore
  }
}

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([])

  // Load on mount
  useEffect(() => {
    setViews(loadViews())
  }, [])

  // Persist on change
  useEffect(() => {
    persist(views)
  }, [views])

  const addView = (name: string, stages: LifecycleStage[]) => {
    const now = new Date().toISOString()
    const newView: SavedView = {
      id: uuidv4(),
      name: name.trim() || "Untitled view",
      stages,
      createdAt: now,
      updatedAt: now,
    }
    setViews((prev) => [...prev, newView])
  }

  const renameView = (id: string, newName: string) => {
    setViews((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, name: newName.trim() || v.name, updatedAt: new Date().toISOString() } : v
      )
    )
  }

  const deleteView = (id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id))
  }

  const updateViewStages = (id: string, stages: LifecycleStage[]) => {
    setViews((prev) =>
      prev.map((v) => (v.id === id ? { ...v, stages, updatedAt: new Date().toISOString() } : v))
    )
  }

  const getViewById = (id: string) => views.find((v) => v.id === id)

  return { views, addView, renameView, deleteView, updateViewStages, getViewById }
}
