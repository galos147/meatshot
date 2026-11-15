"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs */
import { useMemo, useRef, useState } from "react";
import { Beef, ScanBarcode, Search, ShieldCheck, ShoppingCart, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pill } from "@/components/status";
import { formatCurrency, formatKg } from "@/lib/format";
import { cartTotals } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { stockKey } from "@/features/sales/allocate";
import { AddItemDialog } from "./add-item-dialog";
import { CartPanel } from "./cart-panel";
import { SaleCompleteDialog, type CompletedSale } from "./sale-complete-dialog";
import type { CartLine, Option, PosProduct } from "./pos-types";

export function PointOfSale({
  products,
  kosherBodies,
  categories,
}: {
  products: PosProduct[];
  kosherBodies: Option[];
  categories: (Option & { color: string | null })[];
}) {
  const [kosherIds, setKosherIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picking, setPicking] = useState<PosProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [completed, setCompleted] = useState<CompletedSale | null>(null);
  const [saleKey, setSaleKey] = useState(() => crypto.randomUUID());
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!category || p.categoryId === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode === q),
    );
  }, [products, query, category]);

  const reserved = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of cart) {
      const k = stockKey({ batch_id: l.batchId, location_id: l.locationId });
      m.set(k, (m.get(k) ?? 0) + l.qtyKg);
    }
    return m;
  }, [cart]);

  const mismatched = new Set(kosherIds.length ? cart.filter((l) => !kosherIds.includes(l.kosherBodyId)).map((l) => l.key) : []);
  const totals = cartTotals(cart.map((l) => ({ qtyKg: l.qtyKg, pricePerKg: l.pricePerKg, discount: l.discount })));

  // A barcode scanner types the code and presses Enter.
  const onSearchEnter = () => {
    const q = query.trim();
    const exact = products.find((p) => p.barcode === q || p.sku.toLowerCase() === q.toLowerCase());
    const pick = exact ?? (visible.length === 1 ? visible[0] : null);
    if (pick) {
      setPicking(pick);
      setQuery("");
    }
  };

  const addLines = (lines: Omit<CartLine, "key">[]) => {
    setCart((c) => [...c, ...lines.map((l) => ({ ...l, key: crypto.randomUUID() }))]);
    setPicking(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const toggleKosher = (id: string) => setKosherIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const resetSale = () => {
    setCart([]);
    setKosherIds([]);
    setSaleKey(crypto.randomUUID());
    setCompleted(null);
    setCartOpen(false);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const cartPanel = (
    <CartPanel
      cart={cart}
      mismatched={mismatched}
      kosherIds={kosherIds}
      kosherBodies={kosherBodies}
      saleKey={saleKey}
      onRemove={(key) => setCart((c) => c.filter((l) => l.key !== key))}
      onClear={() => setCart([])}
      onCompleted={(sale) => { setCompleted(sale); setCartOpen(false); }}
    />
  );

  return (
    <div className="-m-4 grid min-h-[calc(100svh-3.5rem)] md:-m-6 lg:-m-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
      {/* Catalogue */}
      <section className="min-w-0 space-y-4 p-4 pb-28 md:p-6 lg:pb-6">
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" />
            דרישת הכשר למכירה
            <span className="font-normal text-muted-foreground">– יוצעו רק אצוות בהכשר שנבחר</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKosherIds([])}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
                kosherIds.length === 0 ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              ללא דרישה
            </button>
            {kosherBodies.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => toggleKosher(b.value)}
                className={cn(
                  "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
                  kosherIds.includes(b.value) ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40" : "bg-background hover:bg-muted",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 start-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchEnter()}
            placeholder='חיפוש מוצר, מק"ט או סריקת ברקוד...'
            className="h-14 rounded-2xl bg-card ps-12 pe-12 text-lg shadow-xs"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="absolute top-1/2 end-4 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="ניקוי">
              <X className="size-5" />
            </button>
          ) : (
            <ScanBarcode className="pointer-events-none absolute top-1/2 end-4 size-5 -translate-y-1/2 text-muted-foreground/60" />
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <CategoryChip active={!category} onClick={() => setCategory(null)} label="הכול" />
            {categories.map((c) => (
              <CategoryChip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)} label={c.label} color={c.color} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((p) => {
            const out = p.sellableKg <= 0;
            const inCart = cart.filter((l) => l.productId === p.id).reduce((s, l) => s + l.qtyKg, 0);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPicking(p)}
                disabled={out}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-start shadow-xs transition-all",
                  out ? "cursor-not-allowed opacity-50" : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0",
                )}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[oklch(0.93_0.03_25)] to-[oklch(0.97_0.015_60)] dark:from-[oklch(0.3_0.05_25)] dark:to-[oklch(0.22_0.02_30)]">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="grid size-full place-items-center"><Beef className="size-10 text-primary/35" /></div>
                  )}
                  {inCart > 0 && (
                    <Badge className="absolute top-2 start-2 gap-1 shadow"><ShoppingCart className="size-3" /><span className="num">{formatKg(inCart)}</span></Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <div className="line-clamp-2 font-semibold leading-snug">{p.name}</div>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-1">
                    <span className="num text-lg font-bold text-primary">{formatCurrency(p.price)}<span className="text-xs font-normal text-muted-foreground"> /ק״ג</span></span>
                  </div>
                  {out ? <Pill tone="neutral">אזל</Pill> : <span className="num text-xs text-muted-foreground">זמין {formatKg(p.sellableKg)}</span>}
                </div>
              </button>
            );
          })}
        </div>
        {visible.length === 0 && <p className="py-16 text-center text-muted-foreground">לא נמצאו מוצרים</p>}
      </section>

      {/* Cart – side panel on desktop */}
      <aside className="hidden border-s bg-card lg:block">
        <div className="sticky top-14 flex h-[calc(100svh-3.5rem)] flex-col">{cartPanel}</div>
      </aside>

      {/* Cart – bottom bar + sheet on phone / tablet */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <Button size="lg" className="h-14 w-full justify-between text-base shadow-lg shadow-primary/25" onClick={() => setCartOpen(true)}>
          <span className="flex items-center gap-2"><ShoppingCart />סל ({cart.length})</span>
          <span className="num font-bold">{formatCurrency(totals.total)}</span>
        </Button>
      </div>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[92svh] gap-0 rounded-t-2xl p-0">
          <SheetHeader className="sr-only"><SheetTitle>סל קניות</SheetTitle></SheetHeader>
          {cartPanel}
        </SheetContent>
      </Sheet>

      <AddItemDialog product={picking} kosherIds={kosherIds} reserved={reserved} onClose={() => setPicking(null)} onAdd={addLines} />
      <SaleCompleteDialog sale={completed} onNewSale={resetSale} />
    </div>
  );
}

function CategoryChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string | null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
      )}
    >
      {color && <span className="size-2 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  );
}
