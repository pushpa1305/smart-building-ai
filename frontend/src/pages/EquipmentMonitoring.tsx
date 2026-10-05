import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Wrench,
  Zap,
} from "lucide-react";

import {
  getBuildings,
  type Building,
} from "../services/api";

interface EquipmentRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  floor: string;
  zone: string;
  location: string;
  power: number | null;
  ratedPower: number | null;
  lastMaintenance: string;
  nextMaintenance: string;
  updatedAt: string;
  raw: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getString(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = record[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return fallback;
}

function normalizeStatus(value: string): string {
  const status = value.toLowerCase().trim();

  if (
    status.includes("offline") ||
    status.includes("inactive") ||
    status === "off"
  ) {
    return "Offline";
  }

  if (
    status.includes("alert") ||
    status.includes("warning") ||
    status.includes("fault") ||
    status.includes("error")
  ) {
    return "Alert";
  }

  if (
    status.includes("maintenance") ||
    status.includes("service")
  ) {
    return "Maintenance";
  }

  if (
    status.includes("standby") ||
    status.includes("idle")
  ) {
    return "Standby";
  }

  if (
    status.includes("running") ||
    status.includes("active") ||
    status.includes("online") ||
    status === "on"
  ) {
    return "Running";
  }

  return "Unknown";
}

function formatDate(value: string): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function extractEquipmentArray(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!isRecord(response)) {
    return [];
  }

  const candidates = [
    response.data,
    response.equipment,
    response.items,
    response.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeEquipment(response: unknown): EquipmentRecord[] {
  return extractEquipmentArray(response)
    .filter(isRecord)
    .map((item, index) => {
      const name = getString(
        item,
        [
          "name",
          "equipment_name",
          "equipmentName",
          "device_name",
          "deviceName",
        ],
        `Equipment ${index + 1}`,
      );

      const rawStatus = getString(
        item,
        [
          "status",
          "equipment_status",
          "equipmentStatus",
          "device_status",
          "deviceStatus",
        ],
        "",
      );

      return {
        id: getString(
          item,
          [
            "id",
            "equipment_id",
            "equipmentId",
            "device_id",
            "deviceId",
          ],
          `${name}-${index + 1}`,
        ),
        name,
        type: getString(
          item,
          [
            "equipment_type",
            "equipmentType",
            "device_type",
            "deviceType",
            "type",
          ],
          "Equipment",
        ),
        status: normalizeStatus(rawStatus),
        floor: getString(
          item,
          ["floor", "floor_name", "floorName"],
          "—",
        ),
        zone: getString(
          item,
          ["zone", "zone_name", "zoneName"],
          "—",
        ),
        location: getString(
          item,
          ["location", "location_name", "locationName"],
          "—",
        ),
        power: toNumber(
          item.power_consumption ??
            item.powerConsumption ??
            item.power ??
            item.consumption,
        ),
        ratedPower: toNumber(
          item.rated_power ??
            item.ratedPower,
        ),
        lastMaintenance: getString(
          item,
          [
            "last_maintenance",
            "lastMaintenance",
          ],
          "",
        ),
        nextMaintenance: getString(
          item,
          [
            "next_maintenance",
            "nextMaintenance",
          ],
          "",
        ),
        updatedAt: getString(
          item,
          [
            "updated_at",
            "updatedAt",
            "timestamp",
            "datetime",
          ],
          "",
        ),
        raw: item,
      };
    });
}

async function fetchEquipment(
  buildingId?: number | string,
): Promise<EquipmentRecord[]> {
  const baseUrl = (
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:5000"
  ).replace(/\/$/, "");

  const query = new URLSearchParams();

  if (
    buildingId !== undefined &&
    buildingId !== null &&
    buildingId !== ""
  ) {
    query.set("building_id", String(buildingId));
  }

  const url = `${baseUrl}/api/equipment${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const contentType =
    response.headers.get("content-type") || "";

  let payload: unknown;

  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    const text = await response.text();

    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    let message = `Equipment API failed with status ${response.status}`;

    if (isRecord(payload)) {
      if (typeof payload.message === "string") {
        message = payload.message;
      } else if (typeof payload.error === "string") {
        message = payload.error;
      }
    }

    throw new Error(message);
  }

  return normalizeEquipment(payload);
}

export default function EquipmentMonitoring() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<
    number | string | undefined
  >(undefined);

  const [equipment, setEquipment] = useState<EquipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedEquipment, setSelectedEquipment] =
    useState<EquipmentRecord | null>(null);

  const loadEquipment = async (
    buildingId: number | string | undefined,
    showRefresh = false,
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const records = await fetchEquipment(buildingId);
      setEquipment(records);
    } catch (err) {
      console.error("Equipment monitoring error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load equipment data.",
      );

      setEquipment([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getBuildings();
        const buildingArray = Array.isArray(response)
          ? response
          : [];

        setBuildings(buildingArray);

        if (buildingArray.length > 0) {
          setSelectedBuildingId(buildingArray[0].id);
        } else {
          await loadEquipment(undefined);
        }
      } catch (err) {
        console.error("Building loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load building information.",
        );

        setEquipment([]);
        setLoading(false);
      }
    };

    loadBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuildingId === undefined) {
      return;
    }

    loadEquipment(selectedBuildingId);
  }, [selectedBuildingId]);

  const filteredEquipment = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return equipment.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.floor.toLowerCase().includes(query) ||
        item.zone.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [equipment, searchTerm, statusFilter]);

  const statistics = useMemo(() => {
    const running = equipment.filter(
      (item) => item.status === "Running",
    ).length;

    const alerts = equipment.filter(
      (item) => item.status === "Alert",
    ).length;

    const offline = equipment.filter(
      (item) => item.status === "Offline",
    ).length;

    const maintenance = equipment.filter(
      (item) => item.status === "Maintenance",
    ).length;

    const standby = equipment.filter(
      (item) => item.status === "Standby",
    ).length;

    const powerValues = equipment
      .map((item) => item.power)
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value),
      );

    const totalPower =
      powerValues.length > 0
        ? powerValues.reduce(
            (sum, value) => sum + value,
            0,
          )
        : null;

    const ratedPowerValues = equipment
      .map((item) => item.ratedPower)
      .filter(
        (value): value is number =>
          value !== null &&
          Number.isFinite(value) &&
          value > 0,
      );

    const totalRatedPower =
      ratedPowerValues.length > 0
        ? ratedPowerValues.reduce(
            (sum, value) => sum + value,
            0,
          )
        : null;

    const utilization =
      totalPower !== null &&
      totalRatedPower !== null &&
      totalRatedPower > 0
        ? (totalPower / totalRatedPower) * 100
        : null;

    return {
      total: equipment.length,
      running,
      alerts,
      offline,
      maintenance,
      standby,
      totalPower,
      totalRatedPower,
      utilization,
    };
  }, [equipment]);

  const equipmentTypes = useMemo(() => {
    const counts = new Map<string, number>();

    equipment.forEach((item) => {
      counts.set(
        item.type,
        (counts.get(item.type) || 0) + 1,
      );
    });

    return Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1],
    );
  }, [equipment]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Running":
        return "status-running";
      case "Alert":
        return "status-alert";
      case "Offline":
        return "status-offline";
      case "Maintenance":
        return "status-maintenance";
      case "Standby":
        return "status-standby";
      default:
        return "status-unknown";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Running":
        return <CheckCircle2 size={16} />;
      case "Alert":
        return <AlertTriangle size={16} />;
      case "Offline":
        return <Activity size={16} />;
      case "Maintenance":
        return <Clock3 size={16} />;
      case "Standby":
        return <Clock3 size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  if (loading && equipment.length === 0) {
    return (
      <div className="equipment-page">
        <div className="equipment-loading">
          <Loader2
            size={38}
            className="equipment-spinner"
          />
          <h2>Loading equipment monitoring...</h2>
          <p>
            Retrieving live equipment information from
            the building backend.
          </p>
        </div>

        <style>{`
          .equipment-page {
            min-height: 100%;
            padding: 28px;
            background: #f8fafc;
          }

          .equipment-loading {
            min-height: 500px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #0f172a;
          }

          .equipment-loading h2 {
            margin: 18px 0 6px;
            font-size: 22px;
          }

          .equipment-loading p {
            margin: 0;
            color: #64748b;
          }

          .equipment-spinner {
            animation: equipment-spin 0.9s linear infinite;
          }

          @keyframes equipment-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="equipment-page">
      <div className="equipment-header">
        <div className="equipment-title-row">
          <div className="equipment-title-icon">
            <Wrench size={24} />
          </div>

          <div>
            <div className="eyebrow">
              SMART BUILDING INTELLIGENCE
            </div>

            <h1>Equipment Monitoring</h1>

            <p>
              Live equipment status, power consumption,
              location and maintenance information from
              the building backend.
            </p>
          </div>
        </div>

        <div className="equipment-header-actions">
          <select
            value={selectedBuildingId ?? ""}
            onChange={(event) => {
              const value = event.target.value;

              const building = buildings.find(
                (item) => String(item.id) === value,
              );

              setSelectedBuildingId(building?.id);
            }}
            className="building-select"
          >
            <option value="">
              Select Building
            </option>

            {buildings.map((building) => (
              <option
                key={String(building.id)}
                value={String(building.id)}
              >
                {building.name}
              </option>
            ))}
          </select>

          <button
            className="refresh-button"
            onClick={() =>
              loadEquipment(
                selectedBuildingId,
                true,
              )
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={
                refreshing ? "refresh-spin" : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </div>

      <div className="backend-banner">
        <div className="backend-indicator">
          <span />
          Backend Connected
        </div>

        <span>
          Equipment data source: /api/equipment
        </span>
      </div>

      {error && (
        <div className="equipment-error">
          <AlertTriangle size={20} />

          <div>
            <strong>
              Unable to load equipment data
            </strong>
            <p>{error}</p>
          </div>

          <button
            onClick={() =>
              loadEquipment(
                selectedBuildingId,
                true,
              )
            }
          >
            Try Again
          </button>
        </div>
      )}

      <div className="equipment-stat-grid">
        <div className="equipment-stat-card">
          <div className="equipment-stat-icon total">
            <Building2 size={21} />
          </div>

          <div>
            <span>Total Equipment</span>
            <strong>{statistics.total}</strong>
            <small>Detected from backend</small>
          </div>
        </div>

        <div className="equipment-stat-card">
          <div className="equipment-stat-icon running">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Running</span>
            <strong>{statistics.running}</strong>
            <small>Currently operational</small>
          </div>
        </div>

        <div className="equipment-stat-card">
          <div className="equipment-stat-icon alert">
            <AlertTriangle size={21} />
          </div>

          <div>
            <span>Alerts</span>
            <strong>{statistics.alerts}</strong>
            <small>Warning / fault states</small>
          </div>
        </div>

        <div className="equipment-stat-card">
          <div className="equipment-stat-icon power">
            <Zap size={21} />
          </div>

          <div>
            <span>Total Power</span>
            <strong>
              {statistics.totalPower !== null
                ? `${statistics.totalPower.toFixed(1)} W`
                : "—"}
            </strong>

            <small>
              {statistics.totalPower !== null
                ? "Current equipment load"
                : "Power unavailable"}
            </small>
          </div>
        </div>

        <div className="equipment-stat-card">
          <div className="equipment-stat-icon maintenance">
            <Wrench size={21} />
          </div>

          <div>
            <span>Maintenance</span>
            <strong>{statistics.maintenance}</strong>
            <small>
              {statistics.offline} offline ·{" "}
              {statistics.standby} standby
            </small>
          </div>
        </div>
      </div>

      <div className="equipment-overview-grid">
        <div className="equipment-main-card">
          <div className="section-heading">
            <div>
              <h2>Equipment Overview</h2>
              <p>
                Current equipment inventory grouped by
                equipment type.
              </p>
            </div>

            <div className="record-count">
              {equipment.length} records
            </div>
          </div>

          {equipmentTypes.length === 0 ? (
            <div className="empty-small">
              No equipment type data available.
            </div>
          ) : (
            <div className="type-list">
              {equipmentTypes.map(
                ([type, count]) => {
                  const percentage =
                    statistics.total > 0
                      ? (count / statistics.total) * 100
                      : 0;

                  return (
                    <div
                      className="type-row"
                      key={type}
                    >
                      <div className="type-row-top">
                        <strong>{type}</strong>
                        <span>
                          {count} equipment
                        </span>
                      </div>

                      <div className="type-track">
                        <div
                          className="type-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        <div className="equipment-main-card power-card">
          <div className="section-heading">
            <div>
              <h2>Power Utilization</h2>
              <p>
                Calculated only when rated power is
                supplied by the backend.
              </p>
            </div>
          </div>

          <div className="power-number">
            {statistics.utilization !== null
              ? `${statistics.utilization.toFixed(1)}%`
              : "Unavailable"}
          </div>

          <div className="power-track">
            <div
              className="power-fill"
              style={{
                width: `${
                  statistics.utilization !== null
                    ? Math.min(
                        Math.max(
                          statistics.utilization,
                          0,
                        ),
                        100,
                      )
                    : 0
                }%`,
              }}
            />
          </div>

          <div className="power-meta">
            <span>
              Current:{" "}
              {statistics.totalPower !== null
                ? `${statistics.totalPower.toFixed(1)} W`
                : "—"}
            </span>

            <span>
              Rated:{" "}
              {statistics.totalRatedPower !== null
                ? `${statistics.totalRatedPower.toFixed(1)} W`
                : "Unavailable"}
            </span>
          </div>

          <div className="power-note">
            <Zap size={17} />
            <span>
              No rated-power percentage is fabricated.
              If the backend supplies rated power, the
              utilization is calculated automatically.
            </span>
          </div>
        </div>
      </div>

      <div className="equipment-main-card">
        <div className="equipment-toolbar">
          <div>
            <h2>Equipment Status</h2>
            <p>
              Live equipment records returned by the
              Flask backend.
            </p>
          </div>

          <div className="equipment-toolbar-controls">
            <div className="equipment-search">
              <Search size={17} />

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search equipment..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="status-filter"
            >
              <option value="All">
                All Status
              </option>
              <option value="Running">
                Running
              </option>
              <option value="Alert">
                Alert
              </option>
              <option value="Offline">
                Offline
              </option>
              <option value="Maintenance">
                Maintenance
              </option>
              <option value="Standby">
                Standby
              </option>
              <option value="Unknown">
                Unknown
              </option>
            </select>
          </div>
        </div>

        {equipment.length === 0 ? (
          <div className="no-equipment">
            <div className="no-equipment-icon">
              <Wrench size={30} />
            </div>

            <h3>No equipment data available</h3>

            <p>
              The backend did not return any equipment
              records for the selected building.
            </p>

            <button
              className="empty-refresh-button"
              onClick={() =>
                loadEquipment(
                  selectedBuildingId,
                  true,
                )
              }
            >
              <RefreshCw size={16} />
              Refresh Data
            </button>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="no-equipment">
            <div className="no-equipment-icon">
              <Search size={28} />
            </div>

            <h3>No matching equipment</h3>

            <p>
              Try changing the search text or status
              filter.
            </p>
          </div>
        ) : (
          <div className="equipment-table-wrapper">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Power</th>
                  <th>Rated Power</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredEquipment.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="equipment-name-cell">
                        <div className="equipment-row-icon">
                          <Wrench size={18} />
                        </div>

                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            ID: {item.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>{item.type}</td>

                    <td>
                      <div className="location-cell">
                        <strong>
                          {item.floor !== "—"
                            ? item.floor
                            : item.location !== "—"
                              ? item.location
                              : "Location unavailable"}
                        </strong>

                        <span>
                          {item.zone !== "—"
                            ? item.zone
                            : item.location !== "—"
                              ? item.location
                              : "Zone unavailable"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div
                        className={`equipment-status ${getStatusClass(
                          item.status,
                        )}`}
                      >
                        {getStatusIcon(item.status)}
                        <span>{item.status}</span>
                      </div>
                    </td>

                    <td>
                      {item.power !== null
                        ? `${item.power.toFixed(1)} W`
                        : "—"}
                    </td>

                    <td>
                      {item.ratedPower !== null &&
                      item.ratedPower > 0
                        ? `${item.ratedPower.toFixed(
                            1,
                          )} W`
                        : "—"}
                    </td>

                    <td>
                      {formatDate(item.updatedAt)}
                    </td>

                    <td>
                      <button
                        className="view-button"
                        onClick={() =>
                          setSelectedEquipment(item)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEquipment && (
        <div
          className="equipment-modal-overlay"
          onClick={() =>
            setSelectedEquipment(null)
          }
        >
          <div
            className="equipment-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="equipment-modal-header">
              <div>
                <span>Equipment Details</span>
                <h2>{selectedEquipment.name}</h2>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedEquipment(null)
                }
                aria-label="Close equipment details"
              >
                ×
              </button>
            </div>

            <div className="modal-status-row">
              <div
                className={`equipment-status ${getStatusClass(
                  selectedEquipment.status,
                )}`}
              >
                {getStatusIcon(
                  selectedEquipment.status,
                )}
                <span>
                  {selectedEquipment.status}
                </span>
              </div>
            </div>

            <div className="equipment-detail-grid">
              <div className="detail-box">
                <span>Equipment Type</span>
                <strong>
                  {selectedEquipment.type}
                </strong>
              </div>

              <div className="detail-box">
                <span>Equipment ID</span>
                <strong>
                  {selectedEquipment.id}
                </strong>
              </div>

              <div className="detail-box">
                <span>Floor</span>
                <strong>
                  {selectedEquipment.floor}
                </strong>
              </div>

              <div className="detail-box">
                <span>Zone</span>
                <strong>
                  {selectedEquipment.zone}
                </strong>
              </div>

              <div className="detail-box">
                <span>Location</span>
                <strong>
                  {selectedEquipment.location}
                </strong>
              </div>

              <div className="detail-box">
                <span>Current Power</span>
                <strong>
                  {selectedEquipment.power !== null
                    ? `${selectedEquipment.power.toFixed(
                        1,
                      )} W`
                    : "Unavailable"}
                </strong>
              </div>

              <div className="detail-box">
                <span>Rated Power</span>
                <strong>
                  {selectedEquipment.ratedPower !==
                    null &&
                  selectedEquipment.ratedPower > 0
                    ? `${selectedEquipment.ratedPower.toFixed(
                        1,
                      )} W`
                    : "Unavailable"}
                </strong>
              </div>

              <div className="detail-box">
                <span>Power Utilization</span>
                <strong>
                  {selectedEquipment.power !== null &&
                  selectedEquipment.ratedPower !== null &&
                  selectedEquipment.ratedPower > 0
                    ? `${(
                        (selectedEquipment.power /
                          selectedEquipment.ratedPower) *
                        100
                      ).toFixed(1)}%`
                    : "Unavailable"}
                </strong>
              </div>

              <div className="detail-box">
                <span>Last Maintenance</span>
                <strong>
                  {formatDate(
                    selectedEquipment.lastMaintenance,
                  )}
                </strong>
              </div>

              <div className="detail-box">
                <span>Next Maintenance</span>
                <strong>
                  {formatDate(
                    selectedEquipment.nextMaintenance,
                  )}
                </strong>
              </div>

              <div className="detail-box">
                <span>Last Updated</span>
                <strong>
                  {formatDate(
                    selectedEquipment.updatedAt,
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .equipment-page {
          min-height: 100%;
          padding: 28px;
          background: #f8fafc;
          color: #0f172a;
        }

        .equipment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 14px;
        }

        .equipment-title-row {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .equipment-title-icon {
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e0f2fe;
          color: #0284c7;
        }

        .eyebrow {
          margin-bottom: 5px;
          color: #06a6c7;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .equipment-header h1 {
          margin: 0 0 5px;
          font-size: 29px;
          font-weight: 800;
          letter-spacing: -0.6px;
        }

        .equipment-header p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .equipment-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .building-select,
        .status-filter {
          height: 42px;
          padding: 0 13px;
          border: 1px solid #dbe3ec;
          border-radius: 10px;
          background: white;
          color: #334155;
          font-size: 14px;
          outline: none;
        }

        .building-select:focus,
        .status-filter:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
        }

        .refresh-button,
        .empty-refresh-button {
          height: 42px;
          border: none;
          border-radius: 10px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #06b6d4;
          color: white;
          cursor: pointer;
          font-weight: 700;
        }

        .refresh-button:hover,
        .empty-refresh-button:hover {
          background: #0891b2;
        }

        .refresh-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .refresh-spin {
          animation: equipment-spin 0.9s linear infinite;
        }

        .backend-banner {
          min-height: 42px;
          margin-bottom: 20px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border: 1px solid #dbeafe;
          border-radius: 11px;
          background: #eff6ff;
          color: #64748b;
          font-size: 12px;
        }

        .backend-indicator {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #047857;
          font-weight: 800;
        }

        .backend-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        .equipment-error {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 20px;
          padding: 15px 17px;
          border: 1px solid #fecaca;
          border-radius: 13px;
          background: #fef2f2;
          color: #991b1b;
        }

        .equipment-error > div {
          flex: 1;
        }

        .equipment-error strong {
          display: block;
          margin-bottom: 3px;
        }

        .equipment-error p {
          margin: 0;
          font-size: 13px;
        }

        .equipment-error button {
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 8px 12px;
          background: white;
          color: #991b1b;
          cursor: pointer;
          font-weight: 700;
        }

        .equipment-stat-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 22px;
        }

        .equipment-stat-card {
          min-height: 108px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 13px;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          background: white;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
        }

        .equipment-stat-icon {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .equipment-stat-icon.total {
          background: #eef2ff;
          color: #4f46e5;
        }

        .equipment-stat-icon.running {
          background: #ecfdf5;
          color: #059669;
        }

        .equipment-stat-icon.alert {
          background: #fff7ed;
          color: #ea580c;
        }

        .equipment-stat-icon.power {
          background: #fefce8;
          color: #ca8a04;
        }

        .equipment-stat-icon.maintenance {
          background: #eff6ff;
          color: #2563eb;
        }

        .equipment-stat-card span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 3px;
        }

        .equipment-stat-card strong {
          display: block;
          font-size: 22px;
          line-height: 1.15;
          font-weight: 800;
        }

        .equipment-stat-card small {
          display: block;
          margin-top: 5px;
          color: #94a3b8;
          font-size: 10px;
        }

        .equipment-overview-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
          margin-bottom: 22px;
        }

        .equipment-main-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: white;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
        }

        .section-heading {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-heading h2 {
          margin: 0 0 4px;
          font-size: 18px;
        }

        .section-heading p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .record-count {
          padding: 7px 10px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .type-list {
          padding: 18px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .type-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 7px;
        }

        .type-row-top strong {
          font-size: 13px;
          color: #1e293b;
        }

        .type-row-top span {
          color: #94a3b8;
          font-size: 11px;
        }

        .type-track,
        .power-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .type-fill,
        .power-fill {
          height: 100%;
          border-radius: inherit;
          background: #7c3aed;
        }

        .power-card {
          padding-bottom: 20px;
        }

        .power-number {
          padding: 18px 20px 8px;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .power-card .power-track {
          margin: 0 20px;
        }

        .power-fill {
          background: #06b6d4;
        }

        .power-meta {
          padding: 11px 20px 0;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #64748b;
          font-size: 11px;
        }

        .power-note {
          margin: 17px 20px 0;
          padding: 12px;
          display: flex;
          gap: 9px;
          border-radius: 10px;
          background: #ecfeff;
          color: #0e7490;
          font-size: 11px;
          line-height: 1.5;
        }

        .equipment-toolbar {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .equipment-toolbar h2 {
          margin: 0 0 4px;
          font-size: 18px;
        }

        .equipment-toolbar p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .equipment-toolbar-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .equipment-search {
          width: 230px;
          height: 40px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dbe3ec;
          border-radius: 9px;
          color: #94a3b8;
        }

        .equipment-search input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 13px;
          color: #334155;
          background: transparent;
        }

        .equipment-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .equipment-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;
        }

        .equipment-table th {
          padding: 13px 17px;
          text-align: left;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }

        .equipment-table td {
          padding: 15px 17px;
          border-bottom: 1px solid #eef2f7;
          color: #475569;
          font-size: 13px;
          vertical-align: middle;
        }

        .equipment-table tbody tr:hover {
          background: #f8fafc;
        }

        .equipment-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .equipment-row-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #eff6ff;
          color: #2563eb;
        }

        .equipment-name-cell strong {
          display: block;
          color: #1e293b;
          font-size: 13px;
        }

        .equipment-name-cell span {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 10px;
        }

        .location-cell strong {
          display: block;
          color: #334155;
        }

        .location-cell span {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 11px;
        }

        .equipment-status {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .status-running {
          background: #ecfdf5;
          color: #047857;
        }

        .status-alert {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-offline {
          background: #f1f5f9;
          color: #475569;
        }

        .status-maintenance {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .status-standby {
          background: #f5f3ff;
          color: #6d28d9;
        }

        .status-unknown {
          background: #f8fafc;
          color: #64748b;
        }

        .view-button {
          padding: 7px 11px;
          border: 1px solid #dbe3ec;
          border-radius: 8px;
          background: white;
          color: #2563eb;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .view-button:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .empty-small {
          padding: 35px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }

        .no-equipment {
          min-height: 300px;
          padding: 50px 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .no-equipment-icon {
          width: 65px;
          height: 65px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #f1f5f9;
          color: #64748b;
          margin-bottom: 15px;
        }

        .no-equipment h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .no-equipment p {
          max-width: 570px;
          margin: 0 0 17px;
          color: #64748b;
          line-height: 1.6;
          font-size: 13px;
        }

        .equipment-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.52);
        }

        .equipment-modal {
          width: min(760px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 18px;
          background: white;
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.25);
        }

        .equipment-modal-header {
          padding: 21px 23px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
        }

        .equipment-modal-header span {
          color: #64748b;
          font-size: 12px;
        }

        .equipment-modal-header h2 {
          margin: 3px 0 0;
          font-size: 22px;
        }

        .modal-close {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 9px;
          background: #f1f5f9;
          color: #475569;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
        }

        .modal-close:hover {
          background: #e2e8f0;
        }

        .modal-status-row {
          padding: 17px 23px 0;
        }

        .equipment-detail-grid {
          padding: 20px 23px 25px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .detail-box {
          padding: 15px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #f8fafc;
        }

        .detail-box span {
          display: block;
          margin-bottom: 5px;
          color: #64748b;
          font-size: 11px;
        }

        .detail-box strong {
          display: block;
          color: #1e293b;
          font-size: 14px;
        }

        @keyframes equipment-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1250px) {
          .equipment-stat-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .equipment-overview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 850px) {
          .equipment-page {
            padding: 18px;
          }

          .equipment-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .equipment-header-actions {
            width: 100%;
          }

          .building-select {
            flex: 1;
          }

          .equipment-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .equipment-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .equipment-toolbar-controls {
            width: 100%;
          }

          .equipment-search {
            flex: 1;
          }

          .backend-banner {
            align-items: flex-start;
            flex-direction: column;
            padding: 12px 15px;
          }
        }

        @media (max-width: 560px) {
          .equipment-stat-grid {
            grid-template-columns: 1fr;
          }

          .equipment-title-row {
            align-items: flex-start;
          }

          .equipment-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .equipment-detail-grid {
            grid-template-columns: 1fr;
          }

          .equipment-toolbar-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .equipment-search {
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}
