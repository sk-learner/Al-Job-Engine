import { NextResponse } from "next/server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import type { SubscriptionPlan } from "@/lib/types";

export const runtime = "edge";

function resolvePlan(value: unknown): SubscriptionPlan | null {
  if (value === "Sprint" || value === "Pro") return value;
  return null;
}

function extractPaymentLinkEntity(payload: any) {
  return payload?.payload?.payment_link?.entity
    || payload?.payload?.payment?.entity
    || payload?.payload?.payment_link
    || payload?.entity
    || {};
}

function hexFromBytes(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function signatureValid(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = hexFromBytes(new Uint8Array(digest));
  return timingSafeEqualText(computed, signature.trim().toLowerCase());
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!(await signatureValid(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const event = String(payload?.event || "");
  const entity = extractPaymentLinkEntity(payload);
  const notes = entity?.notes || payload?.payload?.payment?.entity?.notes || payload?.payload?.payment_link?.entity?.notes || {};
  const email = notes?.email || entity?.email || payload?.payload?.payment?.entity?.email || payload?.payload?.payment_link?.entity?.customer?.email;
  const plan = resolvePlan(notes?.plan || entity?.plan || payload?.payload?.payment_link?.entity?.notes?.plan);

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      ok: true,
      applied: false,
      reason: "Supabase admin is not configured.",
      event,
      email: email || null,
      plan: plan || null
    });
  }

  if (!email || !plan) {
    return NextResponse.json({
      ok: true,
      applied: false,
      reason: "Missing plan or email in webhook payload.",
      event,
      email: email || null,
      plan: plan || null
    });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      applied: false,
      reason: "Unable to create admin client.",
      event,
      email,
      plan
    });
  }

  const { data: workspace } = await supabase
    .from("rolepilot_workspaces")
    .select("user_id, snapshot")
    .eq("email", email)
    .maybeSingle();

  if (!workspace?.user_id) {
    return NextResponse.json({
      ok: true,
      applied: false,
      reason: "Workspace not found for email.",
      event,
      email,
      plan
    });
  }

  const snapshot = workspace.snapshot && typeof workspace.snapshot === "object"
    ? workspace.snapshot as Record<string, unknown>
    : {};
  const nextSnapshot = {
    ...snapshot,
    user: {
      ...(snapshot.user as Record<string, unknown> | undefined),
      plan
    }
  };

  const { error } = await supabase
    .from("rolepilot_workspaces")
    .update({
      snapshot: nextSnapshot,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", workspace.user_id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, event, email, plan }, { status: 500 });
  }

  return NextResponse.json({ ok: true, applied: true, event, email, plan });
}
