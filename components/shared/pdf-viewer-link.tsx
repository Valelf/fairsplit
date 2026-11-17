"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ExternalLink } from "lucide-react";

interface PdfViewerLinkProps {
  billId: string;
}

export function PdfViewerLink({ billId }: PdfViewerLinkProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      const res = await fetch(`/api/bills/${billId}/pdf`);
      const data = await res.json();

      if (res.ok && data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="h-7 gap-1 text-xs"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <FileText className="h-3 w-3" />
      )}
      PDF
      <ExternalLink className="h-2.5 w-2.5" />
    </Button>
  );
}
