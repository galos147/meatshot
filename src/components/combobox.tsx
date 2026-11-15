"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string; hint?: string; keywords?: string[]; disabled?: boolean };

/** Searchable select for long lists (products, locations...). */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "בחירה...",
  searchPlaceholder = "חיפוש...",
  emptyText = "לא נמצאו תוצאות",
  allowClear = false,
  className,
  id,
  invalid,
  disabled,
}: {
  options: ComboOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  className?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn("h-10 w-full justify-between bg-transparent px-3 font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command filter={(itemValue, search, keywords) => {
          const hay = [itemValue, ...(keywords ?? [])].join(" ").toLowerCase();
          return search.toLowerCase().split(/\s+/).every((t) => hay.includes(t)) ? 1 : 0;
        }}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowClear && value && (
                <CommandItem value="__clear__" onSelect={() => { onChange(null); setOpen(false); }} className="text-muted-foreground">
                  ללא
                </CommandItem>
              )}
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label + " " + o.value}
                  keywords={o.keywords}
                  disabled={o.disabled}
                  onSelect={() => { onChange(o.value); setOpen(false); }}
                >
                  <Check className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
