"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { toHebrewError } from "@/lib/errors";

const MAX_MB = { documents: 10, "product-images": 5 } as const;

/**
 * Uploads a file straight from the browser to a private Storage bucket (Storage RLS
 * decides who may upload), then hands the stored path to `onUploaded`.
 */
export function FileUploadButton({
  bucket,
  folder,
  accept,
  label = "העלאת קובץ",
  onUploaded,
  variant = "outline",
  size = "sm",
}: {
  bucket: keyof typeof MAX_MB;
  folder: string;
  accept: string;
  label?: string;
  onUploaded: (path: string, file: File) => Promise<void> | void;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (file.size > MAX_MB[bucket] * 1024 * 1024) {
      toast.error(`הקובץ גדול מדי (עד ${MAX_MB[bucket]}MB)`);
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      await onUploaded(path, file);
    } catch (e) {
      toast.error(toHebrewError(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button type="button" variant={variant} size={size} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Spinner /> : <Upload />}
        {label}
      </Button>
    </>
  );
}

/** Opens a private file through a short-lived signed URL. */
export function OpenFileButton({ bucket, path, label = "צפייה" }: { bucket: string; path: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    const { data, error } = await createClient().storage.from(bucket).createSignedUrl(path, 120);
    setBusy(false);
    if (error || !data) return toast.error(toHebrewError(error));
    window.open(data.signedUrl, "_blank", "noopener");
  };
  return (
    <Button type="button" variant="ghost" size="sm" onClick={open} disabled={busy}>
      {busy ? <Spinner /> : <FileText />}
      {label}
    </Button>
  );
}
