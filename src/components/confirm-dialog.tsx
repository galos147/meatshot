"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";

/**
 * Confirmation for consequential actions. With `requireReason`, the user must type a
 * reason, which is passed to the action and recorded in the ledger / audit log.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "אישור",
  destructive = false,
  requireReason = false,
  reasonLabel = "סיבה (חובה)",
  onConfirm,
  successMessage,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<ActionResult<unknown>>;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const confirm = (e: React.MouseEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await onConfirm(reason.trim());
      if (res.ok) {
        if (successMessage) toast.success(successMessage);
        setOpen(false);
        setReason("");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {requireReason && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="confirm-reason">{reasonLabel}</label>
            <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={pending || (requireReason && reason.trim().length === 0)}
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
          >
            {pending && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
