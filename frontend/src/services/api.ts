// src/services/api.ts

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000"
).replace(/\/$/, "");

/* =========================================================
   TYPES
========================================================= */

/* =========================================================
   BUILDING
========================================================= */

export interface Building {
  id: number | string;
  name: string;
  location?: string;
  status?: string;
  description?: string;
}

/* =========================================================
   FLOOR ENERGY
========================================================= */

export interface FloorEnergy {
  id?: number | string;

  floor?: string | number;
  floorName?: string;
  floor_name?: string;
  name?: string;

  energy?: number;
  consumption?: number;
  actual?: number;
  value?: number;

  baseline?: number;
  baseline_energy?: number;
  baselineEnergy?: number;

  percentage?: number;
  energyPercentage?: number;
  energy_percentage?: number;

  building_id?: number | string;
  buildingId?: number | string;

  timestamp?: string;
  time?: string;
  datetime?: string;
  date?: string;
}

/* =========================================================
   ENERGY READING
========================================================= */

export interface EnergyReading {
  id?: number | string;

  timestamp?: string;
  time?: string;
  datetime?: string;
  date?: string;

  energy?: number;
  consumption?: number;
  actual?: number;
  baseline?: number;
  baseline_energy?: number;
  value?: number;

  building_id?: number | string;
  buildingId?: number | string;

  floor?: string;
  zone?: string;
}

/* =========================================================
   ANOMALY
========================================================= */

export interface Anomaly {
  id?: number | string;

  title?: string;
  name?: string;

  description?: string;
  message?: string;

  severity?: string;
  status?: string;

  timestamp?: string;
  detected_at?: string;
  detectedAt?: string;

  building_id?: number | string;
  buildingId?: number | string;
}

/* =========================================================
   RECOMMENDATION
========================================================= */

export interface Recommendation {
  id?: number | string;

  title?: string;
  name?: string;

  description?: string;
  action?: string;

  priority?: string;
  status?: string;

  estimated_savings?: number;
  estimatedSavings?: number;
  savings?: number;

  building_id?: number | string;
  buildingId?: number | string;
}

/* =========================================================
   OCCUPANCY DATA
========================================================= */

export interface OccupancyData {
  id?: number | string;

  timestamp?: string;
  time?: string;
  datetime?: string;
  date?: string;

  occupancy?: number;
  occupancy_rate?: number;
  occupancyRate?: number;
  percentage?: number;
  value?: number;

  current_occupancy?: number;
  currentOccupancy?: number;

  average_occupancy?: number;
  averageOccupancy?: number;

  peak_occupancy?: number;
  peakOccupancy?: number;

  capacity?: number;

  occupied?: number;
  occupiedCount?: number;
  occupied_count?: number;

  people?: number;

  building_id?: number | string;
  buildingId?: number | string;

  zone?: string;
  floor?: string;
  name?: string;
}

/* =========================================================
   FORECAST DATA
========================================================= */

export interface ForecastData {
  id?: number | string;

  timestamp?: string;
  time?: string;
  datetime?: string;
  date?: string;

  predicted?: number;
  prediction?: number;
  forecast?: number;

  energy?: number;
  consumption?: number;

  baseline?: number;

  building_id?: number | string;
  buildingId?: number | string;
}

/* =========================================================
   DASHBOARD
========================================================= */

export interface DashboardData {
  energyReadings?: EnergyReading[];

  currentEnergy?: number;
  baselineEnergy?: number;
  excessEnergy?: number;
  energyIncrease?: number;

  occupancy?: number;

  anomalyCount?: number;

  healthScore?: number;

  building?: Building;

  buildings?: Building[];
}

/* =========================================================
   OCCUPANCY ANALYTICS
========================================================= */

export interface OccupancyAnalytics {
  occupancy?: number;

  currentOccupancy?: number;
  current_occupancy?: number;

  averageOccupancy?: number;
  average_occupancy?: number;

  peakOccupancy?: number;
  peak_occupancy?: number;

  capacity?: number;

  data?: OccupancyData[];
  readings?: OccupancyData[];
  occupancyReadings?: OccupancyData[];
  history?: OccupancyData[];
  records?: OccupancyData[];

  zones?: OccupancyData[];
  floors?: OccupancyData[];
}

/* =========================================================
   FORECASTING
========================================================= */

export type ForecastRange =
  | 1
  | 3
  | 7
  | 14
  | 30
  | "1d"
  | "3d"
  | "7d"
  | "14d"
  | "30d";

export interface Forecasting {
  forecast?: ForecastData[];

  forecastData?: ForecastData[];

  forecasts?: ForecastData[];

  data?: ForecastData[];

  range?: ForecastRange;
}

/* =========================================================
   ENERGY QUERY
========================================================= */

export interface EnergyQuery {
  buildingId?: number | string;

  startDate?: string;
  endDate?: string;

  period?: string;

  limit?: number;
}

/* =========================================================
   LIVE MONITORING TYPES
========================================================= */

export interface LiveSensor {
  id?: number | string;

  name?: string;

  zone?: string;

  floor?: string;

  type?: string;

  temperature?: number;

  humidity?: number;

  occupancy?: number;

  energy?: number;

  consumption?: number;

  hvac?: boolean | string;

  lighting?: boolean | string;

  hvac_status?: string;

  lighting_status?: string;

  status?: string;

  timestamp?: string;

  updated?: string;
}

/* =========================================================
   LIVE MONITORING SUMMARY
========================================================= */

export interface LiveMonitoringSummary {
  currentEnergy?: number;
  current_energy?: number;

  energy?: number;

  power?: number;

  occupancy?: number;

  currentOccupancy?: number;
  current_occupancy?: number;

  sensorHealth?: number;
  sensor_health?: number;

  totalSensors?: number;
  total_sensors?: number;

  onlineSensors?: number;
  online_sensors?: number;
}

/* =========================================================
   LIVE MONITORING ALERT
========================================================= */

export interface LiveMonitoringAlert {
  id?: number | string;

  title?: string;
  name?: string;

  message?: string;
  description?: string;

  severity?: string;
  status?: string;

  timestamp?: string;
  detected_at?: string;
}

/* =========================================================
   LIVE MONITORING INSIGHT
========================================================= */

export interface LiveMonitoringInsight {
  id?: number | string;

  title?: string;
  name?: string;

  description?: string;
  message?: string;

  recommendation?: string;
}

/* =========================================================
   LIVE MONITORING DATA
========================================================= */

export interface LiveMonitoringData {
  sensors?: LiveSensor[];

  data?: LiveSensor[];

  summary?: LiveMonitoringSummary;

  sensorStatus?: Record<string, unknown>;

  alerts?: LiveMonitoringAlert[];

  insights?: LiveMonitoringInsight[];

  aiInsight?: LiveMonitoringInsight;

  lastUpdated?: string;

  timestamp?: string;
}

/* =========================================================
   HELPERS
========================================================= */

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/* =========================================================
   UNWRAP RESPONSE
========================================================= */

function unwrapResponse(
  response: unknown,
): unknown {
  if (!isRecord(response)) {
    return response;
  }

  if (
    response.data !== undefined &&
    response.data !== null
  ) {
    return response.data;
  }

  if (
    response.result !== undefined &&
    response.result !== null
  ) {
    return response.result;
  }

  return response;
}

/* =========================================================
   GET ARRAY
========================================================= */

function getArray<T>(
  response: unknown,
  keys: string[] = [],
): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  const unwrapped =
    unwrapResponse(response);

  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }

  if (isRecord(unwrapped)) {
    for (const key of keys) {
      const value =
        unwrapped[key];

      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }

  return [];
}

/* =========================================================
   BUILD QUERY
========================================================= */

function buildQuery(
  params: Record<
    string,
    string | number | undefined
  >,
): string {
  const searchParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        searchParams.append(
          key,
          String(value),
        );
      }
    },
  );

  const query =
    searchParams.toString();

  return query
    ? `?${query}`
    : "";
}

/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url =
    `${API_BASE_URL}${endpoint}`;

  const response =
    await fetch(url, {
      ...options,

      headers: {
        Accept:
          "application/json",

        "Content-Type":
          "application/json",

        ...(options.headers || {}),
      },
    });

  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  let result: unknown;

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    result =
      await response.json();
  } else {
    const text =
      await response.text();

    try {
      result =
        JSON.parse(text);
    } catch {
      result = text;
    }
  }

  if (!response.ok) {
    let message =
      `API request failed with status ${response.status}`;

    if (isRecord(result)) {
      if (
        typeof result.message ===
        "string"
      ) {
        message =
          result.message;
      } else if (
        typeof result.error ===
        "string"
      ) {
        message =
          result.error;
      }
    }

    throw new Error(message);
  }

  return result as T;
}

/* =========================================================
   BUILDINGS
========================================================= */

export async function getBuildings(): Promise<
  Building[]
> {
  const response =
    await apiRequest<unknown>(
      "/api/buildings",
    );

  return getArray<Building>(
    response,
    [
      "buildings",
      "data",
      "items",
      "results",
    ],
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export async function getDashboard(
  buildingId?: number | string,
): Promise<DashboardData> {
  const query =
    buildQuery({
      building_id:
        buildingId,
    });

  const response =
    await apiRequest<unknown>(
      `/api/dashboard${query}`,
    );

  const data =
    unwrapResponse(response);

  if (!isRecord(data)) {
    return {
      energyReadings: [],
    };
  }

  const energyReadings =
    getArray<EnergyReading>(
      data.energyReadings ??
        data.energy_readings ??
        data.readings ??
        [],
    );

  return {
    energyReadings,

    currentEnergy:
      Number(
        data.currentEnergy ??
          data.current_energy ??
          data.energy ??
          data.current_consumption ??
          0,
      ),

    baselineEnergy:
      Number(
        data.baselineEnergy ??
          data.baseline_energy ??
          data.baseline ??
          0,
      ),

    excessEnergy:
      Number(
        data.excessEnergy ??
          data.excess_energy ??
          data.potential_savings ??
          data.potentialSavings ??
          0,
      ),

    energyIncrease:
      Number(
        data.energyIncrease ??
          data.energy_change ??
          data.energyChange ??
          data.energy_increase ??
          0,
      ),

    occupancy:
      Number(
        data.occupancy ??
          data.current_occupancy ??
          data.currentOccupancy ??
          0,
      ),

    anomalyCount:
      Number(
        data.anomalyCount ??
          data.active_anomalies ??
          data.activeAnomalies ??
          data.anomaly_count ??
          0,
      ),

    healthScore:
      Number(
        data.healthScore ??
          data.health_score ??
          0,
      ),

    /*
     * IMPORTANT:
     *
     * The API returns Record<string, unknown>
     * from isRecord().
     *
     * Casting directly to Building causes TS2352.
     *
     * Therefore we intentionally use:
     * unknown -> Building
     */
    building:
      isRecord(
        data.building,
      )
        ? (data.building as unknown as Building)
        : undefined,

    buildings:
      getArray<Building>(
        data.buildings ??
          [],
      ),
  };
}

/* =========================================================
   ENERGY DATA
========================================================= */

export async function getEnergyData(
  params: EnergyQuery = {},
): Promise<EnergyReading[]> {
  const query =
    buildQuery({
      building_id:
        params.buildingId,

      start_date:
        params.startDate,

      end_date:
        params.endDate,

      period:
        params.period,

      limit:
        params.limit,
    });

  const response =
    await apiRequest<unknown>(
      `/api/energy${query}`,
    );

  return getArray<EnergyReading>(
    response,
    [
      "data",
      "items",
      "results",
      "readings",
      "energy",
      "energyReadings",
      "energy_readings",
    ],
  );
}

/* =========================================================
   FLOOR ENERGY
========================================================= */

export async function getFloorEnergy(
  buildingId?: number | string,
): Promise<FloorEnergy[]> {
  const query =
    buildQuery({
      building_id:
        buildingId,
    });

  /*
   * The frontend component expects FloorEnergy.
   *
   * We first try /api/floor-energy.
   */
  const response =
    await apiRequest<unknown>(
      `/api/floor-energy${query}`,
    );

  return getArray<FloorEnergy>(
    response,
    [
      "data",
      "items",
      "results",
      "floors",
      "floorEnergy",
      "floor_energy",
    ],
  );
}

/* =========================================================
   ANOMALIES
========================================================= */

export async function getAnomalies(
  buildingId?: number | string,
): Promise<Anomaly[]> {
  const query =
    buildQuery({
      building_id:
        buildingId,
    });

  const response =
    await apiRequest<unknown>(
      `/api/anomalies${query}`,
    );

  return getArray<Anomaly>(
    response,
    [
      "data",
      "items",
      "results",
      "alerts",
      "anomalies",
    ],
  );
}

/* =========================================================
   RECOMMENDATIONS
========================================================= */

export async function getRecommendations(
  buildingId?: number | string,
): Promise<Recommendation[]> {
  const query =
    buildQuery({
      building_id:
        buildingId,
    });

  const response =
    await apiRequest<unknown>(
      `/api/recommendations${query}`,
    );

  return getArray<Recommendation>(
    response,
    [
      "data",
      "items",
      "results",
      "recommendations",
    ],
  );
}


export async function approveRecommendation(
  recommendationId: number | string,
): Promise<Recommendation> {
  const response = await apiRequest<unknown>(
    `/api/recommendations/${recommendationId}/approve`,
    {
      method: "PATCH",
    },
  );

  const data = unwrapResponse(response);

  return data as Recommendation;
}

export async function dismissRecommendation(
  recommendationId: number | string,
): Promise<Recommendation> {
  const response = await apiRequest<unknown>(
    `/api/recommendations/${recommendationId}/dismiss`,
    {
      method: "PATCH",
    },
  );

  const data = unwrapResponse(response);

  return data as Recommendation;
}

/* =========================================================
   OCCUPANCY ANALYTICS
========================================================= */

export async function getOccupancyAnalytics(
  buildingId?: number | string,
  period?: string,
): Promise<OccupancyAnalytics> {
  const query =
    buildQuery({
      building_id:
        buildingId,

      period,
    });

  const response =
    await apiRequest<unknown>(
      `/api/occupancy${query}`,
    );

  const data =
    unwrapResponse(response);

  if (!isRecord(data)) {
    return {};
  }

  return data as OccupancyAnalytics;
}

/* =========================================================
   OCCUPANCY ZONES
========================================================= */

export async function getOccupancyZones(
  buildingId?: number | string,
): Promise<OccupancyData[]> {
  const query =
    buildQuery({
      building_id:
        buildingId,
    });

  const response =
    await apiRequest<unknown>(
      `/api/occupancy/zones${query}`,
    );

  return getArray<OccupancyData>(
    response,
    [
      "data",
      "items",
      "results",
      "zones",
      "floors",
    ],
  );
}


export async function getOccupancy(
  buildingId?: number | string,
): Promise<OccupancyData[]> {
  const query =
    buildQuery({
      building_id:
        buildingId,
    });

  const response =
    await apiRequest<unknown>(
      `/api/occupancy${query}`,
    );

  return getArray<OccupancyData>(
    response,
    [
      "data",
      "items",
      "results",
      "occupancy",
      "readings",
      "zones",
      "floors",
    ],
  );
}

/* =========================================================
   FORECAST
========================================================= */

export async function getForecast(
  range: ForecastRange,
  buildingId?: number | string,
): Promise<ForecastData[]> {
  const query =
    buildQuery({
      range,

      building_id:
        buildingId,
    });

  const response =
    await apiRequest<unknown>(
      `/api/forecast${query}`,
    );

  return getArray<ForecastData>(
    response,
    [
      "data",
      "items",
      "results",
      "forecast",
      "forecastData",
      "forecasts",
    ],
  );
}

/* =========================================================
   FORECASTING
========================================================= */

export async function getForecasting(
  range: ForecastRange,
  buildingId?: number | string,
): Promise<Forecasting> {
  const query =
    buildQuery({
      range,

      building_id:
        buildingId,
    });

  const response =
    await apiRequest<unknown>(
      `/api/forecasting${query}`,
    );

  const data =
    unwrapResponse(response);

  if (Array.isArray(data)) {
    return {
      forecast:
        data as ForecastData[],

      forecastData:
        data as ForecastData[],

      forecasts:
        data as ForecastData[],

      range,
    };
  }

  if (!isRecord(data)) {
    return {
      forecast: [],

      forecastData: [],

      forecasts: [],

      range,
    };
  }

  return data as Forecasting;
}

/* =========================================================
   LIVE MONITORING
========================================================= */

export async function getLiveMonitoring(
  buildingId?: number | string,
): Promise<LiveMonitoringData> {
  const query =
    buildQuery({
      building_id:
        buildingId,
    });

  const response =
    await apiRequest<unknown>(
      `/api/live-monitoring${query}`,
    );

  const data =
    unwrapResponse(response);

  if (!isRecord(data)) {
    return {};
  }

  return data as LiveMonitoringData;
}

/* =========================================================
   REPORTS
========================================================= */

export async function getReports(
  params: {
    buildingId?: number | string;

    reportType?: string;

    startDate?: string;

    endDate?: string;
  } = {},
): Promise<unknown[]> {
  const query =
    buildQuery({
      building_id:
        params.buildingId,

      report_type:
        params.reportType,

      start_date:
        params.startDate,

      end_date:
        params.endDate,
    });

  const response =
    await apiRequest<unknown>(
      `/api/reports${query}`,
    );

  return getArray<unknown>(
    response,
    [
      "data",
      "items",
      "results",
      "reports",
    ],
  );
}

/* =========================================================
   DEFAULT API OBJECT
========================================================= */

const api = {
  getBuildings,

  getDashboard,

  getEnergyData,

  getFloorEnergy,

  getAnomalies,

  getRecommendations,

  approveRecommendation,

  dismissRecommendation,

  getOccupancyAnalytics,

  getOccupancy,

  getOccupancyZones,

  getForecast,

  getForecasting,

  getLiveMonitoring,

  getReports,
};

export default api;