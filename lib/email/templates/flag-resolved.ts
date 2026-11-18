import { escapeParams } from "@/lib/email/escape";

export function flagResolvedEmail(params: {
  tenantName: string;
  category: string;
  provider: string;
  resolutionNote: string;
  resolved: boolean;
  propertyName: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const e = escapeParams(params);
  const action = params.resolved ? "resolved" : "dismissed";
  return {
    subject: `Flag ${action}: ${params.category} - ${params.propertyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Flag ${e.resolved ? "Resolved" : "Dismissed"}</h2>
        <p>Hi ${e.tenantName},</p>
        <p>Your flag on the <strong>${e.category}</strong> bill from <strong>${e.provider}</strong> at <strong>${e.propertyName}</strong> has been <strong>${action}</strong>.</p>
        <div style="background: #f9f9f9; border-left: 4px solid #e0e0e0; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold; font-size: 12px; color: #666;">Resolution Note</p>
          <p style="margin: 4px 0 0; color: #333;">${e.resolutionNote}</p>
        </div>
        ${e.resolved ? "<p>Your bill split has been recalculated with the adjusted amount.</p>" : ""}
        <p>View details:</p>
        <p style="margin: 24px 0;">
          <a href="${e.dashboardUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">FairSplit - Fair Utility Bill Splitting</p>
      </div>
    `,
  };
}
