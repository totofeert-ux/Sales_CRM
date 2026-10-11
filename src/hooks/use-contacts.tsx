import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LIFECYCLE_STAGES, LifecycleStage, STAGE_LABELS } from "@/lib/lifecycle";
import { createContact, updateContact as updateContactDB, deleteContact, getContacts } from "@/lib/services/supabase-contacts";
import { useToast } from "@/hooks/use-toast";

export type Contact = {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  sector?: string;
  tags: string[];
  lastActivity?: string;
  lifecycle_stage: LifecycleStage;
  createdAt?: string;
  updatedAt?: string;
};

const initialContacts: Contact[] = [
  {
    id: "1",
    companyName: "TechStart SAS",
    contactName: "Marie Dubois",
    email: "marie@techstart.fr",
    phone: "+33 1 23 45 67 89",
    sector: "Technology",
    tags: ["VIP", "Q4"],
    lastActivity: "Call 2 days ago",
    lifecycle_stage: "qualified",
  },
  {
    id: "2",
    companyName: "Design Studio",
    contactName: "Paul Martin",
    email: "paul@designstudio.com",
    phone: "+33 6 12 34 56 78",
    sector: "Design",
    tags: ["Hot", "Follow-up"],
    lastActivity: "Meeting 1 week ago",
    lifecycle_stage: "qualifying",
  },
  {
    id: "3",
    companyName: "Local Bakery",
    contactName: "Sophie Laurent",
    email: "sophie@bakery.fr",
    phone: "+33 2 98 76 54 32",
    sector: "Food",
    tags: ["Small Business"],
    lastActivity: "Email 3 days ago",
    lifecycle_stage: "won",
  },
];

const STORAGE_KEY = "contacts-store";

type ContactsContextValue = {
  contacts: Contact[];
  loading: boolean;
  getById: (id: string) => Contact | undefined;
  addContact: (data: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<Contact>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  updateLifecycle: (id: string, stage: LifecycleStage) => void;
  stageLabel: (s: LifecycleStage) => string;
};

const ContactsContext = createContext<ContactsContextValue | undefined>(undefined);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load contacts from Supabase on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const data = await getContacts();
        setContacts(data);
      } catch (error) {
        console.error('Failed to load contacts:', error);
        toast({
          title: "Error loading contacts",
          description: "Please refresh the page to try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [toast]);

  const getById = (id: string) => contacts.find((c) => c.id === id);

  const addContact: ContactsContextValue["addContact"] = async (data) => {
    try {
      const newContact = await createContact({
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        tags: data.tags,
        lifecycleStage: data.lifecycle_stage
      });
      setContacts((prev) => [newContact, ...prev]);
      toast({
        title: "Contact created",
        description: `${newContact.companyName || newContact.contactName} has been added.`
      });
      return newContact;
    } catch (error) {
      console.error('Failed to create contact:', error);
      toast({
        title: "Error creating contact",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateContact: ContactsContextValue["updateContact"] = async (id, data) => {
    try {
      await updateContactDB({ 
        id, 
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        tags: data.tags,
        lifecycleStage: data.lifecycle_stage
      });
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      toast({
        title: "Contact updated",
        description: "Changes have been saved."
      });
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast({
        title: "Error updating contact",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteContactFn: ContactsContextValue["deleteContact"] = async (id) => {
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast({
        title: "Contact deleted",
        description: "Contact has been removed."
      });
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast({
        title: "Error deleting contact",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateLifecycle: ContactsContextValue["updateLifecycle"] = (id, stage) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, lifecycle_stage: stage, updatedAt: new Date().toISOString() } : c))
    );
  };

  const stageLabel = (s: LifecycleStage) => STAGE_LABELS[s];

  const value = useMemo(
    () => ({ 
      contacts, 
      loading, 
      getById, 
      addContact, 
      updateContact, 
      deleteContact: deleteContactFn, 
      updateLifecycle, 
      stageLabel 
    }),
    [contacts, loading, addContact, updateContact, deleteContactFn, updateLifecycle]
  );

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
  return ctx;
}

export { LIFECYCLE_STAGES };
export type { LifecycleStage };
