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
} from "lucide-react";

import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export default function Sidebar({
  activePage,
  setActivePage,
}: SidebarProps) {

  const navigate = useNavigate();

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

  const handleNavigation = (
    name: string,
    path: string
  ) => {
    setActivePage(name);
    navigate(path);
  };

  const handleSettings = () => {
    setActivePage("Settings");
    navigate("/settings");
  };

  return (
    <aside className="sidebar">

      {/* LOGO */}

      <div className="logo-section">

        <div className="logo-icon">
          ⚡
        </div>

        <div>
          <h2>SmartBuild AI</h2>
          <span>Energy Intelligence</span>
        </div>

      </div>

      {/* MENU TITLE */}

      <div className="menu-title">
        MAIN MENU
      </div>

      {/* MAIN MENU */}

      <nav>

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <button
              key={item.name}
              className={
                activePage === item.name
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

      {/* BOTTOM */}

      <div className="sidebar-bottom">

        <button
          className={
            activePage === "Settings"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={handleSettings}
        >
          <Settings size={19} />

          <span>
            Settings
          </span>

        </button>

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
  );
}