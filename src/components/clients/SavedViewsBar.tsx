import { useState } from "react"
import type { SavedView } from "@/hooks/use-saved-views"
import type { LifecycleStage } from "@/lib/lifecycle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreVertical } from "lucide-react"

export type SavedViewsBarProps = {
  views: SavedView[]
  selectedViewId: string | null
  currentSelectedStages: LifecycleStage[]
  onSelect: (id: string | null) => void
  onCreate: (name: string) => void // uses currentSelectedStages from parent
  onRename: (id: string, newName: string) => void
  onDelete: (id: string) => void
  onUpdateStages: (id: string) => void // updates stages from parent's currentSelectedStages
}

export function SavedViewsBar({
  views,
  selectedViewId,
  currentSelectedStages,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onUpdateStages,
}: SavedViewsBarProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  return (
    <section className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <Button
          size="sm"
          variant={selectedViewId === null ? "default" : "outline"}
          onClick={() => onSelect(null)}
        >
          All
        </Button>
        {views.map((v) => (
          <div key={v.id} className="flex items-center">
            <Button
              size="sm"
              variant={selectedViewId === v.id ? "default" : "outline"}
              onClick={() => onSelect(v.id)}
              className="max-w-[200px] truncate"
              title={v.name}
            >
              {v.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 ml-1">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 z-50">
                <DropdownMenuItem
                  onClick={() => {
                    setRenameId(v.id)
                    setRenameValue(v.name)
                    setRenameOpen(true)
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStages(v.id)}>
                  Update from current filters
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(v.id)} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Save view
        </Button>
      </div>

      {/* Create view dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current filters as a view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">View name</label>
            <Input
              placeholder="e.g. Active Prospects"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Stages: {currentSelectedStages.length > 0 ? currentSelectedStages.join(", ") : "All"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onCreate(newViewName)
                setNewViewName("")
                setCreateOpen(false)
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">New name</label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renameId) onRename(renameId, renameValue)
                setRenameOpen(false)
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
