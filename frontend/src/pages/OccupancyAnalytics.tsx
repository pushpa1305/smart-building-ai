import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  RefreshCw,
  Settings,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getBuildings, getOccupancy, getOccupancyZones } from "../services/api";

type Period = "24 Hours" | "7 Days" | "30 Days";
type Reading = Record<string, unknown>;

type NormalizedReading = {
  id: string;
  timestamp: Date;
  occupancy: number;
  zone: string;
  floor: string;
  occupied: number | null;
  capacity: number | null;
};

type ZoneSummary = {
  zone: string;
  floor: string;
  occupancy: number;
  average_occupancy: number;
  peak_occupancy: number;
  minimum_occupancy: number;
  readings: number;
  occupied_readings: number;
  timestamp?: string;
  source?: string;
};

type Building = {
  id: number | string;
  name?: string;
  location?: string;
  address?: string;
};

const NAV = [
  ["Dashboard", "/", LayoutDashboard],
  ["Live Monitoring", "/live-monitoring", Activity],
  ["Energy Analytics", "/energy-analytics", Zap],
  ["Occupancy Analytics", "/occupancy-analytics", Users],
  ["Equipment Monitoring", "/equipment-monitoring", Thermometer],
  ["Anomaly Center", "/anomalies", AlertTriangle],
  ["Forecasting", "/forecasting", TrendingUp],
  ["Recommendations", "/recommendations", Lightbulb],
  ["Action Tracker", "/actions", CheckCircle2],
  ["Reports", "/reports", BarChart3],
] as const;

const PERIOD_HOURS: Record<Period, number> = {
  "24 Hours": 24,
  "7 Days": 168,
  "30 Days": 720,
};

const C = {
  navy: "#0f172a",
  cyan: "#06b6d4",
  blue: "#2563eb",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  green: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  purple: "#7c3aed",
};

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number): number => Math.max(0, Math.min(100, value));

const text = (value: unknown, fallback = ""): string => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const stamp = (row: Reading): string =>
  text(row.timestamp ?? row.datetime ?? row.time ?? row.date);

const dateOf = (value: string): Date | null => {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const occOf = (row: Reading): number | null => {
  const value = num(
    row.occupancy_percentage ??
      row.occupancy_percent ??
      row.occupancy ??
      row.occupancy_rate ??
      row.occupancyRate ??
      row.percentage ??
      row.value,
  );
  return value === null ? null : clamp(value);
};

const fmtDateTime = (date: Date): string =>
  date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtTime = (date: Date): string =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDate = (date: Date): string =>
  date.toLocaleDateString([], {
    month: "short",
    day: "2-digit",
  });

export default function OccupancyAnalytics() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState<string>("");
  const [period, setPeriod] = useState<Period>("24 Hours");
  const [readings, setReadings] = useState<NormalizedReading[]>([]);
  const [zoneSummaries, setZoneSummaries] = useState<ZoneSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);

  const loadBuildings = useCallback(async () => {
    try {
      const data = await getBuildings();
      const list = Array.isArray(data) ? (data as Building[]) : [];
      setBuildings(list);
      setBuildingId((current) => current || String(list[0]?.id ?? ""));
    } catch (err) {
      console.error(err);
      setError("Unable to load buildings from the backend.");
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!buildingId) return;

    try {
      setLoading(true);
      setError("");

      // The historical occupancy endpoint is the required data source.
      // Zone summaries are optional: an unavailable /api/occupancy/zones
      // endpoint must never make the entire occupancy page show zero data.
      const occupancyResponse = await getOccupancy(buildingId);

      let zoneResponse: unknown[] = [];
      try {
        zoneResponse = await getOccupancyZones(buildingId);
      } catch (zoneError) {
        console.warn(
          "Zone occupancy endpoint unavailable; continuing with historical occupancy readings.",
          zoneError,
        );
      }

      const rows: Reading[] = Array.isArray(occupancyResponse)
        ? (occupancyResponse as unknown as Reading[])
        : [];

      const zoneRows: Reading[] = Array.isArray(zoneResponse)
        ? (zoneResponse as Reading[])
        : [];

      const normalizedZones: ZoneSummary[] = zoneRows
        .map((row) => {
          const average =
            num(row.average_occupancy ?? row.averageOccupancy ?? row.occupancy) ?? 0;
          const peak =
            num(row.peak_occupancy ?? row.peakOccupancy) ?? average;
          const minimum =
            num(row.minimum_occupancy ?? row.minimumOccupancy) ?? average;

          return {
            zone: text(row.zone, "Unknown Zone"),
            floor: text(row.floor, "Unknown Floor"),
            occupancy: clamp(num(row.occupancy ?? row.average_occupancy ?? row.averageOccupancy) ?? average),
            average_occupancy: clamp(average),
            peak_occupancy: clamp(peak),
            minimum_occupancy: clamp(minimum),
            readings: num(row.readings) ?? 0,
            occupied_readings:
              num(row.occupied_readings ?? row.occupiedReadings) ?? 0,
            timestamp: row.timestamp ? text(row.timestamp) : undefined,
            source: row.source ? text(row.source) : undefined,
          };
        })
        .sort((a, b) => b.average_occupancy - a.average_occupancy);

      setZoneSummaries(normalizedZones);

      const normalized: NormalizedReading[] = rows
        .map((row, index) => {
          const timestamp = dateOf(stamp(row));
          const occupancy = occOf(row);

          if (!timestamp || occupancy === null) return null;

          return {
            id: text(row.id, `${timestamp.getTime()}-${index}`),
            timestamp,
            occupancy,
            zone: text(row.zone ?? row.floor, "Building"),
            floor: text(row.floor, "Building"),
            occupied: num(
              row.occupied ??
                row.occupied_count ??
                row.occupiedCount ??
                row.people,
            ),
            capacity: num(row.capacity),
          };
        })
        .filter((row): row is NormalizedReading => row !== null)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setReadings(normalized);
      setUpdated(new Date());
    } catch (err) {
      console.error(err);
      setReadings([]);
      setZoneSummaries([]);
      setError("Unable to load occupancy readings from the backend. Check /api/occupancy.");
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    void loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => String(building.id) === buildingId),
    [buildings, buildingId],
  );

  const filtered = useMemo(() => {
    if (!readings.length) return [];

    const latestTimestamp = readings[readings.length - 1].timestamp.getTime();
    const cutoff = latestTimestamp - PERIOD_HOURS[period] * 60 * 60 * 1000;

    return readings.filter((reading) => reading.timestamp.getTime() >= cutoff);
  }, [readings, period]);

  const current = filtered.length
    ? filtered[filtered.length - 1].occupancy
    : readings.length
      ? readings[readings.length - 1].occupancy
      : 0;

  const average = filtered.length
    ? filtered.reduce((sum, reading) => sum + reading.occupancy, 0) /
      filtered.length
    : 0;

  const peak = filtered.length
    ? Math.max(...filtered.map((reading) => reading.occupancy))
    : 0;

  const low = filtered.length
    ? Math.min(...filtered.map((reading) => reading.occupancy))
    : 0;

  const first = filtered.length ? filtered[0].occupancy : current;
  const delta = current - first;

  const lowRate = filtered.length
    ? (filtered.filter((reading) => reading.occupancy < 30).length /
        filtered.length) *
      100
    : 0;

  const chart = useMemo(() => {
    if (!filtered.length) return [];

    if (period === "24 Hours") {
      return filtered.map((reading) => ({
        label: fmtTime(reading.timestamp),
        occupancy: Number(reading.occupancy.toFixed(1)),
      }));
    }

    const groups = new Map<string, NormalizedReading[]>();

    filtered.forEach((reading) => {
      const key = reading.timestamp.toISOString().slice(0, 10);
      const existing = groups.get(key) ?? [];
      existing.push(reading);
      groups.set(key, existing);
    });

    return Array.from(groups.values()).map((items) => ({
      label: fmtDate(items[0].timestamp),
      occupancy: Number(
        (
          items.reduce((sum, item) => sum + item.occupancy, 0) /
          items.length
        ).toFixed(1),
      ),
    }));
  }, [filtered, period]);

  const zones = zoneSummaries;

  const refresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const status =
    current < 30
      ? { label: "Low Utilization", color: C.amber }
      : current < 80
        ? { label: "Normal Utilization", color: C.green }
        : { label: "High Utilization", color: C.red };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        display: "flex",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <aside
        style={{
          width: 260,
          background: C.navy,
          color: "white",
          minHeight: "100vh",
          padding: "26px 18px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          boxSizing: "border-box",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 8px 24px",
            borderBottom: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(135deg,#06b6d4,#2563eb)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 8px 24px rgba(6,182,212,.25)",
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>SmartBuild AI</div>
            <div
              style={{
                fontSize: 8,
                letterSpacing: 1.4,
                color: "#94a3b8",
                marginTop: 3,
              }}
            >
              ENERGY INTELLIGENCE
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#64748b",
            letterSpacing: 1.6,
            padding: "28px 10px 12px",
          }}
        >
          MAIN MENU
        </div>

        <nav style={{ display: "grid", gap: 5 }}>
          {NAV.map(([label, path, Icon]) => {
            const active = label === "Occupancy Analytics";

            return (
              <button
                key={label}
                onClick={() => navigate(path)}
                style={{
                  border: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 9,
                  background: active ? "rgba(6,182,212,.16)" : "transparent",
                  color: active ? "#22d3ee" : "#cbd5e1",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  borderLeft: active
                    ? "2px solid #06b6d4"
                    : "2px solid transparent",
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => navigate("/settings")}
          style={{
            position: "absolute",
            bottom: 74,
            left: 18,
            right: 18,
            border: 0,
            background: "transparent",
            color: "#cbd5e1",
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: "11px 12px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <Settings size={17} />
          Settings
        </button>

        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 18,
            right: 18,
            padding: 12,
            borderRadius: 10,
            background: "#17233a",
            border: "1px solid rgba(255,255,255,.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />
            System Online
          </div>
          <div style={{ color: "#64748b", fontSize: 8, marginTop: 4 }}>
            All agents operational
          </div>
        </div>
      </aside>

      <main
        style={{
          marginLeft: 260,
          width: "calc(100% - 260px)",
          minWidth: 0,
        }}
      >
        <header
          style={{
            background: C.white,
            borderBottom: `1px solid ${C.border}`,
            padding: "24px 32px",
          }}
        >
          <div
            style={{
              maxWidth: 1450,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: C.cyan,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Smart Building Intelligence
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 1.15,
                  fontWeight: 800,
                }}
              >
                Occupancy Analytics
              </h1>
              <p style={{ margin: "8px 0 0", color: C.muted, fontSize: 14 }}>
                Real-time occupancy and space-utilization intelligence powered
                by building sensor data.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <select
                value={buildingId}
                onChange={(event) => setBuildingId(event.target.value)}
                style={selectStyle}
              >
                <option value="">Select building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name ?? `Building ${building.id}`}
                  </option>
                ))}
              </select>

              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
                style={selectStyle}
              >
                <option>24 Hours</option>
                <option>7 Days</option>
                <option>30 Days</option>
              </select>

              <button
                onClick={refresh}
                disabled={refreshing || !buildingId}
                style={{
                  ...buttonStyle,
                  opacity: refreshing || !buildingId ? 0.7 : 1,
                }}
              >
                <RefreshCw
                  size={15}
                  style={
                    refreshing
                      ? { animation: "spin 1s linear infinite" }
                      : undefined
                  }
                />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>
        </header>

        <div
          style={{
            maxWidth: 1450,
            margin: "0 auto",
            padding: "24px 32px 40px",
          }}
        >
          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 15,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={iconBox(C.navy)}>
                  <Building2 size={21} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 750 }}>
                    {selectedBuilding?.name ?? "Building"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: C.muted,
                      marginTop: 3,
                    }}
                  >
                    {selectedBuilding?.location ??
                      selectedBuilding?.address ??
                      "Occupancy monitoring"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 15,
                  alignItems: "center",
                }}
              >
                <span style={{ color: C.muted, fontSize: 12 }}>
                  <Clock3
                    size={13}
                    style={{ verticalAlign: "-2px", marginRight: 5 }}
                  />
                  {updated ? `Updated ${fmtDateTime(updated)}` : "Waiting for data"}
                </span>
                <span style={pill(C.green)}>
                  <span style={dot(C.green)} /> Backend Connected
                </span>
              </div>
            </div>
          </section>

          {error && (
            <section
              style={{
                ...cardStyle,
                background: "#fff7ed",
                borderColor: "#fed7aa",
                marginTop: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  color: C.red,
                }}
              >
                <AlertTriangle size={19} />
                <div>
                  <b>Occupancy data unavailable</b>
                  <div style={{ fontSize: 13, marginTop: 3 }}>{error}</div>
                </div>
              </div>
            </section>
          )}

          {loading && (
            <section
              style={{
                ...cardStyle,
                marginTop: 16,
                display: "flex",
                gap: 10,
                alignItems: "center",
                color: C.muted,
              }}
            >
              <Loader2 size={18} color={C.cyan} />
              <span>Loading occupancy readings from backend...</span>
            </section>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,minmax(0,1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <Kpi
              title="Current Occupancy"
              value={`${current.toFixed(1)}%`}
              subtitle={status.label}
              icon={<Users size={20} />}
              accent={C.cyan}
            />
            <Kpi
              title="Average Occupancy"
              value={`${average.toFixed(1)}%`}
              subtitle={`Across ${period.toLowerCase()}`}
              icon={<Activity size={20} />}
              accent={C.blue}
            />
            <Kpi
              title="Peak Occupancy"
              value={`${peak.toFixed(1)}%`}
              subtitle="Highest observed level"
              icon={<TrendingUp size={20} />}
              accent={C.green}
            />
            <Kpi
              title="Backend Readings"
              value={filtered.length.toLocaleString()}
              subtitle={`${zones.length} detected zone group${zones.length === 1 ? "" : "s"}`}
              icon={<BarChart3 size={20} />}
              accent={C.purple}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,2fr) minmax(300px,1fr)",
              gap: 16,
              marginTop: 16,
            }}
          >
            <section style={cardStyle}>
              <div style={sectionHead}>
                <div>
                  <h2 style={h2}>Occupancy Trend</h2>
                  <p style={sub}>Actual backend readings for the selected period.</p>
                </div>
                <span style={smallPill}>{filtered.length} readings</span>
              </div>

              <div style={{ height: 340 }}>
                {chart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart}>
                      <defs>
                        <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.cyan} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={C.cyan} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: C.faint }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: C.faint }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Area
                        type="monotone"
                        dataKey="occupancy"
                        stroke={C.cyan}
                        strokeWidth={3}
                        fill="url(#occFill)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty text="No usable occupancy readings returned by the backend." />
                )}
              </div>
            </section>

            <section style={cardStyle}>
              <div style={sectionHead}>
                <div>
                  <h2 style={h2}>Space Utilization</h2>
                  <p style={sub}>Current occupancy signal.</p>
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: C.muted }}>
                    Current status
                  </span>
                  <span style={pill(status.color)}>{status.label}</span>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 5,
                  }}
                >
                  <b style={{ fontSize: 48, lineHeight: 1 }}>{current.toFixed(1)}</b>
                  <span style={{ fontSize: 18, color: C.faint }}>%</span>
                </div>

                <div
                  style={{
                    height: 10,
                    background: "#e2e8f0",
                    borderRadius: 10,
                    overflow: "hidden",
                    marginTop: 18,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${current}%`,
                      background: `linear-gradient(90deg,${C.cyan},${C.blue})`,
                      borderRadius: 10,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: C.faint,
                    marginTop: 6,
                  }}
                >
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <Mini label="Peak" value={`${peak.toFixed(1)}%`} />
                <Mini label="Average" value={`${average.toFixed(1)}%`} />
              </div>
            </section>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)",
              gap: 16,
              marginTop: 16,
            }}
          >
            <section style={cardStyle}>
              <div style={sectionHead}>
                <div>
                  <h2 style={h2}>Occupancy by Zone</h2>
                  <p style={sub}>Live zone summaries from backend sensor readings.</p>
                </div>
                <span style={smallPill}>{zones.length} groups</span>
              </div>

              <div style={{ height: 300 }}>
                {zones.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={zones.slice(0, 12)} margin={{ left: -20, right: 8 }}>
                      <CartesianGrid
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="zone"
                        tick={{ fontSize: 9, fill: C.faint }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: C.faint }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Bar
                        dataKey="occupancy"
                        fill={C.purple}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty text="No zone-level data returned by the backend." />
                )}
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={h2}>Utilization Insights</h2>
              <p style={sub}>
                Derived from actual occupancy readings. No hardcoded occupancy values.
              </p>

              <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
                <Insight
                  title="Highest utilization"
                  value={
                    zones[0]
                      ? `${zones[0].zone} • ${zones[0].occupancy.toFixed(1)}%`
                      : "Unavailable"
                  }
                  color={C.green}
                />
                <Insight
                  title="Lowest utilization"
                  value={
                    zones.length
                      ? `${zones[zones.length - 1].zone} • ${zones[zones.length - 1].occupancy.toFixed(1)}%`
                      : "Unavailable"
                  }
                  color={C.amber}
                />
                <Insight
                  title="Low-utilization readings"
                  value={`${lowRate.toFixed(1)}% of selected readings`}
                  color={C.blue}
                />
                <Insight
                  title="Observed range"
                  value={`${low.toFixed(1)}% – ${peak.toFixed(1)}%`}
                  color={C.purple}
                />
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: 15,
                  borderRadius: 12,
                  background: "#ecfeff",
                  border: "1px solid #cffafe",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "#475569",
                }}
              >
                <b style={{ color: "#0e7490" }}>Energy optimization signal</b>
                <div style={{ marginTop: 5 }}>
                  {current < 30
                    ? "Occupancy is currently low. Correlate this signal with HVAC, lighting and equipment runtime before approving energy-saving actions."
                    : current < 80
                      ? "Occupancy is within a normal operating range. Continue correlating occupancy with energy and equipment activity."
                      : "Occupancy is high. Prioritize comfort, capacity and equipment-load monitoring."}
                </div>
              </div>
            </section>
          </div>

          <section style={{ ...cardStyle, marginTop: 16 }}>
            <div style={sectionHead}>
              <div>
                <h2 style={h2}>Zone Details</h2>
                <p style={sub}>Latest floor and zone summaries from backend sensor data.</p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {["Zone", "Floor", "Occupancy", "Occupied", "Capacity", "Readings", "Status"].map(
                      (heading) => (
                        <th key={heading} style={th}>
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone, index) => (
                    <tr key={`${zone.floor}-${zone.zone}-${index}`}>
                      <td style={td}>
                        <b>{zone.zone}</b>
                      </td>
                      <td style={td}>{zone.floor}</td>
                      <td style={td}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 90,
                              height: 7,
                              background: "#e2e8f0",
                              borderRadius: 10,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${zone.occupancy}%`,
                                background: C.cyan,
                              }}
                            />
                          </div>
                          <b>{zone.occupancy.toFixed(1)}%</b>
                        </div>
                      </td>
                      <td style={td}>
                        {zone.occupied_readings.toLocaleString()}
                      </td>
                      <td style={td}>—</td>
                      <td style={td}>{zone.readings.toLocaleString()}</td>
                      <td style={td}>
                        <span
                          style={pill(
                            zone.occupancy < 30
                              ? C.amber
                              : zone.occupancy < 80
                                ? C.green
                                : C.red,
                          )}
                        >
                          {zone.occupancy < 30
                            ? "Low"
                            : zone.occupancy < 80
                              ? "Normal"
                              : "High"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!zones.length && (
                <Empty text="No zone-level data returned by the backend." />
              )}
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 16,
              marginTop: 16,
            }}
          >
            <Signal
              title="Trend"
              value={
                Math.abs(delta) < 0.1
                  ? "Stable"
                  : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`
              }
              subtitle="First reading vs latest reading"
              icon={
                delta >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />
              }
            />
            <Signal
              title="Peak occupancy"
              value={`${peak.toFixed(1)}%`}
              subtitle="Highest observed backend value"
              icon={<Users size={18} />}
            />
            <Signal
              title="Data coverage"
              value={filtered.length.toLocaleString()}
              subtitle={`${period} backend readings`}
              icon={<Activity size={18} />}
            />
          </div>

          <footer
            style={{
              marginTop: 16,
              background: C.navy,
              color: "white",
              borderRadius: 16,
              padding: "22px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  fontWeight: 800,
                  letterSpacing: 1.4,
                }}
              >
                SMARTBUILD AI
              </div>
              <div style={{ fontSize: 17, fontWeight: 750, marginTop: 4 }}>
                Occupancy Intelligence
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  marginTop: 5,
                }}
              >
                KPIs, trends and zone summaries are calculated from the Flask
                backend occupancy endpoints.
              </div>
            </div>
            <span style={pill("#22c55e")}>
              <span style={dot("#22c55e")} /> Backend Analytics
            </span>
          </footer>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1100px) {
          aside { display: none !important; }
          main { margin-left: 0 !important; width: 100% !important; }
        }
        @media (max-width: 900px) {
          main > header > div,
          main > div { padding-left: 18px !important; padding-right: 18px !important; }
        }
      `}</style>
    </div>
  );
}

const selectStyle: CSSProperties = {
  height: 42,
  padding: "0 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  background: C.white,
  color: C.text,
  fontSize: 12,
  fontWeight: 650,
  outline: "none",
};

const buttonStyle: CSSProperties = {
  height: 42,
  padding: "0 15px",
  border: 0,
  borderRadius: 10,
  background: C.cyan,
  color: C.white,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 750,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(6,182,212,.2)",
};

const cardStyle: CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 3px 12px rgba(15,23,42,.035)",
};

const h2: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
};

const sub: CSSProperties = {
  margin: "5px 0 0",
  color: C.muted,
  fontSize: 12,
  lineHeight: 1.5,
};

const sectionHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 18,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "11px 10px",
  borderBottom: `1px solid ${C.border}`,
  color: C.faint,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const td: CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#475569",
};

const smallPill: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 20,
  background: "#f1f5f9",
  color: C.muted,
  fontSize: 10,
  fontWeight: 750,
  whiteSpace: "nowrap",
};

const iconBox = (background: string): CSSProperties => ({
  width: 46,
  height: 46,
  borderRadius: 13,
  background,
  color: C.white,
  display: "grid",
  placeItems: "center",
});

const dot = (color: string): CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: color,
  display: "inline-block",
  marginRight: 6,
});

const pill = (color: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 9px",
  borderRadius: 20,
  background: `${color}18`,
  color,
  fontSize: 10,
  fontWeight: 800,
  whiteSpace: "nowrap",
});

function Kpi({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: `${accent}14`,
            color: accent,
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </div>
        <span style={pill(C.green)}>BACKEND</span>
      </div>
      <div style={{ marginTop: 17, fontSize: 12, color: C.muted }}>{title}</div>
      <div
        style={{
          marginTop: 4,
          fontSize: 29,
          fontWeight: 800,
          letterSpacing: -0.7,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: C.faint }}>{subtitle}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #eef2f7",
        background: C.white,
        borderRadius: 11,
        padding: 12,
      }}
    >
      <div style={{ fontSize: 10, color: C.faint }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Insight({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: 12,
        border: "1px solid #eef2f7",
        borderRadius: 11,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: C.faint }}>{title}</div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 750,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function Signal({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "#ecfeff",
          color: C.cyan,
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ marginTop: 13, fontSize: 12, color: C.muted }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 3 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

function Empty({ text: message }: { text: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        color: C.faint,
        fontSize: 12,
        padding: 30,
      }}
    >
      {message}
    </div>
  );
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "9px 11px",
        boxShadow: "0 8px 24px rgba(15,23,42,.12)",
      }}
    >
      <div style={{ fontSize: 10, color: C.faint }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, marginTop: 3 }}>
        {Number(payload[0].value ?? 0).toFixed(1)}% occupancy
      </div>
    </div>
  );
}
