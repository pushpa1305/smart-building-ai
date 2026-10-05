import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import type { FloorEnergy } from "../services/api";

interface FloorEnergyChartProps {
  data: FloorEnergy[];
}

interface ChartDataItem {
  floor: string;
  energy: number;
}

export default function FloorEnergyChart({
  data,
}: FloorEnergyChartProps) {
  /*
   * =====================================================
   * GET LATEST READING FOR EACH FLOOR
   * =====================================================
   *
   * The backend contains historical floor readings.
   * Instead of displaying thousands of bars, we keep
   * only the latest reading for each floor.
   */

  const latestByFloor = new Map<string, FloorEnergy>();

  if (Array.isArray(data)) {
    data.forEach((item) => {
      const floor = String(
        item?.floor ??
          item?.floorName ??
          item?.floor_name ??
          item?.name ??
          ""
      ).trim();

      if (!floor) {
        return;
      }

      const existing = latestByFloor.get(floor);

      const currentTimestamp = new Date(
        String(
          item?.timestamp ??
            item?.time ??
            item?.datetime ??
            item?.date ??
            ""
        )
      ).getTime();

      const existingTimestamp = existing
        ? new Date(
            String(
              existing?.timestamp ??
                existing?.time ??
                existing?.datetime ??
                existing?.date ??
                ""
            )
          ).getTime()
        : 0;

      if (
        !existing ||
        currentTimestamp >= existingTimestamp
      ) {
        latestByFloor.set(floor, item);
      }
    });
  }

  /*
   * =====================================================
   * CONVERT DATA FOR RECHARTS
   * =====================================================
   */

  const chartData: ChartDataItem[] = Array.from(
    latestByFloor.entries()
  )
    .map(([floor, item]) => {
      const energyValue = Number(
        item?.energy ??
          item?.consumption ??
          item?.actual ??
          item?.value ??
          0
      );

      return {
        floor,
        energy: Number.isFinite(energyValue)
          ? energyValue
          : 0,
      };
    })
    .sort((a, b) => {
      /*
       * Try to keep floors in logical order.
       * Example:
       * Ground Floor
       * First Floor
       * Second Floor
       * ...
       */

      const floorOrder = [
        "Ground Floor",
        "First Floor",
        "Second Floor",
        "Third Floor",
        "Fourth Floor",
        "Fifth Floor",
        "Sixth Floor",
        "Seventh Floor",
        "Eighth Floor",
        "Ninth Floor",
        "Tenth Floor",
      ];

      const indexA = floorOrder.indexOf(a.floor);
      const indexB = floorOrder.indexOf(b.floor);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return a.floor.localeCompare(b.floor);
    });

  /*
   * =====================================================
   * TOTAL ENERGY
   * =====================================================
   */

  const totalEnergy = chartData.reduce(
    (total, item) => total + item.energy,
    0
  );

  /*
   * =====================================================
   * HIGHEST CONSUMING FLOOR
   * =====================================================
   */

  const highestFloor =
    chartData.length > 0
      ? chartData.reduce((highest, current) =>
          current.energy > highest.energy
            ? current
            : highest
        )
      : null;

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <div className="dashboard-panel floor-chart-panel">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="panel-header">
        <div>
          <h3>Floor Energy</h3>

          <p>
            Latest energy consumption by floor
          </p>
        </div>

        {chartData.length > 0 && (
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#64748b",
            }}
          >
            Total: {totalEnergy.toFixed(1)} kWh
          </div>
        )}
      </div>

      {/* =================================================
          CHART
      ================================================= */}

      <div
        style={{
          width: "100%",
          height: 300,
          minHeight: 300,
        }}
      >
        {chartData.length === 0 ? (
          <div
            className="empty-state"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 32,
                opacity: 0.5,
              }}
            >
              ⚡
            </div>

            <span>
              No floor energy data available
            </span>

            <small
              style={{
                color: "#94a3b8",
              }}
            >
              Waiting for building energy data
            </small>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 20,
                left: 5,
                bottom: 10,
              }}
              barCategoryGap="25%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="floor"
                tick={{
                  fontSize: 10,
                }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={false}
                width={55}
                label={{
                  value: "kWh",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fontSize: 11,
                  },
                }}
              />

              <Tooltip
                formatter={(value) => [
                  `${Number(value).toFixed(1)} kWh`,
                  "Energy",
                ]}
                labelFormatter={(label) =>
                  `Floor: ${label}`
                }
              />

              <Bar
                dataKey="energy"
                name="Energy"
                fill="#7c3aed"
                radius={[8, 8, 0, 0]}
                maxBarSize={65}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* =================================================
          FLOOR SUMMARY
      ================================================= */}

      {chartData.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
            marginTop: 15,
          }}
        >
          {chartData.map((item, index) => {
            const isHighest =
              highestFloor?.floor === item.floor;

            return (
              <div
                key={`${item.floor}-${index}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isHighest
                    ? "rgba(124, 58, 237, 0.12)"
                    : "rgba(124, 58, 237, 0.06)",
                  border: isHighest
                    ? "1px solid rgba(124, 58, 237, 0.25)"
                    : "1px solid rgba(124, 58, 237, 0.10)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    marginBottom: 4,
                  }}
                >
                  {item.floor}
                </div>

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#7c3aed",
                  }}
                >
                  {item.energy.toFixed(1)} kWh
                </div>

                {isHighest && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#7c3aed",
                    }}
                  >
                    Highest consumption
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}