import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getPublicSupabaseEnvironment,
  hasSupabaseEnvironment,
} from "@/lib/env";

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
  if (!hasSupabaseEnvironment()) {
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

  const environment = getPublicSupabaseEnvironment();
  const supabase = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
  const user = await getCurrentUser();
  const limitKey =
    user && !user.sample
      ? `analytics:user:${user.id}`
      : `analytics:anonymous:${parsed.data.anonymousId ?? "missing"}`;
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_key: limitKey,
    p_limit: 60,
    p_window_seconds: 3600,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Event rate limit exceeded" },
      { status: 429 },
    );
  }
  const { error } = await supabase.from("analytics_events").insert({
    owner_id: user?.sample ? null : (user?.id ?? null),
    anonymous_id: parsed.data.anonymousId ?? null,
    event_name: parsed.data.event,
    properties: parsed.data.properties,
  });
  if (error) {
    return NextResponse.json(
      { error: "Event was not recorded" },
      { status: 500 },
    );
  }
  return new NextResponse(null, { status: 204 });
}
