import { useEffect, useMemo, useState, type ComponentType } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Gauge,
  Lightbulb,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  getAnomalies,
  getBuildings,
  getDashboard,
  getEnergyData,
  getForecasting,
  getOccupancyAnalytics,
  getRecommendations,
  type Building,
} from "../services/api";

type DashboardResponse = Awaited<ReturnType<typeof getDashboard>>;
type OccupancyResponse = Awaited<ReturnType<typeof getOccupancyAnalytics>>;
type ForecastResponse = Awaited<ReturnType<typeof getForecasting>>;

interface EnergyReading {
  timestamp?: string;
  time?: string;
  datetime?: string;
  date?: string;
  energy?: number;
  consumption?: number;
  actual?: number;
  baseline?: number;
  baseline_energy?: number;
  expected?: number;
  value?: number;
}

interface Anomaly {
  id?: number | string;
  title?: string;
  name?: string;
  description?: string;
  message?: string;
  severity?: string;
  status?: string;
  timestamp?: string;
  detected_at?: string;
}

interface Recommendation {
  id?: number | string;
  title?: string;
  name?: string;
  description?: string;
  action?: string;
  priority?: string;
  status?: string;
  estimated_savings?: number;
  savings?: number;
  savings_unit?: string;
}

interface ReportItem {
  id: string;
  title: string;
  description: string;
  type: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  accent: string;
}

function asRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

function getArrayFromResponse<T>(value: unknown, keys: string[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  const record = asRecord(value);
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  return [];
}

function formatNumber(value: unknown, decimals = 0): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(value: unknown): string {
  if (!value) return "No date";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEnergyValue(item: any): number {
  return Number(
    item?.energy ?? item?.consumption ?? item?.actual ?? item?.value ?? 0,
  );
}

function getBaselineValue(item: any): number {
  return Number(
    item?.baseline ?? item?.baseline_energy ?? item?.expected ?? 0,
  );
}

function getTimeValue(item: any): string {
  return String(
    item?.timestamp ?? item?.time ?? item?.datetime ?? item?.date ?? "",
  );
}

function getStatusClass(status: string): string {
  const value = status.toLowerCase();
  if (
    value.includes("critical") ||
    value.includes("high") ||
    value.includes("open")
  ) {
    return "r-status r-danger";
  }
  if (
    value.includes("medium") ||
    value.includes("warning") ||
    value.includes("pending")
  ) {
    return "r-status r-warning";
  }
  if (
    value.includes("resolved") ||
    value.includes("completed") ||
    value.includes("approved") ||
    value.includes("success") ||
    value.includes("low")
  ) {
    return "r-status r-success";
  }
  return "r-status r-neutral";
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tone?: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="r-metric-card">
      <div className={`r-metric-icon ${tone}`}>
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <div className="r-metric-body">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>
          {trend === "up" && <ArrowUpRight size={13} />}
          {trend === "down" && <ArrowDownRight size={13} />}
          {detail}
        </small>
      </div>
    </div>
  );
}

export default function Reports() {
  const [activePage, setActivePage] = useState("Reports");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<
    number | string | undefined
  >(undefined);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [energy, setEnergy] = useState<EnergyReading[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportType, setReportType] = useState("All Reports");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const data = await getBuildings();
        setBuildings(Array.isArray(data) ? data : []);
        if (data?.length && selectedBuildingId === undefined) {
          setSelectedBuildingId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load buildings:", err);
      }
    };
    loadBuildings();
  }, [selectedBuildingId]);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError("");

      try {
        const results = await Promise.allSettled([
          getDashboard(selectedBuildingId),
          getEnergyData({ buildingId: selectedBuildingId }),
          getAnomalies(selectedBuildingId),
          getRecommendations(selectedBuildingId),
          getOccupancyAnalytics(selectedBuildingId),
          getForecasting(7, selectedBuildingId),
        ]);

        const [dashboardResult, energyResult, anomalyResult, recommendationResult, occupancyResult, forecastResult] = results;

        setDashboard(
          dashboardResult.status === "fulfilled" ? dashboardResult.value : null,
        );
        setEnergy(
          energyResult.status === "fulfilled"
            ? getArrayFromResponse<EnergyReading>(energyResult.value, [
                "data",
                "items",
                "results",
                "readings",
                "energyReadings",
                "energy_readings",
              ])
            : [],
        );
        setAnomalies(
          anomalyResult.status === "fulfilled"
            ? getArrayFromResponse<Anomaly>(anomalyResult.value, [
                "data",
                "items",
                "results",
                "alerts",
                "anomalies",
              ])
            : [],
        );
        setRecommendations(
          recommendationResult.status === "fulfilled"
            ? getArrayFromResponse<Recommendation>(recommendationResult.value, [
                "data",
                "items",
                "results",
                "recommendations",
              ])
            : [],
        );
        setOccupancy(
          occupancyResult.status === "fulfilled" ? occupancyResult.value : null,
        );
        setForecast(
          forecastResult.status === "fulfilled" ? forecastResult.value : null,
        );

        if (results.every((result) => result.status === "rejected")) {
          setError("Unable to load reports. Check whether the backend is running.");
        }
      } catch (err) {
        console.error("Reports loading error:", err);
        setError("Unable to load report data. Please check the backend connection.");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [selectedBuildingId]);

  const dashboardRecord = useMemo(() => asRecord(dashboard), [dashboard]);
  const occupancyRecord = useMemo(() => asRecord(occupancy), [occupancy]);
  const forecastRecord = useMemo(() => asRecord(forecast), [forecast]);

  const currentEnergy = Number(
    dashboardRecord.currentEnergy ?? dashboardRecord.current_energy ?? dashboardRecord.energy ?? 0,
  );
  const baselineEnergy = Number(
    dashboardRecord.baselineEnergy ?? dashboardRecord.baseline_energy ?? dashboardRecord.baseline ?? 0,
  );
  const dashboardEnergyChange = Number(
    dashboardRecord.energyChange ?? dashboardRecord.energy_change ?? dashboardRecord.energyIncrease ?? dashboardRecord.energy_increase ?? 0,
  );
  const potentialSavings = Number(
    dashboardRecord.potentialSavings ?? dashboardRecord.potential_savings ?? dashboardRecord.excessEnergy ?? dashboardRecord.excess_energy ?? 0,
  );
  const occupancyValue = Number(
    occupancyRecord.currentOccupancy ?? occupancyRecord.current_occupancy ?? occupancyRecord.occupancy ?? occupancyRecord.averageOccupancy ?? occupancyRecord.average_occupancy ?? dashboardRecord.occupancy ?? 0,
  );
  const healthScore = Number(dashboardRecord.healthScore ?? dashboardRecord.health_score ?? 0);
  const forecastArray = getArrayFromResponse<any>(forecast, [
    "data",
    "items",
    "results",
    "forecast",
    "forecastData",
    "forecasts",
  ]);

  const excessEnergy = Math.max(currentEnergy - baselineEnergy, 0);
  const energyDeltaPercent = baselineEnergy > 0
    ? ((currentEnergy - baselineEnergy) / baselineEnergy) * 100
    : dashboardEnergyChange;
  const highSeverityAnomalies = anomalies.filter((item) =>
    ["critical", "high"].includes(String(item.severity ?? item.status ?? "").toLowerCase()),
  ).length;
  const highPriorityRecommendations = recommendations.filter((item) =>
    ["critical", "high"].includes(String(item.priority ?? "").toLowerCase()),
  ).length;
  const approvedRecommendations = recommendations.filter((item) =>
    String(item.status ?? "").toLowerCase() === "approved",
  ).length;
  const estimatedSavings = recommendations.reduce(
    (sum, item) => sum + Number(item.estimated_savings ?? item.savings ?? 0),
    0,
  );

  const selectedBuilding = buildings.find(
    (building) => String(building.id) === String(selectedBuildingId),
  );

  const reportItems: ReportItem[] = useMemo(
    () => [
      {
        id: "energy-performance",
        title: "Energy Performance",
        description: "Consumption, baseline variance and avoidable energy analysis.",
        type: "Energy",
        icon: Zap,
        accent: "blue",
      },
      {
        id: "occupancy-analysis",
        title: "Occupancy Analytics",
        description: "Occupancy patterns and their relationship with building demand.",
        type: "Occupancy",
        icon: Users,
        accent: "violet",
      },
      {
        id: "equipment-monitoring",
        title: "Equipment Monitoring",
        description: "Operational view of HVAC, lighting and building equipment.",
        type: "Equipment",
        icon: Gauge,
        accent: "cyan",
      },
      {
        id: "anomaly-report",
        title: "Anomaly & Incidents",
        description: "Detected spikes, abnormal conditions and operational issues.",
        type: "Anomalies",
        icon: AlertTriangle,
        accent: "amber",
      },
      {
        id: "forecast-report",
        title: "Energy Forecast",
        description: "Forward-looking energy demand information from available data.",
        type: "Forecast",
        icon: TrendingUp,
        accent: "green",
      },
      {
        id: "recommendation-report",
        title: "AI Recommendations",
        description: "Prioritized actions generated to improve efficiency and operations.",
        type: "Recommendations",
        icon: Lightbulb,
        accent: "orange",
      },
    ],
    [],
  );

  const filteredReports = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return reportItems.filter((report) => {
      const typeMatch = reportType === "All Reports" || report.type === reportType;
      const searchMatch =
        !search ||
        report.title.toLowerCase().includes(search) ||
        report.description.toLowerCase().includes(search) ||
        report.type.toLowerCase().includes(search);
      return typeMatch && searchMatch;
    });
  }, [reportItems, reportType, searchTerm]);

  const reportDetails = useMemo(() => {
    if (!selectedReport) return [] as Array<[string, string]>;

    switch (selectedReport.id) {
      case "energy-performance":
        return [
          ["Current Energy", `${formatNumber(currentEnergy, 2)} kWh`],
          ["Baseline Energy", `${formatNumber(baselineEnergy, 2)} kWh`],
          ["Excess Energy", `${formatNumber(excessEnergy, 2)} kWh`],
          ["Variance", `${formatNumber(energyDeltaPercent, 2)}%`],
          ["Readings", formatNumber(energy.length)],
        ];
      case "occupancy-analysis":
        return [
          ["Current / Average", `${formatNumber(occupancyValue)} people`],
          ["Occupancy Records", formatNumber(getArrayFromResponse<any>(occupancy, ["data", "items", "results", "readings", "occupancy", "zones"]).length)],
        ];
      case "equipment-monitoring":
        return [
          ["Building", selectedBuilding?.name ?? "Selected Building"],
          ["Equipment Data", "Available through monitoring"],
        ];
      case "anomaly-report":
        return [
          ["Total Anomalies", formatNumber(anomalies.length)],
          ["Critical / High", formatNumber(highSeverityAnomalies)],
        ];
      case "forecast-report":
        return [
          ["Forecast Records", formatNumber(forecastArray.length)],
          ["Forecast Status", Object.keys(forecastRecord).length ? "Available" : "No forecast data"],
        ];
      case "recommendation-report":
        return [
          ["Recommendations", formatNumber(recommendations.length)],
          ["High Priority", formatNumber(highPriorityRecommendations)],
          ["Approved", formatNumber(approvedRecommendations)],
          ["Est. Savings", `${formatNumber(estimatedSavings, 2)} kWh`],
        ];
      default:
        return [];
    }
  }, [
    selectedReport,
    currentEnergy,
    baselineEnergy,
    excessEnergy,
    energyDeltaPercent,
    energy.length,
    occupancy,
    occupancyValue,
    selectedBuilding,
    anomalies.length,
    highSeverityAnomalies,
    forecastArray.length,
    forecastRecord,
    recommendations.length,
    highPriorityRecommendations,
    approvedRecommendations,
    estimatedSavings,
  ]);

  const downloadPdf = () => {
    const doc = new jsPDF();
    const buildingName = selectedBuilding?.name ?? "All Buildings";

    doc.setFontSize(21);
    doc.text("SmartBuild AI", 14, 18);
    doc.setFontSize(14);
    doc.text("Building Energy & Facility Report", 14, 28);
    doc.setFontSize(10);
    doc.text(`Building: ${buildingName}`, 14, 38);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

    autoTable(doc, {
      startY: 52,
      head: [["Metric", "Value"]],
      body: [
        ["Current Energy", `${formatNumber(currentEnergy, 2)} kWh`],
        ["Baseline Energy", `${formatNumber(baselineEnergy, 2)} kWh`],
        ["Excess Energy", `${formatNumber(excessEnergy, 2)} kWh`],
        ["Energy Variance", `${formatNumber(energyDeltaPercent, 2)}%`],
        ["Occupancy", `${formatNumber(occupancyValue)} people`],
        ["Health Score", `${formatNumber(healthScore)}/100`],
        ["Anomalies", formatNumber(anomalies.length)],
        ["High Priority Anomalies", formatNumber(highSeverityAnomalies)],
        ["Recommendations", formatNumber(recommendations.length)],
        ["Approved Recommendations", formatNumber(approvedRecommendations)],
        ["Estimated Savings", `${formatNumber(estimatedSavings, 2)} kWh`],
      ],
    });

    let finalY = 130;
    if (energy.length > 0) {
      doc.setFontSize(13);
      doc.text("Recent Energy Readings", 14, finalY);
      autoTable(doc, {
        startY: finalY + 6,
        head: [["Time", "Energy", "Baseline", "Difference"]],
        body: energy.slice(0, 20).map((item) => {
          const actual = getEnergyValue(item);
          const baseline = getBaselineValue(item);
          return [
            getTimeValue(item),
            `${formatNumber(actual, 2)} kWh`,
            `${formatNumber(baseline, 2)} kWh`,
            `${actual - baseline >= 0 ? "+" : ""}${formatNumber(actual - baseline, 2)} kWh`,
          ];
        }),
      });
    }

    doc.addPage();
    doc.setFontSize(15);
    doc.text("Anomalies & AI Recommendations", 14, 18);

    autoTable(doc, {
      startY: 26,
      head: [["Type", "Title", "Severity / Priority", "Status"]],
      body: [
        ...anomalies.slice(0, 12).map((item) => [
          "Anomaly",
          item.title ?? item.name ?? "Energy anomaly",
          item.severity ?? item.status ?? "Unknown",
          item.status ?? "Open",
        ]),
        ...recommendations.slice(0, 12).map((item) => [
          "Recommendation",
          item.title ?? item.name ?? "AI Recommendation",
          item.priority ?? "Normal",
          item.status ?? "Pending",
        ]),
      ],
    });

    doc.save("smartbuild-energy-report.pdf");
  };

  const handleRefresh = () => window.location.reload();

  const SelectedReportIcon = selectedReport?.icon ?? FileText;

  return (
    <div className="app-layout">
      <style>{`
        .reports-page {
          --r-ink: #102033;
          --r-muted: #6b7a8c;
          --r-border: #e7edf3;
          --r-soft: #f7f9fc;
          --r-blue: #2563eb;
          min-height: calc(100vh - 70px);
          padding: 30px 34px 48px;
          background: #f5f7fa;
          color: var(--r-ink);
        }
        .reports-shell { max-width: 1500px; margin: 0 auto; }
        .r-hero {
          position: relative;
          overflow: hidden;
          border: 1px solid #e4eaf1;
          border-radius: 22px;
          padding: 28px 30px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fbff 62%, #f0f6ff 100%);
          box-shadow: 0 10px 35px rgba(25, 55, 90, .06);
        }
        .r-hero:after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          right: -100px;
          top: -120px;
          border-radius: 50%;
          background: rgba(37,99,235,.08);
        }
        .r-hero-main { position: relative; z-index: 1; display:flex; justify-content:space-between; gap:24px; align-items:flex-start; }
        .r-eyebrow { display:flex; align-items:center; gap:8px; color:#2563eb; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.09em; margin-bottom:9px; }
        .r-hero h1 { margin:0; font-size:30px; letter-spacing:-.035em; line-height:1.1; }
        .r-hero p { margin:10px 0 0; max-width:720px; color:var(--r-muted); font-size:14px; line-height:1.6; }
        .r-hero-actions { display:flex; gap:10px; flex-wrap:wrap; }
        .r-button { border:1px solid #dce5ef; background:#fff; color:#213247; border-radius:11px; padding:11px 15px; font-weight:750; font-size:13px; display:flex; align-items:center; gap:8px; cursor:pointer; transition:.2s ease; }
        .r-button:hover { transform:translateY(-1px); box-shadow:0 7px 18px rgba(24,49,78,.09); }
        .r-button.primary { background:#1769e0; border-color:#1769e0; color:#fff; }
        .r-toolbar { margin:18px 0; display:grid; grid-template-columns: 1.05fr .9fr 1fr auto; gap:10px; }
        .r-control { min-height:46px; border:1px solid #dfe7ef; border-radius:12px; background:#fff; display:flex; align-items:center; gap:9px; padding:0 13px; color:#64748b; box-shadow:0 3px 12px rgba(28,53,80,.035); }
        .r-control select,.r-control input { width:100%; border:0; outline:0; background:transparent; color:#233449; font-size:13px; font-weight:650; }
        .r-control input::placeholder { color:#9aa8b7; }
        .r-refresh { width:46px; justify-content:center; cursor:pointer; padding:0; }
        .r-error { display:flex; gap:10px; align-items:center; padding:12px 14px; border:1px solid #fecaca; background:#fff7f7; color:#b42318; border-radius:12px; margin-bottom:16px; font-size:13px; font-weight:650; }
        .r-kpis { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; }
        .r-metric-card { min-height:132px; padding:17px; border:1px solid var(--r-border); background:#fff; border-radius:16px; box-shadow:0 6px 20px rgba(24,49,78,.045); display:flex; gap:13px; }
        .r-metric-icon { width:40px; height:40px; border-radius:11px; display:grid; place-items:center; flex:0 0 auto; }
        .r-metric-icon.blue{background:#eaf2ff;color:#2563eb}.r-metric-icon.violet{background:#f0ebff;color:#7c3aed}.r-metric-icon.cyan{background:#e7f9fb;color:#0891b2}.r-metric-icon.amber{background:#fff5dd;color:#c57a00}.r-metric-icon.green{background:#e9f8ef;color:#159957}.r-metric-icon.orange{background:#fff0e5;color:#ea580c}
        .r-metric-body{min-width:0}.r-metric-body span{display:block;font-size:11px;color:#7b8998;font-weight:750;text-transform:uppercase;letter-spacing:.045em}.r-metric-body strong{display:block;margin-top:7px;font-size:22px;letter-spacing:-.025em;color:#16273b}.r-metric-body small{display:flex;align-items:center;gap:3px;margin-top:5px;color:#7c8998;font-size:11px;line-height:1.3}
        .r-section-head { display:flex; justify-content:space-between; align-items:flex-end; margin:28px 2px 13px; }
        .r-section-head h2 { margin:0; font-size:19px; letter-spacing:-.02em; }.r-section-head p{margin:4px 0 0;color:#7b8998;font-size:12px}.r-date{display:flex;gap:7px;align-items:center;color:#7a8796;font-size:12px}
        .r-report-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.r-report-card{position:relative;overflow:hidden;border:1px solid var(--r-border);background:#fff;border-radius:17px;padding:20px;box-shadow:0 6px 20px rgba(24,49,78,.045);transition:.2s ease}.r-report-card:hover{transform:translateY(-3px);box-shadow:0 13px 30px rgba(24,49,78,.09);border-color:#d6e2ee}.r-report-top{display:flex;justify-content:space-between;align-items:center}.r-report-icon{width:43px;height:43px;border-radius:12px;display:grid;place-items:center;background:#eef5ff;color:#2468d7}.r-report-type{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:800;color:#718096;background:#f4f6f8;padding:6px 9px;border-radius:999px}.r-report-card h3{font-size:16px;margin:17px 0 7px}.r-report-card p{font-size:12.5px;line-height:1.55;color:#718096;min-height:39px;margin:0}.r-report-foot{display:flex;align-items:center;justify-content:space-between;margin-top:20px;padding-top:14px;border-top:1px solid #eef2f6}.r-live{display:flex;align-items:center;gap:6px;color:#6c7b8d;font-size:11px;font-weight:650}.r-live-dot{width:7px;height:7px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 4px #eaf8ef}.r-view{border:0;background:#f0f5ff;color:#1d61cf;border-radius:9px;padding:8px 11px;font-size:12px;font-weight:800;display:flex;align-items:center;gap:5px;cursor:pointer}.r-view:hover{background:#e2edff}
        .r-insight-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:14px;margin-top:14px}.r-panel{border:1px solid var(--r-border);background:#fff;border-radius:17px;box-shadow:0 6px 20px rgba(24,49,78,.045);overflow:hidden}.r-panel-head{padding:17px 19px;border-bottom:1px solid #edf1f5;display:flex;justify-content:space-between;align-items:center}.r-panel-head h3{margin:0;font-size:14px}.r-panel-head p{margin:4px 0 0;font-size:11px;color:#7a8795}.r-panel-icon{width:34px;height:34px;border-radius:10px;background:#f0f5ff;color:#2563eb;display:grid;place-items:center}.r-panel-body{padding:4px 19px 9px}
        .r-energy-row{display:grid;grid-template-columns:1.4fr .7fr .7fr .7fr;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid #f0f3f6;font-size:12px}.r-energy-row:last-child{border-bottom:0}.r-energy-row.header{color:#8492a1;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding-top:12px}.r-energy-row strong{font-size:12px}.r-positive{color:#16834d;font-weight:800}.r-negative{color:#c2410c;font-weight:800}
        .r-list{padding:4px 0}.r-list-item{display:flex;align-items:flex-start;gap:11px;padding:13px 0;border-bottom:1px solid #f0f3f6}.r-list-item:last-child{border-bottom:0}.r-list-icon{width:32px;height:32px;flex:0 0 auto;border-radius:9px;background:#fff2df;color:#d97706;display:grid;place-items:center}.r-list-icon.recommendation{background:#fff3e8;color:#ea580c}.r-list-content{min-width:0;flex:1}.r-list-content strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.r-list-content p{margin:4px 0 0;color:#778595;font-size:11px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.r-list-content small{display:block;margin-top:5px;color:#9aa5b2;font-size:10px}.r-status{white-space:nowrap;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.035em}.r-danger{background:#fff0f0;color:#c62828}.r-warning{background:#fff7e6;color:#b76b00}.r-success{background:#ebf9f0;color:#16794a}.r-neutral{background:#f1f4f7;color:#687789}
        .r-bottom-panel{margin-top:14px}.r-empty{padding:32px 20px;text-align:center;color:#8996a5;font-size:12px}.r-empty svg{margin-bottom:7px;color:#a6b1bd}
        .r-loading{padding:55px 20px;text-align:center;border:1px solid var(--r-border);background:#fff;border-radius:17px;color:#738294}.r-loading h3{margin:13px 0 5px;color:#26384c;font-size:15px}.r-loading p{margin:0;font-size:12px}.spin{animation:rspin 1s linear infinite}@keyframes rspin{to{transform:rotate(360deg)}}
        .r-modal-overlay{position:fixed;inset:0;background:rgba(15,28,44,.52);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:24px;z-index:9999}.r-modal{width:min(720px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 25px 80px rgba(8,25,45,.25)}.r-modal-head{padding:22px 23px;border-bottom:1px solid #edf1f5;display:flex;justify-content:space-between;gap:20px}.r-modal-title{display:flex;gap:11px;align-items:center}.r-modal-title h2{margin:0;font-size:18px}.r-modal-head p{margin:7px 0 0;color:#778595;font-size:12px;line-height:1.5}.r-close{border:0;background:#f3f5f7;width:35px;height:35px;border-radius:10px;display:grid;place-items:center;color:#64748b;cursor:pointer}.r-modal-body{padding:20px 23px}.r-building-chip{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f7f9fb;border:1px solid #e9eef3;border-radius:11px;font-size:12px;font-weight:700;color:#455568}.r-modal-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.r-modal-metric{padding:13px 14px;border:1px solid #edf1f5;border-radius:12px;background:#fbfcfd}.r-modal-metric span{display:block;color:#8491a0;font-size:10px;text-transform:uppercase;font-weight:800;letter-spacing:.04em}.r-modal-metric strong{display:block;margin-top:6px;font-size:15px;color:#23364b}.r-preview{margin-top:18px;border-top:1px solid #edf1f5;padding-top:15px}.r-preview h3{font-size:12px;margin:0 0 9px}.r-preview-row{display:flex;justify-content:space-between;gap:15px;padding:9px 0;border-bottom:1px solid #f1f3f5;font-size:11px}.r-preview-row:last-child{border-bottom:0}.r-preview-row span{color:#718092}.r-preview-row strong{color:#25384d}.r-modal-foot{display:flex;justify-content:flex-end;gap:9px;padding:15px 23px;border-top:1px solid #edf1f5}.r-modal-foot button{border-radius:10px;padding:10px 14px;font-weight:750;font-size:12px;cursor:pointer;display:flex;gap:7px;align-items:center}.r-modal-secondary{background:#fff;border:1px solid #dfe6ed;color:#4d5d70}.r-modal-primary{background:#1769e0;border:1px solid #1769e0;color:#fff}
        @media(max-width:1200px){.r-kpis{grid-template-columns:repeat(3,1fr)}.r-toolbar{grid-template-columns:1fr 1fr}.r-refresh{width:auto}.r-report-grid{grid-template-columns:repeat(2,1fr)}.r-insight-grid{grid-template-columns:1fr}}
        @media(max-width:720px){.reports-page{padding:18px 14px 35px}.r-hero{padding:20px}.r-hero-main{display:block}.r-hero-actions{margin-top:18px}.r-toolbar{grid-template-columns:1fr}.r-kpis{grid-template-columns:1fr 1fr}.r-report-grid{grid-template-columns:1fr}.r-energy-row{grid-template-columns:1.2fr .7fr .7fr}.r-energy-row>*:last-child{display:none}.r-modal-metrics{grid-template-columns:1fr}}
      `}</style>

      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        <Topbar activePage={activePage} />

        <section className="reports-page">
          <div className="reports-shell">
            <div className="r-hero">
              <div className="r-hero-main">
                <div>
                  <div className="r-eyebrow">
                    <Sparkles size={14} /> Building Intelligence Center
                  </div>
                  <h1>Reports & Insights</h1>
                  <p>
                    A unified view of energy performance, occupancy, equipment health,
                    anomalies, forecasts and AI-generated recommendations.
                  </p>
                </div>
                <div className="r-hero-actions">
                  <button className="r-button" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
                  </button>
                  <button className="r-button primary" onClick={downloadPdf} disabled={loading}>
                    <Download size={16} /> Export PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="r-toolbar">
              <div className="r-control">
                <Building2 size={16} />
                <select
                  value={String(selectedBuildingId ?? "")}
                  onChange={(event) => setSelectedBuildingId(event.target.value || undefined)}
                >
                  {buildings.length === 0 && <option value="">No buildings available</option>}
                  {buildings.map((building) => (
                    <option key={String(building.id)} value={String(building.id)}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="r-control">
                <FileText size={16} />
                <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
                  <option>All Reports</option>
                  <option>Energy</option>
                  <option>Occupancy</option>
                  <option>Equipment</option>
                  <option>Anomalies</option>
                  <option>Forecast</option>
                  <option>Recommendations</option>
                </select>
              </div>

              <div className="r-control">
                <Search size={16} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search reports..."
                />
              </div>

              <button className="r-control r-refresh" onClick={handleRefresh} title="Refresh">
                <RefreshCw size={17} className={loading ? "spin" : ""} />
              </button>
            </div>

            {error && (
              <div className="r-error">
                <AlertTriangle size={17} /> {error}
              </div>
            )}

            <div className="r-kpis">
              <MetricCard label="Current Energy" value={`${formatNumber(currentEnergy, 1)} kWh`} detail="Latest consumption" icon={Zap} tone="blue" />
              <MetricCard label="Baseline" value={`${formatNumber(baselineEnergy, 1)} kWh`} detail="Expected consumption" icon={BarChart3} tone="violet" />
              <MetricCard label="Excess Energy" value={`${formatNumber(excessEnergy, 1)} kWh`} detail="Above baseline" icon={TrendingUp} tone="orange" trend={excessEnergy > 0 ? "up" : undefined} />
              <MetricCard label="Occupancy" value={formatNumber(occupancyValue)} detail="Current / average" icon={Users} tone="cyan" />
              <MetricCard label="Anomalies" value={formatNumber(anomalies.length)} detail={`${highSeverityAnomalies} high / critical`} icon={AlertTriangle} tone="amber" />
              <MetricCard label="Health Score" value={`${formatNumber(healthScore)}/100`} detail="Building health" icon={ShieldCheck} tone="green" />
            </div>

            <div className="r-section-head">
              <div>
                <h2>Intelligence Reports</h2>
                <p>{filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""} available for {selectedBuilding?.name ?? "the selected building"}</p>
              </div>
              <div className="r-date"><CalendarDays size={14} /> {new Date().toLocaleDateString()}</div>
            </div>

            {loading ? (
              <div className="r-loading">
                <RefreshCw size={28} className="spin" />
                <h3>Collecting building intelligence...</h3>
                <p>Synchronizing the latest energy, occupancy, anomaly and recommendation data.</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="r-panel r-empty">
                <FileText size={35} />
                <div>No reports match your current filters.</div>
              </div>
            ) : (
              <div className="r-report-grid">
                {filteredReports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <article className="r-report-card" key={report.id}>
                      <div className="r-report-top">
                        <div className={`r-metric-icon ${report.accent}`}><Icon size={20} /></div>
                        <span className="r-report-type">{report.type}</span>
                      </div>
                      <h3>{report.title}</h3>
                      <p>{report.description}</p>
                      <div className="r-report-foot">
                        <div className="r-live"><span className="r-live-dot" /> Live data</div>
                        <button className="r-view" onClick={() => setSelectedReport(report)}>
                          <Eye size={15} /> View report <ChevronRight size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="r-insight-grid">
              <section className="r-panel">
                <div className="r-panel-head">
                  <div><h3>Recent Energy Performance</h3><p>Latest readings compared with baseline</p></div>
                  <div className="r-panel-icon"><Zap size={17} /></div>
                </div>
                <div className="r-panel-body">
                  {energy.length === 0 ? (
                    <div className="r-empty">No energy readings available.</div>
                  ) : (
                    <>
                      <div className="r-energy-row header"><span>Time</span><span>Energy</span><span>Baseline</span><span>Variance</span></div>
                      {energy.slice(0, 7).map((item, index) => {
                        const actual = getEnergyValue(item);
                        const baseline = getBaselineValue(item);
                        const difference = actual - baseline;
                        return (
                          <div className="r-energy-row" key={index}>
                            <span>{formatDate(getTimeValue(item))}</span>
                            <strong>{formatNumber(actual, 2)} kWh</strong>
                            <span>{formatNumber(baseline, 2)} kWh</span>
                            <span className={difference > 0 ? "r-negative" : "r-positive"}>{difference > 0 ? "+" : ""}{formatNumber(difference, 2)} kWh</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </section>

              <section className="r-panel">
                <div className="r-panel-head">
                  <div><h3>AI Action Snapshot</h3><p>Recommendation workflow status</p></div>
                  <div className="r-panel-icon"><Lightbulb size={17} /></div>
                </div>
                <div className="r-panel-body">
                  {recommendations.length === 0 ? (
                    <div className="r-empty">No recommendations available.</div>
                  ) : (
                    <div className="r-list">
                      {recommendations.slice(0, 5).map((item, index) => {
                        const title = item.title ?? item.name ?? "AI Recommendation";
                        const priority = item.priority ?? "Normal";
                        const status = item.status ?? "Pending";
                        const savings = Number(item.estimated_savings ?? item.savings ?? 0);
                        return (
                          <div className="r-list-item" key={item.id ?? index}>
                            <div className="r-list-icon recommendation"><Lightbulb size={16} /></div>
                            <div className="r-list-content">
                              <strong>{title}</strong>
                              <p>{item.description ?? item.action ?? "Recommendation generated by the AI system."}</p>
                              {savings > 0 && <small>Estimated savings: {formatNumber(savings, 2)} {item.savings_unit ?? "kWh"}</small>}
                            </div>
                            <span className={getStatusClass(status === "Pending" ? priority : status)}>{status}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="r-insight-grid">
              <section className="r-panel">
                <div className="r-panel-head">
                  <div><h3>Detected Anomalies</h3><p>Issues requiring operational attention</p></div>
                  <div className="r-panel-icon"><AlertTriangle size={17} /></div>
                </div>
                <div className="r-panel-body">
                  {anomalies.length === 0 ? (
                    <div className="r-empty">No anomalies available.</div>
                  ) : (
                    <div className="r-list">
                      {anomalies.slice(0, 6).map((item, index) => {
                        const severity = item.severity ?? item.status ?? "Unknown";
                        return (
                          <div className="r-list-item" key={item.id ?? index}>
                            <div className="r-list-icon"><AlertTriangle size={16} /></div>
                            <div className="r-list-content">
                              <strong>{item.title ?? item.name ?? "Energy anomaly"}</strong>
                              <p>{item.description ?? item.message ?? "Anomaly detected by the monitoring system."}</p>
                              {(item.timestamp || item.detected_at) && <small>{formatDate(item.timestamp ?? item.detected_at)}</small>}
                            </div>
                            <span className={getStatusClass(severity)}>{severity}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="r-panel">
                <div className="r-panel-head">
                  <div><h3>Report Coverage</h3><p>Current intelligence availability</p></div>
                  <div className="r-panel-icon"><FileBarChart size={17} /></div>
                </div>
                <div className="r-panel-body">
                  <div className="r-list">
                    {[
                      ["Energy readings", energy.length, Zap],
                      ["Anomaly records", anomalies.length, AlertTriangle],
                      ["Recommendations", recommendations.length, Lightbulb],
                      ["Forecast records", forecastArray.length, TrendingUp],
                    ].map(([label, value, Icon], index) => {
                      const CoverageIcon = Icon as ComponentType<{ size?: number }>;
                      return (
                        <div className="r-list-item" key={index}>
                          <div className="r-list-icon recommendation"><CoverageIcon size={16} /></div>
                          <div className="r-list-content"><strong>{label as string}</strong><p>Available in the current reporting dataset.</p></div>
                          <span className="r-status r-success">{formatNumber(value as number)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>

            <div className="r-panel r-bottom-panel">
              <div className="r-panel-head">
                <div><h3>Report Generation Status</h3><p>Current building intelligence snapshot</p></div>
                <div className="r-live"><CheckCircle2 size={16} /> System ready</div>
              </div>
              <div className="r-panel-body" style={{ padding: "15px 19px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <div className="r-modal-metric"><span>Health</span><strong>{formatNumber(healthScore)}/100</strong></div>
                  <div className="r-modal-metric"><span>High Priority</span><strong>{formatNumber(highPriorityRecommendations)} actions</strong></div>
                  <div className="r-modal-metric"><span>Approved</span><strong>{formatNumber(approvedRecommendations)} actions</strong></div>
                  <div className="r-modal-metric"><span>Potential Savings</span><strong>{formatNumber(Math.max(estimatedSavings, potentialSavings), 1)} kWh</strong></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {selectedReport && (
        <div className="r-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="r-modal" onClick={(event) => event.stopPropagation()}>
            <div className="r-modal-head">
              <div>
                <div className="r-modal-title">
                  <SelectedReportIcon size={21} />
                  <h2>{selectedReport.title}</h2>
                </div>
                <p>{selectedReport.description}</p>
              </div>
              <button className="r-close" onClick={() => setSelectedReport(null)}><X size={18} /></button>
            </div>

            <div className="r-modal-body">
              <div className="r-building-chip"><Building2 size={15} /> {selectedBuilding?.name ?? "Selected Building"}</div>
              <div className="r-modal-metrics">
                {reportDetails.map(([label, value]) => (
                  <div className="r-modal-metric" key={label}>
                    <span>{label}</span><strong>{value}</strong>
                  </div>
                ))}
              </div>

              {selectedReport.id === "energy-performance" && energy.length > 0 && (
                <div className="r-preview">
                  <h3>Latest Energy Data</h3>
                  {energy.slice(0, 5).map((item, index) => (
                    <div className="r-preview-row" key={index}>
                      <span>{formatDate(getTimeValue(item))}</span>
                      <strong>{formatNumber(getEnergyValue(item), 2)} kWh</strong>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport.id === "anomaly-report" && anomalies.length > 0 && (
                <div className="r-preview">
                  <h3>Latest Anomalies</h3>
                  {anomalies.slice(0, 5).map((item, index) => (
                    <div className="r-preview-row" key={item.id ?? index}>
                      <span>{item.title ?? item.name ?? "Anomaly"}</span>
                      <strong>{item.severity ?? item.status ?? "Unknown"}</strong>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport.id === "recommendation-report" && recommendations.length > 0 && (
                <div className="r-preview">
                  <h3>Latest AI Recommendations</h3>
                  {recommendations.slice(0, 5).map((item, index) => (
                    <div className="r-preview-row" key={item.id ?? index}>
                      <span>{item.title ?? item.name ?? "Recommendation"}</span>
                      <strong>{item.status ?? item.priority ?? "Pending"}</strong>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport.id === "forecast-report" && forecastArray.length > 0 && (
                <div className="r-preview">
                  <h3>Latest Forecast Records</h3>
                  {forecastArray.slice(0, 5).map((item, index) => (
                    <div className="r-preview-row" key={index}>
                      <span>{getTimeValue(item) || `Forecast ${index + 1}`}</span>
                      <strong>{formatNumber(item.energy ?? item.forecast ?? item.predicted ?? item.value ?? 0, 2)}</strong>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport.id === "occupancy-analysis" && (
                <div className="r-preview">
                  <h3>Occupancy Summary</h3>
                  <div className="r-preview-row"><span>Current / average occupancy</span><strong>{formatNumber(occupancyValue)} people</strong></div>
                  <div className="r-preview-row"><span>Energy relationship</span><strong>Available through occupancy analytics</strong></div>
                </div>
              )}

              {selectedReport.id === "equipment-monitoring" && (
                <div className="r-preview">
                  <h3>Equipment Monitoring</h3>
                  <div className="r-preview-row"><span>Building</span><strong>{selectedBuilding?.name ?? "Selected Building"}</strong></div>
                  <div className="r-preview-row"><span>Monitoring source</span><strong>Equipment monitoring API</strong></div>
                </div>
              )}
            </div>

            <div className="r-modal-foot">
              <button className="r-modal-secondary" onClick={() => setSelectedReport(null)}>Close</button>
              <button className="r-modal-primary" onClick={downloadPdf}><Download size={15} /> Export Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
