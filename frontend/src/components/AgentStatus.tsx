import {
  Activity,
  Zap,
  Users,
  Wind,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

const agents = [
  {
    name: "Building Data Monitoring",
    status: "Running",
    icon: Activity,
  },
  {
    name: "Energy Consumption Analysis",
    status: "Running",
    icon: Zap,
  },
  {
    name: "Occupancy & Space Utilization",
    status: "Completed",
    icon: Users,
  },
  {
    name: "HVAC Optimization",
    status: "Running",
    icon: Wind,
  },
  {
    name: "Anomaly Detection",
    status: "Running",
    icon: AlertTriangle,
  },
  {
    name: "Facility Recommendation",
    status: "Waiting",
    icon: Lightbulb,
  },
];

export default function AgentStatus() {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h3>AI Agent Activity</h3>
          <p>Current agent execution status</p>
        </div>

        <span className="agent-count">
          6 Agents
        </span>
      </div>

      <div className="agent-list">
        {agents.map((agent) => {
          const Icon = agent.icon;

          return (
            <div className="agent-item" key={agent.name}>
              <div className="agent-icon">
                <Icon size={17} />
              </div>

              <span className="agent-name">
                {agent.name}
              </span>

              <span
                className={`agent-status ${agent.status
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                <span className="status-circle"></span>
                {agent.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}