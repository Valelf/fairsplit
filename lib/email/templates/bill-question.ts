import { escapeParams } from "@/lib/email/escape";

/** Email for a bill-question event (new question, reply, resolved). Every value is HTML-escaped. */
export function billQuestionEmail(params: {
  subject: string;
  heading: string;
  recipientName: string;
  intro: string;
  message: string;
  ctaLabel: string;
  url: string;
}): { subject: string; html: string } {
  const e = escapeParams(params);
  return {
    subject: params.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">${e.heading}</h2>
        <p>Hi ${e.recipientName},</p>
        <p>${e.intro}</p>
        <div style="background: #f9f9f9; border-left: 4px solid #e0e0e0; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${e.message}</p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${e.url}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${e.ctaLabel}
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">FairSplit - Fair Utility Bill Splitting</p>
      </div>
    `,
  };
}
