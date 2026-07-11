import type { FollowUpReminder, Job, RecruiterContact, ResumeAsset, ResumeProfile, RolePilotUser, UserSettings } from "@/lib/types";

export const demoUser: RolePilotUser = {
  id: "user_sarath_demo",
  name: "Sarath Krishnan",
  email: "sarath.demo@rolepilot.local",
  plan: "Sprint"
};

export const defaultResumeProfile: ResumeProfile = {
  id: "resume_sarath_data_engineer",
  label: "Sarath - Azure/Databricks Data Engineer",
  updatedAt: "2026-07-08",
  text: `Sarath Krishnan - Data Engineer / Azure Databricks Engineer
Experience: 5+ years.
Core skills: Azure Data Factory, Azure Databricks, ADLS Gen2, Blob Storage, PySpark, Apache Spark, Spark SQL, Delta Lake, Unity Catalog, Medallion Architecture, Airflow, Snowflake, SQL, Python, SSIS, Talend, GitHub Actions, CI/CD, Data Validation, Reconciliation, Star Schema, SCD, Dimensional Modeling, Performance Tuning.
Project strengths: migrated 15+ SSIS packages to Azure Databricks with PySpark; migrated 10+ Talend workflows to Databricks; built bronze/silver/gold medallion architecture; implemented Delta Lake and Unity Catalog patterns; automated Databricks workflows using Jobs and Airflow; implemented validation and reconciliation checks for migration cutover; tuned Spark jobs to reduce runtime; built CI/CD workflows using GitHub Actions.
Target roles: Data Engineer, Senior Data Engineer, Azure Data Engineer, Databricks Engineer, PySpark/Spark Data Engineer, Data Platform Engineer.
Target locations: Bengaluru, Hyderabad, Kochi, India remote/hybrid.
Salary guardrail: INR 22 LPA+.`
};

export const defaultSettings: UserSettings = {
  targetTitles: "Data Engineer, Azure Data Engineer, Databricks Engineer, PySpark Data Engineer, Data Platform Engineer",
  locations: "Bengaluru, Hyderabad, Kochi, India Remote",
  salaryFloor: "INR 22 LPA+",
  noticePeriod: "Immediate to negotiable",
  preferredCompanies: "GCC and product companies first; exclude staffing, support-only, and contract-only roles",
  autoSyncFeed: true,
  aiProvider: "Local",
  aiModel: "gemini-3.1-flash-lite",
  aiPrivacyMode: "Redacted",
  weeklyGoal: 25,
  onboardingDone: false
};

export const defaultResumeAssets: ResumeAsset[] = [
  {
    id: "resume_asset_azure",
    label: "Azure Data Engineer",
    target: "Azure-DE-v1",
    summary: "Best for ADF, ADLS Gen2, Azure Databricks, Synapse, SQL, and orchestration-heavy roles.",
    body: "Lead with Azure Data Factory, ADLS Gen2, Azure Databricks, PySpark, Spark SQL, Delta Lake, Airflow, CI/CD, validation, and migration outcomes.",
    updatedAt: "2026-07-08",
    isDefault: true
  },
  {
    id: "resume_asset_databricks",
    label: "Databricks Lakehouse",
    target: "Databricks-v1",
    summary: "Best for Databricks, PySpark, Delta Lake, Unity Catalog, medallion, and Spark platform roles.",
    body: "Lead with Azure Databricks migrations, PySpark pipelines, Delta Lake, Unity Catalog, bronze/silver/gold architecture, Spark tuning, workflow automation, and reconciliation.",
    updatedAt: "2026-07-08",
    isDefault: false
  },
  {
    id: "resume_asset_generic",
    label: "Generic Data Engineer",
    target: "Generic-DE-v1",
    summary: "Best for broad data engineering roles where stack details are mixed or unclear.",
    body: "Lead with 5+ years of data engineering, SQL, Python, Spark, orchestration, cloud data platforms, migrations, testing, data quality, and stakeholder delivery.",
    updatedAt: "2026-07-08",
    isDefault: false
  }
];

export const seedContacts: RecruiterContact[] = [
  {
    id: "contact_ibm_data",
    name: "IBM Data Hiring Team",
    company: "IBM",
    role: "Data Engineering Recruiting",
    email: "",
    linkedin: "",
    status: "Prospect",
    lastTouch: "",
    nextTouch: "2026-07-11",
    notes: "Use concise Azure/Databricks migration pitch after applying."
  }
];

export const seedReminders: FollowUpReminder[] = [
  {
    id: "reminder_ibm_followup",
    jobId: "ibm-azure-data-platforms",
    title: "Follow up after IBM application",
    dueDate: "2026-07-11",
    channel: "LinkedIn",
    done: false
  }
];

export const seedJobs: Job[] = [
  {
    id: "ibm-azure-data-platforms",
    dateFound: "2026-07-08",
    company: "IBM",
    role: "Data Engineer - Data Platforms - Azure",
    location: "Bengaluru, Hybrid",
    fit: 94,
    priority: 1,
    applyType: "External Apply",
    status: "JD Verified",
    resume: "Azure-DE-v1",
    link: "https://www.linkedin.com/jobs/view/4424865118/",
    notes: "Strong Azure match; salary not listed.",
    keywords: "Azure Data Factory, Azure Databricks, ADLS Gen2, Blob Storage, Spark, Python, Airflow, Synapse, SQL",
    next: "Tailor Azure resume and apply",
    contact: "",
    appliedDate: "",
    followupDate: "",
    scores: { azure: 96, databricks: 82, modeling: 80 }
  },
  {
    id: "ltimindtree-azure-databricks",
    dateFound: "2026-07-08",
    company: "LTIMindtree",
    role: "Azure Databricks Engineer",
    location: "India, Remote",
    fit: 92,
    priority: 2,
    applyType: "Easy Apply",
    status: "Found",
    resume: "Databricks-v1",
    link: "https://www.linkedin.com/jobs/view/4434534526/",
    notes: "Exact role; applicant volume is high.",
    keywords: "Azure Databricks, PySpark, Delta Lake, ADF, SQL, migration",
    next: "Verify full JD and apply",
    contact: "",
    appliedDate: "",
    followupDate: "",
    scores: { azure: 90, databricks: 96, modeling: 76 }
  },
  {
    id: "kpi-partners-senior-databricks",
    dateFound: "2026-07-08",
    company: "KPI Partners",
    role: "Senior Databricks Data Engineer",
    location: "Bangalore Urban, Hybrid",
    fit: 90,
    priority: 3,
    applyType: "Easy Apply",
    status: "Found",
    resume: "Databricks-v1",
    link: "https://www.linkedin.com/jobs/view/4435542286/",
    notes: "Exact Databricks role.",
    keywords: "Databricks, PySpark, Delta Lake, Unity Catalog, medallion architecture",
    next: "Verify full JD and apply",
    contact: "",
    appliedDate: "",
    followupDate: "",
    scores: { azure: 82, databricks: 97, modeling: 84 }
  },
  {
    id: "honeywell-advanced-data-engineer",
    dateFound: "2026-07-08",
    company: "Honeywell Technologies",
    role: "Advanced Data Engineer - Databricks",
    location: "Bengaluru",
    fit: 88,
    priority: 4,
    applyType: "External Apply",
    status: "Found",
    resume: "Databricks-v1",
    link: "https://www.linkedin.com/jobs/view/4418074230/",
    notes: "External apply.",
    keywords: "Databricks, Spark, PySpark, enterprise data platforms",
    next: "Open company careers page",
    contact: "",
    appliedDate: "",
    followupDate: "",
    scores: { azure: 80, databricks: 94, modeling: 78 }
  }
];
