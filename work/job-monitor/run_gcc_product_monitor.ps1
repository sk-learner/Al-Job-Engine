$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$stateDir = Join-Path $root "work\job-monitor"
$outDir = Join-Path $root "outputs"
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$appPublicDir = Join-Path $root "work\rolepilot-saas\public"
New-Item -ItemType Directory -Force -Path $appPublicDir | Out-Null

$registryPath = Join-Path $stateDir "gcc-product-companies.json"
$seenPath = Join-Path $stateDir "seen-jobs.json"
$feedHistoryPath = Join-Path $stateDir "recent-feed-jobs.json"
$trackerCsvPath = Join-Path $outDir "sarath_job_tracker.csv"
$feedPath = Join-Path $outDir "gcc_product_feed.js"
$linkedInFeedPath = Join-Path $outDir "linkedin_discovery_feed.js"
$appFeedPath = Join-Path $appPublicDir "gcc_product_feed.js"
$appLinkedInFeedPath = Join-Path $appPublicDir "linkedin_discovery_feed.js"
$ntfyTopic = "https://ntfy.sh/DE-Jobs"
$maxDiscoveryAlertsPerRun = 25

$linkedInSearches = @(
  [ordered]@{
    name = "Bengaluru Databricks"
    role = "Data Engineer Databricks"
    location = "Bengaluru, Karnataka, India"
    url = "https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20Databricks&location=Bengaluru%2C%20Karnataka%2C%20India&f_E=4&f_TPR=r604800"
    cadence = "Daily"
    lane = "LinkedIn Discovery"
  },
  [ordered]@{
    name = "Bengaluru Azure"
    role = "Azure Data Engineer"
    location = "Bengaluru, Karnataka, India"
    url = "https://www.linkedin.com/jobs/search/?keywords=Azure%20Data%20Engineer&location=Bengaluru%2C%20Karnataka%2C%20India&f_E=4&f_TPR=r604800"
    cadence = "Daily"
    lane = "LinkedIn Discovery"
  },
  [ordered]@{
    name = "Hyderabad Databricks"
    role = "Data Engineer Databricks"
    location = "Hyderabad, Telangana, India"
    url = "https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20Databricks&location=Hyderabad%2C%20Telangana%2C%20India&f_E=4&f_TPR=r604800"
    cadence = "Daily"
    lane = "LinkedIn Discovery"
  },
  [ordered]@{
    name = "Hyderabad Azure"
    role = "Azure Data Engineer"
    location = "Hyderabad, Telangana, India"
    url = "https://www.linkedin.com/jobs/search/?keywords=Azure%20Data%20Engineer&location=Hyderabad%2C%20Telangana%2C%20India&f_E=4&f_TPR=r604800"
    cadence = "Daily"
    lane = "LinkedIn Discovery"
  },
  [ordered]@{
    name = "Kochi Data Engineering"
    role = "Azure Databricks Data Engineer"
    location = "Kochi, Kerala, India"
    url = "https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20Azure%20Databricks&location=Kochi%2C%20Kerala%2C%20India&f_E=4&f_TPR=r604800"
    cadence = "Daily"
    lane = "LinkedIn Discovery"
  },
  [ordered]@{
    name = "Remote India"
    role = "PySpark Databricks Azure"
    location = "India Remote"
    url = "https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20PySpark%20Databricks%20Azure&location=India&f_E=4&f_TPR=r604800&f_WT=2%2C3"
    cadence = "Daily"
    lane = "LinkedIn Discovery"
  }
)

$broadDiscoveryQueries = @(
  [ordered]@{
    name = "Data Engineer GCC/Product India"
    query = '("Data Engineer" OR "Senior Data Engineer" OR "Data Platform Engineer") ("Bengaluru" OR "Hyderabad" OR "Kochi" OR "India Remote" OR "India") ("GCC" OR "global capability center" OR "product company" OR "careers" OR "apply")'
    maxResults = 20
  },
  [ordered]@{
    name = "Azure Databricks India"
    query = '("Azure Data Engineer" OR "Databricks Data Engineer" OR "Azure Databricks Engineer") ("Bengaluru" OR "Hyderabad" OR "Kochi" OR "India") job apply'
    maxResults = 20
  },
  [ordered]@{
    name = "PySpark Data Engineer India"
    query = '("PySpark Data Engineer" OR "Spark Data Engineer") ("Bengaluru" OR "Hyderabad" OR "Kochi" OR "India Remote") job apply'
    maxResults = 20
  },
  [ordered]@{
    name = "LinkedIn Data Engineer Fresh Postings"
    query = 'site:linkedin.com/jobs/view ("Data Engineer" OR "Azure Data Engineer" OR "Databricks Engineer" OR "PySpark" OR "Spark SQL") ("Bengaluru" OR "Hyderabad" OR "Kochi" OR "India Remote" OR "India")'
    maxResults = 25
  },
  [ordered]@{
    name = "Direct ATS Data Engineering India"
    query = '("Data Engineer" OR "Data Platform Engineer") ("Databricks" OR "PySpark" OR "Azure Data Factory" OR "Delta Lake") ("India" OR "Bengaluru" OR "Hyderabad") (greenhouse OR lever OR workdayjobs OR smartrecruiters)'
    maxResults = 25
  },
  [ordered]@{
    name = "Fresh Any-Company Data Engineer India"
    query = '("Data Engineer" OR "Senior Data Engineer" OR "Data Engineer II" OR "Data Platform Engineer") ("India" OR "Bengaluru" OR "Hyderabad" OR "Pune" OR "Chennai" OR "Gurugram" OR "Noida" OR "Remote") ("posted" OR "apply" OR "careers" OR "jobs")'
    maxResults = 25
  },
  [ordered]@{
    name = "LinkedIn Last Week Data Engineering India"
    query = 'site:linkedin.com/jobs/view ("Data Engineer" OR "Senior Data Engineer" OR "Azure Data Engineer" OR "Data Platform Engineer") ("India" OR "Bengaluru" OR "Hyderabad" OR "Remote")'
    maxResults = 25
  },
  [ordered]@{
    name = "Naukri Indeed Foundit Data Engineer India"
    query = '("Data Engineer" OR "Azure Data Engineer" OR "PySpark Data Engineer") ("Bengaluru" OR "Hyderabad" OR "India Remote") (naukri OR indeed OR foundit OR instahyre OR hirist)'
    maxResults = 20
  },
  [ordered]@{
    name = "Naukri Data Engineer India"
    query = 'site:naukri.com ("Data Engineer" OR "Azure Data Engineer" OR "Databricks") ("Bengaluru" OR "Hyderabad" OR "Kochi" OR "Remote")'
    maxResults = 25
  },
  [ordered]@{
    name = "Hirist Instahyre Data Engineer India"
    query = '("Data Engineer" OR "Senior Data Engineer" OR "PySpark" OR "Databricks") ("hirist" OR "instahyre") ("Bengaluru" OR "Hyderabad" OR "India")'
    maxResults = 25
  },
  [ordered]@{
    name = "Fresh Data Engineering Job Posts India"
    query = '("Data Engineer" OR "Azure Data Engineer" OR "Big Data Engineer") ("India" OR "Bangalore" OR "Hyderabad") ("apply" OR "job opening" OR "hiring") -intern -course'
    maxResults = 25
  },
  [ordered]@{
    name = "Data Engineering Product Companies India"
    query = '("Data Engineer" OR "Data Platform Engineer") ("Databricks" OR "Spark" OR "Airflow") ("product company" OR "SaaS" OR "fintech") ("India" OR "Bengaluru" OR "Hyderabad")'
    maxResults = 25
  }
)

$companies = @(
  @{
    company = "MongoDB"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://www.mongodb.com/careers"
    indiaLocations = @("Bengaluru", "Gurugram", "Hyderabad", "India Remote")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/mongodb/jobs?content=true"
  },
  @{
    company = "Rubrik"
    classification = "Product company / India R&D"
    confidence = "High"
    evidenceUrl = "https://www.rubrik.com/company/careers"
    indiaLocations = @("Bengaluru", "India")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/rubrik/jobs?content=true"
  },
  @{
    company = "Okta"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://www.okta.com/company/careers/"
    indiaLocations = @("Bengaluru", "India")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/okta/jobs?content=true"
  },
  @{
    company = "Zscaler"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://www.zscaler.com/careers"
    indiaLocations = @("Bengaluru", "Hyderabad", "Pune", "India")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/zscaler/jobs?content=true"
  },
  @{
    company = "Twilio"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://www.twilio.com/en-us/company/jobs"
    indiaLocations = @("Bengaluru", "India Remote")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/twilio/jobs?content=true"
  },
  @{
    company = "Cloudflare"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://www.cloudflare.com/careers/jobs/"
    indiaLocations = @("Bengaluru", "India Remote")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs?content=true"
  },
  @{
    company = "Asana"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://asana.com/jobs"
    indiaLocations = @("Bengaluru", "India")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/asana/jobs?content=true"
  },
  @{
    company = "Datadog"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://www.datadoghq.com/careers/"
    indiaLocations = @("India Remote", "Bengaluru")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/datadog/jobs?content=true"
  },
  @{
    company = "Elastic"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://www.elastic.co/careers"
    indiaLocations = @("India Remote", "Bengaluru")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/elastic/jobs?content=true"
  },
  @{
    company = "Coinbase"
    classification = "Product company"
    confidence = "High"
    evidenceUrl = "https://www.coinbase.com/careers"
    indiaLocations = @("India Remote", "Bengaluru", "Hyderabad")
    sourceType = "greenhouse"
    url = "https://boards-api.greenhouse.io/v1/boards/coinbase/jobs?content=true"
  }
)

$companies += @(
  @{ company = "Databricks"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.databricks.com/company/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/databricks/jobs?content=true" },
  @{ company = "Snowflake"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://careers.snowflake.com/"; indiaLocations = @("Pune", "Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/snowflake/jobs?content=true" },
  @{ company = "Stripe"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://stripe.com/jobs"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true" },
  @{ company = "Rippling"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.rippling.com/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/rippling/jobs?content=true" },
  @{ company = "Plaid"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://plaid.com/careers/"; indiaLocations = @("India Remote", "Bengaluru"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/plaid/jobs?content=true" },
  @{ company = "Ramp"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://ramp.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/ramp/jobs?content=true" },
  @{ company = "Robinhood"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://careers.robinhood.com/"; indiaLocations = @("India Remote", "Bengaluru"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/robinhood/jobs?content=true" },
  @{ company = "Affirm"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.affirm.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/affirm/jobs?content=true" },
  @{ company = "Dropbox"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://jobs.dropbox.com/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/dropbox/jobs?content=true" },
  @{ company = "Reddit"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.redditinc.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/reddit/jobs?content=true" },
  @{ company = "DoorDash"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://careers.doordash.com/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/doordashusa/jobs?content=true" },
  @{ company = "Pinterest"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.pinterestcareers.com/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/pinterest/jobs?content=true" },
  @{ company = "Gusto"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://gusto.com/about/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/gusto/jobs?content=true" },
  @{ company = "DigitalOcean"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.digitalocean.com/careers"; indiaLocations = @("India Remote", "Bengaluru", "Hyderabad"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/digitalocean98/jobs?content=true" },
  @{ company = "HashiCorp"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.hashicorp.com/careers"; indiaLocations = @("India Remote", "Bengaluru"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/hashicorp/jobs?content=true" },
  @{ company = "Confluent"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.confluent.io/careers/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/confluent/jobs?content=true" },
  @{ company = "Miro"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://miro.com/careers/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/miro/jobs?content=true" },
  @{ company = "Vercel"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://vercel.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/vercel/jobs?content=true" },
  @{ company = "OpenAI"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://openai.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/openai/jobs?content=true" },
  @{ company = "Figma"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.figma.com/careers/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true" },
  @{ company = "Notion"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.notion.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/notion/jobs?content=true" },
  @{ company = "Grammarly"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.grammarly.com/jobs"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/grammarly/jobs?content=true" },
  @{ company = "Atlassian"; classification = "Product company / GCC"; confidence = "High"; evidenceUrl = "https://www.atlassian.com/company/careers"; indiaLocations = @("Bengaluru", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/atlassian/jobs?content=true" },
  @{ company = "Canva"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.canva.com/careers/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/canva/jobs?content=true" },
  @{ company = "Wise"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://wise.jobs/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/wise/jobs?content=true" },
  @{ company = "Toast"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://careers.toasttab.com/"; indiaLocations = @("Bengaluru", "Chennai", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/toast/jobs?content=true" },
  @{ company = "Toast"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://careers.toasttab.com/"; indiaLocations = @("Bengaluru", "Chennai", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/toasttab/jobs?content=true" },
  @{ company = "ThoughtSpot"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://www.thoughtspot.com/careers"; indiaLocations = @("Bengaluru", "Hyderabad", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/thoughtspot/jobs?content=true" },
  @{ company = "Nutanix"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://www.nutanix.com/company/careers"; indiaLocations = @("Bengaluru", "Pune", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/nutanix/jobs?content=true" },
  @{ company = "Couchbase"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.couchbase.com/careers/"; indiaLocations = @("Bengaluru", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/couchbase/jobs?content=true" },
  @{ company = "Airtable"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.airtable.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/airtable/jobs?content=true" },
  @{ company = "Amplitude"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://amplitude.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/amplitude/jobs?content=true" },
  @{ company = "Braze"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.braze.com/company/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/braze/jobs?content=true" },
  @{ company = "Samsara"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.samsara.com/company/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/samsara/jobs?content=true" },
  @{ company = "HackerRank"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://www.hackerrank.com/careers"; indiaLocations = @("Bengaluru", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/hackerrank/jobs?content=true" },
  @{ company = "Postman"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://www.postman.com/company/careers/"; indiaLocations = @("Bengaluru", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/postman/jobs?content=true" },
  @{ company = "Freshworks"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.freshworks.com/company/careers/"; indiaLocations = @("Chennai", "Bengaluru", "Hyderabad", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/freshworks/jobs?content=true" },
  @{ company = "Razorpay"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://razorpay.com/jobs/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/razorpay/jobs?content=true" },
  @{ company = "Zeta"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://www.zeta.tech/careers/"; indiaLocations = @("Bengaluru", "Mumbai", "Hyderabad", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/zeta/jobs?content=true" },
  @{ company = "PhonePe"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.phonepe.com/careers/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/phonepe/jobs?content=true" },
  @{ company = "Meesho"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.meesho.io/jobs"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/meesho/jobs?content=true" },
  @{ company = "ShareChat"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://sharechat.com/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/sharechat/jobs?content=true" },
  @{ company = "Swiggy"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://careers.swiggy.com/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/swiggy/jobs?content=true" },
  @{ company = "Dunzo"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.dunzo.com/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/dunzo/jobs?content=true" },
  @{ company = "Navi"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://navi.com/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/navi/jobs?content=true" },
  @{ company = "Groww"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://groww.in/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/groww/jobs?content=true" },
  @{ company = "CRED"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://cred.club/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/cred/jobs?content=true" },
  @{ company = "CoinDCX"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://coindcx.com/careers"; indiaLocations = @("Bengaluru", "Mumbai", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/coindcx/jobs?content=true" },
  @{ company = "Mindtickle"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.mindtickle.com/careers/"; indiaLocations = @("Pune", "Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/mindtickle/jobs?content=true" },
  @{ company = "BrowserStack"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.browserstack.com/careers"; indiaLocations = @("Mumbai", "Bengaluru", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/browserstack/jobs?content=true" },
  @{ company = "Chargebee"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.chargebee.com/careers/"; indiaLocations = @("Chennai", "Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/chargebee/jobs?content=true" },
  @{ company = "Whatfix"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://whatfix.com/careers/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/whatfix/jobs?content=true" },
  @{ company = "MoEngage"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.moengage.com/careers/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/moengage/jobs?content=true" },
  @{ company = "CleverTap"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://clevertap.com/careers/"; indiaLocations = @("Mumbai", "Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/clevertap/jobs?content=true" },
  @{ company = "Observe.AI"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.observe.ai/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/observeai/jobs?content=true" },
  @{ company = "Locus"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://locus.sh/careers/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/locus/jobs?content=true" },
  @{ company = "Uniphore"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://www.uniphore.com/careers/"; indiaLocations = @("Bengaluru", "Chennai", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/uniphore/jobs?content=true" },
  @{ company = "Eightfold AI"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://eightfold.ai/careers/"; indiaLocations = @("Bengaluru", "Noida", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/eightfoldai/jobs?content=true" },
  @{ company = "Netskope"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://www.netskope.com/company/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/netskope/jobs?content=true" },
  @{ company = "SentinelOne"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.sentinelone.com/careers/"; indiaLocations = @("India Remote", "Bengaluru"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/sentinelone/jobs?content=true" },
  @{ company = "CrowdStrike"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.crowdstrike.com/careers/"; indiaLocations = @("Pune", "India Remote", "Bengaluru"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/crowdstrike/jobs?content=true" },
  @{ company = "Palo Alto Networks"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://jobs.paloaltonetworks.com/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/paloaltonetworks/jobs?content=true" },
  @{ company = "ServiceNow"; classification = "Product company / GCC"; confidence = "High"; evidenceUrl = "https://careers.servicenow.com/"; indiaLocations = @("Hyderabad", "Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/servicenow/jobs?content=true" },
  @{ company = "Box"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://careers.box.com/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/boxinc/jobs?content=true" },
  @{ company = "Yext"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.yext.com/careers"; indiaLocations = @("Hyderabad", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/yext/jobs?content=true" },
  @{ company = "6sense"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://6sense.com/careers/"; indiaLocations = @("Pune", "Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/6sense/jobs?content=true" },
  @{ company = "Branch"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.branch.io/careers/"; indiaLocations = @("Bengaluru", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/branch/jobs?content=true" },
  @{ company = "Cockroach Labs"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.cockroachlabs.com/careers/"; indiaLocations = @("India Remote"); sourceType = "lever"; url = "https://api.lever.co/v0/postings/cockroachlabs?mode=json" },
  @{ company = "Scale AI"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://scale.com/careers"; indiaLocations = @("India Remote"); sourceType = "lever"; url = "https://api.lever.co/v0/postings/scaleai?mode=json" },
  @{ company = "Weights & Biases"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://wandb.ai/careers"; indiaLocations = @("India Remote"); sourceType = "lever"; url = "https://api.lever.co/v0/postings/wandb?mode=json" },
  @{ company = "PlanetScale"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://planetscale.com/careers"; indiaLocations = @("India Remote"); sourceType = "lever"; url = "https://api.lever.co/v0/postings/planetscale?mode=json" },
  @{ company = "Supabase"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://supabase.com/careers"; indiaLocations = @("India Remote"); sourceType = "lever"; url = "https://api.lever.co/v0/postings/supabase?mode=json" },
  @{ company = "Grafana Labs"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://grafana.com/about/careers/"; indiaLocations = @("India Remote", "Bengaluru"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs?content=true" },
  @{ company = "dbt Labs"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.getdbt.com/careers"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/dbtlabs/jobs?content=true" },
  @{ company = "Astronomer"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.astronomer.io/careers/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/astronomer/jobs?content=true" },
  @{ company = "Starburst"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.starburst.io/careers/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/starburst/jobs?content=true" },
  @{ company = "Starburst"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.starburst.io/careers/"; indiaLocations = @("India Remote"); sourceType = "lever"; url = "https://api.lever.co/v0/postings/starburst?mode=json" },
  @{ company = "Fivetran"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.fivetran.com/careers"; indiaLocations = @("Bengaluru", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/fivetran/jobs?content=true" },
  @{ company = "Segment"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://www.twilio.com/en-us/company/jobs"; indiaLocations = @("Bengaluru", "India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/segment/jobs?content=true" },
  @{ company = "Airbnb"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://careers.airbnb.com/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true" },
  @{ company = "Booking.com"; classification = "Product company / GCC"; confidence = "Medium"; evidenceUrl = "https://careers.booking.com/"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/bookingcom/jobs?content=true" },
  @{ company = "Expedia Group"; classification = "Product company / GCC"; confidence = "High"; evidenceUrl = "https://careers.expediagroup.com/"; indiaLocations = @("Gurugram", "Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/expedia/jobs?content=true" },
  @{ company = "Wayfair"; classification = "Product company / GCC"; confidence = "High"; evidenceUrl = "https://www.wayfair.com/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/wayfair/jobs?content=true" },
  @{ company = "Deliveroo"; classification = "Product company / India R&D"; confidence = "High"; evidenceUrl = "https://careers.deliveroo.co.uk/"; indiaLocations = @("Hyderabad", "India"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/deliveroo/jobs?content=true" },
  @{ company = "Deel"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://www.deel.com/careers/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/deel/jobs?content=true" },
  @{ company = "Remote"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://remote.com/jobs"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/remotecom/jobs?content=true" },
  @{ company = "GitLab"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://about.gitlab.com/jobs/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs?content=true" },
  @{ company = "GitHub"; classification = "Product company"; confidence = "High"; evidenceUrl = "https://github.careers/"; indiaLocations = @("India Remote", "Hyderabad", "Bengaluru"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/github/jobs?content=true" },
  @{ company = "Zapier"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://zapier.com/jobs"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/zapier/jobs?content=true" },
  @{ company = "Automattic"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://automattic.com/work-with-us/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/automattic/jobs?content=true" },
  @{ company = "Coursera"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://about.coursera.org/careers"; indiaLocations = @("India Remote", "Bengaluru"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/coursera/jobs?content=true" },
  @{ company = "Udemy"; classification = "Product company"; confidence = "Medium"; evidenceUrl = "https://about.udemy.com/careers/"; indiaLocations = @("India Remote"); sourceType = "greenhouse"; url = "https://boards-api.greenhouse.io/v1/boards/udemy/jobs?content=true" },
  @{ company = "Nielsen"; classification = "Product/GCC"; confidence = "Medium"; evidenceUrl = "https://jobs.lever.co/nielsen"; indiaLocations = @("Bengaluru", "Mumbai", "India"); sourceType = "lever"; url = "https://api.lever.co/v0/postings/nielsen?mode=json" }
)

$companies += @(
  @{ company = "Walmart Global Tech"; classification = "GCC / Product engineering"; confidence = "High"; evidenceUrl = "https://tech.walmart.com/"; indiaLocations = @("Bengaluru", "Chennai", "India"); sourceType = "workday"; url = "https://walmart.wd5.myworkdayjobs.com/wday/cxs/walmart/WalmartExternal/jobs"; publicBaseUrl = "https://walmart.wd5.myworkdayjobs.com/WalmartExternal" },
  @{ company = "Target in India"; classification = "GCC / Product engineering"; confidence = "High"; evidenceUrl = "https://india.target.com/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "workday"; url = "https://target.wd5.myworkdayjobs.com/wday/cxs/target/targetcareers/jobs"; publicBaseUrl = "https://target.wd5.myworkdayjobs.com/targetcareers" },
  @{ company = "Lowe's India"; classification = "GCC / Product engineering"; confidence = "High"; evidenceUrl = "https://www.lowes.co.in/careers"; indiaLocations = @("Bengaluru", "India"); sourceType = "workday"; url = "https://lowes.wd5.myworkdayjobs.com/wday/cxs/lowes/Lowes_External_Career_Site/jobs"; publicBaseUrl = "https://lowes.wd5.myworkdayjobs.com/Lowes_External_Career_Site" },
  @{ company = "Mastercard"; classification = "Product company / GCC"; confidence = "High"; evidenceUrl = "https://careers.mastercard.com/"; indiaLocations = @("Pune", "Gurugram", "Vadodara", "India"); sourceType = "workday"; url = "https://mastercard.wd1.myworkdayjobs.com/wday/cxs/mastercard/CorporateCareers/jobs"; publicBaseUrl = "https://mastercard.wd1.myworkdayjobs.com/CorporateCareers" },
  @{ company = "Salesforce"; classification = "Product company / GCC"; confidence = "High"; evidenceUrl = "https://careers.salesforce.com/"; indiaLocations = @("Hyderabad", "Bengaluru", "Mumbai", "Gurugram", "India"); sourceType = "workday"; url = "https://salesforce.wd12.myworkdayjobs.com/wday/cxs/salesforce/External_Career_Site/jobs"; publicBaseUrl = "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site" },
  @{ company = "ServiceNow"; classification = "Product company / GCC"; confidence = "High"; evidenceUrl = "https://careers.servicenow.com/"; indiaLocations = @("Hyderabad", "Bengaluru", "India"); sourceType = "smartrecruiters"; companySlug = "ServiceNow"; url = "https://api.smartrecruiters.com/v1/companies/ServiceNow/postings?limit=100" },
  @{ company = "Visa"; classification = "Product company / GCC"; confidence = "High"; evidenceUrl = "https://usa.visa.com/careers.html"; indiaLocations = @("Bengaluru", "India"); sourceType = "smartrecruiters"; companySlug = "Visa"; url = "https://api.smartrecruiters.com/v1/companies/Visa/postings?limit=100" },
  @{ company = "Tesco Technology"; classification = "GCC / Product engineering"; confidence = "High"; evidenceUrl = "https://www.tescotechnology.com/careers/"; indiaLocations = @("Bengaluru", "India"); sourceType = "smartrecruiters"; companySlug = "TescoTechnology"; url = "https://api.smartrecruiters.com/v1/companies/TescoTechnology/postings?limit=100" },
  @{ company = "Nagarro Product Roles"; classification = "Review-only product roles"; confidence = "Medium"; evidenceUrl = "https://www.smartrecruiters.com/"; indiaLocations = @("India Remote", "Gurugram", "Bengaluru"); sourceType = "smartrecruiters"; companySlug = "Nagarro"; url = "https://api.smartrecruiters.com/v1/companies/Nagarro/postings?limit=100" }
)

function Normalize-Text($value) {
  if ($null -eq $value) { return "" }
  return ([string]$value) -replace '<[^>]+>', ' ' -replace '&nbsp;', ' ' -replace '\s+', ' '
}

function Canonical-Url($url) {
  if ([string]::IsNullOrWhiteSpace($url)) { return "" }
  return (($url -replace '([?&])utm_[^&]+', '$1' -replace '[?&]$', '').Trim().ToLowerInvariant())
}

function Is-IndiaLocation($location) {
  if ([string]::IsNullOrWhiteSpace([string]$location)) { return $false }
  return ([string]$location).ToLowerInvariant() -match 'india|bengaluru|bangalore|hyderabad|gurugram|noida|pune|chennai|kochi|mumbai|remote'
}

function Is-NonIndiaRemote($location) {
  $value = ([string]$location).ToLowerInvariant()
  if ($value -notmatch 'remote') { return $false }
  if ($value -match 'india|bengaluru|bangalore|hyderabad|gurugram|noida|pune|chennai|kochi|mumbai') { return $false }
  return $value -match 'usa|united states|poland|canada|europe|emea|uk|london|san francisco|us -|remote - us|remote us'
}

function FeedRecord-Key($job) {
  $link = if ($job.link) { [string]$job.link } elseif ($job.canonicalUrl) { [string]$job.canonicalUrl } else { "" }
  if ($link) { return Canonical-Url $link }
  return (([string]$job.company + "|" + [string]$job.role + "|" + [string]$job.location).ToLowerInvariant())
}

function Is-FeedRecordValid($job) {
  if (-not $job) { return $false }
  if (-not $job.company -or -not $job.role -or -not $job.link) { return $false }
  if (-not (Is-IndiaLocation $job.location)) { return $false }
  if (Is-NonIndiaRemote $job.location) { return $false }
  $roleText = ([string]$job.role).ToLowerInvariant()
  if ($roleText -notmatch 'data engineer|data platform|analytics engineer|azure data|databricks data|pyspark|spark data|big data|etl|data pipeline|bi engineer|business intelligence') { return $false }
  $text = "$($job.company) $($job.role) $($job.location) $($job.notes) $($job.fitReason) $($job.keywords)".ToLowerInvariant()
  if ($text -match 'internship|intern|principal|director|manager|architect|training course|certification|question paper|walkin|walk-in|bpo|support') { return $false }
  return $text -match 'data engineer|data platform|azure data|databricks|pyspark|spark|big data|etl|data pipeline|analytics engineer|snowflake'
}

function Normalize-FeedRecord($job, $sourceNote) {
  $keywordValue = @()
  if ($job.keywords -is [array]) { $keywordValue = @($job.keywords) }
  elseif ($job.keywords) { $keywordValue = @(([string]$job.keywords) -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }
  if (-not $keywordValue.Count) { $keywordValue = @("Data Engineer", "India") }

  $idValue = if ($job.id) { [string]$job.id } else { FeedRecord-Key $job }
  $postedValue = if ($job.postedDate) { [string]$job.postedDate } elseif ($job.dateFound) { [string]$job.dateFound } else { "Recent feed carry-forward" }
  $fitValue = if ($job.fit) { [int]$job.fit } else { 70 }
  $fitReasonValue = if ($job.fitReason) { [string]$job.fitReason } else { "Recent India-specific job carried forward for board visibility" }
  $applyTypeValue = if ($job.applyType) { [string]$job.applyType } else { "External Apply" }
  $confidenceValue = if ($job.classificationConfidence) { [string]$job.classificationConfidence } else { "Recent" }
  $notesValue = ""
  if ($job.notes) { $notesValue = [string]$job.notes }
  $notesValue = $notesValue `
    -replace '\s*Imported from previous India job tracker\.', '' `
    -replace '\s*Seeded from previous India tracker\.', '' `
    -replace '\s*Carried forward from previous feed\.', '' `
    -replace '\s*Carried forward from recent feed history\.', ''
  if (-not $notesValue.Trim()) { $notesValue = $sourceNote }
  elseif ($sourceNote -notmatch 'Carried forward|Seeded from previous') { $notesValue = ($notesValue + " " + $sourceNote).Trim() }
  $azureValue = if ($job.azureScore) { [int]$job.azureScore } elseif ($job.scores -and $job.scores.azure) { [int]$job.scores.azure } else { 70 }
  $databricksValue = if ($job.databricksScore) { [int]$job.databricksScore } elseif ($job.scores -and $job.scores.databricks) { [int]$job.scores.databricks } else { 70 }
  $modelingValue = if ($job.modelingScore) { [int]$job.modelingScore } elseif ($job.scores -and $job.scores.modeling) { [int]$job.scores.modeling } else { 70 }

  return [pscustomobject][ordered]@{
    id = $idValue
    company = [string]$job.company
    role = [string]$job.role
    location = [string]$job.location
    link = [string]$job.link
    postedDate = $postedValue
    fit = $fitValue
    fitReason = $fitReasonValue
    keywords = $keywordValue
    applyType = $applyTypeValue
    classificationConfidence = $confidenceValue
    notes = $notesValue
    azureScore = $azureValue
    databricksScore = $databricksValue
    modelingScore = $modelingValue
  }
}

function Get-CarryForwardFeedJobs {
  $records = New-Object System.Collections.Generic.List[object]

  foreach ($path in @($feedPath, $appFeedPath)) {
    if (-not (Test-Path $path)) { continue }
    try {
      $source = Get-Content $path -Raw
      $json = $source -replace '^\s*window\.GCC_PRODUCT_JOB_FEED\s*=\s*', '' -replace ';\s*$', ''
      $feed = $json | ConvertFrom-Json
      foreach ($job in @($feed.jobs)) {
        if (Is-FeedRecordValid $job) { $records.Add((Normalize-FeedRecord $job "Carried forward from previous feed.")) }
      }
    } catch {
      Write-Warning "Previous feed carry-forward failed for ${path}: $($_.Exception.Message)"
    }
  }

  if (Test-Path $feedHistoryPath) {
    try {
      $history = Get-Content $feedHistoryPath -Raw | ConvertFrom-Json
      foreach ($job in @($history.jobs)) {
        if (Is-FeedRecordValid $job) { $records.Add((Normalize-FeedRecord $job "Carried forward from recent feed history.")) }
      }
    } catch {
      Write-Warning "Feed history carry-forward failed: $($_.Exception.Message)"
    }
  }

  if (Test-Path $trackerCsvPath) {
    try {
      foreach ($row in @(Import-Csv $trackerCsvPath)) {
        $fitValue = 70
        [void][int]::TryParse([string]$row.Fit, [ref]$fitValue)
        $resumeVersion = [string]$row.'Resume Version'
        $azureValue = 72
        $databricksValue = 72
        if ($resumeVersion -match 'Azure') { $azureValue = 88 }
        if ($resumeVersion -match 'Databricks|Snowflake') { $databricksValue = 88 }
        $job = [pscustomobject]@{
          id = "tracker:" + ([string]$row.Link -replace '\W+', '-')
          company = $row.Company
          role = $row.Role
          location = $row.Location
          link = $row.Link
          postedDate = $row.Date
          fit = $fitValue
          fitReason = "Recent India-specific tracker job for Sarath's data engineering profile"
          keywords = @($resumeVersion, "Data Engineer", "India")
          applyType = $row.'Apply Type'
          classificationConfidence = "Recent"
          notes = "$($row.Notes) Imported from previous India job tracker."
          azureScore = $azureValue
          databricksScore = $databricksValue
          modelingScore = 74
        }
        if (Is-FeedRecordValid $job) { $records.Add((Normalize-FeedRecord $job "Seeded from previous India tracker.")) }
      }
    } catch {
      Write-Warning "Tracker carry-forward failed from ${trackerCsvPath}: $($_.Exception.Message)"
    }
  }

  $map = [ordered]@{}
  foreach ($record in $records) {
    $key = FeedRecord-Key $record
    if (-not $key) { continue }
    if (-not $map.Contains($key)) { $map[$key] = $record }
  }
  return @($map.Values | Sort-Object -Property @{ Expression = "fit"; Descending = $true } | Select-Object -First 40)
}

function Score-Job($company, $title, $location, $text) {
  $hay = "$title $location $text".ToLowerInvariant()
  $fit = 62
  $azure = 45
  $databricks = 45
  $modeling = 55
  $keywords = New-Object System.Collections.Generic.List[string]

  foreach ($kw in @("data engineer","senior data engineer","data engineer ii","azure data engineer","databricks engineer","data platform engineer","analytics engineer","etl developer","big data engineer","data pipeline engineer")) {
    if ($hay.Contains($kw)) { $fit += 14; $keywords.Add($kw) }
  }
  foreach ($kw in @("spark","pyspark","spark sql")) {
    if ($hay.Contains($kw)) { $fit += 8; $databricks += 8; $keywords.Add($kw) }
  }
  foreach ($kw in @("databricks","delta lake","unity catalog","lakehouse")) {
    if ($hay.Contains($kw)) { $fit += 10; $databricks += 14; $keywords.Add($kw) }
  }
  foreach ($kw in @("azure","adf","data factory","adls")) {
    if ($hay.Contains($kw)) { $fit += 8; $azure += 14; $keywords.Add($kw) }
  }
  foreach ($kw in @("sql","python","airflow","etl","data pipeline","data pipelines")) {
    if ($hay.Contains($kw)) { $fit += 4; $modeling += 5; $keywords.Add($kw) }
  }
  foreach ($kw in @("bengaluru","bangalore","hyderabad","kochi","pune","chennai","gurugram","noida","india remote","remote india")) {
    if ($hay.Contains($kw)) { $fit += 3 }
  }
  if ($hay -match '8\+|8 years|9 years|10 years|principal|architect|manager|director|staff|intern|staffing|contract-only') { $fit -= 30 }
  if ($hay -match 'support only|production support|technical support') { $fit -= 25 }
  if ($company -eq "Rubrik" -and $hay.Contains("security")) { $fit -= 4 }

  $uniq = @($keywords | Select-Object -Unique)
  return @{
    fit = [Math]::Max(0, [Math]::Min(100, $fit))
    azureScore = [Math]::Max(0, [Math]::Min(100, $azure))
    databricksScore = [Math]::Max(0, [Math]::Min(100, $databricks))
    modelingScore = [Math]::Max(0, [Math]::Min(100, $modeling))
    keywords = $uniq
  }
}

function Send-NtfyJobAlert($job) {
  if (-not $job.link) { return $false }
  $isDiscovery = [string]$job.classificationConfidence -eq "Discovery"
  $safeTitle = if ($isDiscovery) { "Review Data Job: $($job.company)" } else { "New GCC Data Job: $($job.company)" }
  $safeReason = ([string]$job.fitReason) -replace "Sarath's ", ""
  $body = @(
    "$($job.role)"
    "Location: $($job.location)"
    "Posted: $($job.postedDate)"
    "Experience: target 4-7 years; verify JD"
    "Fit: $safeReason"
  ) -join "`n"
  $headers = @{
    Title = $safeTitle
    Priority = if ($isDiscovery) { "default" } else { "high" }
    Tags = "briefcase"
    Click = [string]$job.link
  }
  try {
    Invoke-WebRequest -UseBasicParsing -Method Post -Uri $ntfyTopic -Headers $headers -Body $body -TimeoutSec 20 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Resolve-RelativeUrl($baseUrl, $path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return "" }
  if ($path -match '^https?://') { return [string]$path }
  return ([string]$baseUrl).TrimEnd("/") + "/" + ([string]$path).TrimStart("/")
}

function Get-NormalizedJobs($source) {
  $normalized = New-Object System.Collections.Generic.List[object]
  try {
    if ($source.sourceType -eq "workday") {
      $body = @{ appliedFacets = @{}; limit = 100; offset = 0; searchText = "" } | ConvertTo-Json -Depth 5
      $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $source.url -ContentType "application/json" -Body $body -TimeoutSec 30
      $payload = $response.Content | ConvertFrom-Json
      foreach ($job in @($payload.jobPostings)) {
        $title = [string]($job.title, $job.externalPath, $job.bulletFields[0] | Where-Object { $_ } | Select-Object -First 1)
        if ($job.title) { $title = [string]$job.title }
        $location = [string](($job.locationsText, $job.location, ($job.bulletFields -join ", ") | Where-Object { $_ }) -join ", ")
        $url = Resolve-RelativeUrl $source.publicBaseUrl $job.externalPath
        $content = Normalize-Text (($job.title, $job.locationsText, $job.location, ($job.bulletFields -join " "), $job.postedOn) -join " ")
        $normalized.Add([pscustomobject]@{
          id = if ($job.id) { [string]$job.id } elseif ($job.externalPath) { [string]$job.externalPath } else { $url }
          title = $title
          location = $location
          url = $url
          content = $content
          postedRaw = $job.postedOn
        })
      }
      return $normalized
    }

    $response = Invoke-WebRequest -UseBasicParsing $source.url -TimeoutSec 25
    $payload = $response.Content | ConvertFrom-Json

    if ($source.sourceType -eq "lever") {
      foreach ($job in @($payload)) {
        $normalized.Add([pscustomobject]@{
          id = if ($job.id) { [string]$job.id } elseif ($job.postingId) { [string]$job.postingId } else { [string]$job.hostedUrl }
          title = [string]$job.text
          location = [string](($job.categories.location, $job.country, $job.workplaceType | Where-Object { $_ }) -join ", ")
          url = [string]$job.hostedUrl
          content = Normalize-Text (($job.descriptionPlain, $job.additionalPlain, ($job.lists | ForEach-Object { "$($_.text) $($_.content)" })) -join " ")
          postedRaw = $job.createdAt
        })
      }
      return $normalized
    }

    if ($source.sourceType -eq "smartrecruiters") {
      foreach ($job in @($payload.content)) {
        $location = [string](($job.location.city, $job.location.region, $job.location.country, $job.location.remote | Where-Object { $_ }) -join ", ")
        $url = if ($job.ref) { [string]$job.ref } else { "https://jobs.smartrecruiters.com/$($source.companySlug)/$($job.id)" }
        $content = Normalize-Text (($job.name, $job.location.city, $job.location.country, $job.jobAd.sections.jobDescription.text, $job.jobAd.sections.qualifications.text) -join " ")
        $normalized.Add([pscustomobject]@{
          id = if ($job.uuid) { [string]$job.uuid } elseif ($job.id) { [string]$job.id } else { $url }
          title = [string]$job.name
          location = $location
          url = $url
          content = $content
          postedRaw = $job.releasedDate
        })
      }
      return $normalized
    }

    foreach ($job in @($payload.jobs)) {
      $normalized.Add([pscustomobject]@{
        id = if ($job.id) { [string]$job.id } else { [string]$job.absolute_url }
        title = [string]$job.title
        location = [string](($job.location.name, $job.offices.name | Where-Object { $_ }) -join ", ")
        url = [string]$job.absolute_url
        content = Normalize-Text $job.content
        postedRaw = $job.updated_at
      })
    }
    return $normalized
  } catch {
    return $normalized
  }
}

function Get-DiscoveryHost($url) {
  try {
    $hostName = ([Uri]$url).Host.ToLowerInvariant() -replace '^www\.', ''
    if ($hostName.Contains("linkedin.com")) { return "LinkedIn" }
    if ($hostName.Contains("greenhouse.io")) { return "Greenhouse result" }
    if ($hostName.Contains("lever.co")) { return "Lever result" }
    if ($hostName.Contains("myworkdayjobs.com")) { return "Workday result" }
    if ($hostName.Contains("smartrecruiters.com")) { return "SmartRecruiters result" }
    return $hostName.Split(".")[0]
  } catch {
    return "Broad Discovery"
  }
}

function Test-DiscoveryCandidate($title, $link, $description) {
  $hay = "$title $link $description".ToLowerInvariant()
  if ($hay -notmatch 'data engineer|senior data engineer|data platform|azure data|databricks|pyspark|spark engineer|spark sql|big data|etl developer|data pipeline|analytics engineer') { return $false }
  if ($hay -notmatch 'bengaluru|bangalore|hyderabad|kochi|pune|chennai|gurugram|noida|india|india remote|remote india') { return $false }
  if ($hay -match 'internship|intern|principal|director|manager|architect|training course|certification|question paper|walkin|walk-in|bpo|support') { return $false }
  if ($link -notmatch 'linkedin\.com/jobs|greenhouse|lever\.co|myworkdayjobs|smartrecruiters|careers|jobs|job|naukri|indeed|foundit|instahyre|hirist') { return $false }
  return $true
}

function Get-LinkedInDiscoveryJobs($searchSource) {
  $jobs = New-Object System.Collections.Generic.List[object]
  try {
    $response = Invoke-WebRequest -UseBasicParsing $searchSource.url -TimeoutSec 25
    $html = [string]$response.Content
    $cards = [regex]::Matches($html, '(?s)<div class="base-card[^"]*job-search-card"[^>]*data-entity-urn="urn:li:jobPosting:(\d+)".*?</div>\s*</li>')
    $seenLinkedInLinks = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($card in $cards) {
      $raw = $card.Value
      $jobId = $card.Groups[1].Value
      if ([string]::IsNullOrWhiteSpace($jobId)) { continue }

      $linkMatch = [regex]::Match($raw, '<a class="base-card__full-link[^"]*"[^>]*href="([^"]+)"')
      $titleMatch = [regex]::Match($raw, '(?s)<h3 class="base-search-card__title">\s*(.*?)\s*</h3>')
      $companyMatch = [regex]::Match($raw, '(?s)<h4 class="base-search-card__subtitle">.*?>(.*?)</a>')
      $locationMatch = [regex]::Match($raw, '(?s)<span class="job-search-card__location">\s*(.*?)\s*</span>')
      $timeMatch = [regex]::Match($raw, '(?s)<time[^>]*(?:datetime="([^"]+)")?[^>]*>\s*(.*?)\s*</time>')

      $title = Normalize-Text ([System.Net.WebUtility]::HtmlDecode($titleMatch.Groups[1].Value))
      $company = Normalize-Text ([System.Net.WebUtility]::HtmlDecode($companyMatch.Groups[1].Value))
      $location = Normalize-Text ([System.Net.WebUtility]::HtmlDecode($locationMatch.Groups[1].Value))
      $link = if ($linkMatch.Success) { [System.Net.WebUtility]::HtmlDecode($linkMatch.Groups[1].Value) } else { "https://www.linkedin.com/jobs/view/$jobId/" }
      $link = ($link -replace '&amp;', '&')
      if ($link -match '^https://[a-z]{2}\.linkedin\.com/jobs/view/') {
        $link = $link -replace '^https://[a-z]{2}\.linkedin\.com/', 'https://www.linkedin.com/'
      }
      $link = ($link -replace '\?.*$', '/')
      $posted = if ($timeMatch.Groups[1].Value) { $timeMatch.Groups[1].Value } else { Normalize-Text $timeMatch.Groups[2].Value }
      if (-not $posted) { $posted = "LinkedIn public search; verify freshness" }

      $description = "$title $company $location $($searchSource.role) $($searchSource.name)"
      if (-not (Test-DiscoveryCandidate $title $link $description)) { continue }
      if (-not $seenLinkedInLinks.Add((Canonical-Url $link))) { continue }
      if (-not $company) { $company = "LinkedIn result" }

      $jobs.Add([pscustomobject]@{
        id = "linkedin:$jobId"
        company = $company
        title = $title
        location = if ($location) { $location } else { [string]$searchSource.location }
        url = $link
        content = $description
        postedRaw = $posted
        queryName = "LinkedIn public search: $($searchSource.name)"
      })
    }
  } catch {
    return $jobs
  }
  return $jobs
}

function Get-BroadDiscoveryJobs($querySource) {
  $jobs = New-Object System.Collections.Generic.List[object]
  try {
    $rssUrl = "https://www.bing.com/search?q=" + [Uri]::EscapeDataString([string]$querySource.query) + "&format=rss&count=30"
    $response = Invoke-WebRequest -UseBasicParsing $rssUrl -TimeoutSec 20
    [xml]$xml = $response.Content
    $emitted = 0
    $seenDiscoveryLinks = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($item in @($xml.rss.channel.item)) {
      $title = Normalize-Text $item.title
      $link = Normalize-Text $item.link
      $description = Normalize-Text $item.description
      if (-not (Test-DiscoveryCandidate $title $link $description)) { continue }
      if (-not $seenDiscoveryLinks.Add((Canonical-Url $link))) { continue }
      $company = Get-DiscoveryHost $link
      $jobs.Add([pscustomobject]@{
        id = "discovery:" + ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($link))).Replace("-", "").Substring(0, 16).ToLowerInvariant())
        company = $company
        title = $title
        location = "India / verify exact city"
        url = $link
        content = $description
        postedRaw = "Broad web discovery"
        queryName = $querySource.name
      })
      $emitted += 1
      if ($emitted -ge [int]$querySource.maxResults) { break }
    }
    if ($emitted -lt [int]$querySource.maxResults) {
      $htmlUrl = "https://www.bing.com/search?q=" + [Uri]::EscapeDataString([string]$querySource.query) + "&count=30"
      $html = (Invoke-WebRequest -UseBasicParsing $htmlUrl -TimeoutSec 20).Content
      $matches = [regex]::Matches($html, 'href="(https?://[^"#]+)"')
      foreach ($match in $matches) {
        $link = [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
        if ($link -match 'bing\.com|microsoft\.com|go\.microsoft|account\.') { continue }
        $link = ($link -replace '&amp;', '&')
        $title = "Data engineering job result"
        $description = [string]$querySource.query
        if (-not (Test-DiscoveryCandidate $title $link $description)) { continue }
        if (-not $seenDiscoveryLinks.Add((Canonical-Url $link))) { continue }
        $company = Get-DiscoveryHost $link
        $jobs.Add([pscustomobject]@{
          id = "discovery:" + ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($link))).Replace("-", "").Substring(0, 16).ToLowerInvariant())
          company = $company
          title = $title
          location = "India / verify exact city"
          url = $link
          content = $description
          postedRaw = "Broad web discovery"
          queryName = $querySource.name
        })
        $emitted += 1
        if ($emitted -ge [int]$querySource.maxResults) { break }
      }
    }
  } catch {
    return $jobs
  }
  return $jobs
}

function Get-GoogleDiscoveryJobs($querySource) {
  $jobs = New-Object System.Collections.Generic.List[object]
  $apiKey = $env:GOOGLE_API_KEY
  $cseId = $env:GOOGLE_CSE_ID
  if ([string]::IsNullOrWhiteSpace($apiKey) -or [string]::IsNullOrWhiteSpace($cseId)) { return $jobs }
  try {
    $maxResults = [Math]::Min(10, [int]$querySource.maxResults)
    $uri = "https://www.googleapis.com/customsearch/v1?key=$([Uri]::EscapeDataString($apiKey))&cx=$([Uri]::EscapeDataString($cseId))&q=$([Uri]::EscapeDataString([string]$querySource.query))&num=$maxResults&sort=date"
    $response = Invoke-WebRequest -UseBasicParsing $uri -TimeoutSec 25
    $payload = $response.Content | ConvertFrom-Json
    foreach ($item in @($payload.items)) {
      $title = Normalize-Text $item.title
      $link = Normalize-Text $item.link
      $description = Normalize-Text $item.snippet
      if (-not (Test-DiscoveryCandidate $title $link $description)) { continue }
      $company = Get-DiscoveryHost $link
      $jobs.Add([pscustomobject]@{
        id = "google:" + ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($link))).Replace("-", "").Substring(0, 16).ToLowerInvariant())
        company = $company
        title = $title
        location = "India / verify exact city"
        url = $link
        content = $description
        postedRaw = "Google CSE discovery"
        queryName = $querySource.name
      })
    }
  } catch {
    return $jobs
  }
  return $jobs
}

$registry = @{
  generatedAt = (Get-Date).ToString("s")
  companies = @($companies | ForEach-Object {
    [ordered]@{
      company = $_.company
      classification = $_.classification
      confidence = $_.confidence
      evidenceUrl = $_.evidenceUrl
      indiaLocations = $_.indiaLocations
      discoveryDate = "2026-07-08"
      sourceType = $_.sourceType
    }
  })
}
$registry | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $registryPath

$seen = @{ jobs = @() }
if (Test-Path $seenPath) {
  try { $seen = Get-Content $seenPath -Raw | ConvertFrom-Json } catch { $seen = @{ jobs = @() } }
}
$seenKeys = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($item in @($seen.jobs)) {
  if ($item -is [System.Collections.IDictionary]) {
    $key = if ($item.ContainsKey("canonicalUrl")) { $item["canonicalUrl"] } elseif ($item.ContainsKey("link")) { Canonical-Url $item["link"] } else { "" }
  } else {
    $key = if ($item.canonicalUrl) { $item.canonicalUrl } elseif ($item.link) { Canonical-Url $item.link } else { "" }
  }
  if ($key) { [void]$seenKeys.Add($key) }
}

$allRelevant = New-Object System.Collections.Generic.List[object]
$newRelevant = New-Object System.Collections.Generic.List[object]
$allDiscovery = New-Object System.Collections.Generic.List[object]
$newDiscovery = New-Object System.Collections.Generic.List[object]

foreach ($source in $companies) {
  foreach ($job in @(Get-NormalizedJobs $source)) {
    $title = [string]$job.title
    $location = [string]$job.location
    $url = [string]$job.url
    $content = Normalize-Text $job.content
    $hay = "$title $location $content".ToLowerInvariant()

    $locationText = $location.ToLowerInvariant()
    $locationOk = $locationText -match 'india|bengaluru|bangalore|hyderabad|gurugram|noida|pune|chennai|kochi|remote - india|india remote|remote india'
    $strictTitleOk = $title.ToLowerInvariant() -match 'data engineer|data platform engineer|analytics engineer|azure data engineer|databricks data engineer|pyspark data engineer|spark data engineer|big data engineer|etl developer|data pipeline engineer'
    $stackOk = $hay -match 'pyspark|spark|databricks|azure|data factory|adls|delta lake|sql|python|airflow|etl|data pipeline'
    $rejectOk = $hay -notmatch 'intern|principal|architect|manager|director|staff|staffing|contract-only|technical services|customer support|support engineer|partner engineer|sales|account executive|researcher'
    if (-not ($locationOk -and $strictTitleOk -and $stackOk -and $rejectOk)) {
      $nearMissOk = $locationOk -and $rejectOk -and (
        ($title.ToLowerInvariant() -match 'data engineer|data platform|analytics engineer|data infrastructure|data warehouse|etl|data pipeline|big data|business intelligence|bi engineer')
      )
      if ($nearMissOk) {
        $nearScore = Score-Job $source.company $title $location $content
        $nearFit = [Math]::Min(86, [Math]::Max(66, $nearScore.fit - 8))
        $canonical = Canonical-Url $url
        $nearKeywords = @($nearScore.keywords)
        if (-not $nearKeywords.Count) { $nearKeywords = @("Data engineering", "India") }
        $nearRecord = [ordered]@{
          id = if ($job.id) { "near:" + [string]$job.id } else { "near:" + $canonical }
          company = $source.company
          role = $title
          location = if ($location) { $location } else { "India" }
          link = $url
          postedDate = "Official ATS near-match; verify freshness"
          fit = $nearFit
          fitReason = "Tier 2 ATS near-match for Sarath's profile; verify exact title, stack, seniority, and experience requirement"
          keywords = $nearKeywords
          applyType = "External Apply"
          classificationConfidence = "Discovery"
          notes = "Official $($source.company) careers feed, but it missed one strict gate. Review before applying."
          azureScore = $nearScore.azureScore
          databricksScore = $nearScore.databricksScore
          modelingScore = $nearScore.modelingScore
          canonicalUrl = $canonical
        }
        $allDiscovery.Add($nearRecord)
        if ($canonical -and -not $seenKeys.Contains($canonical)) {
          $newDiscovery.Add($nearRecord)
          [void]$seenKeys.Add($canonical)
        }
      }
      continue
    }

    $score = Score-Job $source.company $title $location $content
    if ($score.fit -lt 62) { continue }

    $canonical = Canonical-Url $url
    $posted = "Visible on career feed"
    $postedSource = $job.postedRaw
    if ($postedSource) {
      $rawUpdated = [string]$postedSource
      if ($rawUpdated -match '^\d+$') {
        $posted = ([DateTimeOffset]::FromUnixTimeSeconds([int64]([double]$rawUpdated / 1000))).ToString("yyyy-MM-dd")
      } else {
        try { $posted = ([DateTimeOffset]::Parse($rawUpdated)).ToString("yyyy-MM-dd") } catch { $posted = $rawUpdated }
      }
    }
    $notes = "Official $($source.company) careers feed; classification $($source.confidence)"
    $fitReason = "Matches Sarath's data engineering profile through " + (($score.keywords | Select-Object -First 5) -join ", ")

    $record = [ordered]@{
      id = if ($job.id) { [string]$job.id } else { $canonical }
      company = $source.company
      role = $title
      location = if ($location) { $location } else { "India" }
      link = $url
      postedDate = $posted
      fit = $score.fit
      fitReason = $fitReason
      keywords = @($score.keywords)
      applyType = "External Apply"
      classificationConfidence = $source.confidence
      notes = $notes
      azureScore = $score.azureScore
      databricksScore = $score.databricksScore
      modelingScore = $score.modelingScore
      canonicalUrl = $canonical
    }
    $allRelevant.Add($record)
    if ($canonical -and -not $seenKeys.Contains($canonical)) {
      $newRelevant.Add($record)
      [void]$seenKeys.Add($canonical)
    }
  }
}

foreach ($querySource in $broadDiscoveryQueries) {
  $discoveryCandidates = @()
  $discoveryCandidates += @(Get-BroadDiscoveryJobs $querySource)
  $discoveryCandidates += @(Get-GoogleDiscoveryJobs $querySource)
  foreach ($job in $discoveryCandidates) {
    $title = [string]$job.title
    $location = [string]$job.location
    $url = [string]$job.url
    $content = Normalize-Text $job.content
    $score = Score-Job $job.company $title $location $content
    $boostedFit = [Math]::Min(100, [Math]::Max(60, $score.fit))
    if ($boostedFit -lt 60) { continue }

    $canonical = Canonical-Url $url
    $keywordList = @($score.keywords)
    if (-not $keywordList.Count) { $keywordList = @("Data Engineer", "India discovery") }
    $record = [ordered]@{
      id = if ($job.id) { [string]$job.id } else { $canonical }
      company = [string]$job.company
      role = $title
      location = $location
      link = $url
      postedDate = "Broad discovery; verify freshness"
      fit = $boostedFit
      fitReason = "Broad ntfy-style discovery match from $($job.queryName); verify JD, company, experience, and salary before applying"
      keywords = $keywordList
      applyType = "External Apply"
      classificationConfidence = "Discovery"
      notes = "Broad discovery result restored to match the previous ntfy alert style. Source query: $($job.queryName). Verify before applying."
      azureScore = $score.azureScore
      databricksScore = $score.databricksScore
      modelingScore = $score.modelingScore
      canonicalUrl = $canonical
    }
    $allDiscovery.Add($record)
    if ($canonical -and -not $seenKeys.Contains($canonical)) {
      $newDiscovery.Add($record)
      [void]$seenKeys.Add($canonical)
    }
  }
}

foreach ($searchSource in $linkedInSearches) {
  foreach ($job in @(Get-LinkedInDiscoveryJobs $searchSource)) {
    $title = [string]$job.title
    $location = [string]$job.location
    $url = [string]$job.url
    $content = Normalize-Text $job.content
    $score = Score-Job $job.company $title $location $content
    $boostedFit = [Math]::Min(100, [Math]::Max(62, $score.fit))
    if ($boostedFit -lt 62) { continue }

    $canonical = Canonical-Url $url
    $keywordList = @($score.keywords)
    if (-not $keywordList.Count) { $keywordList = @("Data Engineer", "LinkedIn India discovery") }
    $record = [ordered]@{
      id = if ($job.id) { [string]$job.id } else { $canonical }
      company = [string]$job.company
      role = $title
      location = $location
      link = $url
      postedDate = if ($job.postedRaw) { [string]$job.postedRaw } else { "LinkedIn public search; verify freshness" }
      fit = $boostedFit
      fitReason = "LinkedIn public India discovery match from $($searchSource.name); verify JD, company, experience, and salary before applying"
      keywords = $keywordList
      applyType = "External Apply"
      classificationConfidence = "Discovery"
      notes = "LinkedIn public result restored to match the previous ntfy alert style. Verify before applying."
      azureScore = $score.azureScore
      databricksScore = $score.databricksScore
      modelingScore = $score.modelingScore
      canonicalUrl = $canonical
    }
    $allDiscovery.Add($record)
    if ($canonical -and -not $seenKeys.Contains($canonical)) {
      $newDiscovery.Add($record)
      [void]$seenKeys.Add($canonical)
    }
  }
}

$now = [DateTimeOffset]::Now.ToString("yyyy-MM-ddTHH:mm:sszzz")
$carryForwardJobs = @(Get-CarryForwardFeedJobs)
$feedSourceMap = [ordered]@{}
foreach ($candidate in @(@($allRelevant.ToArray()) + @($allDiscovery.ToArray()) + @($carryForwardJobs))) {
  if (-not (Is-FeedRecordValid $candidate)) { continue }
  $key = FeedRecord-Key $candidate
  if (-not $key) { continue }
  if (-not $feedSourceMap.Contains($key)) {
    $feedSourceMap[$key] = $candidate
  } elseif (($candidate.fit -as [int]) -gt ($feedSourceMap[$key].fit -as [int])) {
    $feedSourceMap[$key] = $candidate
  }
}
$feedSourceJobs = @($feedSourceMap.Values | Sort-Object -Property @{ Expression = { if ($_.classificationConfidence -eq "Discovery") { 1 } elseif ($_.classificationConfidence -eq "Recent") { 2 } else { 0 } } }, @{ Expression = "fit"; Descending = $true } | Select-Object -First 100)
$feedJobs = @($feedSourceJobs | ForEach-Object {
  [ordered]@{
    id = $_.id
    company = $_.company
    role = $_.role
    location = $_.location
    link = $_.link
    postedDate = $_.postedDate
    fit = $_.fit
    fitReason = $_.fitReason
    keywords = $_.keywords
    applyType = $_.applyType
    classificationConfidence = $_.classificationConfidence
    notes = $_.notes
    azureScore = $_.azureScore
    databricksScore = $_.databricksScore
    modelingScore = $_.modelingScore
  }
})

$feed = [ordered]@{
  generatedAt = $now
  sourceAutomation = "India GCC Product Data Job Monitor"
  sourceLanes = @(
    [ordered]@{ name = "Company ATS Feed"; status = "Automated"; sources = @("Greenhouse", "Lever", "Workday", "SmartRecruiters") },
    [ordered]@{ name = "Broad Discovery Feed"; status = "Legacy ntfy-style review lane"; sources = @("Bing RSS", "Bing HTML", "Google CSE when configured", "LinkedIn public job result pages", "public career pages", "Naukri", "Indeed", "Foundit", "Instahyre", "Hirist") }
  )
  broadDiscoveryQueries = $broadDiscoveryQueries
  jobs = $feedJobs
}
$feedJson = $feed | ConvertTo-Json -Depth 8
Set-Content -Encoding UTF8 -Path $feedPath -Value ("window.GCC_PRODUCT_JOB_FEED = " + $feedJson + ";")
Set-Content -Encoding UTF8 -Path $appFeedPath -Value ("window.GCC_PRODUCT_JOB_FEED = " + $feedJson + ";")
$feedHistory = [ordered]@{ updatedAt = $now; jobs = $feedJobs }
$feedHistory | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $feedHistoryPath
$linkedInFeed = [ordered]@{
  generatedAt = $now
  sourceAutomation = "India GCC Product Data Job Monitor"
  sourceLanes = $feed.sourceLanes
  linkedInSearches = $linkedInSearches
  broadDiscoveryQueries = $broadDiscoveryQueries
  linkedInPolicy = $feed.linkedInPolicy
}
$linkedInFeedJson = $linkedInFeed | ConvertTo-Json -Depth 8
Set-Content -Encoding UTF8 -Path $linkedInFeedPath -Value ("window.LINKEDIN_DISCOVERY_FEED = " + $linkedInFeedJson + ";")
Set-Content -Encoding UTF8 -Path $appLinkedInFeedPath -Value ("window.LINKEDIN_DISCOVERY_FEED = " + $linkedInFeedJson + ";")

$ntfyPosted = 0
foreach ($job in @($newRelevant.ToArray())) {
  if (Send-NtfyJobAlert $job) { $ntfyPosted += 1 }
}
$discoveryNtfyPosted = 0
foreach ($job in @($newDiscovery.ToArray() | Sort-Object -Property fit -Descending | Select-Object -First $maxDiscoveryAlertsPerRun)) {
  if (Send-NtfyJobAlert $job) { $discoveryNtfyPosted += 1 }
}

$seenOut = @{
  updatedAt = $now
  jobs = @($seenKeys | ForEach-Object { [ordered]@{ canonicalUrl = $_; firstSeenAt = $now } })
}
$seenOut | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $seenPath

$summary = [pscustomobject]@{
  generatedAt = $now
  companiesChecked = $companies.Count
  linkedInSearches = $linkedInSearches.Count
  broadDiscoveryQueries = $broadDiscoveryQueries.Count
  relevantJobs = $allRelevant.Count
  discoveryJobs = $allDiscovery.Count
  carryForwardJobs = $carryForwardJobs.Count
  newJobs = $newRelevant.Count
  newDiscoveryJobs = $newDiscovery.Count
  ntfyPosted = $ntfyPosted
  discoveryNtfyPosted = $discoveryNtfyPosted
  newJobsDetail = @($newRelevant.ToArray())
  newDiscoveryDetail = @($newDiscovery.ToArray() | Sort-Object -Property fit -Descending | Select-Object -First $maxDiscoveryAlertsPerRun)
}
$summary | ConvertTo-Json -Depth 8
