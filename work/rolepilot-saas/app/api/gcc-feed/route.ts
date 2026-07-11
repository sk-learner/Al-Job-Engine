import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import type { AutomationFeed } from "@/lib/types";

const emptyFeed: AutomationFeed = {
  generatedAt: "",
  sourceAutomation: "India GCC Product Data Job Monitor",
  jobs: []
};

export async function GET() {
  const candidatePaths = [
    join(process.cwd(), "public", "gcc_product_feed.js"),
    ...(process.env.NODE_ENV === "production" ? [] : [
      join(process.cwd(), "..", "..", "outputs", "gcc_product_feed.js"),
      join(process.cwd(), "outputs", "gcc_product_feed.js")
    ])
  ];

  let lastError = "";

  for (const filePath of candidatePaths) {
    try {
      const source = await readFile(filePath, "utf8");
      const json = source
        .replace(/^\s*window\.GCC_PRODUCT_JOB_FEED\s*=\s*/, "")
        .replace(/;\s*$/, "");
      const feed = JSON.parse(json) as AutomationFeed;
      return NextResponse.json(feed);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unable to read feed";
    }
  }

  try {
    return NextResponse.json({ ...emptyFeed, error: lastError || "Unable to read feed" });
  } catch (error) {
    return NextResponse.json({ ...emptyFeed, error: error instanceof Error ? error.message : "Unable to read feed" });
  }
}
