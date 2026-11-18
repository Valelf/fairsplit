import { escapeParams } from "@/lib/email/escape";

export function tenantInviteEmail(params: {
  tenantName: string;
  propertyName: string;
  inviteUrl: string;
}): { subject: string; html: string } {
  const e = escapeParams(params);
  return {
    subject: `You've been invited to ${params.propertyName} on FairSplit`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Welcome to FairSplit</h2>
        <p>Hi ${e.tenantName},</p>
        <p>You've been added as a tenant at <strong>${e.propertyName}</strong>.</p>
        <p>Click the link below to claim your account and view your utility bill splits:</p>
        <p style="margin: 24px 0;">
          <a href="${e.inviteUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invite
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">If you weren't expecting this invite, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">FairSplit - Fair Utility Bill Splitting</p>
      </div>
    `,
  };
}
