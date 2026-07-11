import type { Job, MatchReport, ResumeVersion } from "@/lib/types";

const skillMap = [
  { label: "Azure Data Factory", terms: ["azure data factory", "adf", "data factory"], type: "azure" },
  { label: "Azure Databricks", terms: ["azure databricks", "databricks"], type: "databricks" },
  { label: "PySpark", terms: ["pyspark"], type: "databricks" },
  { label: "Apache Spark", terms: ["apache spark", "spark", "spark sql"], type: "databricks" },
  { label: "Delta Lake", terms: ["delta lake", "delta"], type: "databricks" },
  { label: "Unity Catalog", terms: ["unity catalog"], type: "databricks" },
  { label: "ADLS Gen2", terms: ["adls", "adls gen2", "data lake storage"], type: "azure" },
  { label: "SQL", terms: ["sql", "spark sql"], type: "modeling" },
  { label: "Python", terms: ["python"], type: "engineering" },
  { label: "Airflow", terms: ["airflow", "orchestration"], type: "engineering" },
  { label: "Snowflake", terms: ["snowflake"], type: "modeling" },
  { label: "ETL/ELT", terms: ["etl", "elt", "data pipeline", "data pipelines"], type: "engineering" },
  { label: "Data Modeling", terms: ["data modeling", "dimensional", "star schema", "scd"], type: "modeling" },
  { label: "Validation/Reconciliation", terms: ["validation", "reconciliation", "data quality"], type: "engineering" },
  { label: "CI/CD", terms: ["ci/cd", "github actions", "devops"], type: "engineering" },
  { label: "Migration", terms: ["migration", "ssis", "talend"], type: "engineering" },
  { label: "dbt", terms: ["dbt"], type: "gap" },
  { label: "Kafka", terms: ["kafka"], type: "gap" },
  { label: "GCP", terms: ["gcp", "google cloud"], type: "gap" },
  { label: "Scala", terms: ["scala"], type: "gap" }
];

const includesAny = (text: string, terms: string[]) => terms.some(term => text.includes(term));
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function qualityScore(job: Job) {
  let score = 50;
  score += Math.round((job.fit - 70) * 0.75);
  if (/remote/i.test(job.location)) score += 8;
  if (/hybrid/i.test(job.location)) score += 6;
  if (/ibm|honeywell|ge|cisco|bristol|mongodb|rubrik|okta|zscaler|twilio/i.test(job.company)) score += 8;
  if (/databricks|azure|pyspark|snowflake/i.test(`${job.role} ${job.keywords}`)) score += 8;
  if (job.applyType === "Easy Apply") score += 3;
  if (/contract|immediate|support|8\+|9\+|10\+|principal|architect|manager/i.test(`${job.role} ${job.notes} ${job.keywords}`)) score -= 12;
  if (job.status === "Skipped") score -= 20;
  return clamp(score);
}

export function decision(job: Job) {
  const q = qualityScore(job);
  if (job.status === "Skipped" || job.fit < 72 || q < 58) return { label: "Red", text: "Skip", className: "red" };
  if (job.fit >= 85 && q >= 72) return { label: "Green", text: "Apply", className: "green" };
  return { label: "Yellow", text: "Verify", className: "amber" };
}

export function runMatchEngine(resumeText: string, jdText: string, job?: Partial<Job>): MatchReport {
  const jd = `${job?.company ?? ""} ${job?.role ?? ""} ${job?.location ?? ""} ${job?.notes ?? ""} ${job?.keywords ?? ""} ${jdText}`.toLowerCase();
  const resume = resumeText.toLowerCase();
  const jdSkills = skillMap.filter(skill => includesAny(jd, skill.terms));
  const matched = jdSkills.filter(skill => includesAny(resume, skill.terms));
  const gaps = jdSkills.filter(skill => !includesAny(resume, skill.terms));

  const skillCoverage = clamp((matched.length / Math.max(1, jdSkills.length)) * 100);
  let roleFit = /data engineer|data platform|databricks|pyspark|spark|azure data/i.test(jd) ? 78 : 62;
  if (/bengaluru|bangalore|hyderabad|kochi|india|remote|hybrid/i.test(jd)) roleFit += 8;
  if (/4\+|5\+|6\+|7\+|4 years|5 years|6 years|7 years/i.test(jd)) roleFit += 7;
  const signals: string[] = [];
  if (/8\+|9\+|10\+|principal|architect|manager|director/i.test(jd)) {
    roleFit -= 18;
    signals.push("Seniority risk");
  }
  if (/contract|immediate joiner|support|night shift/i.test(jd)) {
    roleFit -= 10;
    signals.push("Process risk");
  }
  if (/salary|ctc|lpa|compensation/i.test(jd)) signals.push("Salary clue visible");
  if (/bengaluru|bangalore|hyderabad|kochi|india|remote|hybrid/i.test(jd)) signals.push("Location aligned");

  const azure = clamp(50 + matched.filter(s => s.type === "azure").length * 18 + (jd.includes("azure") ? 12 : 0));
  const databricks = clamp(50 + matched.filter(s => s.type === "databricks").length * 14 + (jd.includes("databricks") ? 10 : 0));
  const modeling = clamp(55 + matched.filter(s => s.type === "modeling").length * 16 + matched.filter(s => s.type === "engineering").length * 5);
  const score = clamp(skillCoverage * 0.55 + roleFit * 0.35 + (signals.includes("Location aligned") ? 10 : 0));
  const quality = clamp(score * 0.65 + (azure + databricks + modeling) / 3 * 0.35);
  const resumeVersion: ResumeVersion = jd.includes("snowflake") || jd.includes("warehouse") || jd.includes("modeling")
    ? "Lakehouse-Snowflake-v1"
    : jd.includes("databricks") || jd.includes("spark") || jd.includes("delta")
      ? "Databricks-v1"
      : jd.includes("azure") || jd.includes("adf") || jd.includes("adls")
        ? "Azure-DE-v1"
        : "Generic-DE-v1";

  return {
    score,
    quality,
    skillCoverage,
    decision: score >= 85 && quality >= 75 ? "Strong apply" : score >= 72 ? "Tailor and verify" : "Low priority",
    resume: resumeVersion,
    matched: matched.map(s => s.label),
    gaps: gaps.map(s => s.label),
    signals,
    azure,
    databricks,
    modeling,
    interviewPrep: interviewPrep(jd, gaps.map(s => s.label))
  };
}

function interviewPrep(jd: string, gaps: string[]) {
  const topics: Array<{ topic: string; drill: string }> = [];
  if (/databricks|delta|unity|lakehouse|pyspark|spark/i.test(jd)) {
    topics.push({ topic: "Databricks and PySpark", drill: "Prepare migration story, Delta Lake design, Spark tuning, cluster/job orchestration, and validation approach." });
  }
  if (/azure|adf|adls|synapse/i.test(jd)) {
    topics.push({ topic: "Azure Data Engineering", drill: "Prepare ADF pipeline design, ADLS layout, Databricks integration, triggers, monitoring, and failure handling." });
  }
  if (/sql|warehouse|model|snowflake|star|scd/i.test(jd)) {
    topics.push({ topic: "SQL and Modeling", drill: "Practice joins, windows, incremental loads, SCD, dimensional modeling, and reconciliation SQL." });
  }
  if (/airflow|orchestration|ci\/cd|github|devops/i.test(jd)) {
    topics.push({ topic: "Orchestration and CI/CD", drill: "Prepare Airflow DAG design, retry strategy, GitHub Actions deployment, and rollback story." });
  }
  if (gaps.length) {
    topics.push({ topic: "Gap Defense", drill: `Prepare honest bridging answers for: ${gaps.slice(0, 5).join(", ")}.` });
  }
  if (!topics.length) {
    topics.push({ topic: "Core Data Engineering", drill: "Prepare ETL design, SQL, data validation, pipeline reliability, and migration impact stories." });
  }
  return topics;
}
