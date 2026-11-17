"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface DownloadInvoiceButtonProps {
  cycleId: string;
  tenantId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function DownloadInvoiceButton({
  cycleId,
  tenantId,
  variant = "outline",
  size = "sm",
  label = "Download Invoice",
}: DownloadInvoiceButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);

      const url = `/api/invoices/${cycleId}${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);

      if (!res.ok) {
        const data = await res.json();
        console.error("Invoice error:", data.error);
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const disposition = res.headers.get("Content-Disposition");
      const filename =
        disposition?.match(/filename="(.+)"/)?.[1] || "invoice.pdf";

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();

      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      ) : (
        <Download className="mr-2 h-3 w-3" />
      )}
      {label}
    </Button>
  );
}
