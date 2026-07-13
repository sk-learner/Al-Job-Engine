import { NextResponse } from "next/server";
import type { AutomationFeed } from "@/lib/types";

const emptyFeed: AutomationFeed = {
  generatedAt: "",
  sourceAutomation: "India GCC Product Data Job Monitor",
  jobs: []
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";

async function readFeedFromStaticAsset(request: Request) {
  const response = await fetch(new URL("/gcc_product_feed.js", request.url), {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Unable to read feed asset: ${response.status}`);
  }
  const source = await response.text();
  const json = source
    .replace(/^\s*window\.GCC_PRODUCT_JOB_FEED\s*=\s*/, "")
    .replace(/;\s*$/, "");
  return JSON.parse(json) as AutomationFeed;
}

export async function GET(request: Request) {
  try {
    const feed = await readFeedFromStaticAsset(request);
    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    });
  } catch (error) {
    return NextResponse.json({ ...emptyFeed, error: error instanceof Error ? error.message : "Unable to read feed" }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    });
  }
}
