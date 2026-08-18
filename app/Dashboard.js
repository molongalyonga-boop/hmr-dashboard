"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const BLUE = "#3d97e8";
const PIE_COLORS = ["#3d97e8", "#59b0f0", "#8ac6f4", "#2b7bc4", "#1f5fa0", "#6ee7d6",
  "#f0a35e", "#e0709a", "#a78bfa", "#7ed36b", "#f4d35e", "#e8836b"];

function fmt(n) {
  return typeof n === "number" ? n.toLocaleString() : n;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

const PRESETS = ["Today", "This Week", "This Month", "Last 7 Days", "Last 30 Days", "All Time", "Custom"];

function presetRange(preset) {
  const today = new Date();
  const to = isoDate(today);
  let from;
  switch (preset) {
    case "Today": from = isoDate(today); break;
    case "This Week": {
      const w = new Date(today); w.setDate(today.getDate() - today.getDay()); from = isoDate(w); break;
    }
    case "This Month": from = isoDate(new Date(today.getFullYear(), today.getMonth(), 1)); break;
    case "Last 7 Days": {
      const w = new Date(today); w.setDate(today.getDate() - 6); from = isoDate(w); break;
    }
    case "Last 30 Days": {
      const w = new Date(today); w.setDate(today.getDate() - 29); from = isoDate(w); break;
    }
    case "All Time": from = "2020-01-01"; break;
    default: return null;
  }
  return { from, to };
}

export default function Dashboard() {
  const [preset, setPreset] = useState("This Month");
  const initial = presetRange("This Month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (f, t) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/data?from=${f}&to=${t}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("Couldn't load data. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(from, to); }, [from, to, load]);

  function choosePreset(p) {
    setPreset(p);
    const r = presetRange(p);
    if (r) { setFrom(r.from); setTo(r.to); }
  }

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <span className="logo">HMR</span>
          <div>
            <div className="title">Production Dashboard</div>
            <div className="sub">
              {data ? `${fmt(data.rowCount)} total records` : "Loading…"}
              {data && <> · updated {new Date(data.lastUpdated).toLocaleString()}</>}
            </div>
          </div>
        </div>
      </header>

      {/* Live scorecard */}
      <section className="scorecards">
        <Score label="Today" v={data?.scorecard.todayCount} />
        <Score label="This Week" v={data?.scorecard.weekCount} />
        <Score label="This Month" v={data?.scorecard.monthCount} />
        <Score label="Avg Daily" v={data?.scorecard.avgDaily} />
        <Score label="Avg / Agent" v={data?.scorecard.avgPerAgent} />
      </section>

      {/* Agent leaderboard */}
      <Panel title="Cases by Agent — all-time">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.agentLeaderboard || []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#26303d" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#8a97a8", fontSize: 11 }} interval={0} angle={-40} textAnchor="end" height={70} />
            <YAxis tick={{ fill: "#8a97a8", fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
            <Bar dataKey="value" fill={BLUE} radius={[3, 3, 0, 0]} name="Cases" />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Date filter bar */}
      <section className="filterbar">
        <span className="filterlabel">📅 Date range</span>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p} className={"chip" + (preset === p ? " active" : "")} onClick={() => choosePreset(p)}>{p}</button>
          ))}
        </div>
        <div className="dates">
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("Custom"); }} />
          <span className="to">to</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("Custom"); }} />
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      {/* Filtered KPIs */}
      <section className="kpis">
        <Kpi label="Total Cases" v={data?.kpis.totalCases} delta={data?.trend?.totalCases} />
        <Kpi label="Active Agents" v={data?.kpis.activeAgents} delta={data?.trend?.activeAgents} />
        <Kpi label="Active Clients" v={data?.kpis.activeClients} delta={data?.trend?.activeClients} />
        <Kpi label="Activities" v={data?.kpis.activities} delta={data?.trend?.activities} />
        <Kpi label="Case / Agent" v={data?.kpis.casePerAgent} />
      </section>

      {/* Breakdowns */}
      <div className="grid2">
        <Panel title="Cases by Activity">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart layout="vertical" data={data?.byActivity || []} margin={{ left: 20, right: 20 }}>
              <CartesianGrid stroke="#26303d" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#8a97a8", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#8a97a8", fontSize: 11 }} width={140} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="value" fill={BLUE} radius={[0, 3, 3, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Cases by Client">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart layout="vertical" data={data?.byClient || []} margin={{ left: 20, right: 20 }}>
              <CartesianGrid stroke="#26303d" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#8a97a8", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#8a97a8", fontSize: 11 }} width={140} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="value" fill={BLUE} radius={[0, 3, 3, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Activity Share">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={data?.byActivity || []} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={60} outerRadius={110} paddingAngle={1}
                label={({ percent }) => percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ""}
                labelLine={false}>
                {(data?.byActivity || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Cases by Day of Week">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data?.dow || []}>
              <CartesianGrid stroke="#26303d" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#8a97a8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8a97a8", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="value" fill={BLUE} radius={[3, 3, 0, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Over time */}
      <Panel title="Cases Over Time">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data?.overTime || []}>
            <CartesianGrid stroke="#26303d" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#8a97a8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#8a97a8", fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2} dot={false} name="Cases" />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Agent productivity table — sortable + searchable */}
      <Panel title="Agent Productivity — all-time">
        <AgentTable rows={data?.agentTable || []} />
      </Panel>

      {loading && <div className="loadingbar">Updating…</div>}
    </div>
  );
}

function AgentTable({ rows }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("caseVol");
  const [sortDir, setSortDir] = useState("desc");

  const cols = [
    { key: "name", label: "First Name", num: false },
    { key: "caseVol", label: "Case Vol", num: true },
    { key: "activitiesCount", label: "Activities", num: true },
    { key: "avgDaily", label: "Avg Daily", num: true },
    { key: "activeDays", label: "Active Days", num: true },
  ];

  function clickSort(key) {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  }

  const filtered = rows
    .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div>
      <input
        className="tablesearch"
        placeholder="Search agent…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} onClick={() => clickSort(c.key)} className="sortable">
                  {c.label}
                  {sortKey === c.key && <span className="arrow">{sortDir === "asc" ? " ▲" : " ▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{fmt(a.caseVol)}</td>
                <td>{a.activitiesCount}</td>
                <td>{a.avgDaily}</td>
                <td>{a.activeDays}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="noresults">No agents match “{query}”.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tooltipStyle = { background: "#161d27", border: "1px solid #26303d", borderRadius: 8, color: "#e8edf3" };

function Score({ label, v }) {
  return (
    <div className="score">
      <div className="score-label">{label}</div>
      <div className="score-val">{v === undefined ? "—" : fmt(v)}</div>
    </div>
  );
}

function Kpi({ label, v, delta }) {
  const hasDelta = delta !== null && delta !== undefined;
  const up = hasDelta && delta >= 0;
  return (
    <div className="kpi">
      <div className="kpi-val">{v === undefined ? "—" : fmt(v)}</div>
      <div className="kpi-label">{label}</div>
      {hasDelta && (
        <div className={"kpi-delta " + (up ? "up" : "down")}>
          {up ? "▲" : "▼"} {Math.abs(delta)}%
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      {children}
    </section>
  );
}
