import { readResponses } from "../../../lib/sheets";
import { aggregate } from "../../../lib/aggregate";

// Cache for 5 minutes so the embed doesn't hammer the Sheets API on every view.
export const revalidate = 300;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const rows = await readResponses();
    const data = aggregate(rows, from, to);
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("data route failed:", err);
    return Response.json({ error: "Could not load data." }, { status: 500 });
  }
}
