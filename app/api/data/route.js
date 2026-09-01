export const dynamic = "force-dynamic";

import { kv } from "@vercel/kv";
import { auth } from "../../../lib/auth";
import { aggregateDaily } from "../../../lib/aggregateDaily";

export async function GET(req) {
  try {
    // Gate the data itself, not just the page. Without this the JSON stays
    // public to anyone who finds the URL, even with the dashboard locked.
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Not signed in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const raw = await kv.get("dashboard-summary");
    if (!raw) return Response.json({ error: "No summary yet. Run the refresh in Apps Script." }, { status: 503 });

    const summary = typeof raw === "string" ? JSON.parse(raw) : raw;
    const data = aggregateDaily(summary, from, to);

    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("data route failed:", err);
    return Response.json({ error: "Could not load data." }, { status: 500 });
  }
}
