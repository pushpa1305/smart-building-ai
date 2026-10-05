import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import type { EnergyReading } from "../services/api";

interface EnergyChartProps {
  data: EnergyReading[];
}

interface ChartDataItem {
  timestamp: number;
  time: string;
  fullTime: string;
  consumption: number;
  baseline: number;
}

export default function EnergyChart({
  data,
}: EnergyChartProps) {
  /*
   * =====================================================
   * NORMALIZE ENERGY DATA
   * =====================================================
   */

  const normalizedData: ChartDataItem[] = Array.isArray(data)
    ? data
        .map((item) => {
          const rawTimestamp = String(
            item?.timestamp ?? ""
          );

          const normalizedTimestamp =
            rawTimestamp.includes("T")
              ? rawTimestamp
              : rawTimestamp.replace(" ", "T");

          const date = new Date(normalizedTimestamp);

          if (Number.isNaN(date.getTime())) {
            return null;
          }

          const consumption = Number(
            item?.consumption ?? 0
          );

          const baseline = Number(
            item?.baseline ?? 0
          );

          return {
            timestamp: date.getTime(),

            time: date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),

            fullTime: date.toLocaleString([], {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),

            consumption: Number.isFinite(consumption)
              ? consumption
              : 0,

            baseline: Number.isFinite(baseline)
              ? baseline
              : 0,
          };
        })
        .filter(
          (item): item is ChartDataItem =>
            item !== null
        )
        .sort(
          (a, b) =>
            a.timestamp - b.timestamp
        )
    : [];

  /*
   * =====================================================
   * SHOW LATEST 24 HOURS
   * =====================================================
   *
   * Your database contains 30 days of hourly data.
   * For the dashboard, displaying the latest 24 hours
   * gives a much cleaner real-time view.
   */

  const chartData =
    normalizedData.length > 24
      ? normalizedData.slice(-24)
      : normalizedData;

  /*
   * =====================================================
   * LATEST VALUES
   * =====================================================
   */

  const latestReading =
    chartData.length > 0
      ? chartData[chartData.length - 1]
      : null;

  /*
   * =====================================================
   * EMPTY STATE
   * =====================================================
   */

  if (chartData.length === 0) {
    return (
      <div className="dashboard-panel energy-chart-panel">

        <div className="panel-header">
          <div>
            <h3>Energy Consumption</h3>

            <p>
              Real-time consumption vs historical
              baseline
            </p>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="empty-state">
            <span>
              No energy data available
            </span>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <div className="dashboard-panel energy-chart-panel">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="panel-header">

        <div>
          <h3>Energy Consumption</h3>

          <p>
            Latest 24 hours vs historical baseline
          </p>
        </div>

        {/* =================================================
            LEGEND
        ================================================= */}

        <div className="chart-legend">

          <span>
            <i className="legend-dot consumption-dot"></i>
            Consumption
          </span>

          <span>
            <i className="legend-dot baseline-dot"></i>
            Baseline
          </span>

        </div>
      </div>

      {/* =================================================
          LATEST READING
      ================================================= */}

      {latestReading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "12px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >

          <div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                marginBottom: "3px",
              }}
            >
              Latest Consumption
            </div>

            <strong
              style={{
                fontSize: "17px",
                color: "#2563eb",
              }}
            >
              {latestReading.consumption.toFixed(1)}
              {" "}
              kWh
            </strong>
          </div>

          <div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                marginBottom: "3px",
              }}
            >
              Baseline
            </div>

            <strong
              style={{
                fontSize: "17px",
                color: "#64748b",
              }}
            >
              {latestReading.baseline.toFixed(1)}
              {" "}
              kWh
            </strong>
          </div>

          <div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                marginBottom: "3px",
              }}
            >
              Variance
            </div>

            <strong
              style={{
                fontSize: "17px",
                color:
                  latestReading.consumption >
                  latestReading.baseline
                    ? "#dc2626"
                    : "#16a34a",
              }}
            >
              {(
                latestReading.consumption -
                latestReading.baseline
              ).toFixed(1)}
              {" "}
              kWh
            </strong>
          </div>

        </div>
      )}

      {/* =================================================
          CHART
      ================================================= */}

      <div
        style={{
          width: "100%",
          height: 300,
        }}
      >

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 0,
              bottom: 0,
            }}
          >

            {/* =================================================
                GRADIENT
            ================================================= */}

            <defs>

              <linearGradient
                id="dashboardEnergyGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >

                <stop
                  offset="0%"
                  stopColor="#2563eb"
                  stopOpacity={0.35}
                />

                <stop
                  offset="100%"
                  stopColor="#2563eb"
                  stopOpacity={0.02}
                />

              </linearGradient>

            </defs>

            {/* =================================================
                GRID
            ================================================= */}

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
            />

            {/* =================================================
                X AXIS
            ================================================= */}

            <XAxis
              dataKey="time"
              tick={{
                fontSize: 10,
              }}
              tickLine={false}
              axisLine={false}
              minTickGap={25}
            />

            {/* =================================================
                Y AXIS
            ================================================= */}

            <YAxis
              tick={{
                fontSize: 11,
              }}
              tickLine={false}
              axisLine={false}
              width={55}
              tickFormatter={(value) =>
                `${value}`
              }
            />

            {/* =================================================
                TOOLTIP
            ================================================= */}

            <Tooltip
              formatter={(value, name) => [
                `${Number(value).toFixed(1)} kWh`,
                name === "consumption"
                  ? "Consumption"
                  : "Baseline",
              ]}
              labelFormatter={(
                _label,
                payload
              ) => {
                const item =
                  payload?.[0]?.payload;

                return item?.fullTime ?? "";
              }}
              contentStyle={{
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                boxShadow:
                  "0 10px 25px rgba(0,0,0,0.08)",
              }}
            />

            {/* =================================================
                BASELINE
            ================================================= */}

            <Area
              type="monotone"
              dataKey="baseline"
              name="baseline"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
              dot={false}
              activeDot={{
                r: 4,
              }}
            />

            {/* =================================================
                CONSUMPTION
            ================================================= */}

            <Area
              type="monotone"
              dataKey="consumption"
              name="consumption"
              stroke="#2563eb"
              strokeWidth={3}
              fill="url(#dashboardEnergyGradient)"
              dot={false}
              activeDot={{
                r: 5,
              }}
            />

          </AreaChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}