import { Beef } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.58_0.19_25)] to-[oklch(0.4_0.15_20)] text-white shadow-md shadow-primary/30 ring-1 ring-white/15">
        <Beef className="size-5" strokeWidth={2.25} />
      </div>
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="text-[1.05rem] font-black tracking-tight" dir="ltr">
            MEAT<span className="text-[oklch(0.68_0.17_28)]">STOCK</span>
          </span>
          <span className="mt-1 text-[0.68rem] font-medium opacity-60">ניהול חנות מפעל</span>
        </div>
      )}
    </div>
  );
}
