import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  invoiceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  infoBlock: {},
  infoLabel: {
    fontSize: 8,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  infoDetail: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  col1: { width: "25%" },
  col2: { width: "20%" },
  col3: { width: "25%" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "15%", textAlign: "right" },
  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 10,
  },
  cellMuted: {
    fontSize: 9,
    color: "#666",
  },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: "#1a1a1a",
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    width: "85%",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    paddingRight: 10,
  },
  totalValue: {
    width: "15%",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
});

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const date = (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + "T00:00:00Z") : new Date(dateStr));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface InvoiceBill {
  category: string;
  provider: string;
  serviceStart: string;
  serviceEnd: string;
  totalAmountCents: number;
  tenantAmountCents: number;
  personDays: number;
  totalPersonDays: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  propertyName: string;
  propertyAddress: string;
  cycleLabel: string;
  tenantName: string;
  tenantEmail: string;
  bills: InvoiceBill[];
  totalCents: number;
  generatedAt: string;
}

export function InvoicePdf({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>FairSplit</Text>
          <Text style={styles.subtitle}>Utility Bill Invoice</Text>
        </View>

        <View style={styles.invoiceInfo}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Invoice Number</Text>
            <Text style={styles.infoValue}>{data.invoiceNumber}</Text>
            <Text style={styles.infoDetail}>
              Generated {formatDate(data.generatedAt)}
            </Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Property</Text>
            <Text style={styles.infoValue}>{data.propertyName}</Text>
            <Text style={styles.infoDetail}>{data.propertyAddress}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{data.tenantName}</Text>
            <Text style={styles.infoDetail}>{data.tenantEmail}</Text>
          </View>
        </View>

        <Text style={{ ...styles.infoLabel, marginBottom: 8 }}>
          Billing Cycle: {data.cycleLabel}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.col1}>
              <Text style={styles.headerText}>Category</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.headerText}>Provider</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.headerText}>Period</Text>
            </View>
            <View style={styles.col4}>
              <Text style={styles.headerText}>Total</Text>
            </View>
            <View style={styles.col5}>
              <Text style={styles.headerText}>Your Share</Text>
            </View>
          </View>

          {data.bills.map((bill, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.col1}>
                <Text style={styles.cellText}>
                  {bill.category.charAt(0).toUpperCase() +
                    bill.category.slice(1)}
                </Text>
              </View>
              <View style={styles.col2}>
                <Text style={styles.cellText}>{bill.provider}</Text>
              </View>
              <View style={styles.col3}>
                <Text style={styles.cellMuted}>
                  {formatDate(bill.serviceStart)} -{" "}
                  {formatDate(bill.serviceEnd)}
                </Text>
                <Text style={{ ...styles.cellMuted, fontSize: 7 }}>
                  {bill.personDays} / {bill.totalPersonDays} days
                </Text>
              </View>
              <View style={styles.col4}>
                <Text style={styles.cellText}>
                  {formatCurrency(bill.totalAmountCents)}
                </Text>
              </View>
              <View style={styles.col5}>
                <Text style={{ ...styles.cellText, fontFamily: "Helvetica-Bold" }}>
                  {formatCurrency(bill.tenantAmountCents)}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Due:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.totalCents)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by FairSplit - Fair Utility Bill Splitting
          </Text>
        </View>
      </Page>
    </Document>
  );
}
