import { useCallback } from "react";
import { useContacts } from "./use-contacts";
import { useDeals, DealStage } from "./use-deals";
import { useToast } from "./use-toast";
import { recomputeContactLifecycle } from "@/lib/lifecycle-automation";

export function useLifecycleAutomation() {
  const { contacts, updateLifecycle, getById: getContact } = useContacts();
  const { deals } = useDeals();
  const { toast } = useToast();

  const recomputeForContact = useCallback(async (contactId: string) => {
    const contact = getContact(contactId);
    if (!contact) return;

    const contactDeals = deals.filter(d => d.clientId === contactId);
    const dealStages = contactDeals.map(d => d.stage);
    
    const result = recomputeContactLifecycle({
      contactId,
      allDeals: contactDeals,
      getContactStage: (id: string) => getContact(id)?.lifecycle_stage,
      updateLifecycle: (id: string, stage) => {
        updateLifecycle(id, stage);
      },
      toast: ({ title, description }) => {
        toast({ title, description });
      }
    });

    return result;
  }, [contacts, deals, getContact, updateLifecycle, toast]);

  return { recomputeForContact };
}