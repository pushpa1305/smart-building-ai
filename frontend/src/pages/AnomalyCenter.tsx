import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Cpu,
  Filter,
  Gauge,
  Lightbulb,
  RefreshCw,
  Search,
  ShieldAlert,
  Thermometer,
  UserCheck,
  X,
  Zap,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

type Severity = "Critical" | "High" | "Medium" | "Low";
type AnomalyStatus = "Open" | "Acknowledged" | "Resolved";

interface Anomaly {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: AnomalyStatus;
  category: string;
  location: string;
  floor: string;
  detectedAt: string;
  duration: string;
  value: string;
  expected: string;
  deviation: string;
  confidence: number;
  source: string;
  recommendation: string;
  estimatedSaving: number;
}

interface AnomalyApiRecord {
  id?: number | string;
  anomaly_id?: number | string;
  anomalyId?: number | string;

  title?: string;
  name?: string;

  description?: string;
  details?: string;
  message?: string;

  severity?: string;
  priority?: string;

  status?: string;

  category?: string;
  type?: string;

  location?: string;
  zone?: string;
  floor?: string;

  detected_at?: string;
  detectedAt?: string;
  created_at?: string;
  createdAt?: string;
  timestamp?: string;

  duration?: string;

  value?: string | number;
  observed_value?: string | number;
  observedValue?: string | number;

  expected?: string | number;
  expected_value?: string | number;
  expectedValue?: string | number;

  deviation?: string | number;

  confidence?: number | string;
  ai_confidence?: number | string;
  aiConfidence?: number | string;

  source?: string;
  agent?: string;
  detected_by?: string;
  detectedBy?: string;

  recommendation?: string;
  recommended_action?: string;
  recommendedAction?: string;

  estimated_saving?: number | string;
  estimatedSaving?: number | string;
  estimated_savings?: number | string;
  estimatedSavings?: number | string;

  equipment?: string;
  equipment_name?: string;
  equipmentName?: string;
}

interface AnomalyApiResponse {
  anomalies?: AnomalyApiRecord[];
  data?: AnomalyApiRecord[];
  results?: AnomalyApiRecord[];

  total?: number;
  healthScore?: number;
  health_score?: number;

  detectionConfidence?: number;
  detection_confidence?: number;

  dataStreams?: number;
  data_streams?: number;

  lastScan?: string;
  last_scan?: string;

  potentialSaving?: number;
  potential_saving?: number;
}

interface Building {
  id: number;
  name: string;
  location?: string;
}

const severityOrder: Severity[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

const toArray = <T,>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : [];
};

const numberValue = (
  value: unknown,
  fallback = 0
): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(
      value.replace(/[^0-9.-]/g, "")
    );

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

const stringValue = (
  value: unknown,
  fallback = "—"
): string => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
};

const normalizeSeverity = (
  value: unknown
): Severity => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";

  return "Low";
};

const normalizeStatus = (
  value: unknown
): AnomalyStatus => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "acknowledged" ||
    normalized === "ack"
  ) {
    return "Acknowledged";
  }

  if (
    normalized === "resolved" ||
    normalized === "closed"
  ) {
    return "Resolved";
  }

  return "Open";
};

const formatDateTime = (value: unknown): string => {
  if (!value) return "—";

  const raw = String(value);

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeAnomaly = (
  record: AnomalyApiRecord
): Anomaly => {
  const rawId =
    record.id ??
    record.anomaly_id ??
    record.anomalyId ??
    `ANM-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

  const numericId =
    typeof rawId === "number"
      ? rawId
      : Number(rawId);

  const displayId =
    Number.isFinite(numericId) &&
    String(rawId).trim() !== ""
      ? `ANM-${String(numericId).padStart(3, "0")}`
      : String(rawId);

  return {
    id: displayId,

    title: stringValue(
      record.title ?? record.name,
      "Unnamed anomaly"
    ),

    description: stringValue(
      record.description ??
        record.details ??
        record.message,
      "No anomaly description available."
    ),

    severity: normalizeSeverity(
      record.severity ?? record.priority
    ),

    status: normalizeStatus(record.status),

    category: stringValue(
      record.category ?? record.type,
      "General"
    ),

    location: stringValue(
      record.location ?? record.zone,
      "Unknown location"
    ),

    floor: stringValue(
      record.floor,
      "Unknown floor"
    ),

    detectedAt: formatDateTime(
      record.detected_at ??
        record.detectedAt ??
        record.created_at ??
        record.createdAt ??
        record.timestamp
    ),

    duration: stringValue(
      record.duration,
      "—"
    ),

    value: stringValue(
      record.value ??
        record.observed_value ??
        record.observedValue,
      "—"
    ),

    expected: stringValue(
      record.expected ??
        record.expected_value ??
        record.expectedValue,
      "—"
    ),

    deviation: stringValue(
      record.deviation,
      "—"
    ),

    confidence: Math.max(
      0,
      Math.min(
        100,
        numberValue(
          record.confidence ??
            record.ai_confidence ??
            record.aiConfidence
        )
      )
    ),

    source: stringValue(
      record.source ??
        record.agent ??
        record.detected_by ??
        record.detectedBy,
      "Anomaly Detection Engine"
    ),

    recommendation: stringValue(
      record.recommendation ??
        record.recommended_action ??
        record.recommendedAction,
      "Review the affected condition and validate the related telemetry."
    ),

    estimatedSaving: Math.max(
      0,
      numberValue(
        record.estimated_saving ??
          record.estimatedSaving ??
          record.estimated_savings ??
          record.estimatedSavings
      )
    ),
  };
};

export default function AnomalyCenter() {
  const [activePage, setActivePage] =
    useState("Anomaly Center");

  const [anomalies, setAnomalies] =
    useState<Anomaly[]>([]);

  const [buildings, setBuildings] =
    useState<Building[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] =
    useState<number | null>(null);

  const [severityFilter, setSeverityFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [floorFilter, setFloorFilter] =
    useState("All Floors");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedAnomaly, setSelectedAnomaly] =
    useState<Anomaly | null>(null);

  const [showAIAnalysis, setShowAIAnalysis] =
    useState(false);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [toast, setToast] =
    useState("");

  const [error, setError] =
    useState("");

  const [selectedForBulkAction, setSelectedForBulkAction] =
    useState<string[]>([]);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [backendHealthScore, setBackendHealthScore] =
    useState<number | null>(null);

  const [backendConfidence, setBackendConfidence] =
    useState<number | null>(null);

  const [backendDataStreams, setBackendDataStreams] =
    useState<number | null>(null);

  const [backendLastScan, setBackendLastScan] =
    useState<string>("");

  const showToast = useCallback(
    (message: string) => {
      setToast(message);

      window.setTimeout(() => {
        setToast("");
      }, 3500);
    },
    []
  );

  const fetchJson = useCallback(
    async <T,>(
      url: string,
      options?: RequestInit
    ): Promise<T> => {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
        ...options,
      });

      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;

        try {
          const errorData = await response.json();

          if (errorData?.error) {
            message = errorData.error;
          } else if (errorData?.message) {
            message = errorData.message;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      return response.json();
    },
    []
  );

  const loadBuildings = useCallback(async () => {
    const response = await fetchJson<
      Building[] | { buildings?: Building[] }
    >(`${API_BASE_URL}/api/buildings`);

    const buildingList = Array.isArray(response)
      ? response
      : toArray<Building>(
          response?.buildings
        );

    setBuildings(buildingList);

    setSelectedBuildingId((current) => {
      if (current !== null) {
        const exists = buildingList.some(
          (building) => building.id === current
        );

        if (exists) {
          return current;
        }
      }

      return buildingList[0]?.id ?? null;
    });

    return buildingList;
  }, [fetchJson]);

  const loadAnomalies = useCallback(
    async (buildingId?: number | null) => {
      const query =
        buildingId !== null &&
        buildingId !== undefined
          ? `?building_id=${buildingId}`
          : "";

      const response =
        await fetchJson<AnomalyApiResponse | AnomalyApiRecord[]>(
          `${API_BASE_URL}/api/anomalies${query}`
        );

      let records: AnomalyApiRecord[] = [];

      if (Array.isArray(response)) {
        records = response;
      } else {
        records = toArray<AnomalyApiRecord>(
          response?.anomalies ??
            response?.data ??
            response?.results
        );

        if (
          response?.healthScore !== undefined ||
          response?.health_score !== undefined
        ) {
          setBackendHealthScore(
            numberValue(
              response.healthScore ??
                response.health_score
            )
          );
        }

        if (
          response?.detectionConfidence !==
            undefined ||
          response?.detection_confidence !==
            undefined
        ) {
          setBackendConfidence(
            numberValue(
              response.detectionConfidence ??
                response.detection_confidence
            )
          );
        }

        if (
          response?.dataStreams !== undefined ||
          response?.data_streams !== undefined
        ) {
          setBackendDataStreams(
            numberValue(
              response.dataStreams ??
                response.data_streams
            )
          );
        }

        if (
          response?.lastScan !== undefined ||
          response?.last_scan !== undefined
        ) {
          setBackendLastScan(
            stringValue(
              response.lastScan ??
                response.last_scan
            )
          );
        }
      }

      const normalized = records.map(
        normalizeAnomaly
      );

      setAnomalies(normalized);
      setLastUpdated(new Date());

      return normalized;
    },
    [fetchJson]
  );

  const loadAllData = useCallback(
    async (buildingId?: number | null) => {
      setError("");

      try {
        await loadAnomalies(buildingId);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load anomaly data.";

        setError(message);
        setAnomalies([]);
      }
    },
    [loadAnomalies]
  );

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setIsLoading(true);

      try {
        const buildingList =
          await loadBuildings();

        if (!mounted) return;

        const firstBuilding =
          buildingList[0]?.id ?? null;

        setSelectedBuildingId(
          firstBuilding
        );

        await loadAllData(firstBuilding);
      } catch (err) {
        if (!mounted) return;

        const message =
          err instanceof Error
            ? err.message
            : "Unable to connect to the backend.";

        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadBuildings, loadAllData]);

  useEffect(() => {
    if (selectedBuildingId === null) {
      return;
    }

    loadAllData(selectedBuildingId);
  }, [selectedBuildingId, loadAllData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isRefreshing) {
        loadAllData(selectedBuildingId);
      }
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    loadAllData,
    selectedBuildingId,
    isRefreshing,
  ]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        anomalies
          .map((anomaly) => anomaly.category)
          .filter(Boolean)
      )
    ).sort();
  }, [anomalies]);

  const floors = useMemo(() => {
    return Array.from(
      new Set(
        anomalies
          .map((anomaly) => anomaly.floor)
          .filter(
            (floor) =>
              floor &&
              floor !== "Unknown floor"
          )
      )
    ).sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
      })
    );
  }, [anomalies]);

  const filteredAnomalies = useMemo(() => {
    const query =
      searchTerm.trim().toLowerCase();

    return anomalies.filter((anomaly) => {
      const severityMatch =
        severityFilter === "All" ||
        anomaly.severity === severityFilter;

      const statusMatch =
        statusFilter === "All" ||
        anomaly.status === statusFilter;

      const categoryMatch =
        categoryFilter === "All" ||
        anomaly.category === categoryFilter;

      const floorMatch =
        floorFilter === "All Floors" ||
        anomaly.floor === floorFilter;

      const searchMatch =
        !query ||
        anomaly.title
          .toLowerCase()
          .includes(query) ||
        anomaly.description
          .toLowerCase()
          .includes(query) ||
        anomaly.location
          .toLowerCase()
          .includes(query) ||
        anomaly.id
          .toLowerCase()
          .includes(query);

      return (
        severityMatch &&
        statusMatch &&
        categoryMatch &&
        floorMatch &&
        searchMatch
      );
    });
  }, [
    anomalies,
    severityFilter,
    statusFilter,
    categoryFilter,
    floorFilter,
    searchTerm,
  ]);

  const criticalCount = anomalies.filter(
    (a) =>
      a.severity === "Critical" &&
      a.status !== "Resolved"
  ).length;

  const highCount = anomalies.filter(
    (a) =>
      a.severity === "High" &&
      a.status !== "Resolved"
  ).length;

  const mediumCount = anomalies.filter(
    (a) =>
      a.severity === "Medium" &&
      a.status !== "Resolved"
  ).length;

  const lowCount = anomalies.filter(
    (a) =>
      a.severity === "Low" &&
      a.status !== "Resolved"
  ).length;

  const openCount = anomalies.filter(
    (a) => a.status === "Open"
  ).length;

  const acknowledgedCount = anomalies.filter(
    (a) => a.status === "Acknowledged"
  ).length;

  const resolvedCount = anomalies.filter(
    (a) => a.status === "Resolved"
  ).length;

  const unresolvedAnomalies = useMemo(
    () =>
      anomalies.filter(
        (a) => a.status !== "Resolved"
      ),
    [anomalies]
  );

  const totalPotentialSaving = useMemo(() => {
    return unresolvedAnomalies.reduce(
      (sum, anomaly) =>
        sum + anomaly.estimatedSaving,
      0
    );
  }, [unresolvedAnomalies]);

  const calculatedConfidence = useMemo(() => {
    const values = anomalies
      .map((a) => a.confidence)
      .filter((value) => value > 0);

    if (values.length === 0) {
      return null;
    }

    return (
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length
    );
  }, [anomalies]);

  const detectionConfidence =
    backendConfidence !== null
      ? backendConfidence
      : calculatedConfidence;

  const calculatedHealthScore = useMemo(() => {
    if (anomalies.length === 0) {
      return null;
    }

    const severityPenalty =
      criticalCount * 20 +
      highCount * 10 +
      mediumCount * 5 +
      lowCount * 2;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            (severityPenalty /
              Math.max(
                anomalies.length,
                1
              ))
        )
      )
    );
  }, [
    anomalies.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
  ]);

  const healthScore =
    backendHealthScore !== null
      ? backendHealthScore
      : calculatedHealthScore;

  const healthLabel =
    healthScore === null
      ? "No data"
      : healthScore >= 90
      ? "Excellent"
      : healthScore >= 75
      ? "Good"
      : healthScore >= 60
      ? "Needs attention"
      : "Critical";

  const patternData = useMemo(() => {
    const energy = anomalies.filter(
      (a) =>
        a.category.toLowerCase() ===
        "energy"
    );

    const hvac = anomalies.filter(
      (a) =>
        a.category.toLowerCase() ===
        "hvac"
    );

    const lighting = anomalies.filter(
      (a) =>
        a.category.toLowerCase() ===
        "lighting"
    );

    return {
      energy,
      hvac,
      lighting,
    };
  }, [anomalies]);

  const primaryFinding = useMemo(() => {
    if (criticalCount > 0) {
      return anomalies.find(
        (a) =>
          a.severity === "Critical" &&
          a.status !== "Resolved"
      );
    }

    if (highCount > 0) {
      return anomalies.find(
        (a) =>
          a.severity === "High" &&
          a.status !== "Resolved"
      );
    }

    return unresolvedAnomalies[0];
  }, [
    anomalies,
    criticalCount,
    highCount,
    unresolvedAnomalies,
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await loadAllData(
        selectedBuildingId
      );

      showToast(
        "Anomaly data refreshed successfully."
      );
    } catch {
      showToast(
        "Unable to refresh anomaly data."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateAnomalyStatus = async (
    id: string,
    status: AnomalyStatus
  ) => {
    const existing = anomalies.find(
      (a) => a.id === id
    );

    if (!existing) {
      return;
    }

    const backendId = id.startsWith("ANM-")
      ? id.replace("ANM-", "")
      : id;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/anomalies/${backendId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        let message =
          "Unable to update anomaly status.";

        try {
          const data =
            await response.json();

          message =
            data?.error ||
            data?.message ||
            message;
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      setAnomalies((current) =>
        current.map((anomaly) =>
          anomaly.id === id
            ? {
                ...anomaly,
                status,
              }
            : anomaly
        )
      );

      if (
        selectedAnomaly?.id === id
      ) {
        setSelectedAnomaly({
          ...existing,
          status,
        });
      }

      if (status === "Acknowledged") {
        showToast(
          `${id} has been acknowledged.`
        );
      }

      if (status === "Resolved") {
        showToast(
          `${id} marked as resolved.`
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to update anomaly.";

      showToast(message);
    }
  };

  const handleEscalate = (
    anomaly: Anomaly
  ) => {
    showToast(
      `${anomaly.id} escalation requires facility-manager action.`
    );
  };

  const toggleBulkSelection = (
    id: string
  ) => {
    setSelectedForBulkAction(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) => item !== id
            )
          : [...current, id]
    );
  };

  const handleBulkAcknowledge = async () => {
    if (
      selectedForBulkAction.length === 0
    ) {
      showToast(
        "Select at least one anomaly."
      );
      return;
    }

    const selectable = anomalies.filter(
      (anomaly) =>
        selectedForBulkAction.includes(
          anomaly.id
        ) &&
        anomaly.status !== "Resolved"
    );

    if (selectable.length === 0) {
      showToast(
        "No unresolved anomalies selected."
      );
      return;
    }

    try {
      await Promise.all(
        selectable.map((anomaly) =>
          updateAnomalyStatus(
            anomaly.id,
            "Acknowledged"
          )
        )
      );

      setSelectedForBulkAction([]);

      showToast(
        `${selectable.length} anomalies acknowledged.`
      );
    } catch {
      showToast(
        "Some anomalies could not be updated."
      );
    }
  };

  const handleSelectAll = () => {
    if (
      filteredAnomalies.length === 0
    ) {
      return;
    }

    const allSelected =
      filteredAnomalies.every((anomaly) =>
        selectedForBulkAction.includes(
          anomaly.id
        )
      );

    if (allSelected) {
      setSelectedForBulkAction([]);
    } else {
      setSelectedForBulkAction(
        filteredAnomalies.map(
          (anomaly) => anomaly.id
        )
      );
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSeverityFilter("All");
    setStatusFilter("All");
    setCategoryFilter("All");
    setFloorFilter("All Floors");
  };

  const severityClass = (
    severity: Severity
  ) => {
    return `anomaly-severity ${severity.toLowerCase()}`;
  };

  const statusClass = (
    status: AnomalyStatus
  ) => {
    return `anomaly-status ${status.toLowerCase()}`;
  };

  const selectedBuilding =
    buildings.find(
      (building) =>
        building.id === selectedBuildingId
    );

  const isAllSelected =
    filteredAnomalies.length > 0 &&
    filteredAnomalies.every((anomaly) =>
      selectedForBulkAction.includes(
        anomaly.id
      )
    );

  return (
    <div className="app-layout anomaly-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content anomaly-main">
        <Topbar activePage={activePage} />

        <div className="anomaly-page">
          {/* PAGE HEADER */}
          <section className="anomaly-header">
            <div>
              <div className="anomaly-breadcrumb">
                Facility Intelligence
                <span>/</span>
                Anomaly Center
              </div>

              <div className="anomaly-title-row">
                <div className="anomaly-title-icon">
                  <ShieldAlert size={24} />
                </div>

                <div>
                  <h1>Anomaly Center</h1>
                  <p>
                    Detect, investigate and manage
                    abnormal building conditions
                    using AI.
                  </p>
                </div>
              </div>
            </div>

            <div className="anomaly-header-actions">
              <button
                className="anomaly-refresh-btn"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  size={16}
                  className={
                    isRefreshing
                      ? "anomaly-spin"
                      : ""
                  }
                />

                {isRefreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

              <button
                className="anomaly-ai-btn"
                onClick={() =>
                  setShowAIAnalysis(true)
                }
              >
                <BrainCircuit size={17} />
                AI Analysis
              </button>
            </div>
          </section>

          {/* BUILDING SELECTOR */}
          {buildings.length > 0 && (
            <section
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginBottom: "14px",
              }}
            >
              <div className="anomaly-select">
                <select
                  value={
                    selectedBuildingId ?? ""
                  }
                  onChange={(e) =>
                    setSelectedBuildingId(
                      e.target.value
                        ? Number(
                            e.target.value
                          )
                        : null
                    )
                  }
                >
                  {buildings.map(
                    (building) => (
                      <option
                        key={building.id}
                        value={
                          building.id
                        }
                      >
                        {building.name}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown size={14} />
              </div>
            </section>
          )}

          {/* ERROR */}
          {error && (
            <section
              style={{
                padding: "14px 18px",
                marginBottom: "16px",
                borderRadius: "12px",
                border:
                  "1px solid rgba(239,68,68,.25)",
                background:
                  "rgba(239,68,68,.07)",
                color: "#b91c1c",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <AlertTriangle size={17} />

              <span>
                {error}
              </span>
            </section>
          )}

          {/* AI STATUS BAR */}
          <section className="anomaly-ai-status">
            <div className="anomaly-ai-status-left">
              <div className="ai-pulse">
                <BrainCircuit size={18} />
              </div>

              <div>
                <strong>
                  AI Anomaly Detection Engine Active
                </strong>

                <span>
                  Monitoring energy, HVAC,
                  occupancy, lighting and sensor
                  telemetry
                </span>
              </div>
            </div>

            <div className="anomaly-ai-status-right">
              <div>
                <span>
                  Detection confidence
                </span>

                <strong>
                  {detectionConfidence !==
                  null
                    ? `${detectionConfidence.toFixed(
                        1
                      )}%`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Data streams</span>

                <strong>
                  {backendDataStreams !==
                  null
                    ? backendDataStreams
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Last scan</span>

                <strong>
                  {backendLastScan ||
                    (lastUpdated
                      ? lastUpdated.toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute:
                              "2-digit",
                            second:
                              "2-digit",
                          }
                        )
                      : "—")}
                </strong>
              </div>
            </div>
          </section>

          {/* SEVERITY SUMMARY */}
          <section className="severity-grid">
            <div className="severity-card critical-card">
              <div className="severity-card-top">
                <div className="severity-icon critical-icon">
                  <AlertCircle size={20} />
                </div>

                <span className="severity-live-dot"></span>
              </div>

              <span className="severity-label">
                Critical
              </span>

              <strong>{criticalCount}</strong>

              <p>Immediate attention</p>
            </div>

            <div className="severity-card high-card">
              <div className="severity-card-top">
                <div className="severity-icon high-icon">
                  <AlertTriangle size={20} />
                </div>
              </div>

              <span className="severity-label">
                High
              </span>

              <strong>{highCount}</strong>

              <p>Requires investigation</p>
            </div>

            <div className="severity-card medium-card">
              <div className="severity-card-top">
                <div className="severity-icon medium-icon">
                  <Activity size={20} />
                </div>
              </div>

              <span className="severity-label">
                Medium
              </span>

              <strong>{mediumCount}</strong>

              <p>Monitor condition</p>
            </div>

            <div className="severity-card low-card">
              <div className="severity-card-top">
                <div className="severity-icon low-icon">
                  <CheckCircle2 size={20} />
                </div>
              </div>

              <span className="severity-label">
                Low
              </span>

              <strong>{lowCount}</strong>

              <p>Low operational impact</p>
            </div>

            <div className="anomaly-overview-card">
              <div className="overview-icon">
                <Gauge size={21} />
              </div>

              <div>
                <span>
                  Potential avoidable energy
                </span>

                <strong>
                  {totalPotentialSaving >
                  0
                    ? `${totalPotentialSaving.toLocaleString()} kWh/day`
                    : "No data"}
                </strong>

                <small>
                  Across unresolved anomalies
                </small>
              </div>
            </div>
          </section>

          {/* STATUS SUMMARY */}
          <section className="anomaly-status-summary">
            <div>
              <span className="status-summary-dot open"></span>

              <strong>
                {openCount}
              </strong>

              <span>Open</span>
            </div>

            <div>
              <span className="status-summary-dot acknowledged"></span>

              <strong>
                {acknowledgedCount}
              </strong>

              <span>Acknowledged</span>
            </div>

            <div>
              <span className="status-summary-dot resolved"></span>

              <strong>
                {resolvedCount}
              </strong>

              <span>Resolved</span>
            </div>

            <div className="status-summary-message">
              <Zap size={15} />

              AI has identified{" "}
              {anomalies.length} anomalies
              from current telemetry
              {selectedBuilding
                ? ` in ${selectedBuilding.name}`
                : "."}
            </div>
          </section>

          {/* FILTER BAR */}
          <section className="anomaly-filter-bar">
            <div className="filter-heading">
              <Filter size={17} />

              <strong>
                Anomaly Queue
              </strong>

              <span>
                {filteredAnomalies.length} results
              </span>
            </div>

            <div className="anomaly-filters">
              <div className="anomaly-search">
                <Search size={16} />

                <input
                  type="text"
                  placeholder="Search anomaly..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="anomaly-select">
                <select
                  value={severityFilter}
                  onChange={(e) =>
                    setSeverityFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="All">
                    All Severity
                  </option>

                  {severityOrder.map(
                    (severity) => (
                      <option
                        key={severity}
                        value={severity}
                      >
                        {severity}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown size={14} />
              </div>

              <div className="anomaly-select">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="All">
                    All Status
                  </option>

                  <option value="Open">
                    Open
                  </option>

                  <option value="Acknowledged">
                    Acknowledged
                  </option>

                  <option value="Resolved">
                    Resolved
                  </option>
                </select>

                <ChevronDown size={14} />
              </div>

              <div className="anomaly-select">
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="All">
                    All Categories
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown size={14} />
              </div>

              <div className="anomaly-select">
                <select
                  value={floorFilter}
                  onChange={(e) =>
                    setFloorFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="All Floors">
                    All Floors
                  </option>

                  {floors.map((floor) => (
                    <option
                      key={floor}
                      value={floor}
                    >
                      {floor}
                    </option>
                  ))}
                </select>

                <ChevronDown size={14} />
              </div>
            </div>
          </section>

          {/* LOADING */}
          {isLoading && (
            <section
              style={{
                padding: "50px 20px",
                textAlign: "center",
              }}
            >
              <RefreshCw
                size={30}
                className="anomaly-spin"
              />

              <p>
                Loading anomaly telemetry...
              </p>
            </section>
          )}

          {!isLoading && (
            <>
              {/* BULK ACTION BAR */}
              <section className="bulk-action-bar">
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={
                      handleSelectAll
                    }
                  />

                  <span></span>

                  Select all
                </label>

                {selectedForBulkAction.length >
                  0 && (
                  <>
                    <span className="selected-count">
                      {
                        selectedForBulkAction.length
                      }{" "}
                      selected
                    </span>

                    <button
                      className="bulk-acknowledge"
                      onClick={
                        handleBulkAcknowledge
                      }
                    >
                      <UserCheck size={14} />
                      Acknowledge Selected
                    </button>
                  </>
                )}

                <div className="bulk-right">
                  Showing{" "}
                  <strong>
                    {
                      filteredAnomalies.length
                    }
                  </strong>{" "}
                  of {anomalies.length}{" "}
                  anomalies
                </div>
              </section>

              {/* ANOMALY LIST */}
              <section className="anomaly-list">
                {filteredAnomalies.map(
                  (anomaly) => (
                    <article
                      className={`anomaly-item ${anomaly.severity.toLowerCase()}-item`}
                      key={anomaly.id}
                    >
                      <div className="anomaly-select-column">
                        <label className="custom-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedForBulkAction.includes(
                              anomaly.id
                            )}
                            onChange={() =>
                              toggleBulkSelection(
                                anomaly.id
                              )
                            }
                          />

                          <span></span>
                        </label>
                      </div>

                      <div className="anomaly-severity-column">
                        <div
                          className={`large-severity-icon ${anomaly.severity.toLowerCase()}`}
                        >
                          {anomaly.severity ===
                            "Critical" && (
                            <AlertCircle
                              size={22}
                            />
                          )}

                          {anomaly.severity ===
                            "High" && (
                            <AlertTriangle
                              size={22}
                            />
                          )}

                          {anomaly.severity ===
                            "Medium" && (
                            <Activity
                              size={22}
                            />
                          )}

                          {anomaly.severity ===
                            "Low" && (
                            <CheckCircle2
                              size={22}
                            />
                          )}
                        </div>
                      </div>

                      <div className="anomaly-main-info">
                        <div className="anomaly-item-title">
                          <h3>
                            {anomaly.title}
                          </h3>

                          <span
                            className={severityClass(
                              anomaly.severity
                            )}
                          >
                            {anomaly.severity}
                          </span>

                          <span
                            className={statusClass(
                              anomaly.status
                            )}
                          >
                            {anomaly.status}
                          </span>
                        </div>

                        <p>
                          {
                            anomaly.description
                          }
                        </p>

                        <div className="anomaly-meta">
                          <span>
                            <Cpu size={13} />
                            {anomaly.id}
                          </span>

                          <span>
                            <Activity size={13} />
                            {
                              anomaly.category
                            }
                          </span>

                          <span>
                            <Thermometer
                              size={13}
                            />
                            {
                              anomaly.location
                            }
                          </span>

                          <span>
                            <Clock3
                              size={13}
                            />
                            {
                              anomaly.detectedAt
                            }
                          </span>
                        </div>

                        <div className="anomaly-agent">
                          <BrainCircuit
                            size={14}
                          />

                          <span>
                            Detected by{" "}
                            <strong>
                              {
                                anomaly.source
                              }
                            </strong>
                          </span>

                          {anomaly.confidence >
                            0 && (
                            <span className="confidence">
                              {anomaly.confidence.toFixed(
                                0
                              )}
                              % confidence
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="anomaly-reading">
                        <span>
                          Observed
                        </span>

                        <strong>
                          {anomaly.value}
                        </strong>

                        <small>
                          Expected:{" "}
                          {
                            anomaly.expected
                          }
                        </small>

                        <div
                          className={`deviation ${
                            anomaly.deviation.startsWith(
                              "-"
                            )
                              ? "deviation-good"
                              : "deviation-bad"
                          }`}
                        >
                          {anomaly.deviation.startsWith(
                            "-"
                          ) ? (
                            <ArrowDownRight
                              size={13}
                            />
                          ) : (
                            <ArrowUpRight
                              size={13}
                            />
                          )}

                          {
                            anomaly.deviation
                          }
                        </div>
                      </div>

                      <div className="anomaly-actions">
                        <button
                          className="details-btn"
                          onClick={() =>
                            setSelectedAnomaly(
                              anomaly
                            )
                          }
                        >
                          View Details
                        </button>

                        {anomaly.status ===
                          "Open" && (
                          <button
                            className="ack-btn"
                            onClick={() =>
                              updateAnomalyStatus(
                                anomaly.id,
                                "Acknowledged"
                              )
                            }
                          >
                            <UserCheck
                              size={14}
                            />
                            Acknowledge
                          </button>
                        )}

                        {anomaly.status ===
                          "Acknowledged" && (
                          <button
                            className="resolve-btn"
                            onClick={() =>
                              updateAnomalyStatus(
                                anomaly.id,
                                "Resolved"
                              )
                            }
                          >
                            <CheckCircle2
                              size={14}
                            />
                            Resolve
                          </button>
                        )}
                      </div>
                    </article>
                  )
                )}

                {filteredAnomalies.length ===
                  0 && (
                  <div className="anomaly-empty">
                    <div>
                      <Search size={28} />
                    </div>

                    <h3>
                      No anomalies found
                    </h3>

                    <p>
                      {anomalies.length ===
                      0
                        ? "No anomaly records are currently available from the backend."
                        : "Try changing the filters or search term."}
                    </p>

                    <button
                      onClick={
                        clearFilters
                      }
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {/* BOTTOM AI INSIGHTS */}
          <section className="anomaly-bottom-grid">
            <div className="anomaly-pattern-card">
              <div className="bottom-card-header">
                <div>
                  <h3>
                    Detected Patterns
                  </h3>

                  <p>
                    Patterns identified across
                    current anomalies
                  </p>
                </div>

                <BrainCircuit size={20} />
              </div>

              <div className="pattern-list">
                <div className="pattern-row">
                  <div className="pattern-icon energy">
                    <Zap size={16} />
                  </div>

                  <div>
                    <strong>
                      Energy consumption anomaly
                    </strong>

                    <span>
                      {patternData.energy.length >
                      0
                        ? `${patternData.energy.length} energy-related anomaly${
                            patternData.energy.length >
                            1
                              ? "ies"
                              : "y"
                          } detected from backend telemetry.`
                        : "No energy anomaly data available."}
                    </span>
                  </div>

                  <b>
                    {
                      patternData.energy
                        .length
                    }
                  </b>
                </div>

                <div className="pattern-row">
                  <div className="pattern-icon hvac">
                    <Thermometer
                      size={16}
                    />
                  </div>

                  <div>
                    <strong>
                      HVAC occupancy mismatch
                    </strong>

                    <span>
                      {patternData.hvac.length >
                      0
                        ? `${patternData.hvac.length} HVAC-related anomaly${
                            patternData.hvac.length >
                            1
                              ? "ies"
                              : "y"
                          } detected.`
                        : "No HVAC anomaly data available."}
                    </span>
                  </div>

                  <b>
                    {
                      patternData.hvac.length
                    }
                  </b>
                </div>

                <div className="pattern-row">
                  <div className="pattern-icon lighting">
                    <Lightbulb
                      size={16}
                    />
                  </div>

                  <div>
                    <strong>
                      Lighting schedule deviation
                    </strong>

                    <span>
                      {patternData.lighting
                        .length > 0
                        ? `${patternData.lighting.length} lighting-related anomaly${
                            patternData
                              .lighting
                              .length >
                            1
                              ? "ies"
                              : "y"
                          } detected.`
                        : "No lighting anomaly data available."}
                    </span>
                  </div>

                  <b>
                    {
                      patternData.lighting
                        .length
                    }
                  </b>
                </div>
              </div>
            </div>

            <div className="anomaly-health-card">
              <div className="bottom-card-header">
                <div>
                  <h3>
                    Building Anomaly Health
                  </h3>

                  <p>
                    Overall operational
                    stability
                  </p>
                </div>

                <Gauge size={20} />
              </div>

              <div className="anomaly-health-score">
                <div className="health-ring">
                  <strong>
                    {healthScore !==
                    null
                      ? Math.round(
                          healthScore
                        )
                      : "—"}
                  </strong>

                  <span>
                    {healthScore !==
                    null
                      ? "/100"
                      : ""}
                  </span>
                </div>

                <div>
                  <strong>
                    {healthLabel}
                  </strong>

                  <p>
                    {healthScore !==
                    null
                      ? unresolvedAnomalies.length >
                        0
                        ? `${unresolvedAnomalies.length} unresolved anomaly${
                            unresolvedAnomalies.length >
                            1
                              ? "ies"
                              : "y"
                          } require facility-manager attention.`
                        : "No unresolved anomalies require attention."
                      : "Health score is not available from the backend."}
                  </p>
                </div>
              </div>

              <div className="health-progress-row">
                <span>
                  Operational stability
                </span>

                <strong>
                  {healthScore !==
                  null
                    ? `${Math.round(
                        healthScore
                      )}%`
                    : "—"}
                </strong>
              </div>

              <div className="health-progress">
                <span
                  style={{
                    width:
                      healthScore !==
                      null
                        ? `${Math.max(
                            0,
                            Math.min(
                              100,
                              healthScore
                            )
                          )}%`
                        : "0%",
                  }}
                ></span>
              </div>

              <div className="health-note">
                <CheckCircle2 size={14} />

                {anomalies.length >
                0
                  ? "Detection engine is receiving anomaly telemetry."
                  : "Waiting for anomaly telemetry from the backend."}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* DETAILS MODAL */}
      {selectedAnomaly && (
        <div
          className="anomaly-modal-overlay"
          onClick={() =>
            setSelectedAnomaly(null)
          }
        >
          <div
            className="anomaly-details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-top">
              <div className="modal-anomaly-title">
                <div
                  className={`modal-severity-icon ${selectedAnomaly.severity.toLowerCase()}`}
                >
                  {selectedAnomaly.severity ===
                    "Critical" && (
                    <AlertCircle
                      size={22}
                    />
                  )}

                  {selectedAnomaly.severity ===
                    "High" && (
                    <AlertTriangle
                      size={22}
                    />
                  )}

                  {selectedAnomaly.severity ===
                    "Medium" && (
                    <Activity
                      size={22}
                    />
                  )}

                  {selectedAnomaly.severity ===
                    "Low" && (
                    <CheckCircle2
                      size={22}
                    />
                  )}
                </div>

                <div>
                  <span>
                    {
                      selectedAnomaly.id
                    }
                  </span>

                  <h2>
                    {
                      selectedAnomaly.title
                    }
                  </h2>
                </div>
              </div>

              <button
                className="close-anomaly-modal"
                onClick={() =>
                  setSelectedAnomaly(
                    null
                  )
                }
              >
                <X size={19} />
              </button>
            </div>

            <div className="modal-status-line">
              <span
                className={severityClass(
                  selectedAnomaly.severity
                )}
              >
                {
                  selectedAnomaly.severity
                }
              </span>

              <span
                className={statusClass(
                  selectedAnomaly.status
                )}
              >
                {
                  selectedAnomaly.status
                }
              </span>

              {selectedAnomaly.confidence >
                0 && (
                <span className="modal-confidence">
                  <BrainCircuit
                    size={13}
                  />
                  AI Confidence{" "}
                  {selectedAnomaly.confidence.toFixed(
                    0
                  )}
                  %
                </span>
              )}
            </div>

            <div className="modal-description">
              <p>
                {
                  selectedAnomaly.description
                }
              </p>
            </div>

            <div className="anomaly-detail-grid">
              <div>
                <span>
                  Observed Value
                </span>

                <strong>
                  {
                    selectedAnomaly.value
                  }
                </strong>
              </div>

              <div>
                <span>
                  Expected Value
                </span>

                <strong>
                  {
                    selectedAnomaly.expected
                  }
                </strong>
              </div>

              <div>
                <span>Deviation</span>

                <strong>
                  {
                    selectedAnomaly.deviation
                  }
                </strong>
              </div>

              <div>
                <span>Duration</span>

                <strong>
                  {
                    selectedAnomaly.duration
                  }
                </strong>
              </div>

              <div>
                <span>Location</span>

                <strong>
                  {
                    selectedAnomaly.location
                  }
                </strong>
              </div>

              <div>
                <span>Detected At</span>

                <strong>
                  {
                    selectedAnomaly.detectedAt
                  }
                </strong>
              </div>
            </div>

            <div className="ai-analysis-box">
              <div className="ai-analysis-heading">
                <BrainCircuit size={18} />

                <div>
                  <strong>
                    AI Root-Cause Analysis
                  </strong>

                  <span>
                    Generated from backend
                    anomaly analysis
                  </span>
                </div>
              </div>

              <p>
                {
                  selectedAnomaly.recommendation
                }
              </p>
            </div>

            <div className="saving-estimate">
              <div>
                <Zap size={17} />
              </div>

              <div>
                <span>
                  Estimated avoidable energy
                </span>

                <strong>
                  {selectedAnomaly.estimatedSaving >
                  0
                    ? `${selectedAnomaly.estimatedSaving.toLocaleString()} kWh/day`
                    : "No data available"}
                </strong>
              </div>
            </div>

            <div className="modal-action-row">
              {selectedAnomaly.status ===
                "Open" && (
                <button
                  className="modal-ack-btn"
                  onClick={() =>
                    updateAnomalyStatus(
                      selectedAnomaly.id,
                      "Acknowledged"
                    )
                  }
                >
                  <UserCheck
                    size={15}
                  />
                  Acknowledge
                </button>
              )}

              {selectedAnomaly.status ===
                "Acknowledged" && (
                <button
                  className="modal-resolve-btn"
                  onClick={() =>
                    updateAnomalyStatus(
                      selectedAnomaly.id,
                      "Resolved"
                    )
                  }
                >
                  <CheckCircle2
                    size={15}
                  />
                  Mark Resolved
                </button>
              )}

              <button
                className="modal-escalate-btn"
                onClick={() =>
                  handleEscalate(
                    selectedAnomaly
                  )
                }
              >
                <AlertTriangle
                  size={15}
                />
                Escalate
              </button>

              <button
                className="modal-close-btn"
                onClick={() =>
                  setSelectedAnomaly(
                    null
                  )
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ANALYSIS MODAL */}
      {showAIAnalysis && (
        <div
          className="anomaly-modal-overlay"
          onClick={() =>
            setShowAIAnalysis(false)
          }
        >
          <div
            className="ai-analysis-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="ai-modal-header">
              <div className="big-ai-icon">
                <BrainCircuit
                  size={28}
                />
              </div>

              <button
                className="close-anomaly-modal"
                onClick={() =>
                  setShowAIAnalysis(
                    false
                  )
                }
              >
                <X size={19} />
              </button>
            </div>

            <span className="ai-modal-label">
              ANOMALY DETECTION ENGINE
            </span>

            <h2>
              AI Building Analysis
            </h2>

            <p>
              The anomaly detection engine
              analyzes backend telemetry,
              anomaly severity, occupancy,
              equipment behavior and
              historical conditions.
            </p>

            <div className="ai-analysis-summary">
              <div>
                <span>
                  Total anomalies
                </span>

                <strong>
                  {anomalies.length}
                </strong>
              </div>

              <div>
                <span>
                  Critical / High
                </span>

                <strong>
                  {criticalCount +
                    highCount}
                </strong>
              </div>

              <div>
                <span>
                  AI confidence
                </span>

                <strong>
                  {detectionConfidence !==
                  null
                    ? `${detectionConfidence.toFixed(
                        1
                      )}%`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Potential savings
                </span>

                <strong>
                  {totalPotentialSaving >
                  0
                    ? `${totalPotentialSaving.toLocaleString()} kWh/day`
                    : "No data"}
                </strong>
              </div>
            </div>

            <div className="ai-findings">
              {primaryFinding && (
                <div className="ai-finding critical">
                  <AlertCircle
                    size={17}
                  />

                  <div>
                    <strong>
                      {
                        primaryFinding.title
                      }
                    </strong>

                    <span>
                      {
                        primaryFinding.description
                      }
                    </span>
                  </div>
                </div>
              )}

              {patternData.hvac.length >
                0 && (
                <div className="ai-finding warning">
                  <Thermometer
                    size={17}
                  />

                  <div>
                    <strong>
                      HVAC anomalies detected
                    </strong>

                    <span>
                      {
                        patternData.hvac
                          .length
                      }{" "}
                      HVAC-related anomaly
                      {patternData.hvac
                        .length >
                      1
                        ? "ies"
                        : "y"}{" "}
                      are present in the
                      current backend
                      telemetry.
                    </span>
                  </div>
                </div>
              )}

              {patternData.lighting
                .length > 0 && (
                <div className="ai-finding warning">
                  <Lightbulb
                    size={17}
                  />

                  <div>
                    <strong>
                      Lighting anomalies detected
                    </strong>

                    <span>
                      {
                        patternData
                          .lighting
                          .length
                      }{" "}
                      lighting-related
                      anomaly
                      {patternData
                        .lighting
                        .length >
                      1
                        ? "ies"
                        : "y"}{" "}
                      are present.
                    </span>
                  </div>
                </div>
              )}

              {anomalies.length ===
                0 && (
                <div className="ai-finding normal">
                  <CheckCircle2
                    size={17}
                  />

                  <div>
                    <strong>
                      No anomaly records
                      available
                    </strong>

                    <span>
                      The backend has not
                      returned any anomaly
                      telemetry for this
                      building.
                    </span>
                  </div>
                </div>
              )}

              {anomalies.length >
                0 &&
                patternData.hvac
                  .length === 0 &&
                patternData.lighting
                  .length === 0 &&
                !primaryFinding && (
                  <div className="ai-finding normal">
                    <CheckCircle2
                      size={17}
                    />

                    <div>
                      <strong>
                        Detection system healthy
                      </strong>

                      <span>
                        Current backend
                        anomaly streams are
                        operating normally.
                      </span>
                    </div>
                  </div>
                )}
            </div>

            <div className="ai-human-note">
              <UserCheck size={17} />

              <div>
                <strong>
                  Human decision required
                </strong>

                <span>
                  AI recommendations are
                  advisory. Equipment changes
                  require facility-manager
                  approval.
                </span>
              </div>
            </div>

            <button
              className="ai-modal-close-button"
              onClick={() =>
                setShowAIAnalysis(false)
              }
            >
              Close Analysis
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="anomaly-toast">
          <CheckCircle2 size={17} />

          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}