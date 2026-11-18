"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyTextButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
}

/** Copies a block of plain text to the clipboard and confirms it in place. */
export function CopyTextButton({ text, label = "Copy text", copiedLabel = "Copied" }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </Button>
  );
}
