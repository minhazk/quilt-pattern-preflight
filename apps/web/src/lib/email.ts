import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function sendReportReadyEmail(input: {
  ownerId: string;
  projectId: string;
  projectTitle: string;
}) {
  const admin = createAdminSupabaseClient();
  const idempotencyKey = `report-ready:${input.projectId}`;
  const { data: existing } = await admin
    .from("email_outbox")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", input.ownerId)
    .single();
  const email = profile?.email;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let status: "queued" | "succeeded" | "failed" = "queued";
  let sentAt: string | null = null;
  let errorCode: string | null = null;

  if (apiKey && from && email) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: `${input.projectTitle} preflight report is ready`,
          html: `<p>Your operator-reviewed mathematical preflight is ready.</p><p><a href="${appUrl}/dashboard/projects/${input.projectId}">Open the private report</a></p><p>This check does not replace technical editing, pattern testing or your final review.</p>`,
        }),
      });
      status = response.ok ? "succeeded" : "failed";
      sentAt = response.ok ? new Date().toISOString() : null;
      errorCode = response.ok ? null : `resend_${response.status}`;
    } catch {
      status = "failed";
      errorCode = "resend_network_error";
    }
  }

  await admin.from("email_outbox").insert({
    owner_id: input.ownerId,
    template: "report_ready_v1",
    payload: {
      project_id: input.projectId,
      report_url: `/dashboard/projects/${input.projectId}`,
    },
    idempotency_key: idempotencyKey,
    status,
    sent_at: sentAt,
    non_sensitive_error_code: errorCode,
  });
}
