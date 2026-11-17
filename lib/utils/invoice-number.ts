export function generateInvoiceNumber(
  propertyName: string,
  cycleLabel: string,
  tenantName: string
): string {
  const sanitize = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);

  const propCode = sanitize(propertyName) || "PROP";
  const cycleCode = sanitize(cycleLabel) || "CYC";
  const tenantCode = sanitize(tenantName) || "TNT";

  return `INV-${propCode}-${cycleCode}-${tenantCode}`;
}
