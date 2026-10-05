import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Activity,
  Zap,
  Users,
  Thermometer,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  ClipboardCheck,
  FileText,
  Settings,
  Bell,
  Search,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  CircleCheck,
  CircleAlert,
  Clock3,
  Building2,
  RefreshCw,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import EnergyChart from "../components/EnergyChart";
import FloorEnergyChart from "../components/FloorEnergyChart";

import {
  getBuildings,
  getDashboard,
  getEnergyData,
  getFloorEnergy,
  type Building,
  type DashboardData,
  type EnergyReading,
  type FloorEnergy,
} from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();

  /* =====================================================
     STATE
  ===================================================== */

  const [activePage, setActivePage] =
    useState("Dashboard");

  const [buildings, setBuildings] =
    useState<Building[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] =
    useState<number | string | undefined>(
      undefined
    );

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [energyData, setEnergyData] =
    useState<EnergyReading[]>([]);

  const [floorEnergyData, setFloorEnergyData] =
    useState<FloorEnergy[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showProfileMenu, setShowProfileMenu] =
    useState(false);

  /* =====================================================
     SIDEBAR MENU
  ===================================================== */

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
      icon: ClipboardCheck,
      path: "/actions",
    },
    {
      name: "Reports",
      icon: FileText,
      path: "/reports",
    },
  ];

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const handleNavigation = (
    name: string,
    path: string
  ) => {
    setActivePage(name);
    navigate(path);
  };

  /* =====================================================
     LOAD BUILDINGS
  ===================================================== */

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const data = await getBuildings();

        const buildingList = Array.isArray(data)
          ? data
          : [];

        setBuildings(buildingList);

        if (buildingList.length > 0) {
          setSelectedBuildingId(
            buildingList[0].id
          );
        }
      } catch (err) {
        console.error(
          "Failed to load buildings:",
          err
        );

        setError(
          "Unable to load building information."
        );
      }
    };

    loadBuildings();
  }, []);

  /* =====================================================
     LOAD DASHBOARD + CHART DATA
  ===================================================== */

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          dashboardData,
          energyReadings,
          floorReadings,
        ] = await Promise.all([
          getDashboard(
            selectedBuildingId
          ),

          getEnergyData({
            buildingId:
              selectedBuildingId,
          }),

          getFloorEnergy(
            selectedBuildingId
          ),
        ]);

        setDashboard(
          dashboardData ?? null
        );

        setEnergyData(
          Array.isArray(energyReadings)
            ? energyReadings
            : []
        );

        setFloorEnergyData(
          Array.isArray(floorReadings)
            ? floorReadings
            : []
        );
      } catch (err) {
        console.error(
          "Failed to load dashboard data:",
          err
        );

        setError(
          "Unable to connect to the backend. Please make sure your Flask server is running."
        );

        setEnergyData([]);
        setFloorEnergyData([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedBuildingId]);

  /* =====================================================
     REFRESH DASHBOARD
  ===================================================== */

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        dashboardData,
        energyReadings,
        floorReadings,
      ] = await Promise.all([
        getDashboard(
          selectedBuildingId
        ),

        getEnergyData({
          buildingId:
            selectedBuildingId,
        }),

        getFloorEnergy(
          selectedBuildingId
        ),
      ]);

      setDashboard(
        dashboardData ?? null
      );

      setEnergyData(
        Array.isArray(energyReadings)
          ? energyReadings
          : []
      );

      setFloorEnergyData(
        Array.isArray(floorReadings)
          ? floorReadings
          : []
      );
    } catch (err) {
      console.error(
        "Refresh failed:",
        err
      );

      setError(
        "Unable to refresh dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SELECTED BUILDING
  ===================================================== */

  const selectedBuilding =
    buildings.find(
      (building) =>
        String(building.id) ===
        String(selectedBuildingId)
    );

  /* =====================================================
     KPI VALUES
  ===================================================== */

  const currentEnergy = Number(
    dashboard?.currentEnergy ?? 3150
  );

  const baselineEnergy = Number(
    dashboard?.baselineEnergy ?? 2500
  );

  const occupancy = Number(
    dashboard?.occupancy ?? 68
  );

  const anomalyCount = Number(
    dashboard?.anomalyCount ?? 4
  );

  const excessEnergy = Number(
    dashboard?.excessEnergy ??
      Math.max(
        currentEnergy -
          baselineEnergy,
        0
      )
  );

  const healthScore = Number(
    dashboard?.healthScore ?? 82
  );

  const energyIncrease =
    baselineEnergy > 0
      ? ((currentEnergy -
          baselineEnergy) /
          baselineEnergy) *
        100
      : 0;

  const potentialSavings =
    excessEnergy > 0
      ? excessEnergy
      : 650;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="app-layout">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        {/* LOGO */}

        <div className="logo-section">

          <div className="logo-icon">
            <Zap size={21} />
          </div>

          <div>
            <h2>
              SmartBuild AI
            </h2>

            <span>
              Energy Intelligence
            </span>
          </div>

        </div>

        {/* MAIN MENU */}

        <div className="menu-title">
          MAIN MENU
        </div>

        <nav>

          {menuItems.map((item) => {

            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={
                  activePage ===
                  item.name
                    ? "menu-item active"
                    : "menu-item"
                }
                onClick={() =>
                  handleNavigation(
                    item.name,
                    item.path
                  )
                }
              >

                <Icon size={19} />

                <span>
                  {item.name}
                </span>

              </button>
            );
          })}

        </nav>

        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          <button
            className={
              activePage ===
              "Settings"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() =>
              handleNavigation(
                "Settings",
                "/settings"
              )
            }
          >

            <Settings size={19} />

            <span>
              Settings
            </span>

          </button>

          {/* SYSTEM STATUS */}

          <div className="system-status">

            <div className="status-dot" />

            <div>

              <strong>
                System Online
              </strong>

              <small>
                All agents operational
              </small>

            </div>

          </div>

        </div>

      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="main-content">

        {/* =================================================
            TOPBAR
        ================================================= */}

        <header className="topbar">

          <div>

            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: "12px",
              }}
            >

              <h1>
                Building Dashboard
              </h1>

              <span
                style={{
                  display: "inline-flex",
                  alignItems:
                    "center",
                  gap: "6px",
                  padding:
                    "5px 9px",
                  borderRadius:
                    "20px",
                  background:
                    "rgba(34,197,94,0.10)",
                  color:
                    "#16a34a",
                  fontSize:
                    "10px",
                  fontWeight: 700,
                }}
              >

                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius:
                      "50%",
                    background:
                      "#22c55e",
                  }}
                />

                LIVE

              </span>

            </div>

            <p>
              Smart Building Energy &
              Facility Management
            </p>

          </div>

          <div className="topbar-actions">

            {/* SEARCH */}

            <div className="search-box">

              <Search size={18} />

              <input
                placeholder="Search..."
              />

            </div>

            {/* REFRESH */}

            <button
              className="icon-button"
              onClick={
                handleRefresh
              }
              title="Refresh dashboard"
            >

              <RefreshCw
                size={19}
                style={{
                  animation:
                    loading
                      ? "spin 1s linear infinite"
                      : "none",
                }}
              />

            </button>

            {/* NOTIFICATION */}

            <div
              style={{
                position:
                  "relative",
              }}
            >

              <button
                className="icon-button"
                onClick={() =>
                  setShowNotifications(
                    !showNotifications
                  )
                }
              >

                <Bell size={20} />

                <span className="notification-dot">
                  {anomalyCount}
                </span>

              </button>

              {showNotifications && (

                <div
                  style={{
                    position:
                      "absolute",
                    right: 0,
                    top: "48px",
                    width:
                      "310px",
                    background:
                      "#ffffff",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius:
                      "14px",
                    padding:
                      "16px",
                    boxShadow:
                      "0 15px 40px rgba(0,0,0,0.12)",
                    zIndex: 1000,
                  }}
                >

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                    }}
                  >

                    <strong>
                      Notifications
                    </strong>

                    <span
                      style={{
                        fontSize:
                          "11px",
                        padding:
                          "4px 8px",
                        borderRadius:
                          "10px",
                        background:
                          "#fef2f2",
                        color:
                          "#dc2626",
                      }}
                    >
                      {anomalyCount}
                      {" "}alerts
                    </span>

                  </div>

                  <div
                    style={{
                      marginTop:
                        "12px",
                      padding:
                        "12px",
                      background:
                        "#fff7ed",
                      borderRadius:
                        "10px",
                    }}
                  >

                    <strong
                      style={{
                        fontSize:
                          "13px",
                      }}
                    >
                      Energy spike detected
                    </strong>

                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        color:
                          "#64748b",
                        fontSize:
                          "12px",
                      }}
                    >
                      Building energy
                      consumption is
                      above baseline.
                    </p>

                  </div>

                  <button
                    style={{
                      width:
                        "100%",
                      marginTop:
                        "10px",
                      padding:
                        "9px",
                      border:
                        "none",
                      borderRadius:
                        "8px",
                      background:
                        "#f1f5f9",
                      cursor:
                        "pointer",
                      fontWeight:
                        600,
                    }}
                    onClick={() => {
                      setShowNotifications(
                        false
                      );

                      navigate(
                        "/anomalies"
                      );
                    }}
                  >
                    View Anomalies
                  </button>

                </div>

              )}

            </div>

            {/* PROFILE */}

            <div
              className="profile"
              style={{
                cursor:
                  "pointer",
                position:
                  "relative",
              }}
              onClick={() =>
                setShowProfileMenu(
                  !showProfileMenu
                )
              }
            >

              <div className="profile-avatar">
                FM
              </div>

              <div>

                <strong>
                  Facility Manager
                </strong>

                <span>
                  Administrator
                </span>

              </div>

              <ChevronDown
                size={16}
              />

              {showProfileMenu && (

                <div
                  style={{
                    position:
                      "absolute",
                    right: 0,
                    top: "55px",
                    width:
                      "190px",
                    background:
                      "#ffffff",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius:
                      "12px",
                    padding:
                      "8px",
                    boxShadow:
                      "0 15px 40px rgba(0,0,0,0.12)",
                    zIndex: 1000,
                  }}
                >

                  <button
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      border:
                        "none",
                      background:
                        "transparent",
                      textAlign:
                        "left",
                      cursor:
                        "pointer",
                      borderRadius:
                        "8px",
                    }}
                    onClick={() => {

                      setShowProfileMenu(
                        false
                      );

                      handleNavigation(
                        "Settings",
                        "/settings"
                      );

                    }}
                  >

                    <Settings
                      size={15}
                      style={{
                        marginRight:
                          "8px",
                        verticalAlign:
                          "middle",
                      }}
                    />

                    Settings

                  </button>

                </div>

              )}

            </div>

          </div>

        </header>

        {/* =================================================
            DASHBOARD CONTENT
        ================================================= */}

        <div className="dashboard-content">

          {/* ERROR */}

          {error && (

            <div
              style={{
                marginBottom:
                  "20px",
                padding:
                  "14px 18px",
                borderRadius:
                  "12px",
                background:
                  "#fef2f2",
                border:
                  "1px solid #fecaca",
                color:
                  "#b91c1c",
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "10px",
              }}
            >

              <AlertTriangle
                size={18}
              />

              <span>
                {error}
              </span>

            </div>

          )}

          {/* =================================================
              WELCOME SECTION
          ================================================= */}

          <section className="welcome-section">

            <div>

              <div className="dashboard-eyebrow">
                AI POWERED FACILITY INTELLIGENCE
              </div>

              <h2>
                Hello, Facility Manager 👋
              </h2>

              <p>
                Here's what's happening
                across your building
                today.
              </p>

            </div>

            {/* BUILDING SELECTOR */}

            <div className="building-selector">

              <Building2
                size={17}
              />

              <select
                value={
                  selectedBuildingId ??
                  ""
                }
                onChange={(event) => {

                  const value =
                    event.target
                      .value;

                  const building =
                    buildings.find(
                      (item) =>
                        String(
                          item.id
                        ) === value
                    );

                  setSelectedBuildingId(
                    building?.id
                  );

                }}
                disabled={
                  buildings.length ===
                  0
                }
              >

                {buildings.length >
                0 ? (

                  buildings.map(
                    (building) => (

                      <option
                        key={String(
                          building.id
                        )}
                        value={String(
                          building.id
                        )}
                      >
                        {building.name}
                      </option>

                    )
                  )

                ) : (

                  <option>
                    Smart Building - HQ
                  </option>

                )}

              </select>

              <ChevronDown
                size={16}
              />

            </div>

          </section>

          {/* =================================================
              BUILDING INFORMATION
          ================================================= */}

          <section
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: "20px",
              padding:
                "16px 20px",
              marginBottom:
                "22px",
              background:
                "#ffffff",
              border:
                "1px solid #e5e7eb",
              borderRadius:
                "14px",
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

              <div
                style={{
                  width:
                    "42px",
                  height:
                    "42px",
                  borderRadius:
                    "11px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  background:
                    "#eef2ff",
                  color:
                    "#4f46e5",
                }}
              >

                <Building2
                  size={20}
                />

              </div>

              <div>

                <strong>
                  {selectedBuilding?.name ||
                    "Smart Building - HQ"}
                </strong>

                <p
                  style={{
                    margin:
                      "3px 0 0",
                    fontSize:
                      "12px",
                    color:
                      "#64748b",
                  }}
                >
                  {selectedBuilding?.location ||
                    "Smart facility monitoring"}
                </p>

              </div>

            </div>

            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "7px",
                fontSize:
                  "13px",
                color:
                  "#16a34a",
                fontWeight:
                  600,
              }}
            >

              <span
                style={{
                  width:
                    "8px",
                  height:
                    "8px",
                  borderRadius:
                    "50%",
                  background:
                    "#22c55e",
                }}
              />

              All systems operational

            </div>

          </section>

          {/* =================================================
              KPI CARDS
          ================================================= */}

          <section className="stats-grid">

            {/* CURRENT ENERGY */}

            <div className="stat-card">

              <div className="stat-card-top">

                <div>

                  <span className="stat-title">
                    Current Energy
                  </span>

                  <div className="stat-value">

                    {currentEnergy.toLocaleString()}

                    <small>
                      {" "}kWh
                    </small>

                  </div>

                </div>

                <div className="stat-icon energy">

                  <Zap size={20} />

                </div>

              </div>

              <div className="stat-footer">

                <span className="positive-change">

                  <ArrowUpRight
                    size={14}
                  />

                  +
                  {Math.abs(
                    energyIncrease
                  ).toFixed(0)}
                  %

                </span>

                <span>
                  vs historical baseline
                </span>

              </div>

            </div>

            {/* OCCUPANCY */}

            <div className="stat-card">

              <div className="stat-card-top">

                <div>

                  <span className="stat-title">
                    Occupancy
                  </span>

                  <div className="stat-value">

                    {occupancy}

                    <small>
                      %
                    </small>

                  </div>

                </div>

                <div className="stat-icon occupancy">

                  <Users size={20} />

                </div>

              </div>

              <div className="stat-footer">

                <span className="positive-change">

                  <ArrowUpRight
                    size={14}
                  />

                  +8%

                </span>

                <span>
                  Current occupancy
                </span>

              </div>

            </div>

            {/* ANOMALIES */}

            <div className="stat-card">

              <div className="stat-card-top">

                <div>

                  <span className="stat-title">
                    Active Anomalies
                  </span>

                  <div className="stat-value">
                    {anomalyCount}
                  </div>

                </div>

                <div className="stat-icon anomaly">

                  <AlertTriangle
                    size={20}
                  />

                </div>

              </div>

              <div className="stat-footer">

                <span className="negative-change">

                  <ArrowUpRight
                    size={14}
                  />

                  +{anomalyCount}

                </span>

                <span>
                  Require attention
                </span>

              </div>

            </div>

            {/* POTENTIAL SAVINGS */}

            <div className="stat-card">

              <div className="stat-card-top">

                <div>

                  <span className="stat-title">
                    Potential Savings
                  </span>

                  <div className="stat-value">

                    {potentialSavings.toLocaleString()}

                    <small>
                      {" "}kWh/day
                    </small>

                  </div>

                </div>

                <div className="stat-icon savings">

                  <Lightbulb
                    size={20}
                  />

                </div>

              </div>

              <div className="stat-footer">

                <span className="saving-change">

                  {Math.min(
                    Math.round(
                      (potentialSavings /
                        Math.max(
                          currentEnergy,
                          1
                        )) *
                        100
                    ),
                    100
                  )}
                  %

                </span>

                <span>
                  Estimated avoidable energy
                </span>

              </div>

            </div>

          </section>

          {/* =================================================
              AI BUILDING HEALTH
          ================================================= */}

          <section className="ai-health-card">

            <div className="ai-health-left">

              <div className="ai-health-icon">

                <Sparkles
                  size={22}
                />

              </div>

              <div>

                <span>
                  AI BUILDING HEALTH
                </span>

                <h3>
                  Operational Health Score
                </h3>

                <p>
                  {healthScore >=
                  80
                    ? "Building systems are operating normally with a few optimization opportunities."
                    : healthScore >=
                      60
                    ? "Building systems are operational, but several optimization opportunities require attention."
                    : "Multiple building conditions require immediate attention."}
                </p>

              </div>

            </div>

            <div className="health-score">

              <strong>
                {healthScore}
              </strong>

              <span>
                /100
              </span>

            </div>

          </section>

          {/* =================================================
              CHARTS
          ================================================= */}

          <section className="charts-grid">

            <EnergyChart
              data={energyData}
            />

            <FloorEnergyChart
              data={floorEnergyData}
            />

          </section>

          {/* =================================================
              BOTTOM GRID
          ================================================= */}

          <section className="bottom-grid">

            {/* RECENT ALERTS */}

            <div className="dashboard-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    Recent Alerts
                  </h3>

                  <p>
                    Latest building events
                  </p>

                </div>

                <button
                  className="view-all-button"
                  onClick={() =>
                    navigate(
                      "/anomalies"
                    )
                  }
                >
                  View All
                </button>

              </div>

              <div className="alert-list">

                {/* ALERT 1 */}

                <div className="alert-item">

                  <div className="alert-icon critical">

                    <CircleAlert
                      size={17}
                    />

                  </div>

                  <div className="alert-content">

                    <strong>
                      Energy consumption spike
                    </strong>

                    <span>
                      Floor 6 consumption
                      is above baseline.
                    </span>

                  </div>

                  <small>
                    8 min ago
                  </small>

                </div>

                {/* ALERT 2 */}

                <div className="alert-item">

                  <div className="alert-icon warning">

                    <Thermometer
                      size={17}
                    />

                  </div>

                  <div className="alert-content">

                    <strong>
                      HVAC running in empty zone
                    </strong>

                    <span>
                      HVAC is active with
                      low occupancy.
                    </span>

                  </div>

                  <small>
                    15 min ago
                  </small>

                </div>

                {/* ALERT 3 */}

                <div className="alert-item">

                  <div className="alert-icon info">

                    <Lightbulb
                      size={17}
                    />

                  </div>

                  <div className="alert-content">

                    <strong>
                      Overnight lighting detected
                    </strong>

                    <span>
                      Lighting remains active
                      in Zone B.
                    </span>

                  </div>

                  <small>
                    32 min ago
                  </small>

                </div>

              </div>

            </div>

            {/* AI AGENT ACTIVITY */}

            <div className="dashboard-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    AI Agent Activity
                  </h3>

                  <p>
                    Real-time agent execution
                  </p>

                </div>

                <Sparkles
                  size={20}
                />

              </div>

              <div className="agent-list">

                {/* AGENT 1 */}

                <div className="agent-item">

                  <div className="agent-status-icon running">

                    <Activity
                      size={16}
                    />

                  </div>

                  <div className="agent-info">

                    <strong>
                      Building Data Monitoring
                    </strong>

                    <span>
                      Monitoring 48 sensors
                    </span>

                  </div>

                  <span className="agent-badge running">
                    Running
                  </span>

                </div>

                {/* AGENT 2 */}

                <div className="agent-item">

                  <div className="agent-status-icon completed">

                    <CircleCheck
                      size={16}
                    />

                  </div>

                  <div className="agent-info">

                    <strong>
                      Energy Analysis Agent
                    </strong>

                    <span>
                      Baseline comparison completed
                    </span>

                  </div>

                  <span className="agent-badge completed">
                    Completed
                  </span>

                </div>

                {/* AGENT 3 */}

                <div className="agent-item">

                  <div className="agent-status-icon running">

                    <Users
                      size={16}
                    />

                  </div>

                  <div className="agent-info">

                    <strong>
                      Occupancy Agent
                    </strong>

                    <span>
                      Analyzing 24 zones
                    </span>

                  </div>

                  <span className="agent-badge running">
                    Running
                  </span>

                </div>

                {/* AGENT 4 */}

                <div className="agent-item">

                  <div className="agent-status-icon waiting">

                    <Clock3
                      size={16}
                    />

                  </div>

                  <div className="agent-info">

                    <strong>
                      Recommendation Agent
                    </strong>

                    <span>
                      Waiting for analysis
                    </span>

                  </div>

                  <span className="agent-badge waiting">
                    Waiting
                  </span>

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <section className="quick-actions">

            <div className="quick-action-header">

              <div>

                <h3>
                  Quick Actions
                </h3>

                <p>
                  Access frequently used modules
                </p>

              </div>

            </div>

            <div className="quick-action-grid">

              {/* LIVE MONITORING */}

              <button
                onClick={() =>
                  navigate(
                    "/live-monitoring"
                  )
                }
              >

                <Activity
                  size={19}
                />

                <span>
                  Live Monitoring
                </span>

              </button>

              {/* ENERGY ANALYTICS */}

              <button
                onClick={() =>
                  navigate(
                    "/energy-analytics"
                  )
                }
              >

                <Zap
                  size={19}
                />

                <span>
                  Energy Analytics
                </span>

              </button>

              {/* ANOMALIES */}

              <button
                onClick={() =>
                  navigate(
                    "/anomalies"
                  )
                }
              >

                <AlertTriangle
                  size={19}
                />

                <span>
                  View Anomalies
                </span>

              </button>

              {/* RECOMMENDATIONS */}

              <button
                onClick={() =>
                  navigate(
                    "/recommendations"
                  )
                }
              >

                <Lightbulb
                  size={19}
                />

                <span>
                  AI Recommendations
                </span>

              </button>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}