import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAddDealModal } from "@/hooks/use-add-deal-modal"

export function FloatingActionButton() {
  const isMobile = useIsMobile()
  const { openAddDealModal } = useAddDealModal()
  
  if (!isMobile) return null
  
  return (
    <Button 
      size="lg"
      onClick={() => openAddDealModal()}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
    >
      <Plus className="h-6 w-6" />
    </Button>
  )
}