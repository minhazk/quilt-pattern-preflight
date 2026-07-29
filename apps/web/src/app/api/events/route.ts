import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasNeonEnvironment } from "@/lib/env";
import { createPrivilegedSql } from "@/lib/neon/sql";

const eventNames = z.enum([
  "landing_page_viewed",
  "sample_report_viewed",
  "pricing_viewed",
  "report_viewed",
  "report_downloaded",
]);
const scalar = z.union([z.string().max(200), z.number(), z.boolean()]);
const eventSchema = z.object({
  event: eventNames,
  anonymousId: z.string().uuid().optional(),
  properties: z
    .record(z.string().max(50), scalar)
    .refine((value) => Object.keys(value).length <= 12),
});
const forbiddenPropertyNames = new Set([
  "document_text",
  "source_excerpt",
  "filename",
  "extracted_value",
  "measurement",
]);

export async function POST(request: Request) {
  if (!hasNeonEnvironment()) {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = eventSchema.safeParse(await request.json());
  if (
    !parsed.success ||
    Object.keys(parsed.data.properties).some((key) =>
      forbiddenPropertyNames.has(key),
    )
  ) {
    return NextResponse.json(
      { error: "Invalid analytics event" },
      { status: 400 },
    );
  }

  const sql = createPrivilegedSql();
  const user = await getCurrentUser();
  const limitKey =
    user && !user.sample
      ? `analytics:user:${user.id}`
      : `analytics:anonymous:${parsed.data.anonymousId ?? "missing"}`;
  const rateLimit = await sql`
    select public.check_rate_limit(${limitKey}, ${60}, ${3600}) as allowed
  `;
  if (!rateLimit[0]?.allowed) {
    return NextResponse.json(
      { error: "Event rate limit exceeded" },
      { status: 429 },
    );
  }
  try {
    const ownerId = user?.sample ? null : (user?.id ?? null);
    const anonymousId = parsed.data.anonymousId ?? null;
    await sql`
      insert into public.analytics_events (
        owner_id,
        anonymous_id,
        event_name,
        properties
      ) values (
        ${ownerId}::uuid,
        ${anonymousId}::uuid,
        ${parsed.data.event},
        ${JSON.stringify(parsed.data.properties)}::jsonb
      )
    `;
  } catch {
    return NextResponse.json(
      { error: "Event was not recorded" },
      { status: 500 },
    );
  }
  return new NextResponse(null, { status: 204 });
}
