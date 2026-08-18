/**
 * Reads responses from the Apps Script data feed (doGet web app).
 * The feed returns COMPACT ARRAYS for speed: [date, activity, client, caseNumber, vin, firstName].
 * We map them to objects here so the rest of the app is unchanged.
 *
 * Set DATA_URL to the Apps Script /exec URL.
 */
export async function readResponses() {
  const url = process.env.DATA_URL;
  if (!url) throw new Error("DATA_URL not set");

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("Data feed returned " + res.status);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const rows = data.rows || [];
  return rows.map((r) => ({
    date: r[0] || "",
    activity: r[1] || "",
    client: r[2] || "",
    caseNumber: r[3] || "",
    vin: r[4] || "",
    firstName: r[5] || "",
  }));
}
