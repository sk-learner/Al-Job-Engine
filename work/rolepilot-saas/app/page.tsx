"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Command,
  CreditCard,
  FileText,
  Gauge,
  Layers,
  LogOut,
  PackageCheck,
  Search,
  Settings,
  Sparkles,
  Upload,
  UserRound,
  Users
} from "lucide-react";
import { defaultResumeAssets, defaultResumeProfile, defaultSettings, demoUser, seedJobs } from "@/data/seed";
import { getCloudUser, pullWorkspace, pushWorkspace, sendMagicLink, signOutCloudUser } from "@/lib/cloud-sync";
import { decision, qualityScore, runMatchEngine } from "@/lib/match-engine";
import {
  loadContacts,
  loadJobs,
  loadReminders,
  loadResumeAssets,
  loadResumeProfile,
  loadSettings,
  loadUser,
  clearUser,
  resetWorkspace,
  saveContacts,
  saveJobs,
  saveReminders,
  saveResumeAssets,
  saveResumeProfile,
  saveSettings,
  saveUser
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { AiMatchInsight, AiResumeDraft, AutomationFeed, AutomationFeedJob, FollowUpReminder, Job, JobStatus, MatchReport, RecruiterContact, ResumeAsset, ResumeProfile, RolePilotUser, SubscriptionPlan, UserSettings } from "@/lib/types";

const statuses: JobStatus[] = ["Found", "JD Verified", "Resume Tailored", "Applied", "Followed Up", "Interview", "Rejected", "Offer", "Skipped"];
const primaryViews = ["Dashboard", "Discovery", "Jobs", "Match Engine", "Resume Studio", "Pipeline", "Billing", "Settings"] as const;
const secondaryViews = ["Packets", "CRM", "Reminders", "Interview Prep", "Analytics"] as const;
const views = [...primaryViews, ...secondaryViews] as const;
type View = typeof views[number];

const planLimits: Record<SubscriptionPlan, { jobs: number; resumes: number; contacts: number; label: string; price: string }> = {
  Free: { jobs: 10, resumes: 1, contacts: 10, label: "Starter tracking", price: "Free" },
  Sprint: { jobs: 75, resumes: 4, contacts: 75, label: "Focused job search", price: "INR 999" },
  Pro: { jobs: 300, resumes: 12, contacts: 300, label: "Power search", price: "INR 1,999" }
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function freshnessLabel(value?: string) {
  if (!value) return "Waiting for automation feed";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const minutes = Math.max(0, Math.round((Date.now() - parsed.getTime()) / 60000));
  if (minutes < 2) return "Just refreshed";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function sortFeedJobs(jobs: AutomationFeedJob[] = []) {
  return jobs.slice().sort((a, b) => (Number(b.fit || 0) - Number(a.fit || 0)) || String(b.postedDate || "").localeCompare(String(a.postedDate || "")));
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function isSubmitted(status: JobStatus) {
  return ["Applied", "Followed Up", "Interview", "Offer", "Rejected"].includes(status);
}

function newJob(partial: Partial<Job> = {}): Job {
  return {
    id: crypto.randomUUID(),
    dateFound: today(),
    company: "",
    role: "",
    location: "",
    fit: 70,
    priority: 99,
    applyType: "Unknown",
    status: "Found",
    resume: "Generic-DE-v1",
    link: "",
    notes: "",
    keywords: "",
    next: "Analyze JD and prepare application",
    contact: "",
    appliedDate: "",
    followupDate: "",
    scores: { azure: 60, databricks: 60, modeling: 60 },
    ...partial
  };
}

function canonicalJobKey(job: Pick<Job, "link" | "company" | "role">) {
  return (job.link || `${job.company}-${job.role}`).toLowerCase().replace(/[?#].*$/, "").replace(/[^a-z0-9]+/g, "-");
}

function viewUrl(view: View) {
  return `?view=${encodeURIComponent(view)}`;
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resumeDocumentHtml(title: string, body: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Aptos, Calibri, Arial, sans-serif; color: #111827; line-height: 1.42; margin: 42px; }
    h1 { font-size: 22px; margin: 0 0 14px; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 11.5pt; margin: 0; }
    @media print { body { margin: 24px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <pre>${escapeHtml(body)}</pre>
</body>
</html>`;
}

function downloadResumeDoc(filename: string, title: string, body: string) {
  const blob = new Blob([resumeDocumentHtml(title, body)], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printResumePdf(title: string, body: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!popup) {
    alert("Popup blocked. Allow popups for RolePilot, then try Print PDF again.");
    return;
  }
  popup.document.open();
  popup.document.write(resumeDocumentHtml(title, body));
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 250);
}

function feedJobToJob(item: AutomationFeedJob, index: number, existingCount: number): Job {
  const keywordText = Array.isArray(item.keywords) ? item.keywords.join(", ") : (item.keywords || item.fitReason || "");
  const roleText = `${item.role} ${keywordText}`;
  const resume = /snowflake|warehouse|modeling/i.test(roleText)
    ? "Lakehouse-Snowflake-v1"
    : /databricks|spark|pyspark|delta|unity/i.test(roleText)
      ? "Databricks-v1"
      : /azure|adf|adls/i.test(roleText)
        ? "Azure-DE-v1"
        : "Generic-DE-v1";
  return newJob({
    id: item.id || crypto.randomUUID(),
    dateFound: item.postedDate || today(),
    company: item.company || "",
    role: item.role || "",
    location: item.location || "India",
    link: item.link || "",
    fit: Number(item.fit || 78),
    priority: existingCount + index + 1,
    applyType: item.applyType || "External Apply",
    status: "Found",
    resume,
    notes: item.notes || item.fitReason || "Imported from GCC/Product automation feed",
    keywords: keywordText,
    next: "Verify JD and prepare application",
    scores: {
      azure: Number(item.azureScore || (/azure|adf|adls/i.test(keywordText) ? 88 : 72)),
      databricks: Number(item.databricksScore || (/databricks|spark|pyspark|delta/i.test(keywordText) ? 90 : 70)),
      modeling: Number(item.modelingScore || (/model|warehouse|snowflake|sql/i.test(keywordText) ? 82 : 72))
    }
  });
}

export default function RolePilotApp() {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<RolePilotUser | null>(demoUser);
  const [jobs, setJobs] = useState<Job[]>(seedJobs);
  const [resume, setResume] = useState<ResumeProfile>(defaultResumeProfile);
  const [resumeAssets, setResumeAssets] = useState<ResumeAsset[]>(defaultResumeAssets);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [contacts, setContacts] = useState<RecruiterContact[]>([]);
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [view, setView] = useState<View>("Dashboard");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Job | null>(null);
  const [selectedJobId, setSelectedJobId] = useState(seedJobs[0]?.id ?? "");
  const [jdText, setJdText] = useState("");
  const [report, setReport] = useState<MatchReport | null>(null);
  const [aiInsight, setAiInsight] = useState<AiMatchInsight | null>(null);
  const [resumeDraft, setResumeDraft] = useState<AiResumeDraft | null>(null);
  const [aiStatus, setAiStatus] = useState("AI assistant ready.");
  const [feed, setFeed] = useState<AutomationFeed>({ generatedAt: "", sourceAutomation: "India GCC Product Data Job Monitor", jobs: [] });
  const [feedMessage, setFeedMessage] = useState("Feed not checked yet");
  const [autoSync, setAutoSync] = useState(true);

  function setActiveView(nextView: View) {
    setView(nextView);
    if (typeof window !== "undefined") {
      const nextUrl = `${window.location.pathname}${viewUrl(nextView)}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }

  useEffect(() => {
    setUser(loadUser());
    const loadedJobs = loadJobs();
    setJobs(loadedJobs);
    setResume(loadResumeProfile());
    setResumeAssets(loadResumeAssets());
    setSettings(loadSettings());
    setContacts(loadContacts());
    setReminders(loadReminders());
    setSelectedJobId(loadedJobs[0]?.id ?? "");
    const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
    if (requestedView && views.includes(requestedView)) setView(requestedView);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveJobs(jobs);
  }, [jobs, hydrated]);

  useEffect(() => {
    if (hydrated) saveResumeProfile(resume);
  }, [resume, hydrated]);

  useEffect(() => {
    if (hydrated) saveResumeAssets(resumeAssets);
  }, [resumeAssets, hydrated]);

  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (hydrated) saveContacts(contacts);
  }, [contacts, hydrated]);

  useEffect(() => {
    if (hydrated) saveReminders(reminders);
  }, [reminders, hydrated]);

  useEffect(() => {
    void refreshFeed(true);
  }, []);

  useEffect(() => {
    const syncViewFromUrl = () => {
      const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
      if (requestedView && views.includes(requestedView)) setView(requestedView);
    };
    syncViewFromUrl();
    window.addEventListener("popstate", syncViewFromUrl);
    return () => window.removeEventListener("popstate", syncViewFromUrl);
  }, []);

  useEffect(() => {
    if (!autoSync || !settings.autoSyncFeed) return;
    const timer = window.setInterval(() => {
      void refreshFeed(true);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [autoSync, jobs, settings.autoSyncFeed]);

  const selectedJob = jobs.find(job => job.id === selectedJobId) ?? jobs[0];
  const activeResume = resumeAssets.find(asset => asset.isDefault) ?? resumeAssets[0];
  const effectiveResumeText = `${resume.text}\n\nActive resume version: ${activeResume?.label ?? "Default"}\n${activeResume?.body ?? ""}`;
  const limits = user ? planLimits[user.plan] : planLimits.Free;
  const usage = {
    jobs: jobs.length,
    resumes: resumeAssets.length,
    contacts: contacts.length,
    appliedThisWeek: jobs.filter(job => isSubmitted(job.status)).length,
    dueReminders: reminders.filter(item => !item.done && item.dueDate <= today()).length
  };
  const canAddJob = usage.jobs < limits.jobs;
  const canAddResume = usage.resumes < limits.resumes;
  const canAddContact = usage.contacts < limits.contacts;
  const filteredJobs = useMemo(() => jobs.filter(job => {
    const text = `${job.company} ${job.role} ${job.location} ${job.notes} ${job.keywords} ${job.status}`.toLowerCase();
    const statusMatch = statusFilter === "all" || (statusFilter === "Submitted+" ? isSubmitted(job.status) : job.status === statusFilter);
    return (!query || text.includes(query.toLowerCase())) && statusMatch;
  }).sort((a, b) => a.priority - b.priority), [jobs, query, statusFilter]);

  const metrics: Array<[string, string | number, string]> = [
    ["Tracked Jobs", jobs.length, "Private workspace"],
    ["Strong Apply", jobs.filter(job => job.fit >= 85 && job.status !== "Skipped").length, "Fit score 85+"],
    ["Submitted", jobs.filter(job => isSubmitted(job.status)).length, "Applied or beyond"],
    ["Interviews", jobs.filter(job => ["Interview", "Offer"].includes(job.status)).length, "Active interview/offer"],
    ["Avg Fit", `${Math.round(jobs.reduce((n, job) => n + job.fit, 0) / Math.max(1, jobs.length))}%`, "Across jobs"]
  ];

  function persistUser(next: RolePilotUser) {
    setUser(next);
    saveUser(next);
  }

  function markApplied(job: Job) {
    const due = job.followupDate || daysFromToday(3);
    setJobs(prev => prev.map(item => item.id === job.id ? {
      ...item,
      status: "Applied",
      appliedDate: item.appliedDate || today(),
      followupDate: due,
      next: item.next || "Follow up with recruiter"
    } : item));
    setReminders(prev => prev.some(item => item.jobId === job.id)
      ? prev
      : [{
        id: crypto.randomUUID(),
        jobId: job.id,
        title: `Follow up on ${job.company}`,
        dueDate: due,
        channel: job.applyType === "Recruiter" ? "Recruiter" : "LinkedIn",
        done: false
      }, ...prev]);
  }

  function saveEditing() {
    if (!editing) return;
    const isNew = !jobs.some(job => job.id === editing.id);
    if (isNew && !canAddJob) {
      alert(`${user?.plan ?? "Free"} plan limit reached. Upgrade in Billing or archive old jobs.`);
      return;
    }
    const match = runMatchEngine(effectiveResumeText, `${editing.role}\n${editing.keywords}\n${editing.notes}`, editing);
    const enriched = {
      ...editing,
      fit: match.score || editing.fit,
      resume: editing.resume || match.resume,
      scores: editing.scores || { azure: match.azure, databricks: match.databricks, modeling: match.modeling }
    };
    setJobs(prev => prev.some(job => job.id === enriched.id) ? prev.map(job => job.id === enriched.id ? enriched : job) : [enriched, ...prev]);
    setEditing(null);
  }

  function runMatcher(apply = false) {
    if (!selectedJob) return;
    const nextReport = runMatchEngine(effectiveResumeText, jdText || `${selectedJob.role}\n${selectedJob.keywords}\n${selectedJob.notes}`, selectedJob);
    setReport(nextReport);
    if (apply) {
      setJobs(prev => prev.map(job => job.id === selectedJob.id ? {
        ...job,
        fit: nextReport.score,
        resume: nextReport.resume,
        scores: { azure: nextReport.azure, databricks: nextReport.databricks, modeling: nextReport.modeling },
        keywords: nextReport.matched.join(", ") || job.keywords,
        notes: `${job.notes}\nMatch Engine: ${nextReport.score}% fit, ${nextReport.quality}% quality. Gaps: ${nextReport.gaps.join(", ") || "none detected"}.`.trim()
      } : job));
    }
  }

  async function runGeminiAssist() {
    if (!selectedJob) return;
    const nextReport = runMatchEngine(effectiveResumeText, jdText || `${selectedJob.role}\n${selectedJob.keywords}\n${selectedJob.notes}`, selectedJob);
    setReport(nextReport);
    setAiStatus("Calling AI Assist...");
    setAiInsight(null);
    try {
      const res = await fetch("/api/ai-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: effectiveResumeText,
          jdText: jdText || `${selectedJob.role}\n${selectedJob.keywords}\n${selectedJob.notes}`,
          job: selectedJob,
          model: settings.aiModel,
          privacyMode: settings.aiPrivacyMode
        })
      });
      const payload = await res.json() as AiMatchInsight & { error?: string };
      if (!res.ok || payload.error) {
        setAiStatus(payload.error || "AI Assist failed.");
        return;
      }
      setAiInsight(payload);
      setAiStatus(`AI Assist complete using ${payload.model} (${payload.privacyMode.toLowerCase()} mode).`);
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : "AI Assist failed.");
    }
  }

  async function buildResumeForJd() {
    if (!selectedJob) return;
    if (!canAddResume) {
      alert(`${user?.plan ?? "Free"} plan resume limit reached. Switch plan in Billing or edit an existing resume version.`);
      return;
    }
    const nextReport = runMatchEngine(effectiveResumeText, jdText || `${selectedJob.role}\n${selectedJob.keywords}\n${selectedJob.notes}`, selectedJob);
    setReport(nextReport);
    setAiStatus("Building targeted resume...");
    setResumeDraft(null);
    try {
      const res = await fetch("/api/ai-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "resume",
          resumeText: effectiveResumeText,
          jdText: jdText || `${selectedJob.role}\n${selectedJob.keywords}\n${selectedJob.notes}`,
          job: selectedJob,
          model: settings.aiModel,
          privacyMode: settings.aiPrivacyMode
        })
      });
      const payload = await res.json() as AiResumeDraft & { error?: string };
      if (!res.ok || payload.error) {
        setAiStatus(payload.error || "Resume builder failed.");
        return;
      }
      setResumeDraft(payload);
      setAiStatus(`Resume draft ready for ${selectedJob.company}. Review before applying.`);
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : "Resume builder failed.");
    }
  }

  function saveResumeDraft() {
    if (!resumeDraft || !selectedJob) return;
    if (!canAddResume) {
      alert(`${user?.plan ?? "Free"} plan resume limit reached. Switch plan in Billing or edit an existing resume version.`);
      return;
    }
    const asset: ResumeAsset = {
      id: crypto.randomUUID(),
      label: `${selectedJob.company} - ${selectedJob.role}`.slice(0, 80),
      target: /snowflake|warehouse|model/i.test(`${selectedJob.role} ${selectedJob.keywords}`) ? "Lakehouse-Snowflake-v1" : selectedJob.resume,
      summary: resumeDraft.professionalSummary || resumeDraft.title,
      body: resumeDraft.fullResumeText,
      updatedAt: today(),
      isDefault: true
    };
    setResumeAssets(prev => [asset, ...prev.map(item => ({ ...item, isDefault: false }))]);
    setJobs(prev => prev.map(job => job.id === selectedJob.id ? {
      ...job,
      status: "Resume Tailored",
      resume: asset.target,
      next: "Review tailored resume and apply",
      notes: `${job.notes}\nResume Builder: created targeted resume version "${asset.label}".`.trim()
    } : job));
    setAiStatus(`Saved resume version: ${asset.label}`);
  }

  async function refreshFeed(mergeAfterLoad = false) {
    try {
      const res = await fetch("/api/gcc-feed", { cache: "no-store" });
      const nextFeed = await res.json() as AutomationFeed & { error?: string };
      setFeed(nextFeed);
      setFeedMessage(nextFeed.error ? `Feed error: ${nextFeed.error}` : `Feed checked: ${nextFeed.jobs?.length || 0} jobs`);
      if (mergeAfterLoad && nextFeed.jobs?.length) mergeFeed(nextFeed);
    } catch (error) {
      setFeedMessage(error instanceof Error ? error.message : "Feed check failed");
    }
  }

  function mergeFeed(sourceFeed = feed) {
    const incoming = sortFeedJobs(sourceFeed.jobs || []);
    if (!incoming.length) {
      setFeedMessage("No feed jobs to merge");
      return;
    }
    setJobs(prev => {
      const map = new Map(prev.map(job => [canonicalJobKey(job), job]));
      let added = 0;
      let updated = 0;
      incoming.map((item, index) => feedJobToJob(item, index, prev.length)).forEach(job => {
        const key = canonicalJobKey(job);
        const current = map.get(key);
        if (current) {
          map.set(key, {
            ...current,
            company: current.company || job.company,
            role: current.role || job.role,
            location: current.location || job.location,
            link: current.link || job.link,
            fit: Math.max(current.fit || 0, job.fit || 0),
            keywords: current.keywords || job.keywords,
            notes: current.notes || job.notes,
            scores: current.scores || job.scores
          });
          updated += 1;
        } else {
          map.set(key, job);
          added += 1;
        }
      });
      setFeedMessage(`Merged feed: ${added} added, ${updated} updated`);
      return [...map.values()];
    });
  }

  function addContactFromJob(job: Job) {
    if (!canAddContact) {
      alert(`${user?.plan ?? "Free"} plan contact limit reached. Upgrade in Billing.`);
      return;
    }
    setContacts(prev => prev.some(contact => contact.company.toLowerCase() === job.company.toLowerCase())
      ? prev
      : [{
        id: crypto.randomUUID(),
        name: `${job.company} hiring team`,
        company: job.company,
        role: job.role,
        email: "",
        linkedin: "",
        status: "Prospect",
        lastTouch: "",
        nextTouch: daysFromToday(2),
        notes: `Pitch ${job.resume} profile for ${job.role}. Fit ${job.fit}%.`
      }, ...prev]);
    setView("CRM");
  }

  function markReminderDone(reminder: FollowUpReminder) {
    setReminders(prev => prev.map(item => item.id === reminder.id ? { ...item, done: true } : item));
    setJobs(prev => prev.map(job => job.id === reminder.jobId ? { ...job, status: job.status === "Applied" ? "Followed Up" : job.status, next: "Wait for response or find referral" } : job));
  }

  function updatePlan(plan: SubscriptionPlan) {
    if (!user) return;
    persistUser({ ...user, plan });
  }

  if (!hydrated) {
    return (
      <main className="app">
        <header className="topbar">
          <div className="brand">
            <div className="logo">RP</div>
            <div>
              <h1>RolePilot</h1>
              <div className="muted">Preparing your job-search workspace...</div>
            </div>
          </div>
        </header>
      </main>
    );
  }

  if (!user) return <AuthScreen onLogin={persistUser} />;

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">RP</div>
          <div>
            <h1>RolePilot</h1>
            <div className="muted">Track, match, and tailor every data/cloud job application in one AI-powered workspace</div>
          </div>
        </div>
        <div className="top-actions">
          <span className="pill blue">{user.plan} Plan</span>
          <button className="btn primary" disabled={!canAddJob} onClick={() => setEditing(newJob({ priority: jobs.length + 1 }))}>+ Add Job</button>
          <a className="btn" href={viewUrl("Discovery")} onClick={e => { e.preventDefault(); setActiveView("Discovery"); void refreshFeed(false); }}>Feed</a>
          <a className="btn" href={viewUrl("Match Engine")} onClick={e => { e.preventDefault(); setActiveView("Match Engine"); }}><Sparkles size={17} /> Match</a>
          <button className="btn" onClick={() => { resetWorkspace(); location.reload(); }}><Settings size={17} /> Reset</button>
          <button className="btn" onClick={() => { clearUser(); setUser(null); void signOutCloudUser(); }}><LogOut size={17} /> Sign out</button>
        </div>
      </header>

      <nav className="tabs tabs-primary">
        {primaryViews.map(item => (
          <a key={item} className={`tab ${view === item ? "active" : ""}`} href={viewUrl(item)} onClick={e => { e.preventDefault(); setActiveView(item); }}>{item}</a>
        ))}
      </nav>
      <nav className="tabs tabs-secondary">
        <span className="tabs-label">Tools</span>
        {secondaryViews.map(item => (
          <a key={item} className={`tab ${view === item ? "active" : ""}`} href={viewUrl(item)} onClick={e => { e.preventDefault(); setActiveView(item); }}>{item}</a>
        ))}
      </nav>

      {view === "Dashboard" && <Dashboard metrics={metrics} jobs={jobs} usage={usage} settings={settings} user={user} feed={feed} feedMessage={feedMessage} setView={setActiveView} />}
      {view === "Discovery" && <DiscoveryView feed={feed} feedMessage={feedMessage} refreshFeed={refreshFeed} mergeFeed={mergeFeed} autoSync={autoSync} setAutoSync={setAutoSync} />}
      {view === "Jobs" && <JobsView jobs={filteredJobs} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} markApplied={markApplied} edit={setEditing} addContact={addContactFromJob} />}
      {view === "Match Engine" && <MatchEngineView jobs={jobs} selectedJobId={selectedJobId} setSelectedJobId={setSelectedJobId} selectedJob={selectedJob} resume={resume} setResume={setResume} jdText={jdText} setJdText={setJdText} report={report} runMatcher={runMatcher} runGeminiAssist={runGeminiAssist} buildResumeForJd={buildResumeForJd} saveResumeDraft={saveResumeDraft} resumeDraft={resumeDraft} aiInsight={aiInsight} aiStatus={aiStatus} settings={settings} resumeAssets={resumeAssets} setResumeAssets={setResumeAssets} canAddResume={canAddResume} />}
      {view === "Resume Studio" && <ResumeStudioView resume={resume} setResume={setResume} resumeAssets={resumeAssets} setResumeAssets={setResumeAssets} canAddResume={canAddResume} limits={limits} />}
      {view === "Packets" && <PacketsView jobs={jobs} contacts={contacts} resumeAssets={resumeAssets} />}
      {view === "CRM" && <CrmView contacts={contacts} setContacts={setContacts} jobs={jobs} addContact={addContactFromJob} canAddContact={canAddContact} />}
      {view === "Reminders" && <RemindersView reminders={reminders} jobs={jobs} markDone={markReminderDone} setReminders={setReminders} />}
      {view === "Pipeline" && <PipelineView jobs={jobs} edit={setEditing} markApplied={markApplied} />}
      {view === "Interview Prep" && <InterviewView jobs={jobs} resumeText={effectiveResumeText} />}
      {view === "Analytics" && <AnalyticsView jobs={jobs} />}
      {view === "Billing" && <BillingCenter user={user} updatePlan={updatePlan} usage={usage} limits={limits} />}
      {view === "Settings" && <ProductSettings user={user} setUser={persistUser} jobs={jobs} setJobs={setJobs} settings={settings} setSettings={setSettings} resume={resume} setResume={setResume} resumeAssets={resumeAssets} setResumeAssets={setResumeAssets} contacts={contacts} setContacts={setContacts} reminders={reminders} setReminders={setReminders} />}

      {editing && <JobEditor job={editing} setJob={setEditing} save={saveEditing} close={() => setEditing(null)} resumeText={effectiveResumeText} />}
    </main>
  );
}

function AuthScreen({ onLogin }: { onLogin: (user: RolePilotUser) => void }) {
  const [name, setName] = useState("Sarath Krishnan");
  const [email, setEmail] = useState("sarath.demo@rolepilot.local");
  return (
    <div className="auth-wrap">
      <section className="auth-card">
        <div className="logo">RP</div>
        <h1>RolePilot</h1>
        <p className="muted">Product workspace for matching, tracking, packets, CRM, reminders, and GCC/product job discovery. This build is local-first with optional cloud sync.</p>
        <label>Name<input className="field" value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Email<input className="field" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <button className="btn primary" onClick={() => onLogin({ id: crypto.randomUUID(), name, email, plan: "Sprint" })}>Enter Workspace</button>
      </section>
    </div>
  );
}

function Dashboard({ metrics, jobs, usage, settings, user, feed, feedMessage, setView }: { metrics: Array<[string, string | number, string]>; jobs: Job[]; usage: { appliedThisWeek: number; dueReminders: number }; settings: UserSettings; user: RolePilotUser; feed: AutomationFeed; feedMessage: string; setView: (view: View) => void }) {
  const topJobs = jobs.slice().sort((a, b) => b.fit - a.fit);
  const nextJob = topJobs.find(job => job.fit >= 85 && !isSubmitted(job.status) && job.status !== "Skipped") ?? topJobs.find(job => job.status !== "Skipped");
  const latestFeedJob = sortFeedJobs(feed.jobs || [])[0];
  const needsFollowUp = usage.dueReminders > 0;
  const nextAction = needsFollowUp
    ? "Clear due follow-ups before adding more applications."
    : nextJob
      ? `Tailor resume for ${nextJob.company}, then apply or move it forward.`
      : "Import the latest feed or add a JD to start scoring.";
  const feedFreshness = freshnessLabel(feed.generatedAt);
  const latestTitle = latestFeedJob ? `${latestFeedJob.company} - ${latestFeedJob.role}` : "No fresh qualifying feed job";

  return (
    <div className="stack">
      <section className="panel command-center">
        <div className="command-main">
          <div className="label">Today&apos;s command center</div>
          <h2>{nextJob ? `${nextJob.company}: ${nextJob.role}` : "Build today's application queue"}</h2>
          <p>{nextAction}</p>
          <div className="actions">
            <button className="btn primary" onClick={() => setView(nextJob ? "Jobs" : "Discovery")}>{nextJob ? "Open Priority Job" : "Open Discovery"}</button>
            <button className="btn" onClick={() => setView("Match Engine")}>Run Match Engine</button>
            <button className="btn" onClick={() => setView("Reminders")}>Review Follow-ups</button>
          </div>
        </div>
        <div className="command-grid">
          <div className="command-tile"><span>Latest Feed</span><strong>{latestTitle}</strong><small>{feedFreshness} · {feed.jobs?.length || 0} feed jobs</small></div>
          <div className="command-tile"><span>Best Next Action</span><strong>{needsFollowUp ? `${usage.dueReminders} follow-ups due` : nextJob ? `${nextJob.fit}% fit` : "Add JD"}</strong><small>{needsFollowUp ? "Recruiter touchpoints first" : nextJob ? nextJob.status : "Start from Discovery"}</small></div>
          <div className="command-tile"><span>Feed Health</span><strong>{settings.autoSyncFeed ? "Auto sync on" : "Manual sync"}</strong><small>{feedMessage}</small></div>
          <div className="command-tile"><span>Quality Gate</span><strong>85+ priority</strong><small>{settings.salaryFloor} · {settings.locations}</small></div>
        </div>
      </section>
      <section className="grid-3 compact-grid">
        <div className="panel"><div className="panel-body"><div className="label">Today Focus</div><h2>{nextJob ? `Move ${nextJob.company} forward.` : "Import and score fresh roles."}</h2><p className="muted">Tailor resume, apply, then follow up. Quality stays higher than volume.</p></div></div>
        <div className="panel"><div className="panel-body"><div className="label">Latest New Job</div><h2>{latestFeedJob ? `${latestFeedJob.fit ?? "n/a"}% feed fit` : "Waiting for feed"}</h2><p className="muted">{latestFeedJob ? latestFeedJob.fitReason || latestFeedJob.notes || latestFeedJob.location : "The GCC/product monitor updates this when a role qualifies."}</p></div></div>
        <div className="panel"><div className="panel-body"><div className="label">Pending Follow-ups</div><h2>{usage.dueReminders} due now</h2><p className="muted">Applied roles only convert when recruiter and portal follow-ups are tracked.</p></div></div>
      </section>
      <section className="metrics">
        {metrics.map(metric => <article className="metric" key={metric[0]}><div className="label">{metric[0]}</div><strong>{metric[1]}</strong><div className="muted">{metric[2]}</div></article>)}
      </section>
      <section className="grid-3">
        <div className="panel"><div className="panel-body"><div className="label">Weekly Goal</div><h2>{usage.appliedThisWeek}/{settings.weeklyGoal} submitted</h2><p className="muted">Use this as a pace tracker, not a volume race.</p></div></div>
        <div className="panel"><div className="panel-body"><div className="label">Follow Ups</div><h2>{usage.dueReminders} due now</h2><p className="muted">Keep recruiter touchpoints warm after applying.</p></div></div>
        <div className="panel"><div className="panel-body"><div className="label">Target</div><h2>{settings.salaryFloor}</h2><p className="muted">{settings.locations}</p></div></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Top Matches</div><div className="muted">Highest-fit opportunities in this workspace.</div></div><button className="btn" onClick={() => setView("Jobs")}>Open Jobs</button></div>
        <div className="panel-body job-grid">{topJobs.slice(0, 3).map(job => <JobCard key={job.id} job={job} compact />)}</div>
      </section>
    </div>
  );
}

function OnboardingView({ user, settings, setSettings, resumeAssets, jobs, setView }: { user: RolePilotUser; settings: UserSettings; setSettings: (settings: UserSettings) => void; resumeAssets: ResumeAsset[]; jobs: Job[]; setView: (view: View) => void }) {
  const items = [
    ["Profile", Boolean(user.name && user.email), "Account identity is ready."],
    ["Search targets", Boolean(settings.targetTitles && settings.locations && settings.salaryFloor), "Target titles, cities, and salary guardrail are set."],
    ["Resume versions", resumeAssets.length > 1, "Create multiple resume angles for Azure, Databricks, and generic data roles."],
    ["First jobs", jobs.length > 0, "Import or add jobs before running the match engine."],
    ["Automation feed", settings.autoSyncFeed, "Keep the GCC/product pipeline connected."],
    ["Job-specific resume generator", true, "Generate a tailored resume summary, skills, project bullets, ATS keywords, and DOCX/PDF export for each job."]
  ] as const;
  const complete = items.filter(item => item[1]).length;
  return (
    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Workspace Onboarding</div><div className="muted">{complete}/{items.length} setup checks complete</div></div><span className={`pill ${complete === items.length ? "green" : "amber"}`}>{complete === items.length ? "Ready" : "Setup"}</span></div>
        <div className="panel-body stack">
          {items.map(item => <div className="copy-box" key={item[0]}><b>{item[1] ? "[done]" : "[todo]"} {item[0]}</b><br />{item[2]}</div>)}
          <button className="btn green" onClick={() => { setSettings({ ...settings, onboardingDone: true }); setView("Dashboard"); }}>Mark Setup Complete</button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Search Guardrails</div><div className="muted">Used by discovery, matching, and prioritization.</div></div></div>
        <div className="panel-body stack">
          <label>Target titles<textarea className="field" value={settings.targetTitles} onChange={e => setSettings({ ...settings, targetTitles: e.target.value })} /></label>
          <label>Locations<input className="field" value={settings.locations} onChange={e => setSettings({ ...settings, locations: e.target.value })} /></label>
          <label>Salary floor<input className="field" value={settings.salaryFloor} onChange={e => setSettings({ ...settings, salaryFloor: e.target.value })} /></label>
        </div>
      </section>
    </div>
  );
}

function JobsView({ jobs, query, setQuery, statusFilter, setStatusFilter, markApplied, edit, addContact }: {
  jobs: Job[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  markApplied: (job: Job) => void;
  edit: (job: Job) => void;
  addContact: (job: Job) => void;
}) {
  return (
    <section>
      <div className="filters">
        <input className="field" placeholder="Search company, role, location, notes, skills" value={query} onChange={e => setQuery(e.target.value)} />
        <select className="field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="Submitted+">Applied / submitted+</option>
          {statuses.map(status => <option key={status}>{status}</option>)}
        </select>
      </div>
      <div className="job-grid job-list">{jobs.map(job => <JobCard key={job.id} job={job} markApplied={markApplied} edit={edit} addContact={addContact} />)}</div>
    </section>
  );
}

function DiscoveryView({ feed, feedMessage, refreshFeed, mergeFeed, autoSync, setAutoSync }: {
  feed: AutomationFeed;
  feedMessage: string;
  refreshFeed: (mergeAfterLoad?: boolean) => Promise<void>;
  mergeFeed: (sourceFeed?: AutomationFeed) => void;
  autoSync: boolean;
  setAutoSync: (value: boolean) => void;
}) {
  return (
    <div className="grid-2">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">GCC/Product Automation Feed</div>
            <div className="muted">{feed.sourceAutomation || "India GCC Product Data Job Monitor"}</div>
          </div>
          <span className={`pill ${feed.jobs?.length ? "green" : "amber"}`}>{feed.jobs?.length || 0} feed jobs</span>
        </div>
        <div className="panel-body stack">
          <div className="copy-box"><b>Status:</b> {feedMessage}<br /><b>Generated:</b> {feed.generatedAt || "Waiting for feed file"}<br /><b>Source:</b> outputs/gcc_product_feed.js</div>
          <div className="actions">
            <button className="btn primary" onClick={() => void refreshFeed(false)}>Check Feed</button>
            <button className="btn green" onClick={() => mergeFeed(feed)}>Merge Feed</button>
            <button className={`btn ${autoSync ? "green" : ""}`} onClick={() => setAutoSync(!autoSync)}>{autoSync ? "Auto Sync On" : "Auto Sync Off"}</button>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Feed Inbox</div>
            <div className="muted">Review newly discovered roles before applying.</div>
          </div>
        </div>
        <div className="panel-body stack">
          {sortFeedJobs(feed.jobs || []).length ? sortFeedJobs(feed.jobs || []).map((job, index) => (
            <div className="copy-box" key={`${job.link}-${index}`}>
              <b>{job.company} - {job.role}</b><br />
              {job.location} · Fit {job.fit ?? "n/a"}% · {job.classificationConfidence || "Unscored"} confidence<br />
              {job.fitReason || job.notes || "No notes"}<br />
              {job.link ? <a href={job.link} target="_blank">Open application link</a> : "No direct link"}
            </div>
          )) : <div className="copy-box">No qualifying roles in the latest feed. The automation still refreshed the file successfully.</div>}
        </div>
      </section>
    </div>
  );
}

function JobCard({ job, markApplied, edit, addContact, compact = false }: { job: Job; markApplied?: (job: Job) => void; edit?: (job: Job) => void; addContact?: (job: Job) => void; compact?: boolean }) {
  const q = qualityScore(job);
  const d = decision(job);
  return (
    <article className={`job-card ${compact ? "compact-card" : ""}`}>
      <div className="job-card-top">
        <div className="job-main">
          <div className="avatar">{initials(job.company)}</div>
          <div className="job-title-block">
            <div className="company">{job.company}</div>
            <div className="role">{job.role}</div>
          </div>
        </div>
        <div className={`score ${job.fit < 72 ? "low" : job.fit < 85 ? "mid" : ""}`}><span>{job.fit}%</span><small>fit</small></div>
      </div>
      <div className="job-body">
        <div className="job-meta-line">
          <span>{job.location}</span>
          <span>{job.status}</span>
          <span className={`decision-text ${d.className}`}>{d.text}</span>
        </div>
        <div className="quality-line"><span>Quality</span><div className="quality-track"><i style={{ width: `${q}%` }} /></div><b>{q}%</b></div>
      </div>
      {!compact && <div className="job-foot">
        <a className="btn open-btn" href={job.link} target="_blank">Open</a>
        <div className="actions">
          {!isSubmitted(job.status) && markApplied && <button className="mini-btn green" onClick={() => markApplied(job)}>Mark Applied</button>}
          {addContact && <button className="mini-btn" onClick={() => addContact(job)}>Add CRM</button>}
          {edit && <button className="mini-btn" onClick={() => edit(job)}>Edit</button>}
        </div>
      </div>}
    </article>
  );
}

function MatchEngineView(props: {
  jobs: Job[];
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  selectedJob?: Job;
  resume: ResumeProfile;
  setResume: (profile: ResumeProfile) => void;
  jdText: string;
  setJdText: (value: string) => void;
  report: MatchReport | null;
  runMatcher: (apply?: boolean) => void;
  runGeminiAssist: () => void;
  buildResumeForJd: () => void;
  saveResumeDraft: () => void;
  resumeDraft: AiResumeDraft | null;
  aiInsight: AiMatchInsight | null;
  aiStatus: string;
  settings: UserSettings;
  resumeAssets: ResumeAsset[];
  setResumeAssets: (assets: ResumeAsset[]) => void;
  canAddResume: boolean;
}) {
  const { jobs, selectedJobId, setSelectedJobId, selectedJob, resume, setResume, jdText, setJdText, report, runMatcher, runGeminiAssist, buildResumeForJd, saveResumeDraft, resumeDraft, aiInsight, aiStatus, settings, resumeAssets, setResumeAssets } = props;
  return (
    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Resume and JD Matching</div><div className="muted">Local scoring for quick screening, AI Assist for stronger resume and interview guidance.</div></div><span className="pill blue">{settings.aiModel}</span></div>
        <div className="panel-body stack">
          <label>Tracked Job<select className="field" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>{jobs.map(job => <option key={job.id} value={job.id}>{job.company} - {job.role}</option>)}</select></label>
          <label>Active Resume Version<select className="field" value={resumeAssets.find(asset => asset.isDefault)?.id ?? resumeAssets[0]?.id} onChange={e => setResumeAssets(resumeAssets.map(asset => ({ ...asset, isDefault: asset.id === e.target.value })))}>{resumeAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></label>
          <div className="actions"><button className="btn" onClick={() => setJdText(`${selectedJob?.role ?? ""}\n${selectedJob?.company ?? ""}\n${selectedJob?.location ?? ""}\n${selectedJob?.keywords ?? ""}\n${selectedJob?.notes ?? ""}`)}>Load Job</button><button className="btn primary" onClick={() => runMatcher(false)}>Analyze</button><button className="btn green" onClick={() => runMatcher(true)}>Apply Score To Job</button><button className="btn" onClick={runGeminiAssist}><Sparkles size={17} /> AI Assist</button><button className="btn primary" onClick={buildResumeForJd}><FileText size={17} /> Build Resume for JD</button></div>
          <label>Resume Profile<textarea className="field" value={resume.text} onChange={e => setResume({ ...resume, text: e.target.value, updatedAt: today() })} /></label>
          <label>Full Job Description<textarea className="field" value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste complete JD here" /></label>
          <div className="copy-box"><b>AI mode:</b> {settings.aiProvider} · {settings.aiPrivacyMode} profile mode.</div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Match Report</div><div className="muted">Deterministic fit score plus optional AI suggestions.</div></div></div>
        <div className="panel-body stack">
          {report ? <MatchReportView report={report} /> : <div className="copy-box">Select a job, paste JD, then click Analyze.</div>}
          <AiInsightView insight={aiInsight} status={aiStatus} />
          <ResumeDraftView draft={resumeDraft} saveResumeDraft={saveResumeDraft} selectedJob={selectedJob} />
        </div>
      </section>
    </div>
  );
}

function ResumeDraftView({ draft, saveResumeDraft, selectedJob }: { draft: AiResumeDraft | null; saveResumeDraft: () => void; selectedJob?: Job }) {
  if (!draft) return null;
  const baseFilename = `${(selectedJob?.company || "rolepilot").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-resume-draft`;
  return (
    <div className="resume-draft">
      <div className="row">
        <div>
          <b>{draft.title}</b>
          <div className="muted">{draft.targetRole} · {draft.model} · {draft.privacyMode}</div>
        </div>
        <div className="actions">
          <button className="mini-btn green" onClick={saveResumeDraft}>Save Version</button>
          <button className="mini-btn" onClick={() => downloadTextFile(`${baseFilename}.txt`, draft.fullResumeText)}>TXT</button>
          <button className="mini-btn" onClick={() => downloadResumeDoc(`${baseFilename}.doc`, draft.title, draft.fullResumeText)}>DOC</button>
          <button className="mini-btn" onClick={() => printResumePdf(draft.title, draft.fullResumeText)}>Print PDF</button>
        </div>
      </div>
      <div className="copy-box"><b>Professional summary</b><br />{draft.professionalSummary || "No summary returned."}</div>
      <div className="grid-2">
        <div className="copy-box"><b>Core skills</b><br />{draft.coreSkills.join(", ") || "No skills returned."}</div>
        <div className="copy-box"><b>ATS keywords</b><br />{draft.atsKeywords.join(", ") || "No keywords returned."}</div>
      </div>
      <div className="copy-box"><b>Experience bullets</b><br />{draft.experienceBullets.map(item => `- ${item}`).join("\n") || "No bullets returned."}</div>
      <div className="copy-box"><b>Project bullets</b><br />{draft.projectBullets.map(item => `- ${item}`).join("\n") || "No project bullets returned."}</div>
      <div className="copy-box"><b>Cover note</b><br />{draft.coverNote || "No cover note returned."}</div>
      {!!draft.reviewWarnings.length && <div className="copy-box"><b>Review warnings</b><br />{draft.reviewWarnings.map(item => `- ${item}`).join("\n")}</div>}
      <label>Full resume text<textarea className="field tall" readOnly value={draft.fullResumeText} /></label>
    </div>
  );
}

function AiInsightView({ insight, status }: { insight: AiMatchInsight | null; status: string }) {
  return (
    <div className="ai-box">
      <div className="row"><b>AI Assist</b><span className="pill blue">{insight ? insight.model : "Ready"}</span></div>
      <div className="muted">{status}</div>
      {insight && <>
        <div className="copy-box"><b>Summary</b><br />{insight.summary}</div>
        <div className="grid-2">
          <div className="copy-box"><b>Strengths</b><br />{insight.strengths.map(item => `- ${item}`).join("\n") || "No strengths returned."}</div>
          <div className="copy-box"><b>Gaps</b><br />{insight.gaps.map(item => `- ${item}`).join("\n") || "No gaps returned."}</div>
        </div>
        <div className="copy-box"><b>Tailored resume bullets</b><br />{insight.tailoredBullets.map(item => `- ${item}`).join("\n") || "No bullets returned."}</div>
        <div className="copy-box"><b>Recruiter pitch</b><br />{insight.recruiterPitch || "No pitch returned."}</div>
        <div className="copy-box"><b>Interview drills</b><br />{insight.interviewDrills.map(item => `- ${item}`).join("\n") || "No drills returned."}</div>
      </>}
    </div>
  );
}

function MatchReportView({ report }: { report: MatchReport }) {
  return (
    <>
      <div className="grid-3">
        <div className="insight"><b>Fit</b>{report.score}% · {report.decision}</div>
        <div className="insight"><b>Quality</b>{report.quality}%</div>
        <div className="insight"><b>Skill Coverage</b>{report.skillCoverage}%</div>
      </div>
      <div className="copy-box"><b>Resume:</b> {report.resume}<br /><b>Matched:</b> {report.matched.join(", ") || "None"}<br /><b>Gaps:</b> {report.gaps.join(", ") || "None"}<br /><b>Signals:</b> {report.signals.join(", ") || "No major risks"}</div>
      {report.interviewPrep.map(item => <div className="copy-box" key={item.topic}><b>{item.topic}</b><br />{item.drill}</div>)}
    </>
  );
}

function ResumeStudioView({ resume, setResume, resumeAssets, setResumeAssets, canAddResume, limits }: {
  resume: ResumeProfile;
  setResume: (profile: ResumeProfile) => void;
  resumeAssets: ResumeAsset[];
  setResumeAssets: (assets: ResumeAsset[]) => void;
  canAddResume: boolean;
  limits: { resumes: number };
}) {
  function addResume() {
    if (!canAddResume) {
      alert(`Resume version limit reached. Current plan allows ${limits.resumes}.`);
      return;
    }
    setResumeAssets([{
      id: crypto.randomUUID(),
      label: "New Resume Version",
      target: "Generic-DE-v1",
      summary: "Describe when this version should be used.",
      body: "Add the skills, projects, and achievements to emphasize for this job type.",
      updatedAt: today(),
      isDefault: false
    }, ...resumeAssets]);
  }
  return (
    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Resume Versions</div><div className="muted">{resumeAssets.length}/{limits.resumes} versions available on this plan</div></div><button className="btn primary" onClick={addResume}>Add Version</button></div>
        <div className="panel-body stack">
          {resumeAssets.map(asset => <div className="copy-box" key={asset.id}>
            <div className="row"><b>{asset.label}</b><span className={`pill ${asset.isDefault ? "green" : ""}`}>{asset.isDefault ? "Active" : asset.target}</span></div>
            <label>Label<input className="field" value={asset.label} onChange={e => setResumeAssets(resumeAssets.map(item => item.id === asset.id ? { ...item, label: e.target.value, updatedAt: today() } : item))} /></label>
            <label>Target<select className="field" value={asset.target} onChange={e => setResumeAssets(resumeAssets.map(item => item.id === asset.id ? { ...item, target: e.target.value as ResumeAsset["target"], updatedAt: today() } : item))}><option>Azure-DE-v1</option><option>Databricks-v1</option><option>Lakehouse-Snowflake-v1</option><option>Generic-DE-v1</option></select></label>
            <label>Positioning<textarea className="field" value={asset.body} onChange={e => setResumeAssets(resumeAssets.map(item => item.id === asset.id ? { ...item, body: e.target.value, updatedAt: today() } : item))} /></label>
            <div className="actions"><button className="mini-btn green" onClick={() => setResumeAssets(resumeAssets.map(item => ({ ...item, isDefault: item.id === asset.id })))}>Set Active</button><button className="mini-btn" onClick={() => downloadTextFile(`${asset.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "rolepilot-resume"}.txt`, asset.body)}>TXT</button><button className="mini-btn" onClick={() => downloadResumeDoc(`${asset.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "rolepilot-resume"}.doc`, asset.label, asset.body)}>DOC</button><button className="mini-btn" onClick={() => printResumePdf(asset.label, asset.body)}>Print PDF</button></div>
          </div>)}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Master Resume Profile</div><div className="muted">The matching engine combines this with the active version.</div></div></div>
        <div className="panel-body stack">
          <label>Profile Label<input className="field" value={resume.label} onChange={e => setResume({ ...resume, label: e.target.value, updatedAt: today() })} /></label>
          <label>Master Profile<textarea className="field tall" value={resume.text} onChange={e => setResume({ ...resume, text: e.target.value, updatedAt: today() })} /></label>
        </div>
      </section>
    </div>
  );
}

function buildPacket(job: Job, contacts: RecruiterContact[], resumeAssets: ResumeAsset[]) {
  const contact = contacts.find(item => item.company.toLowerCase() === job.company.toLowerCase());
  const asset = resumeAssets.find(item => item.target === job.resume) ?? resumeAssets.find(item => item.isDefault);
  return {
    subject: `${job.role} application - Sarath Krishnan`,
    resume: asset?.label ?? job.resume,
    pitch: `I bring 5+ years of data engineering experience across Azure Databricks, PySpark, Spark SQL, Delta Lake, ADF, ADLS Gen2, SQL, Python, Airflow, migrations, validation, and CI/CD. The ${job.role} role at ${job.company} is a strong fit because it matches ${job.keywords || "my cloud data engineering background"}.`,
    outreach: `Hi ${contact?.name || "[Name]"}, I applied for ${job.role} at ${job.company}. My recent work includes Azure Databricks/PySpark migrations, Delta Lake pipelines, Unity Catalog patterns, workflow orchestration, and validation/reconciliation. I would appreciate your guidance or referral if this role is aligned with your team.`,
    checklist: ["Verify full JD", `Use ${asset?.label ?? job.resume}`, "Tailor top 5 bullets", "Apply through direct link", "Send recruiter note", "Follow up after 3 days"]
  };
}

function PacketsView({ jobs, contacts, resumeAssets }: { jobs: Job[]; contacts: RecruiterContact[]; resumeAssets: ResumeAsset[] }) {
  return (
    <div className="grid-2">
      {jobs.filter(job => job.status !== "Skipped").sort((a, b) => b.fit - a.fit).map(job => {
        const packet = buildPacket(job, contacts, resumeAssets);
        return <section className="panel" key={job.id}>
          <div className="panel-head"><div><div className="panel-title">{job.company}</div><div className="muted">{job.role}</div></div><span className="pill green">{job.fit}% fit</span></div>
          <div className="panel-body stack">
            <div className="copy-box"><b>Resume:</b> {packet.resume}<br /><b>Subject:</b> {packet.subject}</div>
            <div className="copy-box"><b>Application pitch</b><br />{packet.pitch}</div>
            <div className="copy-box"><b>Recruiter outreach</b><br />{packet.outreach}</div>
            <div className="copy-box"><b>Checklist</b><br />{packet.checklist.map(item => `- ${item}`).join("\n")}</div>
          </div>
        </section>;
      })}
    </div>
  );
}

function CrmView({ contacts, setContacts, jobs, addContact, canAddContact }: { contacts: RecruiterContact[]; setContacts: (contacts: RecruiterContact[]) => void; jobs: Job[]; addContact: (job: Job) => void; canAddContact: boolean }) {
  return (
    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Recruiter CRM</div><div className="muted">Track referral and hiring-team touchpoints.</div></div><span className={`pill ${canAddContact ? "green" : "red"}`}>{contacts.length} contacts</span></div>
        <div className="panel-body stack">
          {contacts.map(contact => <div className="copy-box" key={contact.id}>
            <div className="row"><b>{contact.name}</b><span className="pill blue">{contact.status}</span></div>
            <div>{contact.company} - {contact.role}</div>
            <div className="grid-3">
              <input className="field" placeholder="Name" value={contact.name} onChange={e => setContacts(contacts.map(item => item.id === contact.id ? { ...item, name: e.target.value } : item))} />
              <input className="field" placeholder="LinkedIn" value={contact.linkedin} onChange={e => setContacts(contacts.map(item => item.id === contact.id ? { ...item, linkedin: e.target.value } : item))} />
              <select className="field" value={contact.status} onChange={e => setContacts(contacts.map(item => item.id === contact.id ? { ...item, status: e.target.value as RecruiterContact["status"], lastTouch: today() } : item))}><option>Prospect</option><option>Messaged</option><option>Replied</option><option>Referral</option><option>Closed</option></select>
            </div>
            <textarea className="field" value={contact.notes} onChange={e => setContacts(contacts.map(item => item.id === contact.id ? { ...item, notes: e.target.value } : item))} />
          </div>)}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Create From Job</div><div className="muted">One click creates a recruiter target from a tracked role.</div></div></div>
        <div className="panel-body stack">
          {jobs.slice(0, 8).map(job => <div className="copy-box" key={job.id}><b>{job.company}</b><br />{job.role}<br /><button className="mini-btn green" onClick={() => addContact(job)}>Add to CRM</button></div>)}
        </div>
      </section>
    </div>
  );
}

function RemindersView({ reminders, jobs, markDone, setReminders }: { reminders: FollowUpReminder[]; jobs: Job[]; markDone: (reminder: FollowUpReminder) => void; setReminders: (reminders: FollowUpReminder[]) => void }) {
  const sorted = reminders.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <section className="panel">
      <div className="panel-head"><div><div className="panel-title">Follow-Up Reminders</div><div className="muted">Turn applications into conversations.</div></div><span className="pill amber">{reminders.filter(item => !item.done).length} open</span></div>
      <div className="panel-body stack">
        {sorted.map(reminder => {
          const job = jobs.find(item => item.id === reminder.jobId);
          return <div className="copy-box" key={reminder.id}>
            <div className="row"><b>{reminder.title}</b><span className={`pill ${reminder.done ? "green" : reminder.dueDate <= today() ? "red" : "blue"}`}>{reminder.done ? "Done" : reminder.dueDate}</span></div>
            <div>{job?.company ?? "Unknown"} - {job?.role ?? reminder.jobId} - {reminder.channel}</div>
            <div className="actions"><button className="mini-btn green" onClick={() => markDone(reminder)}>Mark Done</button><button className="mini-btn" onClick={() => setReminders(reminders.map(item => item.id === reminder.id ? { ...item, dueDate: daysFromToday(3) } : item))}>Snooze 3d</button></div>
          </div>;
        })}
      </div>
    </section>
  );
}

function ApplicationsView({ jobs }: { jobs: Job[] }) {
  return <div className="grid-2">{jobs.filter(job => job.status !== "Skipped").sort((a, b) => b.fit - a.fit).slice(0, 8).map(job => <section className="panel" key={job.id}><div className="panel-head"><div><div className="panel-title">{job.company}</div><div className="muted">{job.role}</div></div><span className="pill green">{job.fit}% fit</span></div><div className="panel-body stack"><div className="copy-box"><b>Why fit:</b> I bring 5+ years of data engineering experience across {job.resume.includes("Databricks") ? "Databricks, PySpark, Delta Lake, Unity Catalog, and medallion architecture" : "Azure Data Factory, Azure Databricks, ADLS Gen2, SQL, Airflow, and CI/CD"}.</div><div className="copy-box"><b>Recruiter note:</b> Hi [Name], I found the {job.role} role at {job.company}. It aligns closely with my Azure/Databricks data engineering background, especially PySpark, Databricks migration, validation, and orchestration.</div></div></section>)}</div>;
}

function PipelineView({ jobs, edit, markApplied }: { jobs: Job[]; edit: (job: Job) => void; markApplied: (job: Job) => void }) {
  return <div className="board">{statuses.filter(status => status !== "Skipped").map(status => <section className="stage" key={status}><div className="stage-head"><span>{status}</span><span className="pill">{jobs.filter(job => job.status === status).length}</span></div>{jobs.filter(job => job.status === status).map(job => <div className="lane-card" key={job.id} onClick={() => edit(job)}><b>{job.company}</b><span>{job.role}</span><span>Fit {job.fit}% · Quality {qualityScore(job)}%</span>{!isSubmitted(job.status) && <button className="mini-btn green" onClick={e => { e.stopPropagation(); markApplied(job); }}>Mark Applied</button>}</div>)}</section>)}</div>;
}

function InterviewView({ jobs, resumeText }: { jobs: Job[]; resumeText: string }) {
  const prepJobs = jobs.filter(job => ["Interview", "Offer"].includes(job.status)).length ? jobs.filter(job => ["Interview", "Offer"].includes(job.status)) : jobs.filter(job => decision(job).label === "Green").slice(0, 4);
  return <div className="grid-2">{prepJobs.map(job => {
    const report = runMatchEngine(resumeText, `${job.role}\n${job.keywords}\n${job.notes}`, job);
    return <section className="panel" key={job.id}><div className="panel-head"><div><div className="panel-title">{job.company}</div><div className="muted">{job.role}</div></div><span className="pill green">Prep ready</span></div><div className="panel-body stack"><MatchReportView report={report} /></div></section>;
  })}</div>;
}

function AnalyticsView({ jobs }: { jobs: Job[] }) {
  const counts = statuses.map(status => [status, jobs.filter(job => job.status === status).length] as const);
  return <div className="grid-2"><section className="panel"><div className="panel-head"><div className="panel-title">Funnel</div></div><div className="panel-body stack">{counts.map(([status, count]) => <div className="copy-box" key={status}><b>{status}</b>: {count}</div>)}</div></section><section className="panel"><div className="panel-head"><div className="panel-title">Follow Ups</div></div><div className="panel-body stack">{jobs.filter(job => job.followupDate).map(job => <div className="copy-box" key={job.id}><b>{job.company}</b> · {job.followupDate}<br />{job.next}</div>)}</div></section></div>;
}

function SettingsView({ user, setUser, resume, setResume }: { user: RolePilotUser; setUser: (user: RolePilotUser) => void; resume: ResumeProfile; setResume: (profile: ResumeProfile) => void }) {
  return <div className="grid-2"><section className="panel"><div className="panel-head"><div className="panel-title">Account</div></div><div className="panel-body stack"><label>Name<input className="field" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} /></label><label>Email<input className="field" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} /></label><div className="copy-box">Local-first account data with optional Supabase sign-in and cloud backup.</div></div></section><section className="panel"><div className="panel-head"><div className="panel-title">Resume Profile</div></div><div className="panel-body stack"><textarea className="field" value={resume.text} onChange={e => setResume({ ...resume, text: e.target.value, updatedAt: today() })} /><button className="btn" onClick={() => setResume(defaultResumeProfile)}>Reset Resume Profile</button></div></section></div>;
}

function BillingCenter({ user, updatePlan, usage, limits }: { user: RolePilotUser; updatePlan: (plan: SubscriptionPlan) => void; usage: { jobs: number; resumes: number; contacts: number }; limits: { jobs: number; resumes: number; contacts: number } }) {
  const [checkoutStatus, setCheckoutStatus] = useState("Razorpay checkout is ready after keys are added.");

  async function createPaymentLink(plan: SubscriptionPlan) {
    setCheckoutStatus(`Creating ${plan} payment link...`);
    try {
      const response = await fetch("/api/billing/razorpay-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: user.email, name: user.name })
      });
      const payload = await response.json() as { shortUrl?: string; error?: string };
      if (!response.ok || payload.error) {
        setCheckoutStatus(payload.error || "Payment link failed.");
        return;
      }
      setCheckoutStatus(`${plan} payment link created.`);
      if (payload.shortUrl) window.open(payload.shortUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setCheckoutStatus(error instanceof Error ? error.message : "Payment link failed.");
    }
  }

  return (
    <div className="stack">
      <section className="panel billing-note">
        <div className="panel-body">
          <div className="label">Billing Status</div>
          <h2>Plan controls stay local until billing is activated.</h2>
          <p className="muted">Add Razorpay keys to enable transaction-only checkout. The webhook route can activate Sprint and Pro plans once Razorpay confirms payment.</p>
          <div className="copy-box">{checkoutStatus}</div>
        </div>
      </section>
      <div className="grid-3">
      {(Object.keys(planLimits) as SubscriptionPlan[]).map(plan => {
        const item = planLimits[plan];
        return <section className={`panel ${user.plan === plan ? "selected-plan" : ""}`} key={plan}>
          <div className="panel-head"><div><div className="panel-title">{plan}</div><div className="muted">{item.label}</div></div><CreditCard size={20} /></div>
          <div className="panel-body stack">
            <h2>{item.price}</h2>
            <div className="copy-box">Jobs: {item.jobs}<br />Resume versions: {item.resumes}<br />CRM contacts: {item.contacts}</div>
            <div className="actions">
              <button className={`btn ${user.plan === plan ? "green" : "primary"}`} onClick={() => updatePlan(plan)}>{user.plan === plan ? "Current Plan" : `Switch to ${plan}`}</button>
              {plan !== "Free" && <button className="btn" onClick={() => createPaymentLink(plan)}>Create Payment Link</button>}
            </div>
          </div>
        </section>;
      })}
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Current Usage</div><div className="muted">Current limits for this workspace.</div></div></div>
        <div className="panel-body stack">
          <div className="copy-box"><b>Jobs</b>: {usage.jobs}/{limits.jobs}</div>
          <div className="copy-box"><b>Resume versions</b>: {usage.resumes}/{limits.resumes}</div>
          <div className="copy-box"><b>CRM contacts</b>: {usage.contacts}/{limits.contacts}</div>
          <div className="copy-box">This is a product-ready billing surface; connect Razorpay keys and webhook routing to activate payments.</div>
        </div>
      </section>
      </div>
    </div>
  );
}

function ProductSettings({
  user,
  setUser,
  jobs,
  setJobs,
  settings,
  setSettings,
  resume,
  setResume,
  resumeAssets,
  setResumeAssets,
  contacts,
  setContacts,
  reminders,
  setReminders
}: {
  user: RolePilotUser;
  setUser: (user: RolePilotUser) => void;
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  resume: ResumeProfile;
  setResume: (profile: ResumeProfile) => void;
  resumeAssets: ResumeAsset[];
  setResumeAssets: (assets: ResumeAsset[]) => void;
  contacts: RecruiterContact[];
  setContacts: (contacts: RecruiterContact[]) => void;
  reminders: FollowUpReminder[];
  setReminders: (reminders: FollowUpReminder[]) => void;
}) {
  return <div className="grid-2">
    <section className="panel">
      <div className="panel-head"><div className="panel-title">Account</div></div>
      <div className="panel-body stack">
        <label>Name<input className="field" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} /></label>
        <label>Email<input className="field" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} /></label>
        <label>Notice period<input className="field" value={settings.noticePeriod} onChange={e => setSettings({ ...settings, noticePeriod: e.target.value })} /></label>
        <div className="copy-box">This build stores settings locally. The SaaS backend path is auth, database, payment provider, and encrypted resume storage.</div>
      </div>
    </section>
    <section className="panel">
      <div className="panel-head"><div className="panel-title">Search Preferences</div></div>
      <div className="panel-body stack">
        <label>Target titles<textarea className="field" value={settings.targetTitles} onChange={e => setSettings({ ...settings, targetTitles: e.target.value })} /></label>
        <label>Locations<input className="field" value={settings.locations} onChange={e => setSettings({ ...settings, locations: e.target.value })} /></label>
        <label>Salary floor<input className="field" value={settings.salaryFloor} onChange={e => setSettings({ ...settings, salaryFloor: e.target.value })} /></label>
        <label>Preferred companies<textarea className="field" value={settings.preferredCompanies} onChange={e => setSettings({ ...settings, preferredCompanies: e.target.value })} /></label>
        <label>Weekly application goal<input className="field" type="number" value={settings.weeklyGoal} onChange={e => setSettings({ ...settings, weeklyGoal: Number(e.target.value) })} /></label>
        <label className="check-row"><input type="checkbox" checked={settings.autoSyncFeed} onChange={e => setSettings({ ...settings, autoSyncFeed: e.target.checked })} /> Auto-sync GCC/product feed</label>
        <button className="btn" onClick={() => setResume(defaultResumeProfile)}>Reset Resume Profile</button>
        <div className="copy-box"><b>Active master profile</b><br />{resume.label}</div>
      </div>
    </section>
    <section className="panel">
      <div className="panel-head"><div><div className="panel-title">AI Assist</div><div className="muted">Gemini API-powered JD, resume, and interview guidance.</div></div><Sparkles size={20} /></div>
      <div className="panel-body stack">
        <label>Provider<select className="field" value={settings.aiProvider} onChange={e => setSettings({ ...settings, aiProvider: e.target.value as UserSettings["aiProvider"] })}><option>Gemini API</option><option>Local</option></select></label>
        <label>Model<input className="field" value={settings.aiModel} onChange={e => setSettings({ ...settings, aiModel: e.target.value })} /></label>
        <label>Privacy mode<select className="field" value={settings.aiPrivacyMode} onChange={e => setSettings({ ...settings, aiPrivacyMode: e.target.value as UserSettings["aiPrivacyMode"] })}><option>Redacted</option><option>Full profile</option></select></label>
        <div className="copy-box"><b>AI setup</b><br />Add <code>GEMINI_API_KEY</code> to <code>.env.local</code> and restart the app. Redacted mode removes obvious email, phone, local paths, and candidate name before sending content to Gemini API.</div>
      </div>
    </section>
    <CloudSyncPanel
      user={user}
      jobs={jobs}
      setJobs={setJobs}
      settings={settings}
      setSettings={setSettings}
      resume={resume}
      setResume={setResume}
      resumeAssets={resumeAssets}
      setResumeAssets={setResumeAssets}
      contacts={contacts}
      setContacts={setContacts}
      reminders={reminders}
      setReminders={setReminders}
    />
  </div>;
}

function CloudSyncPanel({
  user,
  jobs,
  setJobs,
  settings,
  setSettings,
  resume,
  setResume,
  resumeAssets,
  setResumeAssets,
  contacts,
  setContacts,
  reminders,
  setReminders
}: {
  user: RolePilotUser;
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  resume: ResumeProfile;
  setResume: (profile: ResumeProfile) => void;
  resumeAssets: ResumeAsset[];
  setResumeAssets: (assets: ResumeAsset[]) => void;
  contacts: RecruiterContact[];
  setContacts: (contacts: RecruiterContact[]) => void;
  reminders: FollowUpReminder[];
  setReminders: (reminders: FollowUpReminder[]) => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState(isSupabaseConfigured() ? "Supabase cloud sync ready." : "Add Supabase env vars to enable cloud sync.");
  const configured = isSupabaseConfigured();

  async function sendLink() {
    setStatus("Sending magic link...");
    const result = await sendMagicLink(email);
    setStatus(result.error || "Magic link sent. Open it in this browser to sign in.");
  }

  async function checkSession() {
    const result = await getCloudUser();
    setStatus(result.error || (result.user?.email ? `Signed in as ${result.user.email}` : "No cloud session yet."));
  }

  async function push() {
    const result = await pushWorkspace({
      user,
      jobs,
      resume,
      resumeAssets,
      settings,
      contacts,
      reminders,
      syncedAt: new Date().toISOString()
    });
    setStatus(result.error || "Workspace pushed to Supabase.");
  }

  async function restore() {
    const result = await pullWorkspace();
    if (result.error || !result.snapshot) {
      setStatus(result.error || "No cloud workspace found.");
      return;
    }
    setJobs(result.snapshot.jobs || []);
    setResume(result.snapshot.resume || defaultResumeProfile);
    setResumeAssets(result.snapshot.resumeAssets || defaultResumeAssets);
    setSettings({ ...defaultSettings, ...result.snapshot.settings });
    setContacts(result.snapshot.contacts || []);
    setReminders(result.snapshot.reminders || []);
    setStatus(`Workspace restored from ${result.snapshot.syncedAt ? new Date(result.snapshot.syncedAt).toLocaleString() : "cloud"}.`);
  }

  async function signOut() {
    const result = await signOutCloudUser();
    setStatus(result.error || "Signed out from cloud sync.");
  }

  return (
    <section className="panel cloud-panel">
      <div className="panel-head"><div><div className="panel-title">Cloud Sync</div><div className="muted">Supabase Auth + Postgres backup for the current workspace.</div></div><span className={`pill ${configured ? "green" : "amber"}`}>{configured ? "Configured" : "Local-first"}</span></div>
      <div className="panel-body stack">
        <label>Email<input className="field" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <div className="actions">
          <button className="btn" disabled={!configured} onClick={sendLink}>Send Magic Link</button>
          <button className="btn" disabled={!configured} onClick={checkSession}>Check Session</button>
          <button className="btn green" disabled={!configured} onClick={push}>Push Workspace</button>
          <button className="btn" disabled={!configured} onClick={restore}>Restore Workspace</button>
          <button className="btn" disabled={!configured} onClick={signOut}>Cloud Sign Out</button>
        </div>
        <div className="copy-box">{status}</div>
        <div className="copy-box"><b>Setup files</b><br />Run <code>supabase/schema.sql</code> in Supabase SQL editor, then add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to Netlify and local env.</div>
      </div>
    </section>
  );
}

function JobEditor({ job, setJob, save, close, resumeText }: { job: Job; setJob: (job: Job) => void; save: () => void; close: () => void; resumeText: string }) {
  const report = runMatchEngine(resumeText, `${job.role}\n${job.keywords}\n${job.notes}`, job);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,27,36,.34)", display: "grid", placeItems: "center", padding: 18, zIndex: 20 }}>
      <section className="panel" style={{ width: "min(920px, 100%)", maxHeight: "92vh", overflow: "auto" }}>
        <div className="panel-head"><div><div className="panel-title">{job.company || "New Job"}</div><div className="muted">Fit {report.score}% · Quality {report.quality}% · {report.resume}</div></div><button className="btn" onClick={close}>Close</button></div>
        <div className="panel-body stack">
          <div className="grid-3"><label>Company<input className="field" value={job.company} onChange={e => setJob({ ...job, company: e.target.value })} /></label><label>Role<input className="field" value={job.role} onChange={e => setJob({ ...job, role: e.target.value })} /></label><label>Location<input className="field" value={job.location} onChange={e => setJob({ ...job, location: e.target.value })} /></label></div>
          <div className="grid-3"><label>Status<select className="field" value={job.status} onChange={e => setJob({ ...job, status: e.target.value as JobStatus })}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label><label>Fit<input className="field" type="number" value={job.fit} onChange={e => setJob({ ...job, fit: Number(e.target.value) })} /></label><label>Link<input className="field" value={job.link} onChange={e => setJob({ ...job, link: e.target.value })} /></label></div>
          <label>Keywords<textarea className="field" value={job.keywords} onChange={e => setJob({ ...job, keywords: e.target.value })} /></label>
          <label>Notes / JD<textarea className="field" value={job.notes} onChange={e => setJob({ ...job, notes: e.target.value })} /></label>
          <div className="copy-box"><b>Auto analysis:</b> {report.score}% fit, {report.quality}% quality. Matched: {report.matched.join(", ") || "none"}. Gaps: {report.gaps.join(", ") || "none"}.</div>
          <div className="actions"><button className="btn primary" onClick={() => setJob({ ...job, fit: report.score, resume: report.resume, scores: { azure: report.azure, databricks: report.databricks, modeling: report.modeling }, keywords: report.matched.join(", ") || job.keywords })}>Apply Analysis</button><button className="btn green" onClick={save}>Save Job</button></div>
        </div>
      </section>
    </div>
  );
}

