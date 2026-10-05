
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  Cpu,
  Eye,
  Fan,
  Filter,
  Lightbulb,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

/* =========================================================
   TYPES
========================================================= */

type ActionStatus =
  | "Pending Approval"
  | "Approved"
  | "In Progress"
  | "Completed"
  | "Rejected";

type ActionPriority =
  | "Critical"
  | "High"
  | "Medium";

type ActionCategory =
  | "HVAC"
  | "Lighting"
  | "Energy"
  | "Occupancy"
  | "Equipment";

type ActionIcon =
  | "hvac"
  | "lighting"
  | "energy"
  | "occupancy";

interface BackendRecommendation {
  id: number;
  building_id?: number;
  title?: string | null;
  description?: string | null;
  estimated_savings?: number | null;
  estimatedSavings?: number | null;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;

  /*
   * These fields are optional.
   * If your backend later provides them,
   * the Action Tracker will automatically use them.
   */
  category?: string | null;
  zone?: string | null;
  priority?: string | null;
  recommendation?: string | null;
  reason?: string | null;
  savings_percentage?: number | null;
  savingsPercentage?: number | null;
  assigned_to?: string | null;
  assignedTo?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  approved_by?: string | null;
  approvedBy?: string | null;
  approved_at?: string | null;
  approvedAt?: string | null;
  agent?: string | null;
  agent_name?: string | null;
  agentName?: string | null;
  icon?: string | null;
}

interface ActionItem {
  id: number;
  title: string;
  category: ActionCategory | null;
  zone: string;
  priority: ActionPriority | null;
  status: ActionStatus;
  description: string;
  recommendation: string;
  reason: string;
  estimatedSavings: number | null;
  savingsPercentage: number | null;
  assignedTo: string;
  createdAt: string;
  dueDate: string;
  approvedBy: string;
  approvedAt: string;
  agent: string;
  icon: ActionIcon;
}

/* =========================================================
   RESPONSE NORMALIZER
========================================================= */

function getString(
  value: unknown,
  fallback = "—",
): string {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value);
}

function getNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

/* =========================================================
   STATUS NORMALIZATION
========================================================= */

function normalizeStatus(
  status: unknown,
): ActionStatus {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  switch (value) {
    case "approved":
      return "Approved";

    case "in progress":
    case "in_progress":
    case "in-progress":
      return "In Progress";

    case "completed":
    case "complete":
      return "Completed";

    case "rejected":
    case "dismissed":
    case "declined":
      return "Rejected";

    case "pending":
    case "pending approval":
    case "pending_approval":
    case "pending-approval":
    default:
      return "Pending Approval";
  }
}

/* =========================================================
   CATEGORY DETECTION
   Only uses backend title/description.
   No fake category is created.
========================================================= */

function normalizeCategory(
  value: unknown,
  title: string,
  description: string,
): ActionCategory | null {
  const source =
    `${String(value || "")} ${title} ${description}`
      .toLowerCase();

  if (source.includes("hvac") || source.includes("air conditioning")) {
    return "HVAC";
  }

  if (
    source.includes("lighting") ||
    source.includes("light")
  ) {
    return "Lighting";
  }

  if (
    source.includes("occupancy") ||
    source.includes("occupied") ||
    source.includes("unoccupied")
  ) {
    return "Occupancy";
  }

  if (
    source.includes("equipment") ||
    source.includes("sensor") ||
    source.includes("machine")
  ) {
    return "Equipment";
  }

  if (
    source.includes("energy") ||
    source.includes("consumption") ||
    source.includes("power")
  ) {
    return "Energy";
  }

  return null;
}

/* =========================================================
   ICON DETECTION
========================================================= */

function normalizeIcon(
  value: unknown,
  category: ActionCategory | null,
): ActionIcon {
  const icon = String(value || "").toLowerCase();

  if (
    icon === "hvac" ||
    icon === "lighting" ||
    icon === "energy" ||
    icon === "occupancy"
  ) {
    return icon as ActionIcon;
  }

  switch (category) {
    case "HVAC":
      return "hvac";

    case "Lighting":
      return "lighting";

    case "Occupancy":
      return "occupancy";

    case "Energy":
    case "Equipment":
    default:
      return "energy";
  }
}

/* =========================================================
   PRIORITY
========================================================= */

function normalizePriority(
  value: unknown,
): ActionPriority | null {
  const priority = String(value || "")
    .trim()
    .toLowerCase();

  if (priority === "critical") {
    return "Critical";
  }

  if (priority === "high") {
    return "High";
  }

  if (priority === "medium") {
    return "Medium";
  }

  return null;
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(
  value: unknown,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

/* =========================================================
   NORMALIZE BACKEND RECOMMENDATION
========================================================= */

function normalizeRecommendation(
  item: BackendRecommendation,
): ActionItem {
  const title = getString(
    item.title,
    "Untitled Recommendation",
  );

  const description = getString(
    item.description,
    "No description available.",
  );

  const category = normalizeCategory(
    item.category,
    title,
    description,
  );

  const estimatedSavings = getNumber(
    item.estimated_savings ??
      item.estimatedSavings,
  );

  const savingsPercentage =
    getNumber(
      item.savings_percentage ??
        item.savingsPercentage,
    );

  const status = normalizeStatus(
    item.status,
  );

  return {
    id: item.id,

    title,

    category,

    zone: getString(
      item.zone,
    ),

    priority: normalizePriority(
      item.priority,
    ),

    status,

    description,

    recommendation: getString(
      item.recommendation,
      description,
    ),

    reason: getString(
      item.reason,
      description,
    ),

    estimatedSavings,

    savingsPercentage,

    assignedTo: getString(
      item.assigned_to ??
        item.assignedTo,
    ),

    createdAt: formatDate(
      item.created_at ??
        item.createdAt,
    ),

    dueDate: formatDate(
      item.due_date ??
        item.dueDate,
    ),

    approvedBy: getString(
      item.approved_by ??
        item.approvedBy,
    ),

    approvedAt: formatDate(
      item.approved_at ??
        item.approvedAt,
    ),

    agent: getString(
      item.agent ??
        item.agent_name ??
        item.agentName,
    ),

    icon: normalizeIcon(
      item.icon,
      category,
    ),
  };
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ActionTracker() {
  const navigate = useNavigate();

  const [activePage, setActivePage] =
    useState("Action Tracker");

  const [actions, setActions] =
    useState<ActionItem[]>([]);

  const [statusFilter, setStatusFilter] =
    useState<"All" | ActionStatus>("All");

  const [priorityFilter, setPriorityFilter] =
    useState<"All" | ActionPriority>("All");

  const [categoryFilter, setCategoryFilter] =
    useState<"All" | ActionCategory>("All");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(false);

  const [selectedAction, setSelectedAction] =
    useState<ActionItem | null>(null);

  const [toast, setToast] =
    useState("");

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =========================================================
     TOAST
  ========================================================= */

  const showToast = useCallback(
    (message: string) => {
      setToast(message);

      window.setTimeout(() => {
        setToast("");
      }, 2500);
    },
    [],
  );

  /* =========================================================
     LOAD ACTIONS FROM BACKEND
  ========================================================= */

  const loadActions = useCallback(
    async (
      showLoading = true,
    ) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }

        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/recommendations`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load recommendations (${response.status})`,
          );
        }

        const result =
          await response.json();

        /*
         * Supports both:
         *
         * [...]
         *
         * and:
         *
         * {
         *   recommendations: [...]
         * }
         */

        const records: BackendRecommendation[] =
          Array.isArray(result)
            ? result
            : Array.isArray(
                result?.recommendations,
              )
            ? result.recommendations
            : [];

        const normalized =
          records
            .filter(
              (item) =>
                item &&
                typeof item.id === "number",
            )
            .map(
              normalizeRecommendation,
            );

        setActions(normalized);

        /*
         * Keep selected modal synchronized
         * with latest backend data.
         */

        setSelectedAction(
          (current) => {
            if (!current) {
              return null;
            }

            return (
              normalized.find(
                (item) =>
                  item.id === current.id,
              ) ?? null
            );
          },
        );
      } catch (err) {
        console.error(
          "Action Tracker API error:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load actions from backend.",
        );

        setActions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  /* =========================================================
     FILTER ACTIONS
  ========================================================= */

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const searchValue =
        searchTerm
          .toLowerCase()
          .trim();

      const searchableValues = [
        action.title,
        action.zone,
        action.category ?? "",
        action.agent,
        action.assignedTo,
        action.description,
      ]
        .join(" ")
        .toLowerCase();

      const searchMatch =
        searchValue === "" ||
        searchableValues.includes(
          searchValue,
        );

      const statusMatch =
        statusFilter === "All" ||
        action.status === statusFilter;

      const priorityMatch =
        priorityFilter === "All" ||
        action.priority === priorityFilter;

      const categoryMatch =
        categoryFilter === "All" ||
        action.category === categoryFilter;

      return (
        searchMatch &&
        statusMatch &&
        priorityMatch &&
        categoryMatch
      );
    });
  }, [
    actions,
    searchTerm,
    statusFilter,
    priorityFilter,
    categoryFilter,
  ]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const pendingActions =
    actions.filter(
      (action) =>
        action.status ===
        "Pending Approval",
    ).length;

  const approvedActions =
    actions.filter(
      (action) =>
        action.status === "Approved",
    ).length;

  const inProgressActions =
    actions.filter(
      (action) =>
        action.status ===
        "In Progress",
    ).length;

  const completedActions =
    actions.filter(
      (action) =>
        action.status ===
        "Completed",
    ).length;

  const potentialSavings =
    actions
      .filter(
        (action) =>
          action.status !==
          "Rejected",
      )
      .reduce(
        (sum, action) =>
          sum +
          (action.estimatedSavings ??
            0),
        0,
      );

  const approvalRate =
    actions.length > 0
      ? Math.round(
          ((approvedActions +
            inProgressActions +
            completedActions) /
            actions.length) *
            100,
        )
      : 0;

  const completionRate =
    actions.length > 0
      ? Math.round(
          (completedActions /
            actions.length) *
            100,
        )
      : 0;

  /* =========================================================
     UPDATE BACKEND STATUS
  ========================================================= */

  const updateActionStatus = async (
    id: number,
    status: ActionStatus,
  ) => {
    try {
      /*
       * Existing backend supports:
       * PATCH /api/recommendations/<id>
       *
       * The backend receives the database status.
       */

      const backendStatus =
        status === "Rejected"
          ? "Dismissed"
          : status;

      const response = await fetch(
        `${API_BASE_URL}/api/recommendations/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            status: backendStatus,
          }),
        },
      );

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(
          message ||
            `Unable to update recommendation (${response.status})`,
        );
      }

      /*
       * Always reload from database.
       * This prevents the UI from becoming
       * different from the backend.
       */

      await loadActions(false);

      if (status === "Approved") {
        showToast(
          "Action approved successfully.",
        );
      }

      if (status === "In Progress") {
        showToast(
          "Action moved to In Progress.",
        );
      }

      if (status === "Completed") {
        showToast(
          "Action marked as completed.",
        );
      }

      if (status === "Rejected") {
        showToast(
          "Action rejected.",
        );
      }
    } catch (err) {
      console.error(
        "Action status update error:",
        err,
      );

      showToast(
        err instanceof Error
          ? err.message
          : "Unable to update action.",
      );
    }
  };

  /* =========================================================
     APPROVE ACTION
  ========================================================= */

  const approveAction = async (
    action: ActionItem,
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recommendations/${action.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            status: "Approved",
          }),
        },
      );

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(
          message ||
            "Unable to approve action.",
        );
      }

      setSelectedAction(null);

      await loadActions(false);

      showToast(
        "Action approved and added to execution queue.",
      );
    } catch (err) {
      console.error(
        "Approve action error:",
        err,
      );

      showToast(
        err instanceof Error
          ? err.message
          : "Unable to approve action.",
      );
    }
  };

  /* =========================================================
     REFRESH FROM BACKEND
  ========================================================= */

  const refreshActions = async () => {
    try {
      setIsRefreshing(true);

      await loadActions(false);

      showToast(
        "Action tracker synchronized with backend.",
      );
    } catch {
      showToast(
        "Unable to synchronize actions.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCategoryFilter("All");
  };

  /* =========================================================
     EXPORT CSV
  ========================================================= */

  const exportActions = () => {
    if (actions.length === 0) {
      showToast(
        "No backend actions available to export.",
      );
      return;
    }

    const headers = [
      "ID",
      "Action",
      "Category",
      "Zone",
      "Priority",
      "Status",
      "Estimated Savings",
      "Savings %",
      "Assigned To",
      "Due Date",
      "AI Agent",
      "Created",
    ];

    const rows = actions.map(
      (action) => [
        action.id,
        action.title,
        action.category ?? "—",
        action.zone,
        action.priority ?? "—",
        action.status,
        action.estimatedSavings ??
          "—",
        action.savingsPercentage ??
          "—",
        action.assignedTo,
        action.dueDate,
        action.agent,
        action.createdAt,
      ],
    );

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            `"${String(
              value,
            ).replaceAll(
              '"',
              '""',
            )}"`,
          )
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href = url;

    link.download =
      "smart-building-action-tracker.csv";

    document.body.appendChild(
      link,
    );

    link.click();

    document.body.removeChild(
      link,
    );

    URL.revokeObjectURL(
      url,
    );

    showToast(
      "Action tracker exported successfully.",
    );
  };

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const openRecommendations = () => {
    setActivePage(
      "Recommendations",
    );

    navigate(
      "/recommendations",
    );
  };

  const openEquipment = () => {
    setActivePage(
      "Equipment Monitoring",
    );

    navigate(
      "/equipment-monitoring",
    );
  };

  /* =========================================================
     ICON
  ========================================================= */

  const getIcon = (
    icon: ActionIcon,
  ) => {
    switch (icon) {
      case "hvac":
        return <Fan size={22} />;

      case "lighting":
        return (
          <Lightbulb size={22} />
        );

      case "energy":
        return (
          <Zap size={22} />
        );

      case "occupancy":
        return (
          <Users size={22} />
        );

      default:
        return (
          <Activity size={22} />
        );
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="app-layout">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content">

        <Topbar
          activePage={activePage}
        />

        <div className="action-tracker-page">

          {/* =================================================
              HEADER
          ================================================= */}

          <section className="action-header">

            <div>

              <div className="action-eyebrow">
                <ClipboardCheck size={16} />
                HUMAN APPROVAL & ACTION CENTER
              </div>

              <h1>
                Action Tracker
              </h1>

              <p>
                Review AI-generated recommendations,
                approve operational actions and track
                their implementation across the building.
              </p>

            </div>

            <div className="action-header-buttons">

              <button
                className="action-secondary-button"
                onClick={
                  openRecommendations
                }
              >
                <Sparkles size={16} />

                Recommendations

                <ChevronRight size={15} />
              </button>

              <button
                className="action-export-button"
                onClick={
                  exportActions
                }
              >
                <TrendingDown size={16} />

                Export CSV
              </button>

              <button
                className="action-primary-button"
                onClick={
                  refreshActions
                }
                disabled={
                  isRefreshing
                }
              >
                <RefreshCw
                  size={16}
                  className={
                    isRefreshing
                      ? "action-spin"
                      : ""
                  }
                />

                {isRefreshing
                  ? "Syncing..."
                  : "Sync Actions"}
              </button>

            </div>

          </section>

          {/* =================================================
              WORKFLOW
          ================================================= */}

          <section className="workflow-card">

            <div className="workflow-title">

              <div className="workflow-icon">
                <ShieldCheck size={20} />
              </div>

              <div>

                <h2>
                  Human Approval Workflow
                </h2>

                <p>
                  AI recommends. Humans approve.
                  Teams execute. System verifies.
                </p>

              </div>

            </div>

            <div className="workflow-steps">

              <WorkflowStep
                number="01"
                icon={<Bot size={18} />}
                title="AI Recommendation"
                description="Agent identifies opportunity"
                active
              />

              <div className="workflow-arrow">
                <ArrowRight size={17} />
              </div>

              <WorkflowStep
                number="02"
                icon={
                  <UserCheck size={18} />
                }
                title="Human Approval"
                description="Manager reviews action"
                active
              />

              <div className="workflow-arrow">
                <ArrowRight size={17} />
              </div>

              <WorkflowStep
                number="03"
                icon={<Play size={18} />}
                title="Execution"
                description="Team implements action"
              />

              <div className="workflow-arrow">
                <ArrowRight size={17} />
              </div>

              <WorkflowStep
                number="04"
                icon={
                  <CheckCircle2 size={18} />
                }
                title="Verification"
                description="System confirms result"
              />

            </div>

          </section>

          {/* =================================================
              KPI CARDS
          ================================================= */}

          <section className="action-kpi-grid">

            <ActionKpi
              icon={<Clock3 size={21} />}
              title="Pending Approval"
              value={pendingActions}
              description="Requires manager review"
              type="pending"
            />

            <ActionKpi
              icon={<UserCheck size={21} />}
              title="Approved"
              value={approvedActions}
              description="Ready for execution"
              type="approved"
            />

            <ActionKpi
              icon={<Play size={21} />}
              title="In Progress"
              value={inProgressActions}
              description="Currently being executed"
              type="progress"
            />

            <ActionKpi
              icon={
                <CheckCircle2 size={21} />
              }
              title="Completed"
              value={completedActions}
              description="Successfully implemented"
              type="completed"
            />

            <ActionKpi
              icon={
                <TrendingDown size={21} />
              }
              title="Potential Savings"
              value={potentialSavings}
              unit="kWh/day"
              description="Across active actions"
              type="savings"
            />

          </section>

          {/* =================================================
              SEARCH / FILTER
          ================================================= */}

          <section className="action-toolbar">

            <div className="action-search">

              <Search size={17} />

              <input
                type="text"
                placeholder="Search actions, zones, categories or agents..."
                value={
                  searchTerm
                }
                onChange={(
                  event,
                ) =>
                  setSearchTerm(
                    event.target
                      .value,
                  )
                }
              />

              {searchTerm && (
                <button
                  className="search-clear"
                  onClick={() =>
                    setSearchTerm(
                      "",
                    )
                  }
                >
                  <X size={15} />
                </button>
              )}

            </div>

            <div className="action-toolbar-buttons">

              <button
                className={`action-filter-button ${
                  showFilters
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setShowFilters(
                    !showFilters,
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
            <section className="action-filter-panel">

              <FilterSelect
                label="Status"
                value={
                  statusFilter
                }
                onChange={(
                  value,
                ) =>
                  setStatusFilter(
                    value as
                      | "All"
                      | ActionStatus,
                  )
                }
                options={[
                  "All",
                  "Pending Approval",
                  "Approved",
                  "In Progress",
                  "Completed",
                  "Rejected",
                ]}
              />

              <FilterSelect
                label="Priority"
                value={
                  priorityFilter
                }
                onChange={(
                  value,
                ) =>
                  setPriorityFilter(
                    value as
                      | "All"
                      | ActionPriority,
                  )
                }
                options={[
                  "All",
                  "Critical",
                  "High",
                  "Medium",
                ]}
              />

              <FilterSelect
                label="Category"
                value={
                  categoryFilter
                }
                onChange={(
                  value,
                ) =>
                  setCategoryFilter(
                    value as
                      | "All"
                      | ActionCategory,
                  )
                }
                options={[
                  "All",
                  "HVAC",
                  "Lighting",
                  "Energy",
                  "Occupancy",
                  "Equipment",
                ]}
              />

              <button
                className="clear-actions-button"
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>

            </section>
          )}

          {/* =================================================
              ACTIVE FILTERS
          ================================================= */}

          {(statusFilter !==
            "All" ||
            priorityFilter !==
              "All" ||
            categoryFilter !==
              "All" ||
            searchTerm !== "") && (
            <div className="active-filters">

              <span>
                Active filters:
              </span>

              {searchTerm && (
                <button
                  onClick={() =>
                    setSearchTerm(
                      "",
                    )
                  }
                >
                  Search:{" "}
                  {searchTerm}
                  <X size={13} />
                </button>
              )}

              {statusFilter !==
                "All" && (
                <button
                  onClick={() =>
                    setStatusFilter(
                      "All",
                    )
                  }
                >
                  {statusFilter}
                  <X size={13} />
                </button>
              )}

              {priorityFilter !==
                "All" && (
                <button
                  onClick={() =>
                    setPriorityFilter(
                      "All",
                    )
                  }
                >
                  {priorityFilter}
                  <X size={13} />
                </button>
              )}

              {categoryFilter !==
                "All" && (
                <button
                  onClick={() =>
                    setCategoryFilter(
                      "All",
                    )
                  }
                >
                  {categoryFilter}
                  <X size={13} />
                </button>
              )}

            </div>
          )}

          {/* =================================================
              ACTION LIST
          ================================================= */}

          <section className="action-list-section">

            <div className="action-list-header">

              <div>

                <h2>
                  Operational Actions
                </h2>

                <p>
                  {isLoading
                    ? "Loading actions from backend..."
                    : `${filteredActions.length} actions matching current filters`}
                </p>

              </div>

              <div className="live-indicator">
                <span />
                Live Tracking
              </div>

            </div>

            {/* BACKEND ERROR */}

            {error && (
              <div className="action-empty">

                <AlertTriangle
                  size={35}
                />

                <h3>
                  Unable to load actions
                </h3>

                <p>
                  {error}
                </p>

                <button
                  onClick={() =>
                    void loadActions()
                  }
                >
                  Try Again
                </button>

              </div>
            )}

            {/* LOADING */}

            {isLoading &&
              !error && (
                <div className="action-empty">

                  <RefreshCw
                    size={35}
                    className="action-spin"
                  />

                  <h3>
                    Loading actions
                  </h3>

                  <p>
                    Retrieving operational
                    recommendations from
                    the backend.
                  </p>

                </div>
              )}

            {/* ACTIONS */}

            {!isLoading &&
              !error && (
                <div className="action-list">

                  {filteredActions.map(
                    (action) => (
                      <ActionCard
                        key={
                          action.id
                        }
                        action={
                          action
                        }
                        icon={getIcon(
                          action.icon,
                        )}
                        onView={() =>
                          setSelectedAction(
                            action,
                          )
                        }
                        onApprove={() =>
                          void approveAction(
                            action,
                          )
                        }
                        onStart={() =>
                          void updateActionStatus(
                            action.id,
                            "In Progress",
                          )
                        }
                        onComplete={() =>
                          void updateActionStatus(
                            action.id,
                            "Completed",
                          )
                        }
                      />
                    ),
                  )}

                </div>
              )}

            {!isLoading &&
              !error &&
              filteredActions.length ===
                0 && (
                <div className="action-empty">

                  <Search size={35} />

                  <h3>
                    No actions found
                  </h3>

                  <p>
                    {actions.length ===
                    0
                      ? "No operational recommendations are currently available in the backend."
                      : "Try changing your search or filter criteria."}
                  </p>

                  <button
                    onClick={
                      actions.length ===
                      0
                        ? () =>
                            void loadActions()
                        : clearFilters
                    }
                  >
                    {actions.length ===
                    0
                      ? "Refresh Data"
                      : "Clear Filters"}
                  </button>

                </div>
              )}

          </section>

          {/* =================================================
              EXECUTION SUMMARY
          ================================================= */}

          <section className="execution-summary">

            <div className="execution-summary-header">

              <div>

                <div className="execution-label">
                  <Activity size={16} />
                  EXECUTION MONITORING
                </div>

                <h2>
                  Action Execution Overview
                </h2>

                <p>
                  Current progress of approved
                  recommendations.
                </p>

              </div>

            </div>

            <div className="execution-grid">

              <ExecutionMetric
                title="Approval Rate"
                value={`${approvalRate}%`}
                description="Recommendations approved"
              />

              <ExecutionMetric
                title="Completion Rate"
                value={`${completionRate}%`}
                description="Actions completed"
              />

              <ExecutionMetric
                title="Active Savings"
                value={`${potentialSavings}`}
                unit="kWh/day"
                description="Estimated opportunity"
              />

              <ExecutionMetric
                title="AI Confidence"
                value="—"
                description="Confidence is not provided by the current backend."
              />

            </div>

            <div className="execution-progress">

              <div className="execution-progress-top">

                <span>
                  Overall action progress
                </span>

                <strong>
                  {completedActions} /{" "}
                  {actions.length}
                </strong>

              </div>

              <div className="execution-progress-track">

                <div
                  className="execution-progress-fill"
                  style={{
                    width: `${completionRate}%`,
                  }}
                />

              </div>

            </div>

          </section>

          {/* =================================================
              QUICK LINKS
          ================================================= */}

          <section className="action-quick-links">

            <div className="quick-link-info">

              <div className="quick-link-icon">
                <Cpu size={21} />
              </div>

              <div>

                <h3>
                  Review supporting equipment data
                </h3>

                <p>
                  Inspect HVAC, lighting and
                  equipment status before executing
                  operational actions.
                </p>

              </div>

            </div>

            <button
              className="equipment-link-button"
              onClick={
                openEquipment
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

          <div className="action-footer">

            <ShieldCheck size={16} />

            <span>
              All AI-generated actions require
              authorized human approval before
              implementation.
            </span>

          </div>

        </div>

      </main>

      {/* =====================================================
          ACTION DETAIL MODAL
      ===================================================== */}

      {selectedAction && (
        <div
          className="action-modal-overlay"
          onClick={() =>
            setSelectedAction(
              null,
            )
          }
        >

          <div
            className="action-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="action-modal-header">

              <div className="action-modal-title">

                <div
                  className={`action-modal-icon ${
                    selectedAction.icon
                  }`}
                >
                  {getIcon(
                    selectedAction.icon,
                  )}
                </div>

                <div>

                  <span>
                    {selectedAction.category ??
                      "Recommendation"}
                  </span>

                  <h2>
                    {selectedAction.title}
                  </h2>

                </div>

              </div>

              <button
                className="action-modal-close"
                onClick={() =>
                  setSelectedAction(
                    null,
                  )
                }
              >
                <X size={19} />
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="action-modal-body">

              <div className="action-modal-badges">

                <span
                  className={`action-priority ${
                    (
                      selectedAction.priority ??
                      "Medium"
                    ).toLowerCase()
                  }`}
                >
                  {selectedAction.priority ??
                    "—"}
                </span>

                <span
                  className={`action-status ${
                    selectedAction.status
                      .toLowerCase()
                      .replaceAll(
                        " ",
                        "-",
                      )
                  }`}
                >
                  {selectedAction.status}
                </span>

              </div>

              {/* DESCRIPTION */}

              <div className="modal-action-section">

                <h3>
                  Action Description
                </h3>

                <p>
                  {
                    selectedAction.description
                  }
                </p>

              </div>

              {/* RECOMMENDATION */}

              <div className="modal-action-section">

                <h3>
                  AI Recommendation
                </h3>

                <div className="modal-ai-box">

                  <Sparkles size={18} />

                  <p>
                    {
                      selectedAction.recommendation
                    }
                  </p>

                </div>

              </div>

              {/* REASON */}

              <div className="modal-action-section">

                <h3>
                  Detection Reason
                </h3>

                <div className="modal-reason-box">

                  <AlertTriangle
                    size={17}
                  />

                  <p>
                    {
                      selectedAction.reason
                    }
                  </p>

                </div>

              </div>

              {/* DETAILS */}

              <div className="modal-details-grid">

                <ModalDetail
                  icon={
                    <Activity size={15} />
                  }
                  label="Zone"
                  value={
                    selectedAction.zone
                  }
                />

                <ModalDetail
                  icon={
                    <TrendingDown
                      size={15}
                    />
                  }
                  label="Estimated Savings"
                  value={
                    selectedAction.estimatedSavings !==
                    null
                      ? `${selectedAction.estimatedSavings} kWh/day`
                      : "—"
                  }
                />

                <ModalDetail
                  icon={
                    <Calendar size={15} />
                  }
                  label="Due Date"
                  value={
                    selectedAction.dueDate
                  }
                />

                <ModalDetail
                  icon={
                    <Users size={15} />
                  }
                  label="Assigned To"
                  value={
                    selectedAction.assignedTo
                  }
                />

                <ModalDetail
                  icon={
                    <Bot size={15} />
                  }
                  label="Generated By"
                  value={
                    selectedAction.agent
                  }
                />

                <ModalDetail
                  icon={
                    <Clock3 size={15} />
                  }
                  label="Created"
                  value={
                    selectedAction.createdAt
                  }
                />

              </div>

              {/* SAVINGS HIGHLIGHT */}

              <div className="modal-savings-highlight">

                <div className="modal-savings-icon">

                  <TrendingDown
                    size={20}
                  />

                </div>

                <div>

                  <span>
                    Estimated Energy Opportunity
                  </span>

                  <strong>
                    {selectedAction.estimatedSavings !==
                    null
                      ? `${selectedAction.estimatedSavings} kWh/day`
                      : "—"}
                  </strong>

                </div>

                <div className="modal-savings-percent">

                  <TrendingDown
                    size={14}
                  />

                  {selectedAction.savingsPercentage !==
                  null
                    ? `${selectedAction.savingsPercentage}%`
                    : "—"}

                </div>

              </div>

              {/* APPROVAL INFORMATION */}

              <div className="approval-info">

                <div className="approval-info-icon">

                  <UserCheck
                    size={18}
                  />

                </div>

                <div>

                  <span>
                    Approval Information
                  </span>

                  <strong>
                    {selectedAction.approvedBy !==
                      "—" &&
                    selectedAction.approvedBy !==
                      ""
                      ? `Approved by ${selectedAction.approvedBy}`
                      : selectedAction.status ===
                        "Pending Approval"
                      ? "Awaiting facility manager approval"
                      : "No approval information provided"}
                  </strong>

                  <small>
                    {selectedAction.approvedAt !==
                    "—"
                      ? selectedAction.approvedAt
                      : "No approval recorded yet"}
                  </small>

                </div>

              </div>

            </div>

            {/* MODAL FOOTER */}

            <div className="action-modal-footer">

              {selectedAction.status ===
                "Pending Approval" && (
                <>
                  <button
                    className="modal-reject-button"
                    onClick={() =>
                      void updateActionStatus(
                        selectedAction.id,
                        "Rejected",
                      )
                    }
                  >
                    <X size={16} />
                    Reject
                  </button>

                  <button
                    className="modal-approve-action"
                    onClick={() =>
                      void approveAction(
                        selectedAction,
                      )
                    }
                  >
                    <Check size={16} />
                    Approve Action
                  </button>
                </>
              )}

              {selectedAction.status ===
                "Approved" && (
                <button
                  className="modal-start-button"
                  onClick={() =>
                    void updateActionStatus(
                      selectedAction.id,
                      "In Progress",
                    )
                  }
                >
                  <Play size={16} />
                  Start Execution
                </button>
              )}

              {selectedAction.status ===
                "In Progress" && (
                <button
                  className="modal-complete-button"
                  onClick={() =>
                    void updateActionStatus(
                      selectedAction.id,
                      "Completed",
                    )
                  }
                >
                  <CheckCircle2
                    size={16}
                  />
                  Mark Completed
                </button>
              )}

              {selectedAction.status ===
                "Completed" && (
                <button
                  className="modal-close-action"
                  onClick={() =>
                    setSelectedAction(
                      null,
                    )
                  }
                >
                  <CheckCircle2
                    size={16}
                  />
                  Completed
                </button>
              )}

              {selectedAction.status ===
                "Rejected" && (
                <button
                  className="modal-close-action"
                  onClick={() =>
                    setSelectedAction(
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
        <div className="action-toast">

          <CheckCircle2 size={18} />

          {toast}

        </div>
      )}

    </div>
  );
}

/* =========================================================
   WORKFLOW STEP
========================================================= */

interface WorkflowStepProps {
  number: string;
  icon: ReactNode;
  title: string;
  description: string;
  active?: boolean;
}

function WorkflowStep({
  number,
  icon,
  title,
  description,
  active,
}: WorkflowStepProps) {
  return (
    <div
      className={`workflow-step ${
        active
          ? "workflow-active"
          : ""
      }`}
    >

      <div className="workflow-step-number">
        {number}
      </div>

      <div className="workflow-step-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

    </div>
  );
}

/* =========================================================
   KPI
========================================================= */

interface ActionKpiProps {
  icon: ReactNode;
  title: string;
  value: number;
  unit?: string;
  description: string;
  type: string;
}

function ActionKpi({
  icon,
  title,
  value,
  unit,
  description,
  type,
}: ActionKpiProps) {
  return (
    <div className="action-kpi">

      <div className="action-kpi-icon-wrapper">

        <div
          className={`action-kpi-icon ${type}`}
        >
          {icon}
        </div>

      </div>

      <span className="action-kpi-title">
        {title}
      </span>

      <div className="action-kpi-value">

        <strong>
          {value}
        </strong>

        {unit && (
          <span>
            {unit}
          </span>
        )}

      </div>

      <span className="action-kpi-description">
        {description}
      </span>

    </div>
  );
}

/* =========================================================
   FILTER SELECT
========================================================= */

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: FilterSelectProps) {
  return (
    <div className="action-filter-group">

      <label>
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
      >

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ),
        )}

      </select>

    </div>
  );
}

/* =========================================================
   ACTION CARD
========================================================= */

interface ActionCardProps {
  action: ActionItem;
  icon: ReactNode;
  onView: () => void;
  onApprove: () => void;
  onStart: () => void;
  onComplete: () => void;
}

function ActionCard({
  action,
  icon,
  onView,
  onApprove,
  onStart,
  onComplete,
}: ActionCardProps) {
  const priorityClass =
    (
      action.priority ??
      "Medium"
    ).toLowerCase();

  return (
    <article
      className={`action-card ${priorityClass}`}
    >

      {/* LEFT */}

      <div className="action-card-left">

        <div
          className={`action-card-icon ${
            action.icon
          }`}
        >
          {icon}
        </div>

        <div className="action-card-content">

          <div className="action-card-title-row">

            <div>

              <span className="action-category">
                {action.category ??
                  "Recommendation"}
              </span>

              <h3>
                {action.title}
              </h3>

            </div>

            <div className="action-card-badges">

              <span
                className={`action-priority ${priorityClass}`}
              >
                {action.priority ??
                  "—"}
              </span>

              <span
                className={`action-status ${
                  action.status
                    .toLowerCase()
                    .replaceAll(
                      " ",
                      "-",
                    )
                }`}
              >
                {action.status}
              </span>

            </div>

          </div>

          <p>
            {action.description}
          </p>

          <div className="action-card-meta">

            <span>
              <Activity size={14} />
              {action.zone}
            </span>

            <span>
              <Users size={14} />
              {action.assignedTo}
            </span>

            <span>
              <Calendar size={14} />
              Due{" "}
              {action.dueDate}
            </span>

          </div>

        </div>

      </div>

      {/* SAVINGS */}

      <div className="action-card-savings">

        <span>
          Potential Savings
        </span>

        <strong>
          {action.estimatedSavings ??
            "—"}
        </strong>

        <small>
          {action.estimatedSavings !==
          null
            ? "kWh/day"
            : ""}
        </small>

        <div>

          <TrendingDown
            size={12}
          />

          {action.savingsPercentage !==
          null
            ? `${action.savingsPercentage}%`
            : "—"}

        </div>

      </div>

      {/* ACTION BUTTONS */}

      <div className="action-card-buttons">

        <button
          className="view-action-button"
          onClick={onView}
        >
          <Eye size={15} />
          View
        </button>

        {action.status ===
          "Pending Approval" && (
          <button
            className="approve-action-button"
            onClick={onApprove}
          >
            <Check size={15} />
            Approve
          </button>
        )}

        {action.status ===
          "Approved" && (
          <button
            className="start-action-button"
            onClick={onStart}
          >
            <Play size={15} />
            Start
          </button>
        )}

        {action.status ===
          "In Progress" && (
          <button
            className="complete-action-button"
            onClick={onComplete}
          >
            <CheckCircle2
              size={15}
            />
            Complete
          </button>
        )}

        {action.status ===
          "Completed" && (
          <span className="completed-label">

            <CheckCircle2
              size={15}
            />

            Done

          </span>
        )}

        {action.status ===
          "Rejected" && (
          <span className="rejected-label">

            <X size={14} />

            Rejected

          </span>
        )}

      </div>

    </article>
  );
}

/* =========================================================
   EXECUTION METRIC
========================================================= */

interface ExecutionMetricProps {
  title: string;
  value: string;
  unit?: string;
  description: string;
}

function ExecutionMetric({
  title,
  value,
  unit,
  description,
}: ExecutionMetricProps) {
  return (
    <div className="execution-metric">

      <span>
        {title}
      </span>

      <div>

        <strong>
          {value}
        </strong>

        {unit && (
          <small>
            {unit}
          </small>
        )}

      </div>

      <p>
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   MODAL DETAIL
========================================================= */

interface ModalDetailProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function ModalDetail({
  icon,
  label,
  value,
}: ModalDetailProps) {
  return (
    <div className="modal-detail">

      <div>
        {icon}
      </div>

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}
