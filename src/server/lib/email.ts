/**
 * Email sending utility using Resend.
 * Used for sending OTP codes for passwordless authentication.
 */

import { Resend } from "resend";
import { env } from "~/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface SendOtpEmailParams {
  to: string;
  code: string;
}

export async function sendOtpEmail({
  to,
  code,
}: SendOtpEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend || !env.EMAIL_FROM) {
    console.warn(
      "Email sending disabled: RESEND_API_KEY or EMAIL_FROM not configured",
    );
    // In development, log the code instead of sending email
    if (env.NODE_ENV === "development") {
      console.log(`[DEV] OTP code for ${to}: ${code}`);
      return { success: true };
    }
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Your Preppal sign-in code",
      text: `Hi there,

Your one-time sign-in code is:

    ${code}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.

— The Preppal Team`,
    });

    if (error) {
      console.error("Failed to send OTP email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Email sending error:", err);
    return { success: false, error: "Failed to send email" };
  }
}
