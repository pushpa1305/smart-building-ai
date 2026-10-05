import {
  Zap,
  Users,
  AlertTriangle,
  PiggyBank,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  change: string;
  description: string;
  type: "energy" | "occupancy" | "anomaly" | "savings";
}

export default function StatCard({
  title,
  value,
  unit,
  change,
  description,
  type,
}: StatCardProps) {
  const icons = {
    energy: Zap,
    occupancy: Users,
    anomaly: AlertTriangle,
    savings: PiggyBank,
  };

  const Icon = icons[type];

  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>
        <Icon size={22} />
      </div>

      <div className="stat-content">
        <div className="stat-header">
          <span>{title}</span>

          <span className="stat-change">
            {change}
          </span>
        </div>

        <div className="stat-value">
          {value}

          {unit && <span>{unit}</span>}
        </div>

        <p>{description}</p>
      </div>
    </div>
  );
}