export type JobStatus =
  | "Found"
  | "JD Verified"
  | "Resume Tailored"
  | "Applied"
  | "Followed Up"
  | "Interview"
  | "Rejected"
  | "Offer"
  | "Skipped";

export type ResumeVersion = "Azure-DE-v1" | "Databricks-v1" | "Lakehouse-Snowflake-v1" | "Generic-DE-v1";

export type SubscriptionPlan = "Free" | "Pro" | "Sprint";

export type RolePilotUser = {
  id: string;
  name: string;
  email: string;
  plan: SubscriptionPlan;
};

export type Job = {
  id: string;
  dateFound: string;
  company: string;
  role: string;
  location: string;
  fit: number;
  priority: number;
  applyType: "Easy Apply" | "External Apply" | "Referral" | "Recruiter" | "Unknown";
  status: JobStatus;
  resume: ResumeVersion;
  link: string;
  notes: string;
  keywords: string;
  next: string;
  contact: string;
  appliedDate: string;
  followupDate: string;
  scores: {
    azure: number;
    databricks: number;
    modeling: number;
  };
};

export type ResumeProfile = {
  id: string;
  label: string;
  text: string;
  updatedAt: string;
};

export type ResumeAsset = {
  id: string;
  label: string;
  target: ResumeVersion;
  summary: string;
  body: string;
  updatedAt: string;
  isDefault: boolean;
};

export type UserSettings = {
  targetTitles: string;
  locations: string;
  salaryFloor: string;
  noticePeriod: string;
  preferredCompanies: string;
  autoSyncFeed: boolean;
  aiProvider: "Local" | "Gemini API";
  aiModel: string;
  aiPrivacyMode: "Redacted" | "Full profile";
  weeklyGoal: number;
  onboardingDone: boolean;
};

export type AiMatchInsight = {
  provider: string;
  model: string;
  privacyMode: UserSettings["aiPrivacyMode"];
  summary: string;
  strengths: string[];
  gaps: string[];
  tailoredBullets: string[];
  recruiterPitch: string;
  interviewDrills: string[];
};

export type AiResumeDraft = {
  provider: string;
  model: string;
  privacyMode: UserSettings["aiPrivacyMode"];
  title: string;
  targetRole: string;
  professionalSummary: string;
  coreSkills: string[];
  experienceBullets: string[];
  projectBullets: string[];
  atsKeywords: string[];
  coverNote: string;
  reviewWarnings: string[];
  fullResumeText: string;
};

export type RecruiterContact = {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  linkedin: string;
  status: "Prospect" | "Messaged" | "Replied" | "Referral" | "Closed";
  lastTouch: string;
  nextTouch: string;
  notes: string;
};

export type FollowUpReminder = {
  id: string;
  jobId: string;
  title: string;
  dueDate: string;
  channel: "Recruiter" | "Portal" | "LinkedIn" | "Email";
  done: boolean;
};

export type MatchReport = {
  score: number;
  quality: number;
  skillCoverage: number;
  decision: "Strong apply" | "Tailor and verify" | "Low priority";
  resume: ResumeVersion;
  matched: string[];
  gaps: string[];
  signals: string[];
  azure: number;
  databricks: number;
  modeling: number;
  interviewPrep: Array<{ topic: string; drill: string }>;
};

export type AutomationFeedJob = {
  id?: string;
  company: string;
  role: string;
  location: string;
  link: string;
  postedDate?: string;
  fit?: number;
  fitReason?: string;
  keywords?: string[] | string;
  applyType?: Job["applyType"];
  classificationConfidence?: string;
  notes?: string;
  azureScore?: number;
  databricksScore?: number;
  modelingScore?: number;
};

export type DiscoverySourceLane = {
  name: string;
  status: string;
  sources: string[];
};

export type LinkedInSearch = {
  name: string;
  role: string;
  location: string;
  url: string;
  cadence?: string;
  lane?: string;
};

export type AutomationFeed = {
  generatedAt: string;
  sourceAutomation: string;
  sourceLanes?: DiscoverySourceLane[];
  linkedInSearches?: LinkedInSearch[];
  linkedInPolicy?: string;
  jobs: AutomationFeedJob[];
};
