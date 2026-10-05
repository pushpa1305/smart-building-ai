import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  CircleCheck,
  Clock3,
  LayoutDashboard,
  Lightbulb,
  Search,
  Settings,
  Thermometer,
  TrendingUp,
  Users,
  Wind,
  XCircle,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  getBuildings,
  getLiveMonitoring,
  type Building,
} from "../services/api";

/* =========================================================
   TYPES
   ========================================================= */

interface SensorRow {
  id: number | string;
  zone: string;
  floor: string;
  temperature: number;
  humidity: number;
  occupancy: number;
  energy: number;
  hvac: boolean;
  lighting: boolean;
  status: "Normal" | "Warning" | "Critical";
  updated: string;
}

interface GenericRecord {
  [key: string]: unknown;
}

/* =========================================================
   HELPERS
   ========================================================= */

function isRecord(value: unknown): value is GenericRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function toNumber(value: unknown, fallback = 0): number {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .toLowerCase();

    return (
      normalized === "true" ||
      normalized === "on" ||
      normalized === "active" ||
      normalized === "running" ||
      normalized === "1"
    );
  }

  return false;
}

function getString(
  record: GenericRecord,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim() !== ""
    ) {
      return value;
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
  }

  return "";
}

function getValue(
  record: GenericRecord,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (
      record[key] !== undefined &&
      record[key] !== null
    ) {
      return record[key];
    }
  }

  return undefined;
}

function formatUpdated(
  timestamp?: string
): string {
  if (!timestamp) {
    return "Just now";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const difference =
    Date.now() - date.getTime();

  if (difference < 60_000) {
    return "Just now";
  }

  const minutes = Math.floor(
    difference / 60_000
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleDateString();
}

function normalizeStatus(
  status: unknown
): "Normal" | "Warning" | "Critical" {
  const value = String(
    status ?? "Normal"
  ).toLowerCase();

  if (
    value.includes("critical") ||
    value.includes("danger") ||
    value.includes("offline")
  ) {
    return "Critical";
  }

  if (
    value.includes("warning") ||
    value.includes("warn")
  ) {
    return "Warning";
  }

  return "Normal";
}

/* =========================================================
   NORMALIZE SENSOR
   ========================================================= */

function normalizeSensor(
  sensor: unknown,
  index: number
): SensorRow {
  const record: GenericRecord =
    isRecord(sensor)
      ? sensor
      : {};

  const type = getString(
    record,
    "type",
    "sensor_type"
  ).toLowerCase();

  const numericValue = toNumber(
    getValue(
      record,
      "value",
      "reading"
    )
  );

  let temperature = toNumber(
    getValue(
      record,
      "temperature",
      "temp"
    )
  );

  let humidity = toNumber(
    getValue(
      record,
      "humidity"
    )
  );

  let occupancy = toNumber(
    getValue(
      record,
      "occupancy",
      "occupancy_percent",
      "occupancyPercentage"
    )
  );

  let energy = toNumber(
    getValue(
      record,
      "energy",
      "power",
      "energy_consumption",
      "consumption"
    )
  );

  /*
   * Some APIs return one generic `value`
   * depending on sensor type.
   */

  if (
    temperature === 0 &&
    (type.includes("temperature") ||
      type.includes("temp"))
  ) {
    temperature = numericValue;
  }

  if (
    humidity === 0 &&
    type.includes("humidity")
  ) {
    humidity = numericValue;
  }

  if (
    occupancy === 0 &&
    type.includes("occupancy")
  ) {
    occupancy = numericValue;
  }

  if (
    energy === 0 &&
    (type.includes("energy") ||
      type.includes("power"))
  ) {
    energy = numericValue;
  }

  const hvac = toBoolean(
    getValue(
      record,
      "hvac",
      "hvac_status",
      "hvacStatus"
    )
  );

  const lighting = toBoolean(
    getValue(
      record,
      "lighting",
      "lighting_status",
      "lightingStatus"
    )
  );

  const idValue = getValue(
    record,
    "id",
    "sensor_id"
  );

  const zone =
    getString(
      record,
      "zone",
      "zone_name",
      "zoneName",
      "area"
    ) || `Zone ${index + 1}`;

  const floor =
    getString(
      record,
      "floor",
      "floor_name",
      "floorName"
    ) || "Unknown Floor";

  const timestamp =
    getString(
      record,
      "timestamp",
      "updated",
      "updated_at",
      "updatedAt",
      "datetime",
      "date",
      "time"
    );

  return {
    id:
      typeof idValue === "number" ||
      typeof idValue === "string"
        ? idValue
        : index + 1,

    zone,
    floor,

    temperature,

    humidity,

    occupancy,

    energy,

    hvac,

    lighting,

    status: normalizeStatus(
      getValue(
        record,
        "status",
        "state",
        "health"
      )
    ),

    updated:
      formatUpdated(timestamp),
  };
}

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

function getSensorsFromResponse(
  response: unknown
): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!isRecord(response)) {
    return [];
  }

  const possibleKeys = [
    "sensors",
    "sensorData",
    "sensor_data",
    "readings",
    "data",
  ];

  for (const key of possibleKeys) {
    const value = response[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function getNestedRecord(
  response: unknown,
  ...keys: string[]
): GenericRecord | null {
  if (!isRecord(response)) {
    return null;
  }

  for (const key of keys) {
    const value = response[key];

    if (isRecord(value)) {
      return value;
    }
  }

  return null;
}

function getResponseArray(
  response: unknown,
  ...keys: string[]
): GenericRecord[] {
  if (!isRecord(response)) {
    return [];
  }

  for (const key of keys) {
    const value = response[key];

    if (Array.isArray(value)) {
      return value.filter(
        isRecord
      );
    }
  }

  return [];
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function LiveMonitoring() {
  const navigate = useNavigate();

  const [activePage, setActivePage] =
    useState("Live Monitoring");

  const [buildings, setBuildings] =
    useState<Building[]>([]);

  const [
    selectedBuildingId,
    setSelectedBuildingId,
  ] = useState<
    number | string | undefined
  >(undefined);

  const [
    monitoringData,
    setMonitoringData,
  ] = useState<unknown>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedFloor, setSelectedFloor] =
    useState("All Floors");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  /* =======================================================
     SIDEBAR MENU
     ======================================================= */

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      name: "Live Monitoring",
      icon: Activity,
      path: "/live-monitoring",
    },
    {
      name: "Energy Analytics",
      icon: Zap,
      path: "/energy-analytics",
    },
    {
      name: "Occupancy Analytics",
      icon: Users,
      path: "/occupancy-analytics",
    },
    {
      name: "Equipment Monitoring",
      icon: Thermometer,
      path: "/equipment-monitoring",
    },
    {
      name: "Anomaly Center",
      icon: AlertTriangle,
      path: "/anomalies",
    },
    {
      name: "Forecasting",
      icon: TrendingUp,
      path: "/forecasting",
    },
    {
      name: "Recommendations",
      icon: Lightbulb,
      path: "/recommendations",
    },
    {
      name: "Action Tracker",
      icon: CircleCheck,
      path: "/actions",
    },
    {
      name: "Reports",
      icon: Bell,
      path: "/reports",
    },
  ];

  const handleNavigation = (
    name: string,
    path: string
  ) => {
    setActivePage(name);
    navigate(path);
  };

  /* =======================================================
     LOAD BUILDINGS
     ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadBuildings() {
      try {
        const data =
          await getBuildings();

        if (!mounted) {
          return;
        }

        setBuildings(
          Array.isArray(data)
            ? data
            : []
        );

        if (
          Array.isArray(data) &&
          data.length > 0
        ) {
          setSelectedBuildingId(
            data[0].id
          );
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "Failed to load buildings:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load buildings."
        );
      }
    }

    loadBuildings();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     LOAD LIVE MONITORING DATA
     ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadMonitoring() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getLiveMonitoring(
            selectedBuildingId
          );

        if (!mounted) {
          return;
        }

        setMonitoringData(data);
        setLastUpdated(
          new Date()
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "Failed to load live monitoring:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load live monitoring data."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMonitoring();

    /*
     * Refresh backend data every 5 seconds.
     */
    const interval =
      window.setInterval(
        loadMonitoring,
        5000
      );

    return () => {
      mounted = false;
      window.clearInterval(
        interval
      );
    };
  }, [selectedBuildingId]);

  /* =======================================================
     SENSOR DATA
     ======================================================= */

  const sensors = useMemo<
    SensorRow[]
  >(() => {
    const rawSensors =
      getSensorsFromResponse(
        monitoringData
      );

    return rawSensors.map(
      normalizeSensor
    );
  }, [monitoringData]);

  /* =======================================================
     FLOOR LIST
     ======================================================= */

  const floors = useMemo(
    () => {
      return Array.from(
        new Set(
          sensors
            .map(
              (sensor) =>
                sensor.floor
            )
            .filter(Boolean)
        )
      );
    },
    [sensors]
  );

  /* =======================================================
     FILTERED SENSORS
     ======================================================= */

  const filteredSensors =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return sensors.filter(
        (sensor) => {
          const matchesFloor =
            selectedFloor ===
              "All Floors" ||
            sensor.floor ===
              selectedFloor;

          const matchesSearch =
            !search ||
            sensor.zone
              .toLowerCase()
              .includes(search) ||
            sensor.floor
              .toLowerCase()
              .includes(search);

          return (
            matchesFloor &&
            matchesSearch
          );
        }
      );
    }, [
      sensors,
      selectedFloor,
      searchTerm,
    ]);

  /* =======================================================
     DERIVED LIVE VALUES
     ======================================================= */


  const summary =
    getNestedRecord(
      monitoringData,
      "summary",
      "statistics",
      "stats"
    );

  /*
   * Prefer backend summary values when available.
   * Otherwise calculate from sensor data.
   */

  const calculatedEnergy =
    sensors.reduce(
      (total, sensor) =>
        total + sensor.energy,
      0
    );

  const calculatedOccupancy =
    sensors.length > 0
      ? sensors.reduce(
          (total, sensor) =>
            total +
            sensor.occupancy,
          0
        ) / sensors.length
      : 0;

  const totalEnergy =
    toNumber(
      summary
        ? getValue(
            summary,
            "currentEnergy",
            "current_energy",
            "energy",
            "power",
            "currentPower"
          )
        : undefined,
      calculatedEnergy
    );

  const totalOccupancy =
    toNumber(
      summary
        ? getValue(
            summary,
            "occupancy",
            "currentOccupancy",
            "current_occupancy"
          )
        : undefined,
      calculatedOccupancy
    );

  const sensorHealth =
    toNumber(
      summary
        ? getValue(
            summary,
            "sensorHealth",
            "sensor_health",
            "health",
            "healthScore"
          )
        : undefined,
      sensors.length > 0
        ? (sensors.filter(
            (sensor) =>
              sensor.status ===
              "Normal"
          ).length /
            sensors.length) *
            100
        : 0
    );

  /* =======================================================
     HVAC / LIGHTING
     ======================================================= */

  const activeHVAC =
    sensors.filter(
      (sensor) => sensor.hvac
    ).length;

  const activeLighting =
    sensors.filter(
      (sensor) =>
        sensor.lighting
    ).length;

  const criticalSensors =
    sensors.filter(
      (sensor) =>
        sensor.status ===
        "Critical"
    ).length;

  const warningSensors =
    sensors.filter(
      (sensor) =>
        sensor.status ===
        "Warning"
    ).length;

  /* =======================================================
     BACKEND ALERTS
     ======================================================= */

  const liveAlerts =
    getResponseArray(
      monitoringData,
      "alerts",
      "liveAlerts",
      "live_alerts"
    );

  const liveInsights =
    getResponseArray(
      monitoringData,
      "insights",
      "aiInsights",
      "ai_insights"
    );

  /* =======================================================
     SENSOR STATUS
     ======================================================= */

  const sensorStatus =
    getNestedRecord(
      monitoringData,
      "sensorStatus",
      "sensor_status",
      "status"
    );

  const onlineSensors =
    toNumber(
      sensorStatus
        ? getValue(
            sensorStatus,
            "online",
            "onlineSensors",
            "online_sensors"
          )
        : undefined,
      sensors.length -
        criticalSensors
    );

  const totalSensors =
    toNumber(
      sensorStatus
        ? getValue(
            sensorStatus,
            "total",
            "totalSensors",
            "total_sensors"
          )
        : undefined,
      sensors.length
    );

  /* =======================================================
     SELECTED BUILDING
     ======================================================= */

  const selectedBuilding =
    buildings.find(
      (building) =>
        String(
          building.id
        ) ===
        String(
          selectedBuildingId
        )
    );

  /* =======================================================
     INSIGHT
     ======================================================= */

  const firstInsight =
    liveInsights.length > 0
      ? liveInsights[0]
      : null;

  const insightTitle =
    firstInsight
      ? getString(
          firstInsight,
          "title",
          "name"
        )
      : "";

  const insightDescription =
    firstInsight
      ? getString(
          firstInsight,
          "description",
          "message"
        )
      : "";

  /*
   * Fallback insight calculated from
   * actual backend sensor values.
   */

  const fallbackInsightTitle =
    criticalSensors > 0
      ? "Critical sensor conditions detected"
      : warningSensors > 0
        ? "Some zones need attention"
        : "Building conditions are stable";

  const fallbackInsightDescription =
    criticalSensors > 0
      ? `${criticalSensors} sensor${
          criticalSensors > 1
            ? "s"
            : ""
        } currently report critical conditions.`
      : warningSensors > 0
        ? `${warningSensors} sensor${
            warningSensors > 1
              ? "s"
              : ""
          } currently report warning conditions.`
        : "No critical sensor conditions are currently detected.";

  /* =======================================================
     RETURN
     ======================================================= */

  return (
    <div className="app-layout">

      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside className="sidebar">

        <div className="logo-section">

          <div className="logo-icon">
            <Zap size={21} />
          </div>

          <div>
            <h2>SmartBuild AI</h2>

            <span>
              Energy Intelligence
            </span>
          </div>

        </div>

        <div className="menu-title">
          MAIN MENU
        </div>

        <nav>
          {menuItems.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <button
                  key={item.name}
                  className={`menu-item ${
                    activePage ===
                    item.name
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleNavigation(
                      item.name,
                      item.path
                    )
                  }
                >
                  <Icon size={18} />

                  <span>
                    {item.name}
                  </span>
                </button>
              );
            }
          )}
        </nav>

        <div className="sidebar-bottom">

          <button
            className={`menu-item ${
              activePage ===
              "Settings"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setActivePage(
                "Settings"
              );
              navigate(
                "/settings"
              );
            }}
          >
            <Settings size={18} />

            <span>
              Settings
            </span>
          </button>

          <div className="system-status">

            <div className="status-dot"></div>

            <div>
              <strong>
                {error
                  ? "System Warning"
                  : "System Online"}
              </strong>

              <small>
                {error
                  ? "Backend connection issue"
                  : "All agents operational"}
              </small>
            </div>

          </div>

        </div>

      </aside>

      {/* ===================================================
          MAIN CONTENT
          =================================================== */}

      <main className="main-content">

        {/* =================================================
            TOPBAR
            ================================================= */}

        <header className="topbar">

          <div className="topbar-left">

            <div className="topbar-title-row">

              <h1>
                Live Monitoring
              </h1>

              <span className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </span>

            </div>

            <p>
              Real-time building
              sensor and equipment
              monitoring
            </p>

          </div>

          <div className="topbar-right">

            <div className="topbar-search">

              <Search size={16} />

              <input
                type="text"
                placeholder="Search zones..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />

            </div>

            <button
              className="notification-button"
              onClick={() =>
                navigate(
                  "/anomalies"
                )
              }
            >

              <Bell size={19} />

              <span className="notification-badge">
                {criticalSensors +
                  warningSensors}
              </span>

            </button>

            <div className="profile-area">

              <div className="profile-avatar">
                FM
              </div>

              <div className="profile-info">

                <strong>
                  Facility Manager
                </strong>

                <span>
                  Administrator
                </span>

              </div>

              <ChevronDown
                size={15}
              />

            </div>

          </div>

        </header>

        {/* =================================================
            PAGE CONTENT
            ================================================= */}

        <div className="module-page">

          {/* PAGE HEADING */}

          <div className="module-heading">

            <div>

              <div className="dashboard-eyebrow">
                REAL-TIME SENSOR
                INTELLIGENCE
              </div>

              <h2>
                Building Live
                Monitoring
              </h2>

              <p>
                Monitor environmental
                conditions, occupancy
                and equipment activity
                across every zone.
              </p>

            </div>

            <div className="last-updated">

              <Clock3 size={14} />

              Updated{" "}
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : "--:--:--"}

            </div>

          </div>

          {/* =================================================
              BUILDING SELECTOR
              ================================================= */}

          {buildings.length >
            0 && (
            <div
              className="monitoring-filter-bar"
              style={{
                marginBottom:
                  "16px",
              }}
            >

              <div className="filter-left">

                <span className="filter-label">
                  BUILDING
                </span>

                <div className="filter-select">

                  <select
                    value={
                      selectedBuildingId ===
                      undefined
                        ? ""
                        : String(
                            selectedBuildingId
                          )
                    }
                    onChange={(
                      event
                    ) => {

                      const value =
                        event.target
                          .value;

                      const building =
                        buildings.find(
                          (item) =>
                            String(
                              item.id
                            ) ===
                            value
                        );

                      setSelectedBuildingId(
                        building?.id
                      );

                      setSelectedFloor(
                        "All Floors"
                      );

                    }}
                  >

                    {buildings.map(
                      (
                        building
                      ) => (
                        <option
                          key={String(
                            building.id
                          )}
                          value={String(
                            building.id
                          )}
                        >
                          {
                            building.name
                          }
                        </option>
                      )
                    )}

                  </select>

                  <ChevronDown
                    size={14}
                  />

                </div>

              </div>

              <div className="sensor-count">
                {
                  selectedBuilding?.name ??
                  "Building"
                }
              </div>

            </div>
          )}

          {/* =================================================
              ERROR
              ================================================= */}

          {error && (
            <div
              className="monitoring-status-banner"
              style={{
                marginBottom:
                  "18px",
              }}
            >

              <div className="monitoring-status-left">

                <div className="monitoring-pulse">
                  <AlertTriangle
                    size={20}
                  />
                </div>

                <div>

                  <strong>
                    Backend connection
                    problem
                  </strong>

                  <span>
                    {error}
                  </span>

                </div>

              </div>

              <button
                className="sensor-live-label"
                onClick={() =>
                  window.location.reload()
                }
              >
                Retry
              </button>

            </div>
          )}

          {/* =================================================
              LIVE STATUS
              ================================================= */}

          <div className="monitoring-status-banner">

            <div className="monitoring-status-left">

              <div className="monitoring-pulse">
                <Activity
                  size={20}
                />
              </div>

              <div>

                <strong>
                  Live sensor stream
                  active
                </strong>

                <span>
                  Receiving data from{" "}
                  {totalSensors}{" "}
                  building sensors
                </span>

              </div>

            </div>

            <div className="stream-status">

              <span className="live-dot"></span>

              {loading
                ? "Updating..."
                : "Connected"}

            </div>

          </div>

          {/* =================================================
              SUMMARY CARDS
              ================================================= */}

          <section className="monitoring-summary-grid">

            {/* ENERGY */}

            <div className="monitoring-summary-card">

              <div className="summary-icon energy">
                <Zap size={20} />
              </div>

              <div>

                <span>
                  LIVE ENERGY LOAD
                </span>

                <strong>
                  {totalEnergy.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    }
                  )}

                  <small>
                    {" "}
                    kW
                  </small>
                </strong>

                <p>
                  Current building
                  demand
                </p>

              </div>

            </div>

            {/* OCCUPANCY */}

            <div className="monitoring-summary-card">

              <div className="summary-icon occupancy">
                <Users size={20} />
              </div>

              <div>

                <span>
                  OCCUPANCY
                </span>

                <strong>
                  {totalOccupancy.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 1,
                    }
                  )}

                  <small>
                    %
                  </small>
                </strong>

                <p>
                  Current building
                  occupancy
                </p>

              </div>

            </div>

            {/* HVAC */}

            <div className="monitoring-summary-card">

              <div className="summary-icon hvac">
                <Wind size={20} />
              </div>

              <div>

                <span>
                  HVAC ACTIVE
                </span>

                <strong>
                  {activeHVAC}

                  <small>
                    {" "}
                    zones
                  </small>
                </strong>

                <p>
                  HVAC currently
                  running
                </p>

              </div>

            </div>

            {/* LIGHTING */}

            <div className="monitoring-summary-card">

              <div className="summary-icon lighting">
                <Lightbulb
                  size={20}
                />
              </div>

              <div>

                <span>
                  LIGHTING ACTIVE
                </span>

                <strong>
                  {activeLighting}

                  <small>
                    {" "}
                    zones
                  </small>
                </strong>

                <p>
                  Lighting currently
                  active
                </p>

              </div>

            </div>

          </section>

          {/* =================================================
              FLOOR FILTER
              ================================================= */}

          <div className="monitoring-filter-bar">

            <div className="filter-left">

              <span className="filter-label">
                FLOOR
              </span>

              <div className="filter-select">

                <select
                  value={
                    selectedFloor
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedFloor(
                      event.target
                        .value
                    )
                  }
                >

                  <option value="All Floors">
                    All Floors
                  </option>

                  {floors.map(
                    (floor) => (
                      <option
                        key={floor}
                        value={floor}
                      >
                        {floor}
                      </option>
                    )
                  )}

                </select>

                <ChevronDown
                  size={14}
                />

              </div>

            </div>

            <div className="sensor-count">

              <span className="online-dot"></span>

              {
                filteredSensors.length
              }{" "}
              zones monitored

            </div>

          </div>

          {/* =================================================
              SENSOR TABLE
              ================================================= */}

          <div className="data-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Zone Sensor
                  Status
                </h3>

                <p>
                  Current readings
                  from connected IoT
                  sensors
                </p>

              </div>

              <div className="sensor-live-label">

                <Activity
                  size={14}
                />

                Real-time

              </div>

            </div>

            <div className="table-container">

              {loading &&
              sensors.length ===
                0 ? (

                <div
                  style={{
                    padding:
                      "50px",
                    textAlign:
                      "center",
                  }}
                >

                  <Activity
                    size={30}
                    className="loading-icon"
                  />

                  <p>
                    Loading live
                    sensor data...
                  </p>

                </div>

              ) : filteredSensors.length ===
                0 ? (

                <div
                  style={{
                    padding:
                      "50px",
                    textAlign:
                      "center",
                  }}
                >

                  <Search
                    size={30}
                  />

                  <p>
                    No sensor data
                    found.
                  </p>

                </div>

              ) : (

                <table className="sensor-table">

                  <thead>

                    <tr>

                      <th>
                        ZONE
                      </th>

                      <th>
                        TEMPERATURE
                      </th>

                      <th>
                        HUMIDITY
                      </th>

                      <th>
                        OCCUPANCY
                      </th>

                      <th>
                        ENERGY
                      </th>

                      <th>
                        HVAC
                      </th>

                      <th>
                        LIGHTING
                      </th>

                      <th>
                        STATUS
                      </th>

                      <th>
                        UPDATED
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredSensors.map(
                      (sensor) => (

                        <tr
                          key={String(
                            sensor.id
                          )}
                        >

                          {/* ZONE */}

                          <td>

                            <div className="zone-cell">

                              <div className="zone-icon">

                                <Activity
                                  size={15}
                                />

                              </div>

                              <div>

                                <strong>
                                  {
                                    sensor.zone
                                  }
                                </strong>

                                <span>
                                  {
                                    sensor.floor
                                  }
                                </span>

                              </div>

                            </div>

                          </td>

                          {/* TEMPERATURE */}

                          <td>

                            <div className="sensor-reading">

                              <Thermometer
                                size={15}
                              />

                              <strong>
                                {
                                  sensor.temperature
                                }
                                °C
                              </strong>

                            </div>

                          </td>

                          {/* HUMIDITY */}

                          <td>

                            <span className="reading-value">
                              {
                                sensor.humidity
                              }
                              %
                            </span>

                          </td>

                          {/* OCCUPANCY */}

                          <td>

                            <div className="occupancy-reading">

                              <div className="occupancy-bar">

                                <span
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        sensor.occupancy
                                      )
                                    )}%`,
                                  }}
                                />

                              </div>

                              <strong>
                                {
                                  sensor.occupancy
                                }
                                %
                              </strong>

                            </div>

                          </td>

                          {/* ENERGY */}

                          <td>

                            <strong className="energy-reading">

                              {
                                sensor.energy
                              }{" "}
                              kW

                            </strong>

                          </td>

                          {/* HVAC */}

                          <td>

                            {sensor.hvac ? (

                              <span className="equipment-on">

                                <Wind
                                  size={13}
                                />

                                ON

                              </span>

                            ) : (

                              <span className="equipment-off">

                                <XCircle
                                  size={13}
                                />

                                OFF

                              </span>

                            )}

                          </td>

                          {/* LIGHTING */}

                          <td>

                            {sensor.lighting ? (

                              <span className="equipment-on">

                                <Lightbulb
                                  size={13}
                                />

                                ON

                              </span>

                            ) : (

                              <span className="equipment-off">

                                <XCircle
                                  size={13}
                                />

                                OFF

                              </span>

                            )}

                          </td>

                          {/* STATUS */}

                          <td>

                            <span
                              className={`sensor-status ${sensor.status.toLowerCase()}`}
                            >

                              {sensor.status ===
                                "Normal" && (
                                <CircleCheck
                                  size={13}
                                />
                              )}

                              {sensor.status ===
                                "Warning" && (
                                <AlertTriangle
                                  size={13}
                                />
                              )}

                              {sensor.status ===
                                "Critical" && (
                                <XCircle
                                  size={13}
                                />
                              )}

                              {
                                sensor.status
                              }

                            </span>

                          </td>

                          {/* UPDATED */}

                          <td>

                            <span className="updated-text">
                              {
                                sensor.updated
                              }
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              )}

            </div>

          </div>

          {/* =================================================
              AI INSIGHTS + ALERTS
              ================================================= */}

          <section className="monitoring-bottom-grid">

            {/* AI INSIGHT */}

            <div className="ai-insight-card">

              <div className="ai-insight-header">

                <div className="ai-insight-icon">
                  ✨
                </div>

                <div>

                  <span>
                    AI MONITORING
                    INSIGHT
                  </span>

                  <h3>
                    {insightTitle ||
                      fallbackInsightTitle}
                  </h3>

                </div>

              </div>

              <p>
                {insightDescription ||
                  fallbackInsightDescription}
              </p>

              {liveInsights.length >
                1 && (

                <div
                  style={{
                    marginTop:
                      "12px",
                  }}
                >

                  {liveInsights
                    .slice(1, 3)
                    .map(
                      (
                        insight,
                        index
                      ) => {

                        const title =
                          getString(
                            insight,
                            "title",
                            "name"
                          );

                        const description =
                          getString(
                            insight,
                            "description",
                            "message"
                          );

                        return (
                          <p
                            key={`${title}-${index}`}
                          >

                            <strong>
                              {title}:
                            </strong>{" "}

                            {
                              description
                            }

                          </p>
                        );
                      }
                    )}

                </div>

              )}

              <div className="ai-insight-footer">

                <div>

                  <strong>
                    Sensor health
                  </strong>

                  <span>
                    {sensorHealth.toFixed(
                      0
                    )}
                    %
                  </span>

                </div>

                <button
                  onClick={() =>
                    navigate(
                      "/recommendations"
                    )
                  }
                >
                  View Recommendations
                </button>

              </div>

            </div>

            {/* LIVE ALERTS */}

            <div className="data-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    Live Alerts
                  </h3>

                  <p>
                    Conditions requiring
                    attention
                  </p>

                </div>

                <button
                  className="sensor-live-label"
                  onClick={() =>
                    navigate(
                      "/anomalies"
                    )
                  }
                >
                  View all
                </button>

              </div>

              <div className="live-alert-list">

                {liveAlerts.length ===
                0 ? (

                  <div
                    style={{
                      padding:
                        "25px",
                      textAlign:
                        "center",
                    }}
                  >

                    <CircleCheck
                      size={28}
                    />

                    <p>
                      No active alerts
                    </p>

                  </div>

                ) : (

                  liveAlerts
                    .slice(0, 5)
                    .map(
                      (
                        alert,
                        index
                      ) => {

                        const severity =
                          getString(
                            alert,
                            "severity",
                            "status",
                            "level"
                          ).toLowerCase();

                        const alertClass =
                          severity.includes(
                            "critical"
                          )
                            ? "critical"
                            : severity.includes(
                                  "warning"
                                )
                              ? "warning"
                              : "info";

                        const alertId =
                          getValue(
                            alert,
                            "id",
                            "alert_id"
                          );

                        const title =
                          getString(
                            alert,
                            "title",
                            "name"
                          ) ||
                          "System Alert";

                        const message =
                          getString(
                            alert,
                            "message",
                            "description"
                          ) ||
                          "Attention required.";

                        const timestamp =
                          getString(
                            alert,
                            "timestamp",
                            "created_at",
                            "createdAt",
                            "time"
                          );

                        return (
                          <div
                            className={`live-alert-item ${alertClass}`}
                            key={
                              String(
                                alertId ??
                                  index
                              )
                            }
                          >

                            <div className="live-alert-icon">

                              <AlertTriangle
                                size={17}
                              />

                            </div>

                            <div>

                              <strong>
                                {title}
                              </strong>

                              <span>
                                {message}
                              </span>

                            </div>

                            <small>
                              {formatUpdated(
                                timestamp
                              )}
                            </small>

                          </div>
                        );
                      }
                    )

                )}

              </div>

            </div>

          </section>

          {/* =================================================
              FOOTER STATUS
              ================================================= */}

          <div className="monitoring-footer">

            <div>

              <span className="online-dot"></span>

              <strong>
                IoT Gateway Connected
              </strong>

              <span>
                •
              </span>

              <span>
                {onlineSensors} /{" "}
                {totalSensors}{" "}
                sensors online
              </span>

            </div>

            <span>
              Last synchronization:{" "}
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : "--:--:--"}
            </span>

          </div>

        </div>

      </main>

    </div>
  );
}