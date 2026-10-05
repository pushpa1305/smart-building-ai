import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowDownRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  DollarSign,
  Fan,
  Filter,
  Gauge,
  Lightbulb,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
  X,
  Zap,
  Activity,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import {
  getBuildings,
  getRecommendations,
  getDashboard,
  approveRecommendation as approveRecommendationApi,
  dismissRecommendation as dismissRecommendationApi,
} from "../services/api";

/* =====================================================
   TYPES
===================================================== */

type Priority =
  | "Critical"
  | "High"
  | "Medium";

type RecommendationStatus =
  | "Pending Approval"
  | "Approved"
  | "Completed"
  | "Dismissed";

type RecommendationIcon =
  | "hvac"
  | "lighting"
  | "energy"
  | "occupancy";

interface Recommendation {
  id: number | string;
  title: string;
  category: string;
  zone: string;
  priority: Priority;
  status: RecommendationStatus;
  description: string;
  reason: string;
  action: string;
  currentValue: string;
  recommendedValue: string;
  savings: number;
  savingsPercentage: number;
  confidence: number;
  agent: string;
  time: string;
  icon: RecommendationIcon;
}

interface Building {
  id: number | string;
  name: string;
  location?: string;
}

interface Agent {
  id?: number | string;
  name?: string;
  description?: string;
  status?: string;
}

interface DashboardData {
  healthScore?: number;

  equipment?: {
    total?: number;
    running?: number;
    health?: number;
  };

  [key: string]: unknown;
}

interface AgentFlowItem {
  number: string;

  icon:
    | "monitoring"
    | "energy"
    | "occupancy"
    | "equipment"
    | "recommendation";

  name: string;

  description: string;
}

/* =====================================================
   GENERIC HELPERS
===================================================== */

const numberValue = (
  value: unknown,
  fallback = 0,
): number => {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const stringValue = (
  value: unknown,
  fallback = "—",
): string => {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const result = String(value).trim();

  return result || fallback;
};

/* =====================================================
   STATUS NORMALIZATION
===================================================== */

const normalizeStatus = (
  value: unknown,
): RecommendationStatus => {
  const status = stringValue(
    value,
    "Pending Approval",
  )
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();

  if (
    status === "approved" ||
    status === "approve"
  ) {
    return "Approved";
  }

  if (
    status === "completed" ||
    status === "complete" ||
    status === "implemented"
  ) {
    return "Completed";
  }

  if (
    status === "dismissed" ||
    status === "dismiss"
  ) {
    return "Dismissed";
  }

  return "Pending Approval";
};

/* =====================================================
   PRIORITY NORMALIZATION
===================================================== */

const normalizePriority = (
  value: unknown,
): Priority => {
  const priority = stringValue(
    value,
    "Medium",
  ).toLowerCase();

  if (
    priority === "critical" ||
    priority === "urgent"
  ) {
    return "Critical";
  }

  if (
    priority === "high" ||
    priority === "major"
  ) {
    return "High";
  }

  return "Medium";
};

/* =====================================================
   ICON DETECTION
===================================================== */

const normalizeIcon = (
  record: Record<string, unknown>,
): RecommendationIcon => {
  const source = [
    record.icon,
    record.category,
    record.type,
    record.recommendation_type,
    record.title,
    record.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    source.includes("hvac") ||
    source.includes("cooling") ||
    source.includes("heating") ||
    source.includes("fan") ||
    source.includes("temperature")
  ) {
    return "hvac";
  }

  if (
    source.includes("lighting") ||
    source.includes("light")
  ) {
    return "lighting";
  }

  if (
    source.includes("occupancy") ||
    source.includes("space") ||
    source.includes("people")
  ) {
    return "occupancy";
  }

  return "energy";
};

/* =====================================================
   CATEGORY
===================================================== */

const getCategory = (
  record: Record<string, unknown>,
): string => {
  return stringValue(
    record.category ??
      record.type ??
      record.recommendation_type,
    "Energy Optimization",
  );
};

/* =====================================================
   ZONE
===================================================== */

const getZone = (
  record: Record<string, unknown>,
): string => {
  if (record.zone) {
    return String(record.zone);
  }

  if (record.location) {
    return String(record.location);
  }

  if (
    record.floor !== null &&
    record.floor !== undefined
  ) {
    return `Floor ${record.floor}`;
  }

  return "Building-wide";
};

/* =====================================================
   TIME FORMATTER
===================================================== */

const formatRecommendationTime = (
  value: unknown,
): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(
    String(value),
  );

  if (Number.isNaN(date.getTime())) {
    return stringValue(value);
  }

  const diff =
    Date.now() - date.getTime();

  if (diff < 0) {
    return date.toLocaleString();
  }

  const minutes = Math.floor(
    diff / 60000,
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days = Math.floor(
    hours / 24,
  );

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return date.toLocaleDateString();
};

/* =====================================================
   NORMALIZE RECOMMENDATION
===================================================== */

const normalizeRecommendation = (
  value: unknown,
  index: number,
): Recommendation | null => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  const rawId =
    record.id ??
    record.recommendation_id ??
    record.recommendationId;

  const id =
    typeof rawId === "number" ||
    typeof rawId === "string"
      ? rawId
      : index + 1;

  const title = stringValue(
    record.title,
    "Energy Optimization Recommendation",
  );

  const description = stringValue(
    record.description,
    "No recommendation description is available from the backend.",
  );

  const savings = numberValue(
    record.estimated_savings ??
      record.estimatedSavings ??
      record.savings,
    0,
  );

  const savingsPercentage =
    numberValue(
      record.savings_percentage ??
        record.savingsPercentage,
      0,
    );

  const confidence =
    numberValue(
      record.confidence,
      0,
    );

  return {
    id,

    title,

    category:
      getCategory(record),

    zone:
      getZone(record),

    priority:
      normalizePriority(
        record.priority ??
          record.severity,
      ),

    status:
      normalizeStatus(
        record.status,
      ),

    description,

    reason:
      stringValue(
        record.reason,
        description,
      ),

    action:
      stringValue(
        record.action ??
          record.recommended_action ??
          record.recommendedAction,
        "Review this recommendation in the facility management workflow.",
      ),

    currentValue:
      stringValue(
        record.current_value ??
          record.currentValue,
        "—",
      ),

    recommendedValue:
      stringValue(
        record.recommended_value ??
          record.recommendedValue,
        "—",
      ),

    savings,

    savingsPercentage,

    confidence,

    agent:
      stringValue(
        record.agent ??
          record.agent_name ??
          record.agentName,
        "Recommendation Engine",
      ),

    time:
      formatRecommendationTime(
        record.created_at ??
          record.createdAt ??
          record.time,
      ),

    icon:
      normalizeIcon(record),
  };
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Recommendations() {
  const navigate = useNavigate();

  const [activePage, setActivePage] =
    useState("Recommendations");

  const [
    recommendations,
    setRecommendations,
  ] = useState<Recommendation[]>([]);

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState<
    "All" | Priority
  >("All");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "All" | RecommendationStatus
  >("All");

  const [
    selectedRecommendation,
    setSelectedRecommendation,
  ] =
    useState<Recommendation | null>(
      null,
    );

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(null);

  const [
    buildings,
    setBuildings,
  ] = useState<Building[]>([]);

  const [
    selectedBuildingId,
    setSelectedBuildingId,
  ] = useState<
    number | string | null
  >(null);

  const [
    dashboardData,
    setDashboardData,
  ] =
    useState<DashboardData | null>(
      null,
    );

  /*
   * The current api.ts does not expose getAgents().
   * Therefore the recommendation workflow uses
   * the five logical AI agents directly.
   *
   * These can later be replaced by backend data
   * when an /api/agents endpoint is added.
   */
  const [agents] = useState<Agent[]>([
    {
      id: 1,
      name: "Monitoring Agent",
      description:
        "Collects live building and sensor conditions.",
      status: "active",
    },
    {
      id: 2,
      name: "Energy Analytics Agent",
      description:
        "Compares current consumption against historical baselines.",
      status: "active",
    },
    {
      id: 3,
      name: "Occupancy Agent",
      description:
        "Analyzes occupancy and identifies unused spaces.",
      status: "active",
    },
    {
      id: 4,
      name: "Equipment Agent",
      description:
        "Checks HVAC, lighting and equipment operating conditions.",
      status: "active",
    },
    {
      id: 5,
      name: "Recommendation Agent",
      description:
        "Generates corrective actions and estimates energy savings.",
      status: "active",
    },
  ]);

  /* =====================================================
     TOAST
  ===================================================== */

  const showToast = useCallback(
    (message: string) => {
      setToast(message);

      window.setTimeout(() => {
        setToast("");
      }, 2500);
    },
    [],
  );

  /* =====================================================
     LOAD BUILDINGS
  ===================================================== */

  const loadBuildings =
    useCallback(async () => {
      try {
        const data =
          await getBuildings();

        const normalized =
          data
            .map((building) => ({
              id: building.id,

              name: stringValue(
                building.name,
                "Building",
              ),

              location:
                stringValue(
                  building.location,
                  "",
                ),
            }))
            .filter(
              (building) =>
                building.id !==
                undefined,
            );

        setBuildings(normalized);

        setSelectedBuildingId(
          (current) => {
            if (
              current !== null &&
              normalized.some(
                (building) =>
                  String(
                    building.id,
                  ) ===
                  String(current),
              )
            ) {
              return current;
            }

            return (
              normalized[0]?.id ??
              null
            );
          },
        );
      } catch (requestError) {
        const message =
          requestError instanceof
          Error
            ? requestError.message
            : "Unable to load buildings.";

        setError(message);
      }
    }, []);

  /* =====================================================
     LOAD RECOMMENDATIONS
  ===================================================== */

  const loadRecommendations =
    useCallback(
      async (
        buildingId:
          | number
          | string
          | null,
      ) => {
        const data =
          await getRecommendations(
            buildingId ??
              undefined,
          );

        const normalized =
          data
            .map(
              (item, index) =>
                normalizeRecommendation(
                  item,
                  index,
                ),
            )
            .filter(
              (
                item,
              ): item is Recommendation =>
                item !== null,
            );

        setRecommendations(
          normalized,
        );
      },
      [],
    );

  /* =====================================================
     LOAD DASHBOARD
  ===================================================== */

  const loadDashboard =
    useCallback(
      async (
        buildingId:
          | number
          | string
          | null,
      ) => {
        try {
          const data =
            await getDashboard(
              buildingId ??
                undefined,
            );

          setDashboardData(
            data as unknown as DashboardData,
          );
        } catch {
          setDashboardData(null);
        }
      },
      [],
    );

  /* =====================================================
     LOAD ALL DATA
  ===================================================== */

  const loadAllData =
    useCallback(
      async (
        buildingId:
          | number
          | string
          | null,
        showLoader = false,
      ) => {
        if (showLoader) {
          setIsLoading(true);
        }

        setError("");

        try {
          await Promise.all([
            loadRecommendations(
              buildingId,
            ),

            loadDashboard(
              buildingId,
            ),
          ]);

          setLastUpdated(
            new Date(),
          );

          return true;
        } catch (requestError) {
          const message =
            requestError instanceof
            Error
              ? requestError.message
              : "Unable to load recommendation data.";

          setError(message);

          return false;
        } finally {
          if (showLoader) {
            setIsLoading(false);
          }
        }
      },
      [
        loadRecommendations,
        loadDashboard,
      ],
    );

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const initialize =
      async () => {
        setIsLoading(true);

        await loadBuildings();

        setIsLoading(false);
      };

    void initialize();
  }, [loadBuildings]);

  /* =====================================================
     LOAD WHEN BUILDING CHANGES
  ===================================================== */

  useEffect(() => {
    if (
      selectedBuildingId === null
    ) {
      return;
    }

    void loadAllData(
      selectedBuildingId,
      true,
    );
  }, [
    selectedBuildingId,
    loadAllData,
  ]);

  /* =====================================================
     AUTO REFRESH
  ===================================================== */

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        if (
          selectedBuildingId !==
          null
        ) {
          void loadAllData(
            selectedBuildingId,
            false,
          );
        }
      }, 30000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    selectedBuildingId,
    loadAllData,
  ]);

  /* =====================================================
     FILTERED DATA
  ===================================================== */

  const filteredRecommendations =
    useMemo(() => {
      return recommendations.filter(
        (item) => {
          const priorityMatch =
            priorityFilter ===
              "All" ||
            item.priority ===
              priorityFilter;

          const statusMatch =
            statusFilter ===
              "All" ||
            item.status ===
              statusFilter;

          return (
            priorityMatch &&
            statusMatch
          );
        },
      );
    }, [
      recommendations,
      priorityFilter,
      statusFilter,
    ]);

  /* =====================================================
     SUMMARY VALUES
  ===================================================== */

  const pendingCount =
    recommendations.filter(
      (item) =>
        item.status ===
        "Pending Approval",
    ).length;

  const approvedCount =
    recommendations.filter(
      (item) =>
        item.status ===
        "Approved",
    ).length;

  const totalSavings =
    recommendations.reduce(
      (sum, item) =>
        sum + item.savings,
      0,
    );

  const pendingSavings =
    recommendations
      .filter(
        (item) =>
          item.status ===
          "Pending Approval",
      )
      .reduce(
        (sum, item) =>
          sum + item.savings,
        0,
      );

  /* =====================================================
     APPROVE RECOMMENDATION
  ===================================================== */

  const approveRecommendation =
    async (
      id: number | string,
    ) => {
      try {
        await approveRecommendationApi(id);

        setRecommendations(
          (current) =>
            current.map(
              (item) =>
                String(item.id) ===
                String(id)
                  ? {
                      ...item,
                      status: "Approved",
                    }
                  : item,
            ),
        );

        setSelectedRecommendation(null);
        showToast("Recommendation approved successfully.");
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to approve recommendation.";

        showToast(message);
      }
    };

  /* =====================================================
     DISMISS RECOMMENDATION
  ===================================================== */

  const dismissRecommendation =
    async (
      id: number | string,
    ) => {
      try {
        await dismissRecommendationApi(id);

        setRecommendations(
          (current) =>
            current.map(
              (item) =>
                String(item.id) ===
                String(id)
                  ? {
                      ...item,
                      status: "Dismissed",
                    }
                  : item,
            ),
        );

        setSelectedRecommendation(null);
        showToast("Recommendation dismissed.");
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to dismiss recommendation.";

        showToast(message);
      }
    };

  /* =====================================================
     REFRESH
  ===================================================== */

  const refreshRecommendations =
    async () => {
      setIsRefreshing(true);
      setError("");

      const success =
        await loadAllData(
          selectedBuildingId,
          false,
        );

      if (success) {
        showToast(
          "Recommendation data refreshed from the AI engine.",
        );
      } else {
        showToast(
          "Unable to refresh recommendation data.",
        );
      }

      setIsRefreshing(false);
    };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const openActionTracker =
    () => {
      setActivePage(
        "Action Tracker",
      );

      navigate("/actions");
    };

  const openEquipmentMonitoring =
    () => {
      setActivePage(
        "Equipment Monitoring",
      );

      navigate(
        "/equipment-monitoring",
      );
    };

  /* =====================================================
     RECOMMENDATION ICON
  ===================================================== */

  const getRecommendationIcon =
    (
      icon: RecommendationIcon,
    ) => {
      switch (icon) {
        case "hvac":
          return (
            <Fan size={22} />
          );

        case "lighting":
          return (
            <Lightbulb size={22} />
          );

        case "occupancy":
          return (
            <Users size={22} />
          );

        case "energy":
        default:
          return (
            <Zap size={22} />
          );
      }
    };

  /* =====================================================
     AGENT FLOW
  ===================================================== */

  const agentFlow =
    useMemo<AgentFlowItem[]>(() => {
      const sortedAgents =
        [...agents].sort(
          (
            a: Agent,
            b: Agent,
          ) =>
            numberValue(a.id) -
            numberValue(b.id),
        );

      return sortedAgents
        .slice(0, 5)
        .map(
          (
            agent: Agent,
            index: number,
          ) => {
            const name =
              stringValue(
                agent.name,
                "AI Agent",
              );

            const source =
              name.toLowerCase();

            let icon: AgentFlowItem["icon"] =
              "recommendation";

            if (
              source.includes(
                "monitor",
              )
            ) {
              icon =
                "monitoring";
            } else if (
              source.includes(
                "energy",
              )
            ) {
              icon = "energy";
            } else if (
              source.includes(
                "occupancy",
              )
            ) {
              icon =
                "occupancy";
            } else if (
              source.includes(
                "equipment",
              ) ||
              source.includes("hvac")
            ) {
              icon =
                "equipment";
            }

            return {
              number: String(
                index + 1,
              ).padStart(2, "0"),

              icon,

              name,

              description:
                stringValue(
                  agent.description,
                  "AI operational analysis",
                ),
            };
          },
        );
    }, [agents]);

  /* =====================================================
     AGENT ICON
  ===================================================== */

  const getAgentIcon = (
    icon: AgentFlowItem["icon"],
  ) => {
    switch (icon) {
      case "monitoring":
        return (
          <Activity size={19} />
        );

      case "energy":
        return (
          <Zap size={19} />
        );

      case "occupancy":
        return (
          <Users size={19} />
        );

      case "equipment":
        return (
          <Fan size={19} />
        );

      default:
        return (
          <Sparkles size={19} />
        );
    }
  };

  /* =====================================================
     SELECTED BUILDING
  ===================================================== */

  const selectedBuilding =
    buildings.find(
      (building) =>
        String(building.id) ===
        String(
          selectedBuildingId,
        ),
    );

  /* =====================================================
     AGENT STATUS
  ===================================================== */

  const onlineAgents =
    agents.filter(
      (agent: Agent) => {
        const status =
          stringValue(
            agent.status,
            "",
          ).toLowerCase();

        return (
          status === "active" ||
          status === "online" ||
          status === "running"
        );
      },
    ).length;

  const agentStatusText =
    agents.length > 0
      ? onlineAgents > 0
        ? `${onlineAgents} of ${agents.length} agents online`
        : `${agents.length} agents available`
      : "Agent status unavailable";

  /* =====================================================
     HEALTH SCORE
  ===================================================== */

  const healthScore =
    numberValue(
      dashboardData?.healthScore,
      numberValue(
        dashboardData?.equipment
          ?.health,
        0,
      ),
    );

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={
          setActivePage
        }
      />

      <main className="main-content">
        <Topbar
          activePage={activePage}
        />

        <div className="recommendations-page">

          {/* =================================================
              HEADER
          ================================================= */}

          <section className="recommendations-header">
            <div>
              <div className="recommendation-eyebrow">
                <Sparkles size={16} />
                AI ACTION CENTER
              </div>

              <h1>
                Recommendations
              </h1>

              <p>
                AI-generated actions to
                reduce energy consumption,
                improve equipment efficiency
                and optimize building
                operations.
              </p>
            </div>

            <div className="recommendation-header-actions">

              <button
                className="recommendation-secondary-btn"
                onClick={
                  openActionTracker
                }
              >
                <ListChecks
                  size={17}
                />

                Action Tracker

                <ChevronRight
                  size={15}
                />
              </button>

              <button
                className="recommendation-primary-btn"
                onClick={
                  refreshRecommendations
                }
                disabled={
                  isRefreshing
                }
              >
                <RefreshCw
                  size={17}
                  className={
                    isRefreshing
                      ? "recommendation-spin"
                      : ""
                  }
                />

                {isRefreshing
                  ? "Analyzing..."
                  : "Run AI Analysis"}
              </button>

            </div>
          </section>

          {/* =================================================
              BUILDING SELECTOR
          ================================================= */}

          {buildings.length > 0 && (
            <section
              className="recommendation-building-selector"
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: "16px",
                marginBottom:
                  "18px",
              }}
            >
              <div>
                <strong>
                  Connected Building
                </strong>

                <span
                  style={{
                    display:
                      "block",
                    opacity: 0.7,
                    marginTop:
                      "4px",
                  }}
                >
                  {selectedBuilding
                    ?.location ||
                    "Backend building data"}
                </span>
              </div>

              <select
                value={
                  selectedBuildingId ??
                  ""
                }
                onChange={(event) => {
                  const value =
                    event.target.value;

                  const building =
                    buildings.find(
                      (item) =>
                        String(
                          item.id,
                        ) === value,
                    );

                  setSelectedBuildingId(
                    building?.id ??
                      null,
                  );
                }}
                style={{
                  minWidth:
                    "220px",
                  padding:
                    "10px 12px",
                  borderRadius:
                    "10px",
                }}
              >
                {buildings.map(
                  (building) => (
                    <option
                      key={String(
                        building.id,
                      )}
                      value={String(
                        building.id,
                      )}
                    >
                      {
                        building.name
                      }
                    </option>
                  ),
                )}
              </select>
            </section>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div
              className="recommendation-error"
              style={{
                padding:
                  "14px 18px",
                marginBottom:
                  "18px",
                borderRadius:
                  "10px",
              }}
            >
              {error}
            </div>
          )}

          {/* =================================================
              AI STATUS
          ================================================= */}

          <section className="recommendation-ai-status">
            <div className="ai-status-left">

              <div className="ai-status-icon">
                <Bot size={22} />
              </div>

              <div>
                <strong>
                  Recommendation Engine Active
                </strong>

                <span>
                  {agentStatusText}
                </span>
              </div>

            </div>

            <div className="ai-status-right">

              <span>
                <i className="online-dot" />

                {agents.length > 0
                  ? "Backend Connected"
                  : "Agent data unavailable"}
              </span>

              <span>
                <Clock3 size={15} />

                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute:
                          "2-digit",
                      },
                    )}`
                  : "Waiting for backend data"}
              </span>

            </div>
          </section>

          {/* =================================================
              SUMMARY CARDS
          ================================================= */}

          <section className="recommendation-summary-grid">

            <SummaryCard
              icon={
                <Lightbulb
                  size={21}
                />
              }
              title="AI Recommendations"
              value={String(
                recommendations.length,
              )}
              description="Total generated actions"
              iconClass="cyan"
            />

            <SummaryCard
              icon={
                <Clock3
                  size={21}
                />
              }
              title="Pending Approval"
              value={String(
                pendingCount,
              )}
              description={`${pendingSavings} kWh/day potential savings`}
              iconClass="orange"
              alert
            />

            <SummaryCard
              icon={
                <CheckCircle2
                  size={21}
                />
              }
              title="Approved Actions"
              value={String(
                approvedCount,
              )}
              description="Ready for implementation"
              iconClass="blue"
            />

            <SummaryCard
              icon={
                <TrendingDown
                  size={21}
                />
              }
              title="Potential Savings"
              value={String(
                totalSavings,
              )}
              unit="kWh/day"
              description="Across all recommendations"
              iconClass="green"
            />

          </section>

          {/* =================================================
              BUILDING HEALTH
          ================================================= */}

          {dashboardData && (
            <section
              className="recommendation-building-selector"
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: "20px",
                marginBottom:
                  "18px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "12px",
                }}
              >
                <Gauge size={22} />

                <div>
                  <strong>
                    Building Health
                  </strong>

                  <span
                    style={{
                      display:
                        "block",
                      opacity:
                        0.7,
                      marginTop:
                        "3px",
                    }}
                  >
                    Current backend
                    health score
                  </span>
                </div>
              </div>

              <strong
                style={{
                  fontSize:
                    "24px",
                }}
              >
                {healthScore > 0
                  ? `${healthScore}%`
                  : "—"}
              </strong>
            </section>
          )}

          {/* =================================================
              SAVINGS BANNER
          ================================================= */}

          <section className="savings-banner">

            <div className="savings-banner-icon">
              <DollarSign
                size={24}
              />
            </div>

            <div className="savings-banner-content">

              <strong>
                Estimated Energy Opportunity
              </strong>

              <p>
                Implementing the
                recommended actions
                could reduce approximately{" "}
                <strong>
                  {totalSavings}{" "}
                  kWh/day
                </strong>{" "}
                of avoidable energy
                consumption.
              </p>

            </div>

            <div className="savings-banner-value">

              <span>
                Estimated
              </span>

              <strong>
                {totalSavings}
              </strong>

              <small>
                kWh / day
              </small>

            </div>

          </section>

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <section className="recommendation-toolbar">

            <div className="recommendation-toolbar-left">

              <h2>
                Recommended Actions
              </h2>

              <span className="recommendation-count">
                {
                  filteredRecommendations.length
                }{" "}
                actions
              </span>

            </div>

            <div className="recommendation-toolbar-right">

              <button
                className={`filter-button ${
                  showFilters
                    ? "filter-active"
                    : ""
                }`}
                onClick={() =>
                  setShowFilters(
                    (current) =>
                      !current,
                  )
                }
              >
                <Filter size={16} />

                Filters
              </button>

            </div>

          </section>

          {/* =================================================
              FILTER PANEL
          ================================================= */}

          {showFilters && (
            <section className="filter-panel">

              <div className="filter-group">

                <label>
                  Priority
                </label>

                <select
                  value={
                    priorityFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setPriorityFilter(
                      event.target
                        .value as
                        | "All"
                        | Priority,
                    )
                  }
                >
                  <option value="All">
                    All Priorities
                  </option>

                  <option value="Critical">
                    Critical
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Medium">
                    Medium
                  </option>
                </select>

              </div>

              <div className="filter-group">

                <label>
                  Status
                </label>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setStatusFilter(
                      event.target
                        .value as
                        | "All"
                        | RecommendationStatus,
                    )
                  }
                >
                  <option value="All">
                    All Statuses
                  </option>

                  <option value="Pending Approval">
                    Pending Approval
                  </option>

                  <option value="Approved">
                    Approved
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="Dismissed">
                    Dismissed
                  </option>
                </select>

              </div>

              <button
                className="clear-filter-button"
                onClick={() => {
                  setPriorityFilter(
                    "All",
                  );

                  setStatusFilter(
                    "All",
                  );
                }}
              >
                Clear Filters
              </button>

            </section>
          )}

          {/* =================================================
              LOADING
          ================================================= */}

          {isLoading ? (
            <div className="recommendation-empty">

              <RefreshCw
                size={32}
                className="recommendation-spin"
              />

              <h3>
                Loading recommendations
              </h3>

              <p>
                Retrieving recommendation
                data from the backend.
              </p>

            </div>
          ) : (
            <>
              {/* =================================================
                  RECOMMENDATION CARDS
              ================================================= */}

              <section className="recommendation-list">

                {filteredRecommendations.map(
                  (
                    recommendation,
                  ) => (
                    <RecommendationCard
                      key={String(
                        recommendation.id,
                      )}
                      recommendation={
                        recommendation
                      }
                      icon={getRecommendationIcon(
                        recommendation.icon,
                      )}
                      onView={() =>
                        setSelectedRecommendation(
                          recommendation,
                        )
                      }
                      onApprove={() =>
                        approveRecommendation(
                          recommendation.id,
                        )
                      }
                      onDismiss={() =>
                        dismissRecommendation(
                          recommendation.id,
                        )
                      }
                    />
                  ),
                )}

              </section>

              {/* =================================================
                  EMPTY STATE
              ================================================= */}

              {filteredRecommendations.length ===
                0 && (
                <div className="recommendation-empty">

                  <CheckCircle2
                    size={40}
                  />

                  <h3>
                    No recommendations found
                  </h3>

                  <p>
                    There are no
                    recommendations available
                    from the backend for the
                    selected filters.
                  </p>

                </div>
              )}
            </>
          )}

          {/* =================================================
              AGENT COLLABORATION
          ================================================= */}

          <section className="agent-collaboration">

            <div className="collaboration-header">

              <div>

                <div className="collaboration-label">
                  <Bot size={17} />

                  MULTI-AGENT ANALYSIS
                </div>

                <h2>
                  How the recommendation was generated
                </h2>

                <p>
                  Specialized agents collaborate
                  to identify energy-saving
                  opportunities before presenting
                  an action for human approval.
                </p>

              </div>

            </div>

            {agentFlow.length > 0 ? (
              <div className="agent-flow">

                {agentFlow.map(
                  (
                    agent,
                    index,
                  ) => (
                    <div
                      key={`${agent.name}-${index}`}
                      style={{
                        display:
                          "contents",
                      }}
                    >

                      <AgentFlowCard
                        number={
                          agent.number
                        }
                        icon={getAgentIcon(
                          agent.icon,
                        )}
                        name={
                          agent.name
                        }
                        description={
                          agent.description
                        }
                      />

                      {index <
                        agentFlow.length -
                          1 && (
                        <div className="flow-arrow">

                          <ChevronRight
                            size={19}
                          />

                        </div>
                      )}

                    </div>
                  ),
                )}

              </div>
            ) : (
              <div
                className="recommendation-empty"
                style={{
                  marginTop:
                    "20px",
                }}
              >

                <Bot size={30} />

                <h3>
                  Agent information unavailable
                </h3>

                <p>
                  Agent collaboration details
                  will appear when the backend
                  provides agent activity data.
                </p>

              </div>
            )}

          </section>

          {/* =================================================
              QUICK NAVIGATION
          ================================================= */}

          <section className="recommendation-quick-actions">

            <div className="quick-action-text">

              <div className="quick-action-icon">
                <Cpu size={21} />
              </div>

              <div>

                <h3>
                  Need more operational details?
                </h3>

                <p>
                  Review equipment status and
                  current building conditions
                  before approving an action.
                </p>

              </div>

            </div>

            <button
              className="quick-action-button"
              onClick={
                openEquipmentMonitoring
              }
            >
              Equipment Monitoring

              <ChevronRight
                size={16}
              />
            </button>

          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="recommendation-footer">

            <ShieldCheck
              size={16}
            />

            <span>
              AI recommendations are advisory.
              Facility managers must review and
              approve actions before implementation.
            </span>

          </div>

        </div>
      </main>

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {selectedRecommendation && (
        <div
          className="recommendation-modal-overlay"
          onClick={() =>
            setSelectedRecommendation(
              null,
            )
          }
        >
          <div
            className="recommendation-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div className="modal-title-area">

                <div
                  className={`modal-recommendation-icon ${selectedRecommendation.icon}`}
                >
                  {getRecommendationIcon(
                    selectedRecommendation.icon,
                  )}
                </div>

                <div>

                  <span className="modal-category">
                    {
                      selectedRecommendation.category
                    }
                  </span>

                  <h2>
                    {
                      selectedRecommendation.title
                    }
                  </h2>

                </div>

              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedRecommendation(
                    null,
                  )
                }
              >
                <X size={20} />
              </button>

            </div>

            <div className="modal-body">

              <div className="modal-status-row">

                <span
                  className={`priority-badge ${selectedRecommendation.priority.toLowerCase()}`}
                >
                  {
                    selectedRecommendation.priority
                  }
                </span>

                <span
                  className={`modal-status ${selectedRecommendation.status
                    .toLowerCase()
                    .replaceAll(
                      " ",
                      "-",
                    )}`}
                >
                  {
                    selectedRecommendation.status
                  }
                </span>

              </div>

              <div className="modal-section">

                <h3>
                  AI Analysis
                </h3>

                <p>
                  {
                    selectedRecommendation.description
                  }
                </p>

              </div>

              <div className="modal-section">

                <h3>
                  Why was this recommended?
                </h3>

                <div className="reason-box">

                  <Sparkles
                    size={18}
                  />

                  <p>
                    {
                      selectedRecommendation.reason
                    }
                  </p>

                </div>

              </div>

              <div className="modal-values">

                <div>

                  <span>
                    Current State
                  </span>

                  <strong>
                    {
                      selectedRecommendation.currentValue
                    }
                  </strong>

                </div>

                <div className="modal-value-arrow">

                  <ArrowDownRight
                    size={20}
                  />

                </div>

                <div>

                  <span>
                    Recommended
                  </span>

                  <strong>
                    {
                      selectedRecommendation.recommendedValue
                    }
                  </strong>

                </div>

              </div>

              <div className="modal-savings">

                <div className="modal-savings-icon">

                  <TrendingDown
                    size={20}
                  />

                </div>

                <div>

                  <span>
                    Estimated Energy Savings
                  </span>

                  <strong>
                    {
                      selectedRecommendation.savings
                    }{" "}
                    kWh/day
                  </strong>

                </div>

                <div className="modal-savings-percent">

                  <ArrowDownRight
                    size={14}
                  />

                  {
                    selectedRecommendation.savingsPercentage
                  }%

                </div>

              </div>

              <div className="modal-confidence">

                <div className="confidence-heading">

                  <span>
                    AI Confidence
                  </span>

                  <strong>
                    {selectedRecommendation.confidence >
                    0
                      ? `${selectedRecommendation.confidence}%`
                      : "—"}
                  </strong>

                </div>

                <div className="modal-confidence-bar">

                  <div
                    style={{
                      width: `${Math.min(
                        Math.max(
                          selectedRecommendation.confidence,
                          0,
                        ),
                        100,
                      )}%`,
                    }}
                  />

                </div>

              </div>

              <div className="modal-section">

                <h3>
                  Recommended Action
                </h3>

                <div className="action-box">

                  <CheckCircle2
                    size={18}
                  />

                  <p>
                    {
                      selectedRecommendation.action
                    }
                  </p>

                </div>

              </div>

              <div className="modal-agent">

                <Bot size={18} />

                <div>

                  <span>
                    Generated by
                  </span>

                  <strong>
                    {
                      selectedRecommendation.agent
                    }
                  </strong>

                </div>

              </div>

            </div>

            <div className="modal-footer">

              {selectedRecommendation.status ===
              "Pending Approval" ? (
                <>
                  <button
                    className="modal-dismiss-button"
                    onClick={() =>
                      dismissRecommendation(
                        selectedRecommendation.id,
                      )
                    }
                  >
                    <X size={16} />

                    Dismiss
                  </button>

                  <button
                    className="modal-approve-button"
                    onClick={() =>
                      approveRecommendation(
                        selectedRecommendation.id,
                      )
                    }
                  >
                    <Check size={17} />

                    Approve Action
                  </button>
                </>
              ) : (
                <button
                  className="modal-close-button"
                  onClick={() =>
                    setSelectedRecommendation(
                      null,
                    )
                  }
                >
                  Close
                </button>
              )}

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (
        <div className="recommendation-toast">

          <CheckCircle2
            size={18}
          />

          {toast}

        </div>
      )}

    </div>
  );
}

/* =====================================================
   SUMMARY CARD
===================================================== */

interface SummaryCardProps {
  icon: React.ReactNode;

  title: string;

  value: string;

  unit?: string;

  description: string;

  iconClass: string;

  alert?: boolean;
}

function SummaryCard({
  icon,
  title,
  value,
  unit,
  description,
  iconClass,
  alert,
}: SummaryCardProps) {
  return (
    <div
      className={`recommendation-summary-card ${
        alert
          ? "summary-alert"
          : ""
      }`}
    >
      <div className="summary-card-top">

        <div
          className={`summary-card-icon ${iconClass}`}
        >
          {icon}
        </div>

        {alert && (
          <span className="summary-alert-dot">

            <i />

            Attention

          </span>
        )}

      </div>

      <span className="summary-card-title">
        {title}
      </span>

      <div className="summary-card-value">

        <strong>
          {value}
        </strong>

        {unit && (
          <span>
            {unit}
          </span>
        )}

      </div>

      <span className="summary-card-description">
        {description}
      </span>

    </div>
  );
}

/* =====================================================
   RECOMMENDATION CARD
===================================================== */

interface RecommendationCardProps {
  recommendation: Recommendation;

  icon: React.ReactNode;

  onView: () => void;

  onApprove: () => void;

  onDismiss: () => void;
}

function RecommendationCard({
  recommendation,
  icon,
  onView,
  onApprove,
  onDismiss,
}: RecommendationCardProps) {
  const isPending =
    recommendation.status ===
    "Pending Approval";

  return (
    <article
      className={`recommendation-card ${recommendation.priority.toLowerCase()}`}
    >

      <div className="recommendation-card-main">

        <div
          className={`recommendation-main-icon ${recommendation.icon}`}
        >
          {icon}
        </div>

        <div className="recommendation-content">

          <div className="recommendation-title-row">

            <div>

              <span className="recommendation-category">
                {
                  recommendation.category
                }
              </span>

              <h3>
                {
                  recommendation.title
                }
              </h3>

            </div>

            <div className="recommendation-badges">

              <span
                className={`priority-badge ${recommendation.priority.toLowerCase()}`}
              >
                {
                  recommendation.priority
                }
              </span>

              <span
                className={`recommendation-status ${recommendation.status
                  .toLowerCase()
                  .replaceAll(
                    " ",
                    "-",
                  )}`}
              >
                {
                  recommendation.status
                }
              </span>

            </div>

          </div>

          <p className="recommendation-description">
            {
              recommendation.description
            }
          </p>

          <div className="recommendation-meta">

            <span>

              <Gauge size={14} />

              {
                recommendation.zone
              }

            </span>

            <span>

              <Clock3 size={14} />

              {
                recommendation.time
              }

            </span>

            <span>

              <Bot size={14} />

              {
                recommendation.agent
              }

            </span>

          </div>

        </div>

      </div>

      <div className="recommendation-savings">

        <span>
          Potential Savings
        </span>

        <strong>
          {
            recommendation.savings
          }
        </strong>

        <small>
          kWh/day
        </small>

        {recommendation.savingsPercentage >
          0 && (
          <div className="saving-percent">

            <ArrowDownRight
              size={13}
            />

            {
              recommendation.savingsPercentage
            }%

          </div>
        )}

      </div>

      <div className="recommendation-card-actions">

        <button
          className="view-details-button"
          onClick={onView}
        >
          View Details

          <ChevronRight
            size={15}
          />
        </button>

        {isPending ? (
          <>
            <button
              className="dismiss-card-button"
              onClick={
                onDismiss
              }
            >
              <X size={15} />

              Dismiss
            </button>

            <button
              className="approve-card-button"
              onClick={
                onApprove
              }
            >
              <Check size={15} />

              Approve
            </button>
          </>
        ) : (
          <span className="card-completed">

            <CheckCircle2
              size={15}
            />

            {
              recommendation.status
            }

          </span>
        )}

      </div>

    </article>
  );
}

/* =====================================================
   AGENT FLOW CARD
===================================================== */

interface AgentFlowCardProps {
  number: string;

  icon: React.ReactNode;

  name: string;

  description: string;
}

function AgentFlowCard({
  number,
  icon,
  name,
  description,
}: AgentFlowCardProps) {
  return (
    <div className="agent-flow-card">

      <div className="agent-flow-number">
        {number}
      </div>

      <div className="agent-flow-icon">
        {icon}
      </div>

      <strong>
        {name}
      </strong>

      <span>
        {description}
      </span>

    </div>
  );
}