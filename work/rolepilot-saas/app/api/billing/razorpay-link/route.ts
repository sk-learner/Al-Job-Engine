import { NextResponse } from "next/server";

const planAmounts: Record<string, number> = {
  Sprint: 99900,
  Pro: 199900
};
export const runtime = "edge";

function base64Encode(value: string) {
  if (typeof btoa === "function") return btoa(value);
  return Buffer.from(value, "utf8").toString("base64");
}

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable transaction-only checkout." },
      { status: 400 }
    );
  }

  const body = await request.json() as { plan?: string; email?: string; name?: string };
  const plan = body.plan || "Sprint";
  const amount = planAmounts[plan];
  if (!amount) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  const auth = base64Encode(`${keyId}:${keySecret}`);
  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      description: `RolePilot ${plan} plan`,
      notes: {
        plan,
        email: body.email || "",
        source: "RolePilot"
      },
      customer: {
        name: body.name || "RolePilot user",
        email: body.email || undefined
      },
      notify: { email: true, sms: false },
      reminder_enable: true
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: payload?.error?.description || "Razorpay payment link failed." }, { status: response.status });
  }

  return NextResponse.json({
    id: payload.id,
    shortUrl: payload.short_url,
    status: payload.status
  });
}
