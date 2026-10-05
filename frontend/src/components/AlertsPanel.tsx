import {
  AlertTriangle,
  Thermometer,
  Lightbulb,
  Wind,
} from "lucide-react";

const alerts = [
  {
    title: "HVAC running in unoccupied zone",
    location: "Floor 6 - Zone A",
    time: "5 min ago",
    icon: Wind,
    severity: "high",
  },
  {
    title: "Energy consumption spike",
    location: "Floor 4",
    time: "18 min ago",
    icon: AlertTriangle,
    severity: "medium",
  },
  {
    title: "Lighting active overnight",
    location: "Floor 2 - Conference Room",
    time: "32 min ago",
    icon: Lightbulb,
    severity: "medium",
  },
  {
    title: "Abnormal temperature detected",
    location: "Floor 3 - Server Room",
    time: "45 min ago",
    icon: Thermometer,
    severity: "high",
  },
];

export default function AlertsPanel() {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h3>Recent Alerts</h3>
          <p>AI-detected facility issues</p>
        </div>

        <button className="view-all">
          View All
        </button>
      </div>

      <div className="alerts-list">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;

          return (
            <div className="alert-item" key={index}>
              <div className={`alert-icon ${alert.severity}`}>
                <Icon size={18} />
              </div>

              <div className="alert-info">
                <strong>{alert.title}</strong>
                <span>{alert.location}</span>
              </div>

              <time>{alert.time}</time>
            </div>
          );
        })}
      </div>
    </div>
  );
}