/**
 * Turns the compact daily-summary (from KV) into the dashboard shape for a range.
 * Fast: operates on ~365 daily buckets, never raw rows.
 */

function ymd(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function mergeInto(target, src) {
  for (const k in src) target[k] = (target[k] || 0) + src[k];
}

function toSorted(map) {
  return Object.keys(map).map((k) => ({ name: k, value: map[k] })).sort((a, b) => b.value - a.value);
}

function round2(n) { return Math.round(n * 100) / 100; }

function pct(cur, prev) {
  if (!prev) return null; // no previous data to compare
  return Math.round(((cur - prev) / prev) * 1000) / 10; // one decimal
}

export function aggregateDaily(summary, fromStr, toStr) {
  const daily = summary.daily || [];
  const from = fromStr || "0000-00-00";
  const to = toStr || "9999-99-99";

  // Filtered range slice
  const inRange = daily.filter((d) => d.date >= from && d.date <= to);

  const act = {}, cli = {}, agt = {};
  const overTime = [];
  const dow = [0, 0, 0, 0, 0, 0, 0];
  let total = 0;

  for (const d of inRange) {
    total += d.total;
    mergeInto(act, d.act);
    mergeInto(cli, d.cli);
    mergeInto(agt, d.agt);
    overTime.push({ date: d.date, value: d.total });
    const wd = new Date(d.date).getDay();
    if (!isNaN(wd)) dow[wd] += d.total;
  }

  const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Previous equal-length period (for trend arrows), only when a real range is set.
  let trend = null;
  if (fromStr && toStr) {
    const fromD = new Date(fromStr), toD = new Date(toStr);
    const lenMs = toD - fromD;
    const prevTo = new Date(fromD); prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo.getTime() - lenMs);
    const pFrom = ymd(prevFrom), pTo = ymd(prevTo);
    const prev = daily.filter((d) => d.date >= pFrom && d.date <= pTo);
    let prevTotal = 0; const prevAgt = {}, prevCli = {}, prevAct = {};
    for (const d of prev) {
      prevTotal += d.total;
      mergeInto(prevAgt, d.agt); mergeInto(prevCli, d.cli); mergeInto(prevAct, d.act);
    }
    trend = {
      totalCases: pct(total, prevTotal),
      activeAgents: pct(Object.keys(agt).length, Object.keys(prevAgt).length),
      activeClients: pct(Object.keys(cli).length, Object.keys(prevCli).length),
      activities: pct(Object.keys(act).length, Object.keys(prevAct).length),
    };
  }

  // Live scorecard (ignores the filter) — derive from all daily totals.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = ymd(today);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const weekStr = ymd(weekStart);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStr = ymd(monthStart);

  let todayCount = 0, weekCount = 0, monthCount = 0, allTotal = 0;
  const allDays = daily.length;
  for (const d of daily) {
    allTotal += d.total;
    if (d.date === todayStr) todayCount += d.total;
    if (d.date >= weekStr && d.date <= todayStr) weekCount += d.total;
    if (d.date >= monthStr && d.date <= todayStr) monthCount += d.total;
  }
  const allAgents = (summary.agentLeaderboard || []).length;

  const activeAgents = Object.keys(agt).length;

  return {
    kpis: {
      totalCases: total,
      activeAgents: activeAgents,
      activeClients: Object.keys(cli).length,
      activities: Object.keys(act).length,
      casePerAgent: round2(total / Math.max(activeAgents, 1)),
    },
    scorecard: {
      todayCount, weekCount, monthCount,
      avgDaily: round2(allTotal / Math.max(allDays, 1)),
      avgPerAgent: round2(allTotal / Math.max(allAgents, 1)),
    },
    byActivity: toSorted(act),
    byClient: toSorted(cli),
    byAgent: toSorted(agt),
    overTime,
    dow: dowNames.map((n, i) => ({ name: n, value: dow[i] })),
    agentLeaderboard: summary.agentLeaderboard || [],
    agentTable: summary.agentTable || [],
    trend: trend,
    rowCount: summary.rowCount || 0,
    lastUpdated: summary.lastUpdated || null,
  };
}
