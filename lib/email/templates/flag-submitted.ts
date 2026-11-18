import { escapeParams } from "@/lib/email/escape";

export function flagSubmittedEmail(params: {
  ownerName: string;
  tenantName: string;
  category: string;
  provider: string;
  reason: string;
  propertyName: string;
  flagsUrl: string;
}): { subject: string; html: string } {
  const e = escapeParams(params);
  return {
    subject: `Bill flagged: ${params.category} - ${params.propertyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Bill Flagged</h2>
        <p>Hi ${e.ownerName},</p>
        <p><strong>${e.tenantName}</strong> has flagged the <strong>${e.category}</strong> bill from <strong>${e.provider}</strong> at <strong>${e.propertyName}</strong>.</p>
        <div style="background: #f9f9f9; border-left: 4px solid #e0e0e0; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; color: #333;">${e.reason}</p>
        </div>
        <p>Review and respond to this flag:</p>
        <p style="margin: 24px 0;">
          <a href="${e.flagsUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Flag
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">FairSplit - Fair Utility Bill Splitting</p>
      </div>
    `,
  };
}
