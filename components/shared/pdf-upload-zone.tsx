"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, X, FileText, Loader2 } from "lucide-react";

interface PdfUploadZoneProps {
  propertyId: string;
  onUploadComplete: (path: string) => void;
  onRemove: () => void;
  currentPath?: string | null;
  onFileSelected?: (file: File) => void;
}

export function PdfUploadZone({
  propertyId,
  onUploadComplete,
  onRemove,
  currentPath,
  onFileSelected,
}: PdfUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be under 10MB");
        return;
      }

      setUploading(true);
      setError(null);
      setFileName(file.name);
      onFileSelected?.(file);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", propertyId);

      try {
        const res = await fetch("/api/bills/upload-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Upload failed");
          setFileName(null);
        } else {
          onUploadComplete(data.path);
        }
      } catch {
        setError("Upload failed. Please try again.");
        setFileName(null);
      } finally {
        setUploading(false);
      }
    },
    [propertyId, onUploadComplete, onFileSelected]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave() {
    setDragActive(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  if (currentPath || fileName) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {fileName || "PDF uploaded"}
        </span>
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Uploading" />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Remove PDF"
            onClick={() => {
              setFileName(null);
              onRemove();
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/50"
        }`}
      >
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileUp className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mb-3 text-sm text-muted-foreground">
          Drag & drop a PDF bill, or
        </p>
        <label>
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={handleInputChange}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            asChild
          >
            <span className="cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Choose File"
              )}
            </span>
          </Button>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          PDF only, max 10MB
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
