export function cycleClosedEmail(params: {
  tenantName: string;
  cycleLabel: string;
  propertyName: string;
  totalOwedCents: number;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const amount = (params.totalOwedCents / 100).toFixed(2);
  return {
    subject: `Billing cycle closed: ${params.cycleLabel} - ${params.propertyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Billing Cycle Closed</h2>
        <p>Hi ${params.tenantName},</p>
        <p>The billing cycle <strong>${params.cycleLabel}</strong> for <strong>${params.propertyName}</strong> has been finalized.</p>
        <p style="font-size: 24px; font-weight: bold; margin: 16px 0;">Your total: $${amount}</p>
        <p>View your full breakdown on the dashboard:</p>
        <p style="margin: 24px 0;">
          <a href="${params.dashboardUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Details
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">FairSplit - Fair Utility Bill Splitting</p>
      </div>
    `,
  };
}
