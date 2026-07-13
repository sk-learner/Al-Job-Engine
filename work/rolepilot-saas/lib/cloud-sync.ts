"use client";

import { getSupabaseClient } from "@/lib/supabase";
import type { FollowUpReminder, Job, RecruiterContact, ResumeAsset, ResumeProfile, RolePilotUser, UserSettings } from "@/lib/types";

export type WorkspaceSnapshot = {
  user: RolePilotUser;
  jobs: Job[];
  resume: ResumeProfile;
  resumeAssets: ResumeAsset[];
  settings: UserSettings;
  contacts: RecruiterContact[];
  reminders: FollowUpReminder[];
  syncedAt: string;
};

export async function sendMagicLink(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  return { error: error?.message };
}

export async function getCloudUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return { user: null, error: "Supabase is not configured yet." };
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error: error?.message };
}

export async function signOutCloudUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const { error } = await supabase.auth.signOut();
  return { error: error?.message };
}

export async function pushWorkspace(snapshot: WorkspaceSnapshot) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: authError?.message || "Sign in before syncing." };
  const { error } = await supabase.from("rolepilot_workspaces").upsert({
    user_id: authData.user.id,
    email: authData.user.email,
    snapshot,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  return { error: error?.message };
}

export async function pullWorkspace() {
  const supabase = getSupabaseClient();
  if (!supabase) return { snapshot: null, error: "Supabase is not configured yet." };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { snapshot: null, error: authError?.message || "Sign in before restoring." };
  const { data, error } = await supabase
    .from("rolepilot_workspaces")
    .select("snapshot")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  return { snapshot: data?.snapshot as WorkspaceSnapshot | null, error: error?.message };
}

