"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBill } from "@/lib/actions/bills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Sparkles, Info } from "lucide-react";
import Link from "next/link";
import { PdfUploadZone } from "@/components/shared/pdf-upload-zone";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";

interface PageProps {
  params: { propertyId: string };
}

type ConfidenceLevel = "high" | "medium" | "low";
type FieldConfidence = Record<string, ConfidenceLevel>;

export default function NewBillPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cycleId = searchParams.get("cycleId") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("internet");
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<FieldConfidence>({});
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleParsePdf() {
    if (!pdfFile) return;

    setParsing(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch("/api/bills/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.fallback) {
        setParseError(
          result.message || "PDF parsing not configured. Enter details manually."
        );
        setParsing(false);
        return;
      }

      if (result.error) {
        setParseError(result.error);
        setParsing(false);
        return;
      }

      const data = result.data;

      // Pre-fill form fields
      if (data.category) setCategory(data.category);
      if (data.confidence) setConfidence(data.confidence);

      if (formRef.current) {
        const form = formRef.current;
        if (data.provider) {
          const providerInput = form.querySelector<HTMLInputElement>('[name="provider"]');
          if (providerInput) providerInput.value = data.provider;
        }
        if (data.amount) {
          const amountInput = form.querySelector<HTMLInputElement>('[name="amount"]');
          if (amountInput) amountInput.value = data.amount.toString();
        }
        if (data.service_start) {
          const startInput = form.querySelector<HTMLInputElement>('[name="service_start"]');
          if (startInput) startInput.value = data.service_start;
        }
        if (data.service_end) {
          const endInput = form.querySelector<HTMLInputElement>('[name="service_end"]');
          if (endInput) endInput.value = data.service_end;
        }
      }
    } catch {
      setParseError("Failed to parse PDF. Enter details manually.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const amountDollars = parseFloat(formData.get("amount") as string);

    if (isNaN(amountDollars) || amountDollars <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    const amountCents = Math.round(amountDollars * 100);

    const result = await createBill({
      cycle_id: cycleId,
      property_id: params.propertyId,
      category: category as "internet" | "electricity" | "water" | "other",
      provider: formData.get("provider") as string,
      amount_cents: amountCents,
      service_start: formData.get("service_start") as string,
      service_end: formData.get("service_end") as string,
      source: pdfPath ? "pdf_parsed" : "manual",
      pdf_storage_path: pdfPath || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(
        `/dashboard/owner/properties/${params.propertyId}/cycles/${cycleId}`
      );
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/dashboard/owner/properties/${params.propertyId}/cycles/${cycleId}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Bill</h1>
          <p className="text-muted-foreground">
            Enter the bill details to calculate splits
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bill Details</CardTitle>
          <CardDescription>
            All amounts are in dollars. Splits will be calculated automatically
            based on tenant occupancy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>PDF Bill (Optional)</Label>
              <PdfUploadZone
                propertyId={params.propertyId}
                onUploadComplete={(path) => setPdfPath(path)}
                onRemove={() => {
                  setPdfPath(null);
                  setPdfFile(null);
                  setConfidence({});
                  setParseError(null);
                }}
                currentPath={pdfPath}
                onFileSelected={(file) => setPdfFile(file)}
              />
              {pdfPath && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleParsePdf}
                  disabled={parsing || !pdfFile}
                  className="mt-2"
                >
                  {parsing ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3 w-3" />
                  )}
                  {parsing ? "Parsing..." : "Parse Bill with AI"}
                </Button>
              )}
              {parseError && (
                <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{parseError}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="category">Category</Label>
                  {confidence.category && (
                    <ConfidenceBadge level={confidence.category} />
                  )}
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="provider">Provider</Label>
                  {confidence.provider && (
                    <ConfidenceBadge level={confidence.provider} />
                  )}
                </div>
                <Input
                  id="provider"
                  name="provider"
                  placeholder="e.g. Spectrum"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="amount">Amount ($)</Label>
                {confidence.amount && (
                  <ConfidenceBadge level={confidence.amount} />
                )}
              </div>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="95.49"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="service_start">Service Start</Label>
                  {confidence.service_start && (
                    <ConfidenceBadge level={confidence.service_start} />
                  )}
                </div>
                <Input
                  id="service_start"
                  name="service_start"
                  type="date"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="service_end">Service End</Label>
                  {confidence.service_end && (
                    <ConfidenceBadge level={confidence.service_end} />
                  )}
                </div>
                <Input
                  id="service_end"
                  name="service_end"
                  type="date"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Any additional notes about this bill"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Bill
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link
                  href={`/dashboard/owner/properties/${params.propertyId}/cycles/${cycleId}`}
                >
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
