window.LINKEDIN_DISCOVERY_FEED = {
    "generatedAt":  "2026-07-13T16:02:42+00:00",
    "sourceAutomation":  "India GCC Product Data Job Monitor",
    "sourceLanes":  [
                        {
                            "name":  "Company ATS Feed",
                            "status":  "Automated",
                            "sources":  [
                                            "Greenhouse",
                                            "Lever",
                                            "Workday",
                                            "SmartRecruiters"
                                        ]
                        },
                        {
                            "name":  "Broad Discovery Feed",
                            "status":  "Legacy ntfy-style review lane",
                            "sources":  [
                                            "Bing RSS",
                                            "Bing HTML",
                                            "Google CSE when configured",
                                            "LinkedIn public job result pages",
                                            "public career pages",
                                            "Naukri",
                                            "Indeed",
                                            "Foundit",
                                            "Instahyre",
                                            "Hirist"
                                        ]
                        }
                    ],
    "linkedInSearches":  [
                             {
                                 "name":  "Bengaluru Databricks",
                                 "role":  "Data Engineer Databricks",
                                 "location":  "Bengaluru, Karnataka, India",
                                 "url":  "https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20Databricks\u0026location=Bengaluru%2C%20Karnataka%2C%20India\u0026f_E=4\u0026f_TPR=r604800",
                                 "cadence":  "Daily",
                                 "lane":  "LinkedIn Discovery"
                             },
                             {
                                 "name":  "Bengaluru Azure",
                                 "role":  "Azure Data Engineer",
                                 "location":  "Bengaluru, Karnataka, India",
                                 "url":  "https://www.linkedin.com/jobs/search/?keywords=Azure%20Data%20Engineer\u0026location=Bengaluru%2C%20Karnataka%2C%20India\u0026f_E=4\u0026f_TPR=r604800",
                                 "cadence":  "Daily",
                                 "lane":  "LinkedIn Discovery"
                             },
                             {
                                 "name":  "Hyderabad Databricks",
                                 "role":  "Data Engineer Databricks",
                                 "location":  "Hyderabad, Telangana, India",
                                 "url":  "https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20Databricks\u0026location=Hyderabad%2C%20Telangana%2C%20India\u0026f_E=4\u0026f_TPR=r604800",
                                 "cadence":  "Daily",
                                 "lane":  "LinkedIn Discovery"
                             },
                             {
                                 "name":  "Hyderabad Azure",
                                 "role":  "Azure Data Engineer",
                                 "location":  "Hyderabad, Telangana, India",
                                 "url":  "https://www.linkedin.com/jobs/search/?keywords=Azure%20Data%20Engineer\u0026location=Hyderabad%2C%20Telangana%2C%20India\u0026f_E=4\u0026f_TPR=r604800",
                                 "cadence":  "Daily",
                                 "lane":  "LinkedIn Discovery"
                             },
                             {
                                 "name":  "Kochi Data Engineering",
                                 "role":  "Azure Databricks Data Engineer",
                                 "location":  "Kochi, Kerala, India",
                                 "url":  "https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20Azure%20Databricks\u0026location=Kochi%2C%20Kerala%2C%20India\u0026f_E=4\u0026f_TPR=r604800",
                                 "cadence":  "Daily",
                                 "lane":  "LinkedIn Discovery"
                             },
                             {
                                 "name":  "Remote India",
                                 "role":  "PySpark Databricks Azure",
                                 "location":  "India Remote",
                                 "url":  "https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20PySpark%20Databricks%20Azure\u0026location=India\u0026f_E=4\u0026f_TPR=r604800\u0026f_WT=2%2C3",
                                 "cadence":  "Daily",
                                 "lane":  "LinkedIn Discovery"
                             }
                         ],
    "broadDiscoveryQueries":  [
                                  {
                                      "name":  "Data Engineer GCC/Product India",
                                      "query":  "(\"Data Engineer\" OR \"Senior Data Engineer\" OR \"Data Platform Engineer\") (\"Bengaluru\" OR \"Hyderabad\" OR \"Kochi\" OR \"India Remote\" OR \"India\") (\"GCC\" OR \"global capability center\" OR \"product company\" OR \"careers\" OR \"apply\")",
                                      "maxResults":  20
                                  },
                                  {
                                      "name":  "Azure Databricks India",
                                      "query":  "(\"Azure Data Engineer\" OR \"Databricks Data Engineer\" OR \"Azure Databricks Engineer\") (\"Bengaluru\" OR \"Hyderabad\" OR \"Kochi\" OR \"India\") job apply",
                                      "maxResults":  20
                                  },
                                  {
                                      "name":  "PySpark Data Engineer India",
                                      "query":  "(\"PySpark Data Engineer\" OR \"Spark Data Engineer\") (\"Bengaluru\" OR \"Hyderabad\" OR \"Kochi\" OR \"India Remote\") job apply",
                                      "maxResults":  20
                                  },
                                  {
                                      "name":  "LinkedIn Data Engineer Fresh Postings",
                                      "query":  "site:linkedin.com/jobs/view (\"Data Engineer\" OR \"Azure Data Engineer\" OR \"Databricks Engineer\" OR \"PySpark\" OR \"Spark SQL\") (\"Bengaluru\" OR \"Hyderabad\" OR \"Kochi\" OR \"India Remote\" OR \"India\")",
                                      "maxResults":  25
                                  },
                                  {
                                      "name":  "Direct ATS Data Engineering India",
                                      "query":  "(\"Data Engineer\" OR \"Data Platform Engineer\") (\"Databricks\" OR \"PySpark\" OR \"Azure Data Factory\" OR \"Delta Lake\") (\"India\" OR \"Bengaluru\" OR \"Hyderabad\") (greenhouse OR lever OR workdayjobs OR smartrecruiters)",
                                      "maxResults":  25
                                  },
                                  {
                                      "name":  "Fresh Any-Company Data Engineer India",
                                      "query":  "(\"Data Engineer\" OR \"Senior Data Engineer\" OR \"Data Engineer II\" OR \"Data Platform Engineer\") (\"India\" OR \"Bengaluru\" OR \"Hyderabad\" OR \"Pune\" OR \"Chennai\" OR \"Gurugram\" OR \"Noida\" OR \"Remote\") (\"posted\" OR \"apply\" OR \"careers\" OR \"jobs\")",
                                      "maxResults":  25
                                  },
                                  {
                                      "name":  "LinkedIn Last Week Data Engineering India",
                                      "query":  "site:linkedin.com/jobs/view (\"Data Engineer\" OR \"Senior Data Engineer\" OR \"Azure Data Engineer\" OR \"Data Platform Engineer\") (\"India\" OR \"Bengaluru\" OR \"Hyderabad\" OR \"Remote\")",
                                      "maxResults":  25
                                  },
                                  {
                                      "name":  "Naukri Indeed Foundit Data Engineer India",
                                      "query":  "(\"Data Engineer\" OR \"Azure Data Engineer\" OR \"PySpark Data Engineer\") (\"Bengaluru\" OR \"Hyderabad\" OR \"India Remote\") (naukri OR indeed OR foundit OR instahyre OR hirist)",
                                      "maxResults":  20
                                  },
                                  {
                                      "name":  "Naukri Data Engineer India",
                                      "query":  "site:naukri.com (\"Data Engineer\" OR \"Azure Data Engineer\" OR \"Databricks\") (\"Bengaluru\" OR \"Hyderabad\" OR \"Kochi\" OR \"Remote\")",
                                      "maxResults":  25
                                  },
                                  {
                                      "name":  "Hirist Instahyre Data Engineer India",
                                      "query":  "(\"Data Engineer\" OR \"Senior Data Engineer\" OR \"PySpark\" OR \"Databricks\") (\"hirist\" OR \"instahyre\") (\"Bengaluru\" OR \"Hyderabad\" OR \"India\")",
                                      "maxResults":  25
                                  },
                                  {
                                      "name":  "Fresh Data Engineering Job Posts India",
                                      "query":  "(\"Data Engineer\" OR \"Azure Data Engineer\" OR \"Big Data Engineer\") (\"India\" OR \"Bangalore\" OR \"Hyderabad\") (\"apply\" OR \"job opening\" OR \"hiring\") -intern -course",
                                      "maxResults":  25
                                  },
                                  {
                                      "name":  "Data Engineering Product Companies India",
                                      "query":  "(\"Data Engineer\" OR \"Data Platform Engineer\") (\"Databricks\" OR \"Spark\" OR \"Airflow\") (\"product company\" OR \"SaaS\" OR \"fintech\") (\"India\" OR \"Bengaluru\" OR \"Hyderabad\")",
                                      "maxResults":  25
                                  }
                              ],
    "linkedInPolicy":  null
};
