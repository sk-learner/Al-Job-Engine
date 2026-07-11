"use client";

import { defaultResumeAssets, defaultResumeProfile, defaultSettings, demoUser, seedContacts, seedJobs, seedReminders } from "@/data/seed";
import type { FollowUpReminder, Job, RecruiterContact, ResumeAsset, ResumeProfile, RolePilotUser, UserSettings } from "@/lib/types";

const USER_KEY = "rolepilot:user";
const JOBS_KEY = "rolepilot:jobs";
const RESUME_KEY = "rolepilot:resume";
const RESUME_ASSETS_KEY = "rolepilot:resume-assets";
const SETTINGS_KEY = "rolepilot:settings";
const CONTACTS_KEY = "rolepilot:contacts";
const REMINDERS_KEY = "rolepilot:reminders";
const INTRO_SEEN_KEY = "rolepilot:intro-seen";

function isValidTrackedJob(job: Job) {
  const role = (job.role || "").toLowerCase();
  const text = `${job.company} ${job.role} ${job.location} ${job.notes} ${job.keywords}`.toLowerCase();
  if (!/data engineer|data platform|analytics engineer|azure data|databricks data|pyspark|spark data|big data|etl|data pipeline|bi engineer|business intelligence/.test(role)) return false;
  if (/internship|intern|principal|director|manager|architect|support engineer|software engineer - observability/.test(text)) return false;
  return true;
}

export function loadUser(): RolePilotUser | null {
  if (typeof window === "undefined") return demoUser;
  const saved = localStorage.getItem(USER_KEY);
  if (!saved) {
    if (!localStorage.getItem(INTRO_SEEN_KEY)) {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      return demoUser;
    }
    return null;
  }
  return JSON.parse(saved) as RolePilotUser;
}

export function saveUser(user: RolePilotUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function loadJobs(): Job[] {
  if (typeof window === "undefined") return seedJobs;
  const saved = localStorage.getItem(JOBS_KEY);
  if (!saved) {
    localStorage.setItem(JOBS_KEY, JSON.stringify(seedJobs));
    return seedJobs;
  }
  const parsed = JSON.parse(saved) as Job[];
  const validJobs = parsed.filter(isValidTrackedJob);
  if (validJobs.length !== parsed.length) localStorage.setItem(JOBS_KEY, JSON.stringify(validJobs));
  return validJobs.length ? validJobs : seedJobs;
}

export function saveJobs(jobs: Job[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.filter(isValidTrackedJob)));
}

export function loadResumeProfile(): ResumeProfile {
  if (typeof window === "undefined") return defaultResumeProfile;
  const saved = localStorage.getItem(RESUME_KEY);
  if (!saved) {
    localStorage.setItem(RESUME_KEY, JSON.stringify(defaultResumeProfile));
    return defaultResumeProfile;
  }
  return JSON.parse(saved) as ResumeProfile;
}

export function saveResumeProfile(profile: ResumeProfile) {
  localStorage.setItem(RESUME_KEY, JSON.stringify(profile));
}

export function loadResumeAssets(): ResumeAsset[] {
  if (typeof window === "undefined") return defaultResumeAssets;
  const saved = localStorage.getItem(RESUME_ASSETS_KEY);
  if (!saved) {
    localStorage.setItem(RESUME_ASSETS_KEY, JSON.stringify(defaultResumeAssets));
    return defaultResumeAssets;
  }
  return JSON.parse(saved) as ResumeAsset[];
}

export function saveResumeAssets(assets: ResumeAsset[]) {
  localStorage.setItem(RESUME_ASSETS_KEY, JSON.stringify(assets));
}

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return defaultSettings;
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    return defaultSettings;
  }
  const parsed = JSON.parse(saved) as Omit<Partial<UserSettings>, "aiProvider"> & { aiProvider?: string };
  const aiProvider = parsed.aiProvider === "Gemini Free"
    ? "Gemini API"
    : parsed.aiProvider === "Local"
      ? "Local"
      : parsed.aiProvider === "Gemini API"
        ? "Gemini API"
        : defaultSettings.aiProvider;
  return {
    ...defaultSettings,
    ...parsed,
    aiProvider
  } as UserSettings;
}

export function saveSettings(settings: UserSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadContacts(): RecruiterContact[] {
  if (typeof window === "undefined") return seedContacts;
  const saved = localStorage.getItem(CONTACTS_KEY);
  if (!saved) {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(seedContacts));
    return seedContacts;
  }
  return JSON.parse(saved) as RecruiterContact[];
}

export function saveContacts(contacts: RecruiterContact[]) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function loadReminders(): FollowUpReminder[] {
  if (typeof window === "undefined") return seedReminders;
  const saved = localStorage.getItem(REMINDERS_KEY);
  if (!saved) {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(seedReminders));
    return seedReminders;
  }
  return JSON.parse(saved) as FollowUpReminder[];
}

export function saveReminders(reminders: FollowUpReminder[]) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

export function resetWorkspace() {
  localStorage.removeItem(INTRO_SEEN_KEY);
  localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
  localStorage.setItem(JOBS_KEY, JSON.stringify(seedJobs));
  localStorage.setItem(RESUME_KEY, JSON.stringify(defaultResumeProfile));
  localStorage.setItem(RESUME_ASSETS_KEY, JSON.stringify(defaultResumeAssets));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(seedContacts));
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(seedReminders));
}
