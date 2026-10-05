import {
  Bell,
  Zap,
  Brain,
  Shield,
  RotateCcw,
  Save,
  Check,
  Mail,
  Database,
  Activity,
  Clock,
  Gauge,
  AlertTriangle,
  Settings as SettingsIcon,
} from "lucide-react";

import { useEffect, useState } from "react";

export default function Settings() {
  /* =========================================
     SETTINGS STATE
  ========================================= */

  const [notifications, setNotifications] = useState(true);

  const [energyAlerts, setEnergyAlerts] = useState(true);

  const [anomalyAlerts, setAnomalyAlerts] = useState(true);

  const [aiRecommendations, setAiRecommendations] =
    useState(true);

  const [autoRefresh, setAutoRefresh] =
    useState(true);

  const [emailNotifications, setEmailNotifications] =
    useState(false);

  const [dataCollection, setDataCollection] =
    useState(true);

  const [refreshInterval, setRefreshInterval] =
    useState("30");

  const [alertThreshold, setAlertThreshold] =
    useState("15");

  const [saved, setSaved] = useState(false);


  /* =========================================
     LOAD SAVED SETTINGS
  ========================================= */

  useEffect(() => {
    const savedNotifications =
      localStorage.getItem(
        "smartbuild-notifications"
      );

    const savedEnergyAlerts =
      localStorage.getItem(
        "smartbuild-energy-alerts"
      );

    const savedAnomalyAlerts =
      localStorage.getItem(
        "smartbuild-anomaly-alerts"
      );

    const savedAI =
      localStorage.getItem(
        "smartbuild-ai-recommendations"
      );

    const savedAutoRefresh =
      localStorage.getItem(
        "smartbuild-auto-refresh"
      );

    const savedEmail =
      localStorage.getItem(
        "smartbuild-email-notifications"
      );

    const savedDataCollection =
      localStorage.getItem(
        "smartbuild-data-collection"
      );

    const savedInterval =
      localStorage.getItem(
        "smartbuild-refresh-interval"
      );

    const savedThreshold =
      localStorage.getItem(
        "smartbuild-alert-threshold"
      );


    if (savedNotifications !== null) {
      setNotifications(
        JSON.parse(savedNotifications)
      );
    }

    if (savedEnergyAlerts !== null) {
      setEnergyAlerts(
        JSON.parse(savedEnergyAlerts)
      );
    }

    if (savedAnomalyAlerts !== null) {
      setAnomalyAlerts(
        JSON.parse(savedAnomalyAlerts)
      );
    }

    if (savedAI !== null) {
      setAiRecommendations(
        JSON.parse(savedAI)
      );
    }

    if (savedAutoRefresh !== null) {
      setAutoRefresh(
        JSON.parse(savedAutoRefresh)
      );
    }

    if (savedEmail !== null) {
      setEmailNotifications(
        JSON.parse(savedEmail)
      );
    }

    if (savedDataCollection !== null) {
      setDataCollection(
        JSON.parse(savedDataCollection)
      );
    }

    if (savedInterval !== null) {
      setRefreshInterval(savedInterval);
    }

    if (savedThreshold !== null) {
      setAlertThreshold(savedThreshold);
    }

  }, []);


  /* =========================================
     SAVE SETTINGS
  ========================================= */

  const handleSave = () => {

    localStorage.setItem(
      "smartbuild-notifications",
      JSON.stringify(notifications)
    );

    localStorage.setItem(
      "smartbuild-energy-alerts",
      JSON.stringify(energyAlerts)
    );

    localStorage.setItem(
      "smartbuild-anomaly-alerts",
      JSON.stringify(anomalyAlerts)
    );

    localStorage.setItem(
      "smartbuild-ai-recommendations",
      JSON.stringify(aiRecommendations)
    );

    localStorage.setItem(
      "smartbuild-auto-refresh",
      JSON.stringify(autoRefresh)
    );

    localStorage.setItem(
      "smartbuild-email-notifications",
      JSON.stringify(emailNotifications)
    );

    localStorage.setItem(
      "smartbuild-data-collection",
      JSON.stringify(dataCollection)
    );

    localStorage.setItem(
      "smartbuild-refresh-interval",
      refreshInterval
    );

    localStorage.setItem(
      "smartbuild-alert-threshold",
      alertThreshold
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };


  /* =========================================
     RESET SETTINGS
  ========================================= */

  const handleReset = () => {

    setNotifications(true);

    setEnergyAlerts(true);

    setAnomalyAlerts(true);

    setAiRecommendations(true);

    setAutoRefresh(true);

    setEmailNotifications(false);

    setDataCollection(true);

    setRefreshInterval("30");

    setAlertThreshold("15");

    localStorage.removeItem(
      "smartbuild-notifications"
    );

    localStorage.removeItem(
      "smartbuild-energy-alerts"
    );

    localStorage.removeItem(
      "smartbuild-anomaly-alerts"
    );

    localStorage.removeItem(
      "smartbuild-ai-recommendations"
    );

    localStorage.removeItem(
      "smartbuild-auto-refresh"
    );

    localStorage.removeItem(
      "smartbuild-email-notifications"
    );

    localStorage.removeItem(
      "smartbuild-data-collection"
    );

    localStorage.removeItem(
      "smartbuild-refresh-interval"
    );

    localStorage.removeItem(
      "smartbuild-alert-threshold"
    );

    setSaved(false);
  };


  return (
    <div className="settings-container">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="settings-page-header">

        <div className="settings-title-row">

          <div className="settings-title-icon">
            <SettingsIcon size={25} />
          </div>

          <div>

            <h1>
              Settings
            </h1>

            <p>
              Manage SmartBuild AI monitoring,
              notifications and system preferences.
            </p>

          </div>

        </div>


        <div className="settings-header-actions">

          <button
            className="reset-button"
            onClick={handleReset}
          >
            <RotateCcw size={17} />

            Reset
          </button>


          <button
            className="save-button"
            onClick={handleSave}
          >

            {saved ? (
              <>
                <Check size={18} />

                Saved
              </>
            ) : (
              <>
                <Save size={18} />

                Save Changes
              </>
            )}

          </button>

        </div>

      </div>


      {/* =====================================
          QUICK STATUS
      ===================================== */}

      <div className="settings-status-grid">

        <StatusCard
          icon={<Activity size={21} />}
          title="System Status"
          value="Operational"
          status="online"
        />

        <StatusCard
          icon={<Brain size={21} />}
          title="AI Engine"
          value="Active"
          status="online"
        />

        <StatusCard
          icon={<Database size={21} />}
          title="Data Pipeline"
          value="Connected"
          status="online"
        />

        <StatusCard
          icon={<Gauge size={21} />}
          title="Monitoring"
          value="Real-Time"
          status="online"
        />

      </div>


      {/* =====================================
          NOTIFICATIONS
      ===================================== */}

      <section className="settings-section">

        <SectionHeader
          icon={<Bell size={20} />}
          title="Notifications"
          description="Control how SmartBuild AI communicates important events."
          className="notification-icon"
        />


        <div className="settings-list">

          <SettingToggle
            icon={<Bell size={19} />}
            title="System Notifications"
            description="Receive important system notifications and updates."
            enabled={notifications}
            setEnabled={setNotifications}
          />


          <SettingToggle
            icon={<Zap size={19} />}
            title="Energy Alerts"
            description="Get notified when energy consumption exceeds the configured threshold."
            enabled={energyAlerts}
            setEnabled={setEnergyAlerts}
          />


          <SettingToggle
            icon={<AlertTriangle size={19} />}
            title="Anomaly Alerts"
            description="Receive alerts when unusual building activity is detected."
            enabled={anomalyAlerts}
            setEnabled={setAnomalyAlerts}
          />


          <SettingToggle
            icon={<Mail size={19} />}
            title="Email Notifications"
            description="Send important alerts and recommendations to the facility manager."
            enabled={emailNotifications}
            setEnabled={setEmailNotifications}
          />

        </div>

      </section>


      {/* =====================================
          AI INTELLIGENCE
      ===================================== */}

      <section className="settings-section">

        <SectionHeader
          icon={<Brain size={20} />}
          title="AI Intelligence"
          description="Configure the intelligent energy analysis engine."
          className="ai-icon"
        />


        <div className="settings-list">

          <SettingToggle
            icon={<Brain size={19} />}
            title="AI Recommendations"
            description="Allow the AI engine to identify inefficiencies and generate corrective recommendations."
            enabled={aiRecommendations}
            setEnabled={setAiRecommendations}
          />


          <SettingToggle
            icon={<Database size={19} />}
            title="Automatic Data Collection"
            description="Allow SmartBuild AI to continuously collect building energy and occupancy data."
            enabled={dataCollection}
            setEnabled={setDataCollection}
          />

        </div>

      </section>


      {/* =====================================
          MONITORING
      ===================================== */}

      <section className="settings-section">

        <SectionHeader
          icon={<Activity size={20} />}
          title="Monitoring Configuration"
          description="Configure real-time building monitoring behavior."
          className="monitoring-icon"
        />


        <div className="settings-list">

          <SettingToggle
            icon={<Activity size={19} />}
            title="Automatic Data Refresh"
            description="Automatically update energy, occupancy and equipment monitoring data."
            enabled={autoRefresh}
            setEnabled={setAutoRefresh}
          />

        </div>


        {autoRefresh && (

          <div className="settings-control-grid">

            <div className="settings-control">

              <div className="control-icon">
                <Clock size={19} />
              </div>

              <div className="control-content">

                <strong>
                  Refresh Interval
                </strong>

                <span>
                  How often monitoring data is updated.
                </span>

              </div>

              <select
                value={refreshInterval}
                onChange={(e) =>
                  setRefreshInterval(
                    e.target.value
                  )
                }
              >

                <option value="15">
                  15 seconds
                </option>

                <option value="30">
                  30 seconds
                </option>

                <option value="60">
                  1 minute
                </option>

                <option value="300">
                  5 minutes
                </option>

              </select>

            </div>


            <div className="settings-control">

              <div className="control-icon">
                <Zap size={19} />
              </div>

              <div className="control-content">

                <strong>
                  Energy Alert Threshold
                </strong>

                <span>
                  Alert when consumption rises above baseline.
                </span>

              </div>

              <select
                value={alertThreshold}
                onChange={(e) =>
                  setAlertThreshold(
                    e.target.value
                  )
                }
              >

                <option value="5">
                  5%
                </option>

                <option value="10">
                  10%
                </option>

                <option value="15">
                  15%
                </option>

                <option value="20">
                  20%
                </option>

                <option value="25">
                  25%
                </option>

              </select>

            </div>

          </div>

        )}

      </section>


      {/* =====================================
          ENERGY MONITORING
      ===================================== */}

      <section className="settings-section">

        <SectionHeader
          icon={<Zap size={20} />}
          title="Energy Intelligence"
          description="Current status of the SmartBuild energy monitoring system."
          className="energy-icon"
        />


        <div className="energy-status-grid">

          <InfoCard
            icon={<Zap size={20} />}
            title="Real-Time Energy Monitoring"
            description="Live energy consumption is being monitored."
            status="Active"
          />


          <InfoCard
            icon={<Brain size={20} />}
            title="AI Analysis Engine"
            description="Consumption patterns are being analyzed continuously."
            status="Active"
          />


          <InfoCard
            icon={<AlertTriangle size={20} />}
            title="Anomaly Detection"
            description="Equipment and energy anomalies are being detected."
            status="Active"
          />


          <InfoCard
            icon={<Database size={20} />}
            title="Historical Data"
            description="Historical energy data is available for analysis."
            status="Connected"
          />

        </div>

      </section>


      {/* =====================================
          SYSTEM INFORMATION
      ===================================== */}

      <section className="settings-section">

        <SectionHeader
          icon={<Shield size={20} />}
          title="System Information"
          description="SmartBuild AI platform information."
          className="system-icon"
        />


        <div className="system-info-grid">

          <InfoItem
            label="Platform"
            value="SmartBuild AI"
          />

          <InfoItem
            label="Version"
            value="1.0.0"
          />

          <InfoItem
            label="AI Engine"
            value="Operational"
          />

          <InfoItem
            label="Data Pipeline"
            value="Connected"
          />

          <InfoItem
            label="Monitoring Mode"
            value="Real-Time"
          />

          <InfoItem
            label="System Status"
            value="All Systems Operational"
            online
          />

        </div>

      </section>


      {/* =====================================
          BOTTOM SAVE BAR
      ===================================== */}

      <div className="settings-save-bar">

        <div>

          <strong>
            Configuration
          </strong>

          <span>
            Changes are saved locally for this device.
          </span>

        </div>


        <button
          className="save-button"
          onClick={handleSave}
        >

          {saved ? (
            <>
              <Check size={18} />
              Settings Saved
            </>
          ) : (
            <>
              <Save size={18} />
              Save Settings
            </>
          )}

        </button>

      </div>

    </div>
  );
}


/* =========================================
   SECTION HEADER
========================================= */

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className: string;
}

function SectionHeader({
  icon,
  title,
  description,
  className,
}: SectionHeaderProps) {

  return (
    <div className="section-heading">

      <div
        className={`section-icon ${className}`}
      >
        {icon}
      </div>

      <div>

        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}


/* =========================================
   TOGGLE
========================================= */

interface SettingToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

function SettingToggle({
  icon,
  title,
  description,
  enabled,
  setEnabled,
}: SettingToggleProps) {

  return (
    <div className="setting-row">

      <div className="setting-row-left">

        <div className="setting-row-icon">
          {icon}
        </div>

        <div>

          <h3>
            {title}
          </h3>

          <p>
            {description}
          </p>

        </div>

      </div>


      <button
        type="button"
        className={`toggle ${
          enabled ? "toggle-active" : ""
        }`}
        onClick={() =>
          setEnabled(!enabled)
        }
      >

        <span />

      </button>

    </div>
  );
}


/* =========================================
   STATUS CARD
========================================= */

interface StatusCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  status: "online" | "offline";
}

function StatusCard({
  icon,
  title,
  value,
  status,
}: StatusCardProps) {

  return (
    <div className="settings-status-card">

      <div className="status-card-icon">
        {icon}
      </div>

      <div className="status-card-content">

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

      </div>

      <div
        className={`status-indicator ${
          status === "online"
            ? "status-online"
            : "status-offline"
        }`}
      />

    </div>
  );
}


/* =========================================
   INFO CARD
========================================= */

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
}

function InfoCard({
  icon,
  title,
  description,
  status,
}: InfoCardProps) {

  return (
    <div className="energy-info-card">

      <div className="energy-info-top">

        <div className="energy-info-icon">
          {icon}
        </div>

        <span className="status-badge">
          {status}
        </span>

      </div>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>

    </div>
  );
}


/* =========================================
   INFO ITEM
========================================= */

interface InfoItemProps {
  label: string;
  value: string;
  online?: boolean;
}

function InfoItem({
  label,
  value,
  online = false,
}: InfoItemProps) {

  return (
    <div className="info-item">

      <span>
        {label}
      </span>

      <strong
        className={
          online
            ? "online-status"
            : ""
        }
      >

        {online && <span />}

        {value}

      </strong>

    </div>
  );
}