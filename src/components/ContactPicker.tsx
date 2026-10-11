import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Portal } from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";

type Contact = { id: string; company_name?: string; contact_name?: string; email?: string };
type Props = {
  value: string | null;
  onChange: (id: string, contact?: Contact) => void;
  contacts: Contact[];
  disabled?: boolean;
  placeholder?: string;
};

export function ContactPicker({ value, onChange, contacts, disabled, placeholder = "Search contacts..." }: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(
    () => contacts.find(c => c.id === value) ?? null,
    [contacts, value]
  );

  const handleSelect = React.useCallback((c: Contact) => {
    if (!c?.id) return;
    // delay close a tick to avoid unmount race in nested dialogs
    requestAnimationFrame(() => {
      onChange(c.id, c);
      setOpen(false);
    });
  }, [onChange]);

  // Fallback simple picker to unblock local work instantly
  if (import.meta.env.VITE_SIMPLE_PICKER === "1") {
    return (
      <select
        disabled={disabled}
        className="w-full border rounded-md px-3 py-2"
        value={value ?? ""}
        onChange={(e) => {
          const id = e.target.value || null;
          const c = contacts.find(x => x.id === id) as Contact | undefined;
          if (id) onChange(id, c);
        }}
      >
        <option value="">{placeholder}</option>
        {contacts.map(c => (
          <option key={c.id} value={c.id}>
            {c.company_name ?? c.contact_name ?? c.email ?? c.id}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        {/* EXACTLY ONE child element */}
        <button
          type="button"
          disabled={disabled}
          className="w-full border rounded-md px-3 py-2 flex items-center justify-between text-left"
          data-testid="contact-picker-trigger"
          onClick={() => setOpen(v => !v)}
        >
          <span className="truncate">
            {selected?.company_name ?? selected?.contact_name ?? placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
        </button>
      </PopoverTrigger>

      {/* Render to body so it's above Dialog overlay */}
      <Portal>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          forceMount
          className="w-[360px] p-0 z-[9999] pointer-events-auto bg-popover border rounded-md shadow-md"
          data-testid="contact-popover"
        >
          <Command shouldFilter>
            <div className="px-3 pt-2">
              <CommandInput
                placeholder="Search contacts…"
                autoFocus
                data-testid="contact-search-input"
              />
            </div>
            <CommandList className="max-h-64 overflow-auto">
              <CommandEmpty>No contacts found</CommandEmpty>
              {contacts.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  data-testid={`contact-item-${c.id}`}
                  onMouseDown={(e) => e.preventDefault()}  // prevents blur-close before selection
                  onSelect={() => handleSelect(c)}
                  onClick={() => handleSelect(c)}          // safety for mouse users
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {c.company_name ?? c.contact_name ?? c.email ?? c.id}
                    </span>
                    {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
