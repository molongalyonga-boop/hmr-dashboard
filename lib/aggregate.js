/**
 * Pure aggregation helpers. Take raw rows + a date range, return dashboard data.
 * Kept framework-free so it's easy to reason about and test.
 */

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function countBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const v = r[key];
    if (!v) continue;
    map.set(v, (map.get(v) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function uniqueCount(rows, key) {
  return new Set(rows.filter((r) => r[key]).map((r) => r[key])).size;
}

export function aggregate(allRows, fromStr, toStr) {
  const from = fromStr ? new Date(fromStr) : null;
  const to = toStr ? new Date(toStr) : null;
  if (to) to.setHours(23, 59, 59, 999);

  const rows = allRows.filter((r) => inRange(r.date, from, to));

  // Filtered KPIs
  const totalCases = rows.length;
  const activeAgents = uniqueCount(rows, "firstName");
  const activeClients = uniqueCount(rows, "client");
  const activities = uniqueCount(rows, "activity");
  const casePerAgent = activeAgents ? +(totalCases / activeAgents).toFixed(2) : 0;

  // Live scorecard (ignores the filter — always current)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay()); // Sunday
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayCount = allRows.filter((r) => inRange(r.date, today, new Date())).length;
  const weekCount = allRows.filter((r) => inRange(r.date, weekStart, new Date())).length;
  const monthCount = allRows.filter((r) => inRange(r.date, monthStart, new Date())).length;
  const allDays = uniqueCount(allRows, "date");
  const allAgents = uniqueCount(allRows, "firstName");
  const avgDaily = allDays ? +(allRows.length / allDays).toFixed(2) : 0;
  const avgPerAgent = allAgents ? +(allRows.length / allAgents).toFixed(2) : 0;

  // Breakdowns (filtered)
  const byActivity = countBy(rows, "activity");
  const byClient = countBy(rows, "client");
  const byAgent = countBy(rows, "firstName");

  // Over time (filtered) — by date, chronological
  const dateMap = new Map();
  for (const r of rows) {
    if (!r.date) continue;
    dateMap.set(r.date, (dateMap.get(r.date) || 0) + 1);
  }
  const overTime = [...dateMap.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Day of week (filtered)
  const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dow = dowNames.map((name) => ({ name, value: 0 }));
  for (const r of rows) {
    const d = new Date(r.date);
    if (!isNaN(d)) dow[d.getDay()].value += 1;
  }

  // Agent productivity table (all-time, sorted by case vol)
  const agentMap = new Map();
  for (const r of allRows) {
    const name = r.firstName;
    if (!name) continue;
    if (!agentMap.has(name)) agentMap.set(name, { name, cases: 0, activities: new Set(), days: new Set() });
    const a = agentMap.get(name);
    a.cases += 1;
    if (r.activity) a.activities.add(r.activity);
    if (r.date) a.days.add(r.date);
  }
  const agentTable = [...agentMap.values()]
    .map((a) => ({
      name: a.name,
      caseVol: a.cases,
      activitiesCount: a.activities.size,
      activeDays: a.days.size,
      avgDaily: a.days.size ? +(a.cases / a.days.size).toFixed(2) : 0,
    }))
    .sort((x, y) => y.caseVol - x.caseVol);

  // Agent leaderboard (all-time) for the big chart
  const agentLeaderboard = countBy(allRows, "firstName");

  return {
    kpis: { totalCases, activeAgents, activeClients, activities, casePerAgent },
    scorecard: { todayCount, weekCount, monthCount, avgDaily, avgPerAgent },
    byActivity, byClient, byAgent, overTime, dow,
    agentTable, agentLeaderboard,
    lastUpdated: new Date().toISOString(),
    rowCount: allRows.length,
  };
}
