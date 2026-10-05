import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Gauge,
  RefreshCw,
  Sparkles,
  Thermometer,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import {
  getForecast,
  type ForecastData,
  type ForecastRange,
} from "../services/api";

/* ============================================================
   LOCAL TYPES
============================================================ */

interface ChartPoint {
  label: string;
  predicted: number | null;
  baseline: number | null;
  observed: number | null;
}

interface NormalizedForecast {
  original: ForecastData;
  unit: string;
  historicalLatest: string;
  historicalReadings: number | null;
  historyDays: number | null;
  label: string;
  date: string;
  time: string;
  forecastValue: number | null;
  baselineValue: number | null;
  observedValue: number | null;
  variance: number | null;
}

/* ============================================================
   FORECASTING PAGE
============================================================ */

export default function Forecasting() {
  const navigate = useNavigate();

  /* ==========================================================
     STATE
  ========================================================== */

  const [activePage, setActivePage] =
    useState("Forecasting");

  const [range, setRange] =
    useState<ForecastRange>(7);

  const [forecastData, setForecastData] =
    useState<ForecastData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showPeakOnly, setShowPeakOnly] =
    useState(false);

  /* ==========================================================
     HELPERS
  ========================================================== */

  const toNumber = useCallback(
    (value: unknown): number | null => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return null;
      }

      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : null;
    },
    []
  );

  const formatNumber = useCallback(
    (value: number | null): string => {
      if (value === null) {
        return "N/A";
      }

      return value.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 1,
        }
      );
    },
    []
  );

  const formatDateTime = useCallback(
    (value: unknown): string => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return "N/A";
      }

      const parsed =
        new Date(String(value));

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return String(value);
      }

      return parsed.toLocaleString();
    },
    []
  );

  /* ==========================================================
     API RESPONSE NORMALIZATION
  ========================================================== */

  const normalizeForecastResponse =
    useCallback(
      (result: unknown): ForecastData[] => {
        // api.ts getForecast() normally returns the forecast array directly.
        if (Array.isArray(result)) {
          return result as ForecastData[];
        }

        if (
          !result ||
          typeof result !== "object"
        ) {
          return [];
        }

        const response =
          result as {
            forecast?: unknown;
            forecastData?: unknown;
            forecasts?: unknown;
            data?: unknown;
          };

        if (
          Array.isArray(
            response.forecast
          )
        ) {
          return response.forecast as ForecastData[];
        }

        if (
          Array.isArray(
            response.forecastData
          )
        ) {
          return response.forecastData as ForecastData[];
        }

        if (
          Array.isArray(
            response.forecasts
          )
        ) {
          return response.forecasts as ForecastData[];
        }

        if (
          Array.isArray(
            response.data
          )
        ) {
          return response.data as ForecastData[];
        }

        return [];
      },
      []
    );

  /* ==========================================================
     LOAD FORECAST
  ========================================================== */

  const loadForecast = useCallback(
    async (
      selectedRange: ForecastRange,
      showLoader = true
    ) => {
      try {
        setError("");

        if (showLoader) {
          setLoading(true);
        }

        const result =
          await getForecast(
            selectedRange
          );

        const records =
          normalizeForecastResponse(
            result
          );

        setForecastData(records);
      } catch (err) {
        console.error(
          "Forecast API Error:",
          err
        );

        setForecastData([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load forecast data from backend."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [normalizeForecastResponse]
  );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    void loadForecast(
      range,
      true
    );
  }, [
    range,
    loadForecast,
  ]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    await loadForecast(
      range,
      false
    );
  };

  /* ==========================================================
     NORMALIZED DATA
  ========================================================== */

  const normalizedData =
    useMemo<NormalizedForecast[]>(
      () => {
        return forecastData.map(
          (item) => {
            const metadata = item as ForecastData & {
              unit?: string;
              historical_latest_datetime?: string;
              historical_latest_energy?: number;
              historical_latest_baseline?: number | null;
              historical_readings?: number;
              history_days?: number;
            };

            const explicitForecast =
              toNumber(
                item.predicted
              ) ??
              toNumber(
                item.prediction
              ) ??
              toNumber(
                item.forecast
              );

            const energyValue =
              toNumber(
                item.energy
              ) ??
              toNumber(
                item.consumption
              );

            /*
             * If the backend returns predicted/
             * prediction/forecast, use that.
             *
             * Otherwise use energy/consumption
             * as the returned forecast value.
             */
            const forecastValue =
              explicitForecast ??
              energyValue;

            /*
             * energy/consumption is treated as
             * observed only when an explicit
             * prediction field also exists.
             */
            const observedValue =
              explicitForecast !== null
                ? energyValue
                : null;

            const baselineValue =
              toNumber(
                item.baseline
              );

            const variance =
              forecastValue !== null &&
              baselineValue !== null &&
              baselineValue !== 0
                ? ((forecastValue -
                    baselineValue) /
                    baselineValue) *
                  100
                : null;

            const dateValue =
              item.date ??
              item.datetime ??
              item.timestamp ??
              "";

            const timeValue =
              item.time ?? "";

            return {
              original: item,
              unit:
                metadata.unit
                  ? `${metadata.unit}/day`
                  : "kWh/day",
              historicalLatest:
                String(
                  metadata.historical_latest_datetime ??
                    ""
                ),
              historicalReadings:
                typeof metadata.historical_readings ===
                "number"
                  ? metadata.historical_readings
                  : null,
              historyDays:
                typeof metadata.history_days ===
                "number"
                  ? metadata.history_days
                  : null,
              label:
                String(
                  dateValue ||
                    timeValue ||
                    "Point"
                ),
              date:
                String(
                  dateValue || "N/A"
                ),
              time:
                String(
                  timeValue || ""
                ),
              forecastValue,
              baselineValue,
              observedValue,
              variance,
            };
          }
        );
      },
      [forecastData, toNumber]
    );

  /* ==========================================================
     VISIBLE DATA
  ========================================================== */

  const visibleData =
    useMemo(() => {
      if (!showPeakOnly) {
        return normalizedData;
      }

      const valid =
        normalizedData.filter(
          (item) =>
            item.forecastValue !==
            null
        );

      if (valid.length === 0) {
        return [];
      }

      const maximum =
        Math.max(
          ...valid.map(
            (item) =>
              item.forecastValue ?? 0
          )
        );

      return valid.filter(
        (item) =>
          item.forecastValue ===
          maximum
      );
    }, [
      normalizedData,
      showPeakOnly,
    ]);

  /* ==========================================================
     TOTAL FORECAST
  ========================================================== */

  const totalPredicted =
    useMemo(() => {
      const values =
        normalizedData
          .map(
            (item) =>
              item.forecastValue
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      if (values.length === 0) {
        return null;
      }

      return values.reduce(
        (total, value) =>
          total + value,
        0
      );
    }, [normalizedData]);

  /* ==========================================================
     AVERAGE
  ========================================================== */

  const averageForecast =
    useMemo(() => {
      const values =
        normalizedData
          .map(
            (item) =>
              item.forecastValue
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      if (values.length === 0) {
        return null;
      }

      return (
        values.reduce(
          (total, value) =>
            total + value,
          0
        ) / values.length
      );
    }, [normalizedData]);

  /* ==========================================================
     MAXIMUM FORECAST
  ========================================================== */

  const maximumForecast =
    useMemo(() => {
      const values =
        normalizedData
          .map(
            (item) =>
              item.forecastValue
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      if (values.length === 0) {
        return null;
      }

      return Math.max(
        ...values
      );
    }, [normalizedData]);

  /* ==========================================================
     PEAK FORECAST RECORD
  ========================================================== */

  const peakRecord =
    useMemo(() => {
      const valid =
        normalizedData.filter(
          (item) =>
            item.forecastValue !==
            null
        );

      if (valid.length === 0) {
        return null;
      }

      return valid.reduce(
        (highest, current) => {
          const highestValue =
            highest.forecastValue ??
            -Infinity;

          const currentValue =
            current.forecastValue ??
            -Infinity;

          return currentValue >
            highestValue
            ? current
            : highest;
        }
      );
    }, [normalizedData]);

  /* ==========================================================
     AVERAGE VARIANCE
  ========================================================== */

  const averageVariance =
    useMemo(() => {
      const values =
        normalizedData
          .map(
            (item) =>
              item.variance
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      if (values.length === 0) {
        return null;
      }

      return (
        values.reduce(
          (total, value) =>
            total + value,
          0
        ) / values.length
      );
    }, [normalizedData]);

  /* ==========================================================
     STATUS COUNTS
  ========================================================== */

  const statusSummary =
    useMemo(() => {
      let normal = 0;
      let elevated = 0;
      let high = 0;

      normalizedData.forEach(
        (item) => {
          const variance =
            item.variance;

          if (
            variance === null
          ) {
            normal += 1;
          } else if (
            variance >= 15
          ) {
            high += 1;
          } else if (
            variance >= 5
          ) {
            elevated += 1;
          } else {
            normal += 1;
          }
        }
      );

      return {
        normal,
        elevated,
        high,
      };
    }, [normalizedData]);

  /* ==========================================================
     LATEST DATA POINT
  ========================================================== */

  const historicalLatest =
    normalizedData.find(
      (item) => item.historicalLatest
    )?.historicalLatest ?? "";


  /* ==========================================================
     CHART DATA
  ========================================================== */

  const chartData =
    useMemo<ChartPoint[]>(
      () =>
        visibleData.map(
          (item) => ({
            label: item.date,
            predicted:
              item.forecastValue,
            baseline:
              item.baselineValue,
            observed:
              item.observedValue,
          })
        ),
      [visibleData]
    );

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const openRecommendations =
    () => {
      setActivePage(
        "Recommendations"
      );

      navigate(
        "/recommendations"
      );
    };

  const openEquipment =
    () => {
      setActivePage(
        "Equipment Monitoring"
      );

      navigate(
        "/equipment-monitoring"
      );
    };

  /* ==========================================================
     CSV EXPORT
  ========================================================== */

  const exportCSV = () => {
    if (
      normalizedData.length === 0
    ) {
      return;
    }

    const headers = [
      "Date",
      "Time",
      "Forecast (kWh/day)",
      "Baseline (kWh/day)",
      "Observed (kWh/day)",
      "Variance %",
    ];

    const rows =
      normalizedData.map(
        (item) => [
          item.date,
          item.time,
          item.forecastValue ?? "",
          item.baselineValue ?? "",
          item.observedValue ?? "",
          item.variance !== null
            ? item.variance.toFixed(2)
            : "",
        ]
      );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `smart-building-${String(
        range
      )}-day-forecast.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar
          activePage={
            activePage
          }
          setActivePage={
            setActivePage
          }
        />

        <main className="main-content">
          <Topbar
            activePage={
              activePage
            }
          />

          <div
            style={{
              minHeight: "70vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "12px",
              textAlign: "center",
              padding: "30px",
            }}
          >
            <RefreshCw
              size={40}
              className="spin"
            />

            <h2>
              Loading Energy Forecast...
            </h2>

            <p>
              Fetching forecasting
              data from the backend.
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* ==========================================================
     MAIN PAGE
  ========================================================== */

  return (
    <div className="app-layout">
      <Sidebar
        activePage={
          activePage
        }
        setActivePage={
          setActivePage
        }
      />

      <main className="main-content">
        <Topbar
          activePage={
            activePage
          }
        />

        <div className="forecast-page">

          {/* ERROR */}

          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "14px 18px",
                borderRadius: "12px",
                background: "#fff1f2",
                border:
                  "1px solid #fecdd3",
                color: "#be123c",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <AlertTriangle
                size={20}
              />

              <div>
                <strong>
                  Forecasting API Error
                </strong>

                <div
                  style={{
                    fontSize: "13px",
                    marginTop: "3px",
                  }}
                >
                  {error}
                </div>
              </div>

              <button
                className="secondary-button"
                onClick={() =>
                  void loadForecast(
                    range,
                    true
                  )
                }
                style={{
                  marginLeft: "auto",
                }}
              >
                <RefreshCw
                  size={15}
                />
                Retry
              </button>
            </div>
          )}

          {/* HEADER */}

          <section className="forecast-header">
            <div>
              <div className="eyebrow">
                <BrainCircuit
                  size={16}
                />
                AI POWERED PREDICTION
              </div>

              <h1>
                Energy Forecasting
              </h1>

              <p>
                Analyze forecasted energy
                consumption using data
                returned by your backend
                forecasting API.
              </p>
            </div>

            <div className="header-actions">
              <button
                className="secondary-button"
                onClick={
                  exportCSV
                }
                disabled={
                  normalizedData.length ===
                  0
                }
              >
                <Download
                  size={17}
                />
                Export CSV
              </button>

              <button
                className="primary-button"
                onClick={
                  handleRefresh
                }
                disabled={
                  refreshing
                }
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh Forecast"}
              </button>
            </div>
          </section>

          {/* STATUS STRIP */}

          <section className="forecast-status-strip">

            <div className="status-item">
              <div className="status-icon green">
                <CheckCircle2
                  size={18}
                />
              </div>

              <div>
                <span>
                  Forecast API
                </span>

                <strong>
                  {error
                    ? "Error"
                    : "Connected"}
                </strong>
              </div>
            </div>

            <div className="status-divider" />

            <div className="status-item">
              <div className="status-icon blue">
                <Clock3
                  size={18}
                />
              </div>

              <div>
                <span>
                  Forecast Points
                </span>

                <strong>
                  {normalizedData.length}
                </strong>
              </div>
            </div>

            <div className="status-divider" />

            <div className="status-item">
              <div className="status-icon purple">
                <Sparkles
                  size={18}
                />
              </div>

              <div>
                <span>
                  Selected Range
                </span>

                <strong>
                  {range} Days
                </strong>
              </div>
            </div>

            <div className="status-divider" />

            <div className="status-item">
              <div className="status-icon orange">
                <Gauge
                  size={18}
                />
              </div>

              <div>
                <span>
                  Latest Data
                </span>

                <strong>
                  {historicalLatest
                    ? formatDateTime(historicalLatest)
                    : "N/A"}
                </strong>
              </div>
            </div>

          </section>

          {/* TOOLBAR */}

          <section className="forecast-toolbar">

            <div className="range-selector">
              <span className="toolbar-label">
                <CalendarDays
                  size={16}
                />
                Forecast period
              </span>

              <div className="range-buttons">
                {[1, 3, 7, 14, 30].map(
                  (days) => (
                    <button
                      key={days}
                      className={
                        Number(
                          range
                        ) ===
                        days
                          ? "range-active"
                          : ""
                      }
                      onClick={() =>
                        setRange(
                          days as ForecastRange
                        )
                      }
                      disabled={
                        refreshing
                      }
                    >
                      {days} Days
                    </button>
                  )
                )}
              </div>
            </div>

            <button
              className={`peak-filter ${
                showPeakOnly
                  ? "peak-active"
                  : ""
              }`}
              onClick={() =>
                setShowPeakOnly(
                  !showPeakOnly
                )
              }
              disabled={
                normalizedData.length ===
                0
              }
            >
              <AlertTriangle
                size={16}
              />

              {showPeakOnly
                ? "Showing Peak Point"
                : "Show Peak Point"}
            </button>

          </section>

          {/* KPI */}

          <section className="forecast-kpi-grid">

            <ForecastCard
              icon={
                <Zap size={21} />
              }
              title="Projected Consumption"
              value={
                formatNumber(
                  totalPredicted
                )
              }
              unit={
                totalPredicted !== null
                  ? "kWh"
                  : undefined
              }
              description={
                normalizedData.length >
                0
                  ? `${range}-day projected consumption`
                  : "No forecast data"
              }
              trend={
                averageVariance !==
                null
                  ? `${
                      averageVariance >=
                      0
                        ? "+"
                        : ""
                    }${averageVariance.toFixed(
                      1
                    )}% vs baseline`
                  : "No baseline"
              }
              trendType={
                getTrendType(
                  averageVariance
                )
              }
              iconClass="cyan"
            />

            <ForecastCard
              icon={
                <BarChart3
                  size={21}
                />
              }
              title="Average Forecast"
              value={
                formatNumber(
                  averageForecast
                )
              }
              unit={
                averageForecast !==
                null
                  ? "kWh/day"
                  : undefined
              }
              description={
                averageForecast !==
                null
                  ? "Average projected daily consumption"
                  : "No forecast data"
              }
              trend={
                normalizedData.length >
                0
                  ? "Backend forecast"
                  : "N/A"
              }
              trendType="normal"
              iconClass="blue"
            />

            <ForecastCard
              icon={
                <TrendingUp
                  size={21}
                />
              }
              title="Peak Forecast"
              value={
                formatNumber(
                  maximumForecast
                )
              }
              unit={
                maximumForecast !==
                null
                  ? "kWh/day"
                  : undefined
              }
              description={
                peakRecord
                  ? `At ${peakRecord.date}`
                  : "No peak data"
              }
              trend={
                peakRecord
                  ? "Highest forecast value"
                  : "No data"
              }
              trendType={
                getTrendType(
                  averageVariance
                )
              }
              iconClass="orange"
            />

            <ForecastCard
              icon={
                <BrainCircuit
                  size={21}
                />
              }
              title="Data Coverage"
              value={
                String(
                  normalizedData.length
                )
              }
              unit={
                normalizedData.length >
                0
                  ? "points"
                  : undefined
              }
              description="Returned by backend"
              trend={
                error
                  ? "API error"
                  : "Available"
              }
              trendType={
                error
                  ? "critical"
                  : "normal"
              }
              iconClass="purple"
            />

          </section>

          {/* FORECAST CHART */}

          <section className="forecast-chart-card">

            <div className="card-heading">

              <div>
                <div className="card-title-row">
                  <h2>
                    Daily Energy Consumption Forecast
                  </h2>

                  <span className="ai-badge">
                    <Sparkles
                      size={13}
                    />
                    Backend Forecast
                  </span>
                </div>

                <p>
                  Projected daily consumption compared
                  with the historical baseline.
                </p>

                <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                  Unit: kWh/day · Future dates are forecasts; observed values will appear after those dates occur.
                </p>
              </div>

              <div className="chart-legend-info">

                <span>
                  <i className="legend-dot predicted" />
                  Forecast
                </span>

                <span>
                  <i className="legend-dot baseline" />
                  Baseline
                </span>

                <span>
                  <i className="legend-dot actual" />
                  Observed
                </span>

              </div>

            </div>

            <div
              className="large-chart"
              style={{
                minHeight: "360px",
              }}
            >
              {chartData.length ===
              0 ? (
                <div
                  style={{
                    minHeight: "300px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  No forecast data
                  available from backend.
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={
                      chartData
                    }
                  >
                    <defs>
                      <linearGradient
                        id="forecastFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#06b6d4"
                          stopOpacity={
                            0.25
                          }
                        />

                        <stop
                          offset="100%"
                          stopColor="#06b6d4"
                          stopOpacity={
                            0.02
                          }
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <YAxis
                      label={{
                        value: "kWh/day",
                        angle: -90,
                        position: "insideLeft",
                        style: { textAnchor: "middle", fontSize: 12 },
                      }}
                      tick={{
                        fontSize: 12,
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <Tooltip />

                    <Area
                      type="monotone"
                      dataKey="predicted"
                      name="Forecast"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fill="url(#forecastFill)"
                    />

                    <Line
                      type="monotone"
                      dataKey="baseline"
                      name="Baseline"
                      stroke="#64748b"
                      strokeWidth={2}
                      strokeDasharray="7 6"
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="observed"
                      name="Observed"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

          </section>

          {/* TWO COLUMNS */}

          <section className="forecast-two-column">

            {/* INSIGHTS */}

            <div className="ai-insight-card">

              <div className="ai-insight-header">

                <div className="ai-brain">
                  <BrainCircuit
                    size={24}
                  />
                </div>

                <div>
                  <h2>
                    Forecast Insights
                  </h2>

                  <p>
                    Calculated from
                    backend forecast
                    values.
                  </p>
                </div>

              </div>

              <div className="insight-main">

                <div className="insight-score">

                  <span>
                    Forecast Status
                  </span>

                  <strong>
                    {error
                      ? "Unavailable"
                      : normalizedData.length >
                        0
                      ? "Available"
                      : "No Data"}
                  </strong>

                  <div className="risk-meter">
                    <div
                      className="risk-meter-fill"
                      style={{
                        width:
                          `${Math.min(
                            Math.max(
                              Math.abs(
                                averageVariance ??
                                  0
                              ),
                              0
                            ),
                            100
                          )}%`,
                      }}
                    />
                  </div>

                  <small>
                    Average variance:{" "}
                    {averageVariance !==
                    null
                      ? `${averageVariance.toFixed(
                          1
                        )}%`
                      : "N/A"}
                  </small>

                </div>

                <div className="insight-message">

                  <Sparkles
                    size={18}
                  />

                  <p>
                    {normalizedData.length >
                    0
                      ? getInsightMessage(
                          averageVariance,
                          maximumForecast
                        )
                      : "No forecasting information is currently available from the backend."}
                  </p>

                </div>

              </div>

              <div className="insight-list">

                <div>
                  <span className="insight-number">
                    01
                  </span>

                  <p>
                    Normal points:{" "}
                    <strong>
                      {
                        statusSummary.normal
                      }
                    </strong>
                  </p>
                </div>

                <div>
                  <span className="insight-number">
                    02
                  </span>

                  <p>
                    Elevated points:{" "}
                    <strong>
                      {
                        statusSummary.elevated
                      }
                    </strong>
                  </p>
                </div>

                <div>
                  <span className="insight-number">
                    03
                  </span>

                  <p>
                    High points:{" "}
                    <strong>
                      {
                        statusSummary.high
                      }
                    </strong>
                  </p>
                </div>

              </div>

              <button
                className="insight-action"
                onClick={
                  openRecommendations
                }
              >
                View Recommendations

                <ChevronRight
                  size={16}
                />
              </button>

            </div>

            {/* PEAK FORECAST */}

            <div className="peak-card">

              <div className="card-heading">

                <div>
                  <h2>
                    Peak Forecast
                  </h2>

                  <p>
                    Highest projected daily consumption
                    in the selected forecast period.
                  </p>
                </div>

                <div className="peak-icon">
                  <TrendingUp
                    size={20}
                  />
                </div>

              </div>

              <div className="peak-value">

                <strong>
                  {formatNumber(
                    maximumForecast
                  )}
                </strong>

                {maximumForecast !==
                  null && (
                  <span>
                    kWh/day
                  </span>
                )}

              </div>

              <div className="peak-date">

                <CalendarDays
                  size={15}
                />

                Peak point:{" "}
                {peakRecord
                  ? peakRecord.date
                  : "N/A"}

              </div>

              <div
                className="peak-chart"
                style={{
                  minHeight: "130px",
                }}
              >

                {chartData.length ===
                0 ? (
                  <div
                    style={{
                      minHeight: "120px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                      fontSize: "13px",
                    }}
                  >
                    No forecast data
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={
                        chartData
                      }
                    >
                      <XAxis
                        dataKey="label"
                        hide
                      />

                      <YAxis hide />

                      <Tooltip />

                      <Line
                        type="monotone"
                        dataKey="predicted"
                        name="Forecast"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}

              </div>

              <div className="peak-warning">

                <AlertTriangle
                  size={18}
                />

                <div>
                  <strong>
                    Peak forecast status
                  </strong>

                  <p>
                    {maximumForecast !==
                    null
                      ? `Highest forecast value is ${formatNumber(
                          maximumForecast
                        )}.`
                      : "No peak forecast information is available."}
                  </p>
                </div>

              </div>

            </div>

          </section>

          {/* TABLE */}

          <section className="forecast-table-card">

            <div className="card-heading table-heading">

              <div>
                <h2>
                  Forecast Data
                </h2>

                <p>
                  Detailed values returned
                  by the forecasting API.
                </p>
              </div>

              <span className="data-count">
                {normalizedData.length}{" "}
                forecast points
              </span>

            </div>

            <div className="table-wrapper">

              <table className="forecast-table">

                <thead>
                  <tr>
                    <th>
                      Date
                    </th>

                    <th>
                      Forecast
                    </th>

                    <th>
                      Baseline
                    </th>

                    <th>
                      Variance
                    </th>

                    <th>
                      Observed
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {normalizedData.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "40px",
                        }}
                      >
                        No forecast data
                        available from
                        backend.
                      </td>
                    </tr>
                  ) : (
                    normalizedData.map(
                      (
                        item,
                        index
                      ) => {
                        const status =
                          getForecastStatus(
                            item.variance
                          );

                        return (
                          <tr
                            key={`${item.label}-${index}`}
                          >
                            <td>
                              <div className="date-cell">
                                <strong>
                                  {
                                    item.date
                                  }
                                </strong>

                                <span>
                                  {
                                    item.time
                                  }
                                </span>
                              </div>
                            </td>

                            <td>
                              <strong className="energy-number">
                                {formatNumber(
                                  item.forecastValue
                                )}
                              </strong>
                            </td>

                            <td>
                              {formatNumber(
                                item.baselineValue
                              )}
                            </td>

                            <td>
                              <span
                                className={`variance ${getStatusClass(
                                  status
                                )}`}
                              >
                                {item.variance !==
                                null
                                  ? `${
                                      item.variance >=
                                      0
                                        ? "+"
                                        : ""
                                    }${item.variance.toFixed(
                                      1
                                    )}%`
                                  : "N/A"}
                              </span>
                            </td>

                            <td>
                              {item.observedValue !== null
                                ? `${formatNumber(item.observedValue)} kWh`
                                : "Future — not observed yet"}
                            </td>

                            <td>
                              <span
                                className={`forecast-status ${getStatusClass(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

          {/* SUMMARY */}

          <section className="zone-section">

            <div className="section-title">

              <div>
                <h2>
                  Forecast Summary
                </h2>

                <p>
                  Projected daily energy consumption
                  for the selected forecast horizon.
                </p>
              </div>

              <button
                className="view-all-button"
                onClick={
                  openEquipment
                }
              >
                View Equipment

                <ChevronRight
                  size={15}
                />
              </button>

            </div>

            <div className="zone-grid">

              <SummaryCard
                icon={
                  <Zap size={20} />
                }
                title="Projected Consumption"
                value={
                  totalPredicted !==
                  null
                    ? formatNumber(
                        totalPredicted
                      )
                    : "N/A"
                }
              />

              <SummaryCard
                icon={
                  <Gauge size={20} />
                }
                title="Maximum Forecast"
                value={
                  maximumForecast !==
                  null
                    ? formatNumber(
                        maximumForecast
                      )
                    : "N/A"
                }
              />

              <SummaryCard
                icon={
                  <TrendingUp
                    size={20}
                  />
                }
                title="Average Variance"
                value={
                  averageVariance !==
                  null
                    ? `${
                        averageVariance >=
                        0
                          ? "+"
                          : ""
                      }${averageVariance.toFixed(
                        1
                      )}%`
                    : "N/A"
                }
              />

              <SummaryCard
                icon={
                  <CheckCircle2
                    size={20}
                  />
                }
                title="Normal Points"
                value={String(
                  statusSummary.normal
                )}
              />

            </div>

          </section>

          {/* BACKEND SERVICE */}

          <section className="model-section">

            <div className="model-card">

              <div className="model-icon">
                <BrainCircuit
                  size={25}
                />
              </div>

              <div className="model-content">

                <div className="model-title-row">

                  <div>
                    <h2>
                      Forecasting Service
                    </h2>

                    <p>
                      Connected through
                      the forecasting
                      endpoint in api.ts.
                    </p>
                  </div>

                  <span className="agent-online">
                    <span />

                    {error
                      ? "Offline"
                      : "Connected"}
                  </span>

                </div>

                <div className="model-details">

                  <div>
                    <span>
                      Forecast Range
                    </span>

                    <strong>
                      {range} Days
                    </strong>
                  </div>

                  <div>
                    <span>
                      Forecast Points
                    </span>

                    <strong>
                      {
                        normalizedData.length
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Baseline Data
                    </span>

                    <strong>
                      {
                        normalizedData.filter(
                          (item) =>
                            item.baselineValue !==
                            null
                        ).length
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Historical Readings
                    </span>

                    <strong>
                      {
                        normalizedData.find((item) => item.historicalReadings !== null)?.historicalReadings ?? 0
                      }
                    </strong>
                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* FOOTER */}

          <div className="forecast-footer-note">

            <Thermometer
              size={16}
            />

            <span>
              Forecast values are generated from
              historical building energy readings.
              Future points have no observed value
              until the corresponding day occurs.
            </span>

          </div>

        </div>
      </main>
    </div>
  );
}

/* ============================================================
   TREND TYPE
============================================================ */

function getTrendType(
  value: number | null
): "normal" | "warning" | "critical" {
  if (value === null) {
    return "normal";
  }

  const absolute =
    Math.abs(value);

  if (absolute >= 20) {
    return "critical";
  }

  if (absolute >= 10) {
    return "warning";
  }

  return "normal";
}

/* ============================================================
   FORECAST STATUS
============================================================ */

function getForecastStatus(
  variance: number | null
): string {
  if (variance === null) {
    return "No Baseline";
  }

  if (variance >= 15) {
    return "High";
  }

  if (variance >= 5) {
    return "Elevated";
  }

  if (variance <= -5) {
    return "Below Baseline";
  }

  return "Normal";
}

/* ============================================================
   STATUS CLASS
============================================================ */

function getStatusClass(
  status: string
): string {
  const value =
    status
      .toLowerCase()
      .replace(
        /\s+/g,
        "-"
      );

  if (
    value.includes("high")
  ) {
    return "status-high";
  }

  if (
    value.includes("elevated")
  ) {
    return "status-warning";
  }

  if (
    value.includes(
      "below"
    )
  ) {
    return "status-normal";
  }

  if (
    value.includes(
      "normal"
    )
  ) {
    return "status-normal";
  }

  return "status-normal";
}

/* ============================================================
   INSIGHT MESSAGE
============================================================ */

function getInsightMessage(
  averageVariance: number | null,
  maximumForecast: number | null
): string {
  if (
    averageVariance === null
  ) {
    return "The backend returned forecast values, but baseline values are not available for comparison.";
  }

  if (
    averageVariance >= 15
  ) {
    return `Forecast consumption is significantly above the returned baseline, with an average variance of ${averageVariance.toFixed(
      1
    )}%.`;
  }

  if (
    averageVariance >= 5
  ) {
    return `Forecast consumption is moderately above the returned baseline, with an average variance of ${averageVariance.toFixed(
      1
    )}%.`;
  }

  if (
    averageVariance <= -5
  ) {
    return `Forecast consumption is below the returned baseline by an average of ${Math.abs(
      averageVariance
    ).toFixed(1)}%.`;
  }

  if (
    maximumForecast !== null
  ) {
    return "Forecast values are generally close to the returned baseline.";
  }

  return "Forecast data is available from the backend.";
}

/* ============================================================
   KPI CARD
============================================================ */

interface ForecastCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  unit?: string;
  description: string;
  trend: string;
  trendType:
    | "normal"
    | "warning"
    | "critical";
  iconClass: string;
}

function ForecastCard({
  icon,
  title,
  value,
  unit,
  description,
  trend,
  trendType,
  iconClass,
}: ForecastCardProps) {
  return (
    <div className="forecast-kpi-card">

      <div className="kpi-card-header">

        <div
          className={`kpi-icon ${iconClass}`}
        >
          {icon}
        </div>

        <span
          className={`kpi-trend ${trendType}`}
        >
          {trendType ===
          "normal" ? (
            <CheckCircle2
              size={13}
            />
          ) : (
            <TrendingUp
              size={13}
            />
          )}

          {trend}
        </span>

      </div>

      <span className="kpi-title">
        {title}
      </span>

      <div className="kpi-value">

        <strong>
          {value}
        </strong>

        {unit && (
          <span>
            {unit}
          </span>
        )}

      </div>

      <span className="kpi-description">
        {description}
      </span>

    </div>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

interface SummaryCardProps {
  icon: ReactNode;
  title: string;
  value: string;
}

function SummaryCard({
  icon,
  title,
  value,
}: SummaryCardProps) {
  return (
    <div className="zone-card">

      <div className="zone-card-top">

        <div className="zone-icon">
          {icon}
        </div>

        <span className="zone-status status-normal">
          Backend
        </span>

      </div>

      <h3>
        {title}
      </h3>

      <div
        style={{
          marginTop: "18px",
          fontSize: "24px",
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {value}
      </div>

    </div>
  );
}