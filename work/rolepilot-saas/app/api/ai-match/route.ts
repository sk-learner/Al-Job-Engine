import { NextResponse } from "next/server";
import type { AiMatchInsight, AiResumeDraft, UserSettings } from "@/lib/types";

type AiMatchRequest = {
  mode?: "insight" | "resume";
  resumeText?: string;
  jdText?: string;
  job?: {
    company?: string;
    role?: string;
    location?: string;
    keywords?: string;
    notes?: string;
  };
  model?: string;
  privacyMode?: UserSettings["aiPrivacyMode"];
};

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

function redactSensitive(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/(?:\+?\d[\s-]?){8,}\d/g, "[phone redacted]")
    .replace(/\bSarath\s+Krishnan\b/gi, "[candidate]")
    .replace(/\bC:\S+/gi, "[local path redacted]");
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return JSON.parse(raw);
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean).slice(0, 6) : [];
}

function asLongStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean).slice(0, 12) : [];
}

function normalizeInsight(value: unknown, model: string, privacyMode: UserSettings["aiPrivacyMode"]): AiMatchInsight {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    provider: "Gemini API",
    model,
    privacyMode,
    summary: String(item.summary || "Gemini reviewed the JD and resume profile, but returned a short response."),
    strengths: asStringArray(item.strengths),
    gaps: asStringArray(item.gaps),
    tailoredBullets: asStringArray(item.tailoredBullets),
    recruiterPitch: String(item.recruiterPitch || ""),
    interviewDrills: asStringArray(item.interviewDrills)
  };
}

function buildFullResumeText(item: Record<string, unknown>) {
  const skills = asLongStringArray(item.coreSkills);
  const experienceBullets = asLongStringArray(item.experienceBullets);
  const projectBullets = asLongStringArray(item.projectBullets);
  const keywords = asLongStringArray(item.atsKeywords);
  return [
    String(item.title || "Targeted Data Engineer Resume"),
    "",
    "TARGET ROLE",
    String(item.targetRole || "Data Engineer"),
    "",
    "PROFESSIONAL SUMMARY",
    String(item.professionalSummary || ""),
    "",
    "CORE SKILLS",
    skills.join(", "),
    "",
    "EXPERIENCE BULLETS",
    experienceBullets.map(text => `- ${text}`).join("\n"),
    "",
    "PROJECT BULLETS",
    projectBullets.map(text => `- ${text}`).join("\n"),
    "",
    "ATS KEYWORDS",
    keywords.join(", "),
    "",
    "COVER NOTE",
    String(item.coverNote || "")
  ].join("\n").trim();
}

function normalizeResumeDraft(value: unknown, model: string, privacyMode: UserSettings["aiPrivacyMode"]): AiResumeDraft {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const fullResumeText = String(item.fullResumeText || buildFullResumeText(item));
  return {
    provider: "Gemini API",
    model,
    privacyMode,
    title: String(item.title || "Targeted Data Engineer Resume"),
    targetRole: String(item.targetRole || "Data Engineer"),
    professionalSummary: String(item.professionalSummary || ""),
    coreSkills: asLongStringArray(item.coreSkills),
    experienceBullets: asLongStringArray(item.experienceBullets),
    projectBullets: asLongStringArray(item.projectBullets),
    atsKeywords: asLongStringArray(item.atsKeywords),
    coverNote: String(item.coverNote || ""),
    reviewWarnings: asLongStringArray(item.reviewWarnings),
    fullResumeText
  };
}

async function callGemini(model: string, apiKey: string, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.22,
        responseMimeType: "application/json"
      }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    return { error: result?.error?.message || "Gemini request failed.", status: response.status };
  }

  const text = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n") || "{}";
  return { text, status: 200 };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY. Add it to .env.local and restart RolePilot to enable AI Assist." },
      { status: 400 }
    );
  }

  const body = await request.json() as AiMatchRequest;
  const model = body.model || DEFAULT_MODEL;
  const privacyMode = body.privacyMode || "Redacted";
  const resumeText = privacyMode === "Redacted" ? redactSensitive(body.resumeText || "") : (body.resumeText || "");
  const jdText = privacyMode === "Redacted" ? redactSensitive(body.jdText || "") : (body.jdText || "");
  const job = body.job || {};

  const honestyRules = `Keep it practical, concise, and honest. Do not invent experience, credentials, employers, tools, certifications, metrics, percentages, counts, timelines, salary, or outcomes.
If a bullet needs a measurable result but no metric is provided, write it without numbers and leave the impact qualitative.
Use only skills and experience present in the resume profile or strongly implied by the provided job-search profile.`;

  if (body.mode === "resume") {
    const resumePrompt = `You are RolePilot's resume builder for an India-based Data Engineer targeting GCC/product companies.
Return only valid JSON with these keys:
title: string
targetRole: string
professionalSummary: string
coreSkills: string[]
experienceBullets: string[]
projectBullets: string[]
atsKeywords: string[]
coverNote: string
reviewWarnings: string[]
fullResumeText: string

Create a job-specific resume draft for the JD. The output should be ATS-friendly, plain text, and easy to paste into a resume template.
Include a strong professional summary, targeted skills, experience bullets, project bullets, ATS keywords, and a short cover note.
${honestyRules}
If the JD asks for something not supported by the resume profile, put it in reviewWarnings instead of pretending the candidate has it.

Job:
Company: ${job.company || "Unknown"}
Role: ${job.role || "Unknown"}
Location: ${job.location || "Unknown"}
Keywords: ${job.keywords || ""}
Notes: ${job.notes || ""}

Resume profile:
${resumeText.slice(0, 9000)}

Job description:
${jdText.slice(0, 12000)}`;

    const resumeResult = await callGemini(model, apiKey, resumePrompt);
    if (resumeResult.error) return NextResponse.json({ error: resumeResult.error }, { status: resumeResult.status });
    try {
      return NextResponse.json(normalizeResumeDraft(extractJson(resumeResult.text || "{}"), model, privacyMode));
    } catch {
      return NextResponse.json(normalizeResumeDraft({ fullResumeText: resumeResult.text }, model, privacyMode));
    }
  }

  const prompt = `You are RolePilot's job-search assistant for an India-based Data Engineer targeting GCC/product companies.
Return only valid JSON with these keys:
summary: string
strengths: string[]
gaps: string[]
tailoredBullets: string[]
recruiterPitch: string
interviewDrills: string[]

Focus on Azure Databricks, PySpark, Spark SQL, ADF, ADLS Gen2, Delta Lake, Unity Catalog, SQL, Python, Airflow, migration, validation, and modeling fit.
${honestyRules}

Job:
Company: ${job.company || "Unknown"}
Role: ${job.role || "Unknown"}
Location: ${job.location || "Unknown"}
Keywords: ${job.keywords || ""}
Notes: ${job.notes || ""}

Resume profile:
${resumeText.slice(0, 9000)}

Job description:
${jdText.slice(0, 12000)}`;

  const result = await callGemini(model, apiKey, prompt);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  try {
    return NextResponse.json(normalizeInsight(extractJson(result.text || "{}"), model, privacyMode));
  } catch {
    return NextResponse.json(normalizeInsight({ summary: result.text }, model, privacyMode));
  }
}
