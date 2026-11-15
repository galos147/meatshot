"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Prints the current page; the print stylesheet hides navigation. Also used for "export to PDF". */
export function PrintButton({ label = "הדפסה / PDF" }: { label?: string }) {
  return (
    <Button variant="outline" size="lg" className="no-print" onClick={() => window.print()}>
      <Printer />{label}
    </Button>
  );
}
