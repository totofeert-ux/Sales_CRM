import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEAL_STAGE_OPTIONS, DealStatus, dealStageBadgeClasses } from "@/lib/deal-status";

interface UpdateDealStageModalProps {
  dealId: string;
  currentStage: DealStatus;
  dealTitle: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateDealStageModal({
  dealId,
  currentStage,
  dealTitle,
  open,
  onClose,
  onSuccess,
}: UpdateDealStageModalProps) {
  const [selectedStage, setSelectedStage] = useState<DealStatus>(currentStage);
  const [lostReason, setLostReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedStage) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: any = {
        status: selectedStage,
      };

      // Handle closed stages
      if (selectedStage === "won" || selectedStage === "lost") {
        updateData.closed_at = new Date().toISOString();
      } else {
        updateData.closed_at = null;
      }

      // Handle lost reason
      if (selectedStage === "lost") {
        updateData.lost_reason = lostReason || null;
      } else {
        updateData.lost_reason = null;
      }

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId)
        .eq('user_id', user.id);

      if (error) throw error;

      const stageLabel = DEAL_STAGE_OPTIONS.find(s => s.value === selectedStage)?.label || selectedStage;
      toast({
        title: "Deal stage updated",
        description: `"${dealTitle}" is now in ${stageLabel} stage.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update deal stage:', error);
      toast({
        title: "Error updating deal stage",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedStage(currentStage);
    setLostReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Deal Stage</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Update the stage for "{dealTitle}"
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Current Stage</Label>
            <div className="mt-1">
              <Badge className={dealStageBadgeClasses(currentStage)}>
                {DEAL_STAGE_OPTIONS.find(s => s.value === currentStage)?.label || currentStage}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">New Stage</Label>
            <RadioGroup
              value={selectedStage}
              onValueChange={(value) => setSelectedStage(value as DealStatus)}
              className="mt-2"
            >
              {DEAL_STAGE_OPTIONS.map((stage) => (
                <div key={stage.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={stage.value} id={stage.value} />
                  <Label htmlFor={stage.value} className="flex items-center gap-2 cursor-pointer">
                    <Badge className={dealStageBadgeClasses(stage.value)}>
                      {stage.label}
                    </Badge>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedStage === "lost" && (
            <div>
              <Label htmlFor="lostReason" className="text-sm font-medium">
                Lost Reason (Optional)
              </Label>
              <Textarea
                id="lostReason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Why was this deal lost?"
                className="mt-1"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStage || isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}