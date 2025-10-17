// client/src/components/DepartmentCombobox.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandEmpty,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type Department = { id: number; name: string };

type Props = {
  value?: number;
  departments: Department[];
  onChange: (id: number) => void;
  /** se usa para “mutear” el mapa desde el padre */
  onOpenStateChange?: (open: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function DepartmentCombobox({
  value,
  departments,
  onChange,
  onOpenStateChange,
  disabled,
  placeholder = "Seleccione un departamento...",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [triggerW, setTriggerW] = React.useState<number>(0);

  React.useEffect(() => {
    const w = triggerRef.current?.offsetWidth ?? 0;
    setTriggerW(w);
  }, []);

  const selected = value ? departments.find((d) => d.id === value)?.name : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenStateChange?.(o);
        // re-medir por si cambia en responsive
        setTimeout(() => setTriggerW(triggerRef.current?.offsetWidth ?? 0), 0);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="location-select justify-between"
        >
          {selected ?? placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* Forzamos portal + z-index + ancho del trigger */}
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        collisionPadding={16}
        className="p-0 consultation-dropdown"
        style={{ width: triggerW || undefined, zIndex: 9_999 }}
      >
        <Command>
          <CommandInput placeholder="Buscar departamento..." />
          <CommandList>
            <CommandEmpty>No se encontró.</CommandEmpty>
            <CommandGroup>
              {departments.map((d) => (
                <CommandItem
                  key={d.id}
                  value={d.name}
                  onSelect={() => {
                    onChange(d.id);
                    setOpen(false);
                    onOpenStateChange?.(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === d.id ? "opacity-100" : "opacity-0")} />
                  {d.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
