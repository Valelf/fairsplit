export function newBillEmail(params: {
  tenantName: string;
  category: string;
  provider: string;
  amountCents: number;
  propertyName: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const amount = (params.amountCents / 100).toFixed(2);
  return {
    subject: `New ${params.category} bill added - ${params.propertyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Bill Added</h2>
        <p>Hi ${params.tenantName},</p>
        <p>A new <strong>${params.category}</strong> bill has been added for <strong>${params.propertyName}</strong>:</p>
        <table style="margin: 16px 0; border-collapse: collapse;">
          <tr><td style="padding: 4px 16px 4px 0; color: #666;">Provider</td><td>${params.provider}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #666;">Total Amount</td><td>$${amount}</td></tr>
        </table>
        <p>Your share has been calculated. View details on your dashboard:</p>
        <p style="margin: 24px 0;">
          <a href="${params.dashboardUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Bill
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">FairSplit - Fair Utility Bill Splitting</p>
      </div>
    `,
  };
}
