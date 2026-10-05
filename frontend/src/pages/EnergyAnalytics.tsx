import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle,
  Clock3,
  Download,
  FileText,
  Gauge,
  Lightbulb,
  Loader2,
  RefreshCw,
  Target,
  Users,
  Zap,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import {
  getBuildings,
  getDashboard,
  getEnergyData,
  getFloorEnergy,
  getOccupancy,
  type Building,
} from "../services/api";

/* =========================================================
   TYPES
========================================================= */

type Period =
  | "24 Hours"
  | "7 Days"
  | "30 Days";

type AnyRecord = Record<string, any>;

interface DailyEnergy {
  day: string;
  actual: number;
  baseline: number;
  fullDate: string;
}

interface HourlyEnergy {
  hour: string;
  actual: number;
  baseline: number;
  occupancy: number;
}

interface FloorEnergyItem {
  floor: string;
  consumption: number;
  baseline: number;
  variance: number;
  occupancy: number | null;
}

/* =========================================================
   HELPERS
========================================================= */

const numberValue = (value: any): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const getEnergyValue = (
  item: AnyRecord,
): number => {
  return numberValue(
    item?.consumption ??
      item?.energy ??
      item?.actual ??
      item?.value ??
      item?.kwh,
  );
};

const getBaselineValue = (
  item: AnyRecord,
): number => {
  return numberValue(
    item?.baseline ??
      item?.baseline_energy ??
      item?.baselineEnergy ??
      item?.expected,
  );
};

const getTimestamp = (
  item: AnyRecord,
): string => {
  return String(
    item?.timestamp ??
      item?.datetime ??
      item?.date ??
      item?.time ??
      "",
  );
};

const getFloorName = (
  item: AnyRecord,
): string => {
  return String(
    item?.floor ??
      item?.floor_name ??
      item?.floorName ??
      item?.name ??
      "",
  ).trim();
};

const getOccupancyValue = (
  item: AnyRecord,
): number => {
  return numberValue(
    item?.occupancy_percentage ??
      item?.occupancy ??
      item?.occupancyRate ??
      item?.occupancy_percent ??
      item?.percentage,
  );
};

const parseDate = (
  value: string,
): Date | null => {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const formatTime = (
  value: string,
): string => {
  const date = parseDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (
  value: string,
): string => {
  const date = parseDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
};

const periodToHours = (
  period: Period,
): number => {
  switch (period) {
    case "24 Hours":
      return 24;

    case "7 Days":
      return 24 * 7;

    case "30 Days":
      return 24 * 30;

    default:
      return 24 * 7;
  }
};

/* =========================================================
   CUSTOM TOOLTIP
========================================================= */

function EnergyTooltip({
  active,
  payload,
  label,
}: any) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  return (
    <div className="energy-tooltip">
      <strong>{label}</strong>

      {payload.map(
        (
          item: any,
          index: number,
        ) => (
          <div
            key={index}
            className="tooltip-row"
          >
            <span>
              {item.name}
            </span>

            <strong>
              {numberValue(
                item.value,
              ).toFixed(1)}{" "}
              {item.name ===
              "Occupancy %"
                ? "%"
                : "kWh"}
            </strong>
          </div>
        ),
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function EnergyAnalytics() {
  /* =======================================================
     STATE
  ======================================================= */

  const [activePage, setActivePage] =
    useState("Energy Analytics");

  const [buildings, setBuildings] =
    useState<Building[]>([]);

  const [
    selectedBuildingId,
    setSelectedBuildingId,
  ] = useState<
    number | string | undefined
  >(undefined);

  const [period, setPeriod] =
    useState<Period>("7 Days");

  const [selectedFloor, setSelectedFloor] =
    useState("All Floors");

  const [energyData, setEnergyData] =
    useState<AnyRecord[]>([]);

  const [floorData, setFloorData] =
    useState<AnyRecord[]>([]);

  const [occupancyData, setOccupancyData] =
    useState<AnyRecord[]>([]);

  const [dashboardData, setDashboardData] =
    useState<AnyRecord | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("Waiting for data");

  /* =======================================================
     LOAD BUILDINGS
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadBuildings =
      async () => {
        try {
          const data =
            await getBuildings();

          if (!mounted) {
            return;
          }

          const safeData =
            Array.isArray(data)
              ? data
              : [];

          setBuildings(safeData);

          if (
            safeData.length > 0 &&
            selectedBuildingId ===
              undefined
          ) {
            setSelectedBuildingId(
              safeData[0].id,
            );
          }

          if (
            safeData.length === 0
          ) {
            setError(
              "No buildings were returned by the Flask backend.",
            );
          }
        } catch (err) {
          console.error(
            "Building loading error:",
            err,
          );

          if (mounted) {
            setError(
              "Unable to connect to the Flask backend. Make sure the backend is running on http://127.0.0.1:5000.",
            );
          }
        }
      };

    loadBuildings();

    return () => {
      mounted = false;
    };
  }, [selectedBuildingId]);

  /* =======================================================
     LOAD ANALYTICS DATA
  ======================================================= */

  useEffect(() => {
    if (
      selectedBuildingId ===
      undefined
    ) {
      return;
    }

    let mounted = true;

    const loadAnalytics =
      async () => {
        try {
          setLoading(true);
          setError("");

          /*
           * allSettled prevents one failed API endpoint
           * from breaking the complete analytics page.
           */

          const results =
            await Promise.allSettled([
              getDashboard(
                selectedBuildingId,
              ),

              getEnergyData({
                buildingId:
                  selectedBuildingId,
                period: String(
                  periodToHours(
                    period,
                  ),
                ),
              }),

              getFloorEnergy(
                selectedBuildingId,
              ),

              getOccupancy(
                selectedBuildingId,
              ),
            ]);

          if (!mounted) {
            return;
          }

          const [
            dashboardResult,
            energyResult,
            floorResult,
            occupancyResult,
          ] = results;

          const errors: string[] = [];

          /* ===============================================
             DASHBOARD
          =============================================== */

          if (
            dashboardResult.status ===
            "fulfilled"
          ) {
            setDashboardData(
              dashboardResult.value
                ? (dashboardResult.value as unknown as AnyRecord)
                : null,
            );
          } else {
            setDashboardData(null);

            errors.push(
              "Dashboard API unavailable",
            );
          }

          /* ===============================================
             ENERGY
          =============================================== */

          if (
            energyResult.status ===
            "fulfilled"
          ) {
            setEnergyData(
              Array.isArray(
                energyResult.value,
              )
                ? (energyResult.value as AnyRecord[])
                : [],
            );
          } else {
            setEnergyData([]);

            errors.push(
              "Energy API unavailable",
            );
          }

          /* ===============================================
             FLOOR ENERGY
          =============================================== */

          if (
            floorResult.status ===
            "fulfilled"
          ) {
            setFloorData(
              Array.isArray(
                floorResult.value,
              )
                ? (floorResult.value as AnyRecord[])
                : [],
            );
          } else {
            setFloorData([]);

            errors.push(
              "Floor Energy API unavailable",
            );
          }

          /* ===============================================
             OCCUPANCY
          =============================================== */

          if (
            occupancyResult.status ===
            "fulfilled"
          ) {
            setOccupancyData(
              Array.isArray(
                occupancyResult.value,
              )
                ? (occupancyResult.value as AnyRecord[])
                : [],
            );
          } else {
            setOccupancyData([]);

            errors.push(
              "Occupancy API unavailable",
            );
          }

          if (
            errors.length > 0
          ) {
            setError(
              errors.join(" • "),
            );
          }

          setLastUpdated(
            `Updated ${new Date().toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}`,
          );
        } catch (err) {
          console.error(
            "Energy analytics error:",
            err,
          );

          if (mounted) {
            setError(
              "Unable to load energy analytics from the Flask backend.",
            );
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [
    selectedBuildingId,
    period,
  ]);

  /* =======================================================
     SELECTED BUILDING
  ======================================================= */

  const selectedBuilding =
    useMemo(() => {
      return buildings.find(
        (building) =>
          String(
            building.id,
          ) ===
          String(
            selectedBuildingId,
          ),
      );
    }, [
      buildings,
      selectedBuildingId,
    ]);

  /* =======================================================
     SORT ENERGY DATA
  ======================================================= */

  const sortedEnergyData =
    useMemo(() => {
      return [...energyData]
        .filter(
          (item) =>
            parseDate(
              getTimestamp(item),
            ) !== null,
        )
        .sort(
          (a, b) => {
            const dateA =
              parseDate(
                getTimestamp(a),
              );

            const dateB =
              parseDate(
                getTimestamp(b),
              );

            if (
              !dateA ||
              !dateB
            ) {
              return 0;
            }

            return (
              dateA.getTime() -
              dateB.getTime()
            );
          },
        );
    }, [energyData]);

  /* =======================================================
     PERIOD FILTER

     Keep the UI period semantically correct:
     - 24 Hours = rolling 24-hour window
     - 7 Days   = exactly 7 calendar dates
     - 30 Days  = exactly 30 calendar dates

     The previous implementation subtracted N*24 hours from
     the latest timestamp. When the latest reading was partway
     through a day, a "7 Days" view could contain 8 calendar
     dates. That made totals and average-daily values misleading.
  ======================================================= */

  const periodFilteredEnergy =
    useMemo(() => {
      if (
        sortedEnergyData.length ===
        0
      ) {
        return [];
      }

      const latestDate =
        parseDate(
          getTimestamp(
            sortedEnergyData[
              sortedEnergyData.length - 1
            ],
          ),
        );

      if (!latestDate) {
        return sortedEnergyData;
      }

      /* Keep the rolling behaviour for the 24-hour view. */
      if (period === "24 Hours") {
        const startDate =
          new Date(
            latestDate.getTime() -
              24 *
                60 *
                60 *
                1000,
          );

        return sortedEnergyData.filter(
          (item) => {
            const date =
              parseDate(
                getTimestamp(item),
              );

            return (
              date !== null &&
              date >= startDate
            );
          },
        );
      }

      /*
       * For day-based periods, compare calendar dates rather than
       * timestamps. This guarantees exactly 7 or 30 dates.
       */
      const dayCount =
        period === "30 Days"
          ? 30
          : 7;

      const latestDay =
        new Date(
          latestDate.getFullYear(),
          latestDate.getMonth(),
          latestDate.getDate(),
        );

      const startDay =
        new Date(
          latestDay.getTime() -
            (dayCount - 1) *
              24 *
              60 *
              60 *
              1000,
        );

      return sortedEnergyData.filter(
        (item) => {
          const date =
            parseDate(
              getTimestamp(item),
            );

          if (!date) {
            return false;
          }

          const itemDay =
            new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
            );

          return (
            itemDay >= startDay &&
            itemDay <= latestDay
          );
        },
      );
    }, [
      sortedEnergyData,
      period,
    ]);

  /* =======================================================
     DAILY ENERGY DATA
  ======================================================= */

  const dailyEnergyData =
    useMemo<DailyEnergy[]>(
      () => {
        const grouped =
          new Map<
            string,
            {
              actual: number;
              baseline: number;
            }
          >();

        periodFilteredEnergy.forEach(
          (item) => {
            const date =
              parseDate(
                getTimestamp(item),
              );

            if (!date) {
              return;
            }

            const key =
              date
                .toISOString()
                .slice(0, 10);

            const existing =
              grouped.get(
                key,
              ) ?? {
                actual: 0,
                baseline: 0,
              };

            existing.actual +=
              getEnergyValue(
                item,
              );

            existing.baseline +=
              getBaselineValue(
                item,
              );

            grouped.set(
              key,
              existing,
            );
          },
        );

        return Array.from(
          grouped.entries(),
        )
          .map(
            ([
              date,
              values,
            ]) => ({
              day:
                formatDate(
                  date,
                ),
              actual:
                values.actual,
              baseline:
                values.baseline,
              fullDate: date,
            }),
          )
          .sort(
            (a, b) =>
              a.fullDate.localeCompare(
                b.fullDate,
              ),
          );
      },
      [
        periodFilteredEnergy,
      ],
    );

  /* =======================================================
     HOURLY ENERGY DATA
  ======================================================= */

  const hourlyEnergyData =
    useMemo<HourlyEnergy[]>(
      () => {
        const recentData =
          periodFilteredEnergy.slice(
            -Math.min(
              24,
              periodFilteredEnergy.length,
            ),
          );

        return recentData.map(
          (item) => {
            const energyDate =
              parseDate(
                getTimestamp(
                  item,
                ),
              );

            let closestOccupancy:
              AnyRecord | null =
              null;

            let closestDifference =
              Number.MAX_SAFE_INTEGER;

            if (
              energyDate
            ) {
              occupancyData.forEach(
                (
                  occupancyItem,
                ) => {
                  const occupancyDate =
                    parseDate(
                      getTimestamp(
                        occupancyItem,
                      ),
                    );

                  if (
                    !occupancyDate
                  ) {
                    return;
                  }

                  const difference =
                    Math.abs(
                      energyDate.getTime() -
                        occupancyDate.getTime(),
                    );

                  if (
                    difference <
                      closestDifference &&
                    difference <=
                      60 *
                        60 *
                        1000
                  ) {
                    closestDifference =
                      difference;

                    closestOccupancy =
                      occupancyItem;
                  }
                },
              );
            }

            return {
              hour:
                formatTime(
                  getTimestamp(
                    item,
                  ),
                ),

              actual:
                getEnergyValue(
                  item,
                ),

              baseline:
                getBaselineValue(
                  item,
                ),

              occupancy:
                closestOccupancy
                  ? getOccupancyValue(
                      closestOccupancy,
                    )
                  : 0,
            };
          },
        );
      },
      [
        periodFilteredEnergy,
        occupancyData,
      ],
    );

  /* =======================================================
     FLOOR DATA
     SUM LATEST DAY PER FLOOR
  ======================================================= */

  const latestFloorData =
    useMemo<
      FloorEnergyItem[]
    >(() => {
      if (
        floorData.length ===
        0
      ) {
        return [];
      }

      const validFloorData =
        floorData.filter(
          (item) =>
            getFloorName(
              item,
            ) &&
            parseDate(
              getTimestamp(
                item,
              ),
            ),
        );

      if (
        validFloorData.length ===
        0
      ) {
        return [];
      }

      /*
       * Find latest floor reading date.
       */

      let latestTimestamp =
        0;

      validFloorData.forEach(
        (item) => {
          const date =
            parseDate(
              getTimestamp(item),
            );

          if (
            date &&
            date.getTime() >
              latestTimestamp
          ) {
            latestTimestamp =
              date.getTime();
          }
        },
      );

      const latestDate =
        new Date(
          latestTimestamp,
        );

      const latestDay =
        latestDate
          .toISOString()
          .slice(0, 10);

      /*
       * Aggregate the latest day
       * by floor.
       */

      const grouped =
        new Map<
          string,
          {
            consumption: number;
            baseline: number;
            latestTimestamp: string;
          }
        >();

      validFloorData.forEach(
        (item) => {
          const date =
            parseDate(
              getTimestamp(item),
            );

          if (!date) {
            return;
          }

          const itemDay =
            date
              .toISOString()
              .slice(0, 10);

          if (
            itemDay !==
            latestDay
          ) {
            return;
          }

          const floor =
            getFloorName(item);

          const existing =
            grouped.get(
              floor,
            ) ?? {
              consumption: 0,
              baseline: 0,
              latestTimestamp:
                getTimestamp(
                  item,
                ),
            };

          existing.consumption +=
            getEnergyValue(
              item,
            );

          existing.baseline +=
            getBaselineValue(
              item,
            );

          if (
            date.getTime() >
            (
              parseDate(
                existing.latestTimestamp,
              )?.getTime() ?? 0
            )
          ) {
            existing.latestTimestamp =
              getTimestamp(item);
          }

          grouped.set(
            floor,
            existing,
          );
        },
      );

      return Array.from(
        grouped.entries(),
      )
        .map(
          ([
            floor,
            values,
          ]) => {
            const variance =
              values.baseline >
              0
                ? ((values.consumption -
                    values.baseline) /
                    values.baseline) *
                  100
                : 0;

            /*
             * Occupancy is normally building-level
             * in the current backend, so do not
             * fabricate floor occupancy.
             */
            const floorOccupancy =
              occupancyData.find(
                (item) =>
                  getFloorName(
                    item,
                  ) === floor,
              );

            return {
              floor,
              consumption:
                values.consumption,
              baseline:
                values.baseline,
              variance,
              occupancy:
                floorOccupancy
                  ? getOccupancyValue(
                      floorOccupancy,
                    )
                  : null,
            };
          },
        )
        .sort(
          (a, b) =>
            a.floor.localeCompare(
              b.floor,
              undefined,
              {
                numeric: true,
              },
            ),
        );
    }, [
      floorData,
      occupancyData,
    ]);

  /* =======================================================
     FLOOR FILTER
  ======================================================= */

  const filteredFloorData =
    useMemo(() => {
      if (
        selectedFloor ===
        "All Floors"
      ) {
        return latestFloorData;
      }

      return latestFloorData.filter(
        (item) =>
          item.floor ===
          selectedFloor,
      );
    }, [
      latestFloorData,
      selectedFloor,
    ]);

  /* =======================================================
     RESET INVALID FLOOR FILTER
  ======================================================= */

  useEffect(() => {
    if (
      selectedFloor !==
        "All Floors" &&
      !latestFloorData.some(
        (item) =>
          item.floor ===
          selectedFloor,
      )
    ) {
      setSelectedFloor(
        "All Floors",
      );
    }
  }, [
    latestFloorData,
    selectedFloor,
  ]);

  /* =======================================================
     CURRENT DAILY DATA
  ======================================================= */

  const currentDailyData =
    dailyEnergyData[
      dailyEnergyData.length - 1
    ];

  /* =======================================================
     CURRENT ENERGY
  ======================================================= */

  const currentEnergy =
    currentDailyData?.actual ??
    0;

  /* =======================================================
     CURRENT BASELINE
  ======================================================= */

  const currentBaseline =
    currentDailyData?.baseline ??
    0;

  /* =======================================================
     TOTAL ENERGY
  ======================================================= */

  const totalEnergy =
    useMemo(() => {
      return periodFilteredEnergy.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          getEnergyValue(
            item,
          ),
        0,
      );
    }, [
      periodFilteredEnergy,
    ]);

  /* =======================================================
     AVERAGE DAILY ENERGY
  ======================================================= */

  const averageDailyEnergy =
    dailyEnergyData.length >
    0
      ? dailyEnergyData.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            item.actual,
          0,
        ) /
        dailyEnergyData.length
      : 0;

  /* =======================================================
     ENERGY DIFFERENCE
  ======================================================= */

  const energyDifference =
    currentEnergy -
    currentBaseline;

  /* =======================================================
     PERCENTAGE INCREASE
  ======================================================= */

  const percentageIncrease =
    currentBaseline > 0
      ? ((currentEnergy -
          currentBaseline) /
          currentBaseline) *
        100
      : 0;

  /* =======================================================
     AVOIDABLE ENERGY
  ======================================================= */

  const calculatedAvoidableEnergy =
    Math.max(
      energyDifference,
      0,
    );

  const dashboardSavings =
    numberValue(
      dashboardData?.potentialSavings ??
        dashboardData?.potential_savings ??
        dashboardData?.avoidableEnergy,
    );

  const avoidableEnergy =
    dashboardSavings >
    0
      ? dashboardSavings
      : calculatedAvoidableEnergy;

  /* =======================================================
     AVOIDABLE PERCENTAGE
  ======================================================= */

  const avoidablePercentage =
    currentEnergy > 0
      ? (avoidableEnergy /
          currentEnergy) *
        100
      : 0;

  /* =======================================================
     PEAK ENERGY
  ======================================================= */

  const peakEnergy =
    periodFilteredEnergy.length >
    0
      ? Math.max(
          ...periodFilteredEnergy.map(
            (item) =>
              getEnergyValue(
                item,
              ),
          ),
        )
      : 0;

  /* =======================================================
     PEAK HOUR
  ======================================================= */

  const peakHour =
    useMemo(() => {
      if (
        hourlyEnergyData.length ===
        0
      ) {
        return "Unavailable";
      }

      const peak =
        [...hourlyEnergyData].sort(
          (a, b) =>
            b.actual -
            a.actual,
        )[0];

      return peak?.hour ??
        "Unavailable";
    }, [
      hourlyEnergyData,
    ]);

  /* =======================================================
     AVERAGE OCCUPANCY
  ======================================================= */

  const averageOccupancy =
    occupancyData.length >
    0
      ? occupancyData.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            getOccupancyValue(
              item,
            ),
          0,
        ) /
        occupancyData.length
      : numberValue(
          dashboardData?.occupancy ??
            dashboardData?.occupancy_percentage,
        );

  /* =======================================================
     LATEST OCCUPANCY
  ======================================================= */

  const latestOccupancy =
    useMemo(() => {
      if (
        occupancyData.length ===
        0
      ) {
        return 0;
      }

      const sorted =
        [...occupancyData]
          .filter(
            (item) =>
              parseDate(
                getTimestamp(item),
              ),
          )
          .sort(
            (a, b) => {
              const dateA =
                parseDate(
                  getTimestamp(a),
                );

              const dateB =
                parseDate(
                  getTimestamp(b),
                );

              return (
                (dateB?.getTime() ??
                  0) -
                (dateA?.getTime() ??
                  0)
              );
            },
          );

      return sorted.length >
        0
        ? getOccupancyValue(
            sorted[0],
          )
        : 0;
    }, [
      occupancyData,
    ]);

  /* =======================================================
     TOP FLOOR VARIANCES
  ======================================================= */

  const topFloorVariances =
    useMemo(() => {
      return [
        ...latestFloorData,
      ]
        .sort(
          (a, b) =>
            b.variance -
            a.variance,
        )
        .slice(0, 3);
    }, [
      latestFloorData,
    ]);

  /* =======================================================
     EVENING ENERGY MISMATCH
  ======================================================= */

  const eveningMismatchCount =
    useMemo(() => {
      return hourlyEnergyData.filter(
        (item) => {
          const date =
            parseDate(
              `2026-01-01 ${item.hour}`,
            );

          const hour =
            date?.getHours() ??
            -1;

          return (
            hour >= 19 &&
            item.occupancy < 35 &&
            item.actual >
              item.baseline
          );
        },
      ).length;
    }, [
      hourlyEnergyData,
    ]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh =
    async () => {
      if (
        selectedBuildingId ===
        undefined
      ) {
        return;
      }

      try {
        setRefreshing(true);
        setError("");

        const results =
          await Promise.allSettled([
            getDashboard(
              selectedBuildingId,
            ),

            getEnergyData({
              buildingId:
                selectedBuildingId,
              period: String(
                periodToHours(
                  period,
                ),
              ),
            }),

            getFloorEnergy(
              selectedBuildingId,
            ),

            getOccupancy(
              selectedBuildingId,
            ),
          ]);

        const [
          dashboardResult,
          energyResult,
          floorResult,
          occupancyResult,
        ] = results;

        const refreshErrors: string[] =
          [];

        if (
          dashboardResult.status ===
          "fulfilled"
        ) {
          setDashboardData(
            dashboardResult.value
              ? (dashboardResult.value as unknown as AnyRecord)
              : null,
          );
        } else {
          refreshErrors.push(
            "Dashboard API failed",
          );
        }

        if (
          energyResult.status ===
          "fulfilled"
        ) {
          setEnergyData(
            Array.isArray(
              energyResult.value,
            )
              ? (energyResult.value as AnyRecord[])
              : [],
          );
        } else {
          refreshErrors.push(
            "Energy API failed",
          );
        }

        if (
          floorResult.status ===
          "fulfilled"
        ) {
          setFloorData(
            Array.isArray(
              floorResult.value,
            )
              ? (floorResult.value as AnyRecord[])
              : [],
          );
        } else {
          refreshErrors.push(
            "Floor Energy API failed",
          );
        }

        if (
          occupancyResult.status ===
          "fulfilled"
        ) {
          setOccupancyData(
            Array.isArray(
              occupancyResult.value,
            )
              ? (occupancyResult.value as AnyRecord[])
              : [],
          );
        } else {
          refreshErrors.push(
            "Occupancy API failed",
          );
        }

        if (
          refreshErrors.length >
          0
        ) {
          setError(
            refreshErrors.join(
              " • ",
            ),
          );
        }

        setLastUpdated(
          `Updated ${new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          )}`,
        );
      } catch (err) {
        console.error(
          "Refresh error:",
          err,
        );

        setError(
          "Unable to refresh analytics. Check the Flask server.",
        );
      } finally {
        setRefreshing(false);
      }
    };

  /* =======================================================
     EXPORT REPORT
  ======================================================= */

  const handleExport =
    () => {
      const report = `
SMARTBUILD AI
ENERGY ANALYTICS REPORT
========================================

Building:
${selectedBuilding?.name ?? "Unknown"}

Location:
${selectedBuilding?.location ?? "Unknown"}

Analysis Period:
${period}

Current Consumption:
${currentEnergy.toFixed(1)} kWh

Historical Baseline:
${currentBaseline.toFixed(1)} kWh

Energy Difference:
${energyDifference.toFixed(1)} kWh

Baseline Variance:
${percentageIncrease.toFixed(1)}%

Avoidable Energy:
${avoidableEnergy.toFixed(1)} kWh

Peak Consumption:
${peakEnergy.toFixed(1)} kWh

Peak Hour:
${peakHour}

Average Daily Consumption:
${averageDailyEnergy.toFixed(1)} kWh

Average Occupancy:
${averageOccupancy.toFixed(1)}%

Latest Occupancy:
${latestOccupancy.toFixed(1)}%

Retrieved Energy:
${totalEnergy.toFixed(1)} kWh

Evening Mismatch Periods:
${eveningMismatchCount}

========================================
Generated by SmartBuild AI
`;

      const blob =
        new Blob(
          [report],
          {
            type:
              "text/plain",
          },
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement(
          "a",
        );

      link.href = url;

      link.download =
        "smartbuild-energy-analytics.txt";

      document.body.appendChild(
        link,
      );

      link.click();

      document.body.removeChild(
        link,
      );

      URL.revokeObjectURL(
        url,
      );
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="app-layout">

      {/* SIDEBAR */}

      <Sidebar
        activePage={
          activePage
        }
        setActivePage={
          setActivePage
        }
      />

      {/* MAIN */}

      <main className="main-content">

        <Topbar
          activePage={
            activePage
          }
        />

        <div className="module-page energy-analytics-page">

          {/* ===============================================
              HEADER
          =============================================== */}

          <div className="module-heading energy-page-header">

            <div className="page-title-with-icon">

              <div className="page-title-icon">
                <Zap size={21} />
              </div>

              <div>
                <h1>
                  Energy Analytics
                </h1>

                <p>
                  Analyze real building
                  consumption, compare
                  historical baselines,
                  and identify energy
                  optimization opportunities.
                </p>
              </div>

            </div>

            <div className="energy-header-actions">

              <div className="last-updated-box">

                <Clock3 size={13} />

                <span>
                  {lastUpdated}
                </span>

              </div>

              <button
                className="secondary-button"
                onClick={
                  handleRefresh
                }
                disabled={
                  refreshing ||
                  loading
                }
              >

                {refreshing ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw
                    size={14}
                  />
                )}

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}

              </button>

              <button
                className="primary-button"
                onClick={
                  handleExport
                }
                disabled={
                  !selectedBuilding
                }
              >

                <Download
                  size={14}
                />

                Export Report

              </button>

            </div>

          </div>

          {/* ===============================================
              FILTER BAR
          =============================================== */}

          <div className="energy-filter-bar">

            <div className="filter-title">

              <CalendarDays
                size={16}
              />

              <strong>
                Analysis Period
              </strong>

            </div>

            <div className="period-buttons">

              {[
                "24 Hours",
                "7 Days",
                "30 Days",
              ].map(
                (item) => (
                  <button
                    key={item}
                    className={
                      period === item
                        ? "period-button active"
                        : "period-button"
                    }
                    onClick={() =>
                      setPeriod(
                        item as Period,
                      )
                    }
                  >
                    {item}
                  </button>
                ),
              )}

            </div>

            <div className="floor-filter">

              <label>
                Floor
              </label>

              <select
                value={
                  selectedFloor
                }
                onChange={(e) =>
                  setSelectedFloor(
                    e.target.value,
                  )
                }
              >

                <option>
                  All Floors
                </option>

                {latestFloorData.map(
                  (floor) => (
                    <option
                      key={
                        floor.floor
                      }
                      value={
                        floor.floor
                      }
                    >
                      {floor.floor}
                    </option>
                  ),
                )}

              </select>

            </div>

          </div>

          {/* ===============================================
              ERROR
          =============================================== */}

          {error && (
            <div className="dashboard-error">

              <AlertTriangle
                size={18}
              />

              <div>

                <strong>
                  Backend/API issue
                </strong>

                <span>
                  {error}
                </span>

              </div>

              <button
                onClick={
                  handleRefresh
                }
              >
                Retry
              </button>

            </div>
          )}

          {/* ===============================================
              LOADING
          =============================================== */}

          {loading && (
            <div className="analytics-loading">

              <Loader2
                size={25}
                className="animate-spin"
              />

              <span>
                Loading building
                energy intelligence...
              </span>

            </div>
          )}

          {/* ===============================================
              BUILDING BANNER
          =============================================== */}

          <div className="energy-building-banner">

            <div className="building-banner-icon">
              <Building2
                size={21}
              />
            </div>

            <div>

              <strong>
                {selectedBuilding?.name ??
                  "Building"}
              </strong>

              <span>
                {selectedBuilding?.location ??
                  "Connected Smart Building"}
              </span>

            </div>

            <div className="building-live-status">

              <span />

              {selectedBuilding
                ? "Backend Connected"
                : "Waiting for Backend"}

            </div>

          </div>

          {/* ===============================================
              KPI CARDS
          =============================================== */}

          <section className="energy-kpi-grid">

            {/* CURRENT */}

            <div className="energy-kpi-card current-energy">

              <div className="energy-kpi-top">

                <div className="energy-kpi-icon">
                  <Zap size={19} />
                </div>

                <span
                  className={
                    percentageIncrease >
                    0
                      ? "kpi-status danger"
                      : "kpi-status success"
                  }
                >

                  {percentageIncrease >
                  0 ? (
                    <ArrowUpRight
                      size={12}
                    />
                  ) : (
                    <ArrowDown
                      size={12}
                    />
                  )}

                  {Math.abs(
                    percentageIncrease,
                  ).toFixed(1)}
                  %

                </span>

              </div>

              <span className="energy-kpi-label">
                Current Consumption
              </span>

              <div className="energy-kpi-value">

                {currentEnergy.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits: 1,
                  },
                )}

                <span>
                  kWh
                </span>

              </div>

              <p>
                Latest available selected-day consumption
              </p>

            </div>

            {/* BASELINE */}

            <div className="energy-kpi-card">

              <div className="energy-kpi-top">

                <div className="energy-kpi-icon baseline">
                  <Target
                    size={19}
                  />
                </div>

                <span className="kpi-status neutral">
                  Historical
                </span>

              </div>

              <span className="energy-kpi-label">
                Historical Baseline
              </span>

              <div className="energy-kpi-value">

                {currentBaseline.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits: 1,
                  },
                )}

                <span>
                  kWh
                </span>

              </div>

              <p>
                Calculated baseline for comparison
              </p>

            </div>

            {/* AVOIDABLE */}

            <div className="energy-kpi-card savings">

              <div className="energy-kpi-top">

                <div className="energy-kpi-icon green">
                  <Lightbulb
                    size={19}
                  />
                </div>

                <span className="kpi-status success">
                  Opportunity
                </span>

              </div>

              <span className="energy-kpi-label">
                Avoidable Energy
              </span>

              <div className="energy-kpi-value">

                {avoidableEnergy.toFixed(
                  1,
                )}

                <span>
                  kWh
                </span>

              </div>

              <p>
                Estimated energy optimization opportunity
              </p>

            </div>

            {/* PEAK */}

            <div className="energy-kpi-card">

              <div className="energy-kpi-top">

                <div className="energy-kpi-icon orange">
                  <Gauge
                    size={19}
                  />
                </div>

                <span className="kpi-status warning">
                  Peak
                </span>

              </div>

              <span className="energy-kpi-label">
                Peak Consumption
              </span>

              <div className="energy-kpi-value">

                {peakEnergy.toFixed(
                  1,
                )}

                <span>
                  kWh
                </span>

              </div>

              <p>
                Highest recorded interval
              </p>

            </div>

            {/* OCCUPANCY */}

            <div className="energy-kpi-card">

              <div className="energy-kpi-top">

                <div className="energy-kpi-icon">
                  <Users
                    size={19}
                  />
                </div>

                <span className="kpi-status neutral">
                  Sensor
                </span>

              </div>

              <span className="energy-kpi-label">
                Average Occupancy
              </span>

              <div className="energy-kpi-value">

                {averageOccupancy.toFixed(
                  0,
                )}

                <span>
                  %
                </span>

              </div>

              <p>
                Occupancy readings from backend sensors
              </p>

            </div>

          </section>

          {/* ===============================================
              MAIN CHART + AI INSIGHT
          =============================================== */}

          <section className="energy-main-grid">

            {/* ENERGY TREND */}

            <div className="energy-main-chart-card">

              <div className="energy-card-header">

                <div>

                  <div className="chart-title-row">

                    <div className="small-chart-icon">
                      <Activity
                        size={16}
                      />
                    </div>

                    <h3>
                      Energy Consumption Trend
                    </h3>

                  </div>

                  <p>
                    Real consumption compared with historical baseline
                  </p>

                </div>

                <div className="chart-legend">

                  <span>
                    <i className="legend-line actual-line" />
                    Actual
                  </span>

                  <span>
                    <i className="legend-line baseline-line" />
                    Baseline
                  </span>

                </div>

              </div>

              <div className="energy-chart-wrapper">

                {dailyEnergyData.length >
                0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >

                    <AreaChart
                      data={
                        dailyEnergyData
                      }
                    >

                      <defs>

                        <linearGradient
                          id="actualEnergyGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >

                          <stop
                            offset="0%"
                            stopColor="#06b6d4"
                            stopOpacity={
                              0.28
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
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="day"
                        tick={{
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        content={
                          <EnergyTooltip />
                        }
                      />

                      <Area
                        type="monotone"
                        dataKey="actual"
                        name="Actual"
                        stroke="#0891b2"
                        strokeWidth={3}
                        fill="url(#actualEnergyGradient)"
                      />

                      <Line
                        type="monotone"
                        dataKey="baseline"
                        name="Baseline"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeDasharray="6 5"
                        dot={false}
                      />

                    </AreaChart>

                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    message="No energy readings available for this period."
                  />
                )}

              </div>

              <div className="chart-bottom-summary">

                <div>

                  <span>
                    Retrieved Energy
                  </span>

                  <strong>
                    {totalEnergy.toFixed(
                      1,
                    )}{" "}
                    kWh
                  </strong>

                </div>

                <div>

                  <span>
                    Average Daily
                  </span>

                  <strong>
                    {averageDailyEnergy.toFixed(
                      1,
                    )}{" "}
                    kWh
                  </strong>

                </div>

                <div>

                  <span>
                    Baseline Variance
                  </span>

                  <strong
                    className={
                      percentageIncrease >
                      0
                        ? "danger-text"
                        : "success-text"
                    }
                  >

                    {percentageIncrease >=
                    0
                      ? "+"
                      : ""}

                    {percentageIncrease.toFixed(
                      1,
                    )}
                    %

                  </strong>

                </div>

              </div>

            </div>

            {/* AI INSIGHT */}

            <div className="energy-ai-card">

              <div className="ai-card-heading">

                <div className="ai-brain-icon">
                  <Lightbulb
                    size={20}
                  />
                </div>

                <div>

                  <h3>
                    AI Energy Insight
                  </h3>

                  <span>
                    Backend-driven consumption analysis
                  </span>

                </div>

              </div>

              <div
                className={
                  percentageIncrease >
                  10
                    ? "ai-alert"
                    : "ai-alert success"
                }
              >

                {percentageIncrease >
                10 ? (
                  <AlertTriangle
                    size={17}
                  />
                ) : (
                  <CheckCircle
                    size={17}
                  />
                )}

                <div>

                  <strong>
                    {percentageIncrease >
                    10
                      ? "Consumption is above baseline"
                      : "Consumption is within baseline range"}
                  </strong>

                  <p>
                    Current consumption is{" "}
                    {Math.abs(
                      percentageIncrease,
                    ).toFixed(
                      1,
                    )}
                    %{" "}
                    {percentageIncrease >=
                    0
                      ? "above"
                      : "below"}{" "}
                    the historical baseline.
                  </p>

                </div>

              </div>

              <div className="ai-findings">

                <div className="finding">

                  <div className="finding-number">
                    01
                  </div>

                  <div>

                    <strong>
                      Consumption difference
                    </strong>

                    <p>
                      {Math.abs(
                        energyDifference,
                      ).toFixed(
                        1,
                      )}{" "}
                      kWh{" "}
                      {energyDifference >=
                      0
                        ? "above"
                        : "below"}{" "}
                      the calculated baseline.
                    </p>

                  </div>

                </div>

                <div className="finding">

                  <div className="finding-number">
                    02
                  </div>

                  <div>

                    <strong>
                      Highest floor variance
                    </strong>

                    <p>
                      {topFloorVariances.length >
                      0
                        ? `${topFloorVariances[0].floor} shows a ${topFloorVariances[0].variance.toFixed(1)}% variance from its baseline.`
                        : "Floor-level data is unavailable."}
                    </p>

                  </div>

                </div>

                <div className="finding">

                  <div className="finding-number">
                    03
                  </div>

                  <div>

                    <strong>
                      Optimization opportunity
                    </strong>

                    <p>
                      {avoidableEnergy.toFixed(
                        1,
                      )}{" "}
                      kWh of the latest consumption is identified as potentially avoidable.
                    </p>

                  </div>

                </div>

              </div>

              <button
                className="ai-action-button"
                onClick={() =>
                  window.location.href =
                    "/recommendations"
                }
              >

                <Lightbulb
                  size={14}
                />

                View AI Recommendations

              </button>

            </div>

          </section>

          {/* ===============================================
              HOURLY ANALYSIS
          =============================================== */}

          <section className="energy-section-card">

            <div className="energy-card-header">

              <div>

                <div className="chart-title-row">

                  <div className="small-chart-icon blue">
                    <BarChart3
                      size={16}
                    />
                  </div>

                  <h3>
                    Hourly Consumption Analysis
                  </h3>

                </div>

                <p>
                  Identify time periods contributing to higher energy consumption
                </p>

              </div>

            </div>

            <div className="hourly-chart">

              {hourlyEnergyData.length >
              0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <ComposedChart
                    data={
                      hourlyEnergyData
                    }
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="hour"
                      tick={{
                        fontSize: 10,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      yAxisId="energy"
                      tick={{
                        fontSize: 10,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      yAxisId="occupancy"
                      orientation="right"
                      tick={{
                        fontSize: 10,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      content={
                        <EnergyTooltip />
                      }
                    />

                    <Bar
                      yAxisId="energy"
                      dataKey="actual"
                      name="Actual Energy"
                      fill="#06b6d4"
                      radius={[
                        5,
                        5,
                        0,
                        0,
                      ]}
                    />

                    <Line
                      yAxisId="energy"
                      type="monotone"
                      dataKey="baseline"
                      name="Baseline"
                      stroke="#64748b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />

                    <Line
                      yAxisId="occupancy"
                      type="monotone"
                      dataKey="occupancy"
                      name="Occupancy %"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{
                        r: 3,
                      }}
                    />

                  </ComposedChart>

                </ResponsiveContainer>
              ) : (
                <EmptyState
                  message="No hourly energy data available."
                />
              )}

            </div>

            <div className="hourly-insight-row">

              <div className="hourly-insight">

                <Clock3
                  size={16}
                />

                <div>

                  <strong>
                    Peak period
                  </strong>

                  <span>
                    Highest recorded interval:{" "}
                    {peakHour}.
                  </span>

                </div>

              </div>

              <div className="hourly-insight warning">

                <AlertTriangle
                  size={16}
                />

                <div>

                  <strong>
                    Baseline comparison
                  </strong>

                  <span>
                    {eveningMismatchCount} recent evening period
                    {eveningMismatchCount ===
                    1
                      ? ""
                      : "s"}{" "}
                    exceeded baseline while occupancy was low.
                  </span>

                </div>

              </div>

              <div className="hourly-insight success">

                <CheckCircle
                  size={16}
                />

                <div>

                  <strong>
                    Occupancy correlation
                  </strong>

                  <span>
                    Energy readings are compared with the closest available occupancy sensor reading.
                  </span>

                </div>

              </div>

            </div>

          </section>

          {/* ===============================================
              FLOOR ANALYSIS
          =============================================== */}

          <section className="energy-bottom-grid">

            {/* FLOOR CHART */}

            <div className="energy-section-card">

              <div className="energy-card-header">

                <div>

                  <div className="chart-title-row">

                    <div className="small-chart-icon">
                      <BarChart3
                        size={16}
                      />
                    </div>

                    <h3>
                      Floor-wise Energy Consumption
                    </h3>

                  </div>

                  <p>
                    Latest available interval consumption by floor
                  </p>

                </div>

                <span className="data-period">
                  Backend Data
                </span>

              </div>

              <div className="floor-bar-chart">

                {filteredFloorData.length >
                0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={310}
                  >

                    <BarChart
                      data={
                        filteredFloorData
                      }
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
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        content={
                          <EnergyTooltip />
                        }
                      />

                      <Bar
                        dataKey="consumption"
                        name="Consumption"
                        fill="#0891b2"
                        radius={[
                          5,
                          5,
                          0,
                          0,
                        ]}
                      />

                      <Bar
                        dataKey="baseline"
                        name="Baseline"
                        fill="#cbd5e1"
                        radius={[
                          5,
                          5,
                          0,
                          0,
                        ]}
                      />

                    </BarChart>

                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    message="No floor energy data available."
                  />
                )}

              </div>

              <div className="floor-ranking">

                {topFloorVariances.map(
                  (
                    floor,
                    index,
                  ) => (
                    <div
                      className="floor-ranking-row"
                      key={
                        floor.floor
                      }
                    >

                      <div className="floor-rank">
                        {index + 1}
                      </div>

                      <div className="floor-name">

                        <strong>
                          {floor.floor}
                        </strong>

                        <span>
                          {floor.consumption.toFixed(
                            1,
                          )}{" "}
                          kWh
                        </span>

                      </div>

                      <div
                        className={
                          floor.variance >
                          0
                            ? "floor-variance"
                            : "floor-variance success"
                        }
                      >

                        {floor.variance >
                        0 && (
                          <ArrowUpRight
                            size={12}
                          />
                        )}

                        {floor.variance >=
                        0
                          ? "+"
                          : ""}

                        {floor.variance.toFixed(
                          1,
                        )}
                        %

                      </div>

                    </div>
                  ),
                )}

                {topFloorVariances.length ===
                  0 && (
                  <div className="analytics-empty-state compact">
                    <span>
                      No floor ranking data available.
                    </span>
                  </div>
                )}

              </div>

            </div>

            {/* BACKEND DATA SOURCES */}

            <div className="energy-section-card">

              <div className="energy-card-header">

                <div>

                  <div className="chart-title-row">

                    <div className="small-chart-icon orange">
                      <Gauge
                        size={16}
                      />
                    </div>

                    <h3>
                      Analytics Data Sources
                    </h3>

                  </div>

                  <p>
                    Backend signals currently used by this analytics page
                  </p>

                </div>

              </div>

              <div className="analytics-source-list">

                <AnalyticsSource
                  icon={
                    <Zap
                      size={18}
                    />
                  }
                  title="Energy Readings"
                  value={`${energyData.length} readings`}
                  description="Consumption and baseline values from the energy API"
                />

                <AnalyticsSource
                  icon={
                    <Building2
                      size={18}
                    />
                  }
                  title="Floor Energy"
                  value={`${latestFloorData.length} floors`}
                  description="Latest available interval consumption calculated from backend records"
                />

                <AnalyticsSource
                  icon={
                    <Users
                      size={18}
                    />
                  }
                  title="Occupancy"
                  value={`${occupancyData.length} readings`}
                  description="Occupancy sensor readings returned by the backend"
                />

                <AnalyticsSource
                  icon={
                    <Activity
                      size={18}
                    />
                  }
                  title="Dashboard Intelligence"
                  value={
                    dashboardData
                      ? "Available"
                      : "Unavailable"
                  }
                  description="Building-level analytics returned by Flask"
                />

              </div>

              <div className="analytics-source-footer">

                <CheckCircle
                  size={17}
                />

                <div>

                  <strong>
                    Backend-driven analytics
                  </strong>

                  <span>
                    This page does not use sample energy, floor, occupancy, or KPI values. Metrics are calculated from API responses.
                  </span>

                </div>

              </div>

            </div>

          </section>

          {/* ===============================================
              BASELINE ANALYSIS
          =============================================== */}

          <section className="baseline-analysis-card">

            <div className="baseline-analysis-icon">
              <Target
                size={22}
              />
            </div>

            <div className="baseline-analysis-content">

              <h3>
                Baseline Analysis
              </h3>

              <p>

                Current consumption of{" "}

                <strong>
                  {currentEnergy.toFixed(
                    1,
                  )}{" "}
                  kWh
                </strong>{" "}

                is{" "}

                <strong
                  className={
                    energyDifference >
                    0
                      ? "danger-text"
                      : "success-text"
                  }
                >
                  {Math.abs(
                    energyDifference,
                  ).toFixed(
                    1,
                  )}{" "}
                  kWh{" "}
                  {energyDifference >=
                  0
                    ? "above"
                    : "below"}
                </strong>{" "}

                the calculated historical baseline of{" "}

                <strong>
                  {currentBaseline.toFixed(
                    1,
                  )}{" "}
                  kWh
                </strong>
                .

              </p>

              <div className="baseline-progress">

                <div className="baseline-progress-label">

                  <span>
                    Baseline utilization
                  </span>

                  <strong>
                    {currentBaseline >
                    0
                      ? (
                          (currentEnergy /
                            currentBaseline) *
                          100
                        ).toFixed(
                          0,
                        )
                      : "0"}
                    %
                  </strong>

                </div>

                <div className="baseline-progress-track">

                  <div
                    className="baseline-progress-fill"
                    style={{
                      width: `${Math.min(
                        currentBaseline >
                        0
                          ? (currentEnergy /
                              currentBaseline) *
                              100
                          : 0,
                        100,
                      )}%`,
                    }}
                  />

                </div>

              </div>

            </div>

            <div className="baseline-saving-box">

              <span>
                Potential saving
              </span>

              <strong>
                {avoidableEnergy.toFixed(
                  1,
                )}{" "}
                kWh
              </strong>

              <small>
                {avoidablePercentage.toFixed(
                  1,
                )}
                % of current use
              </small>

            </div>

          </section>

          {/* ===============================================
              FOOTER
          =============================================== */}

          <div className="energy-footer-note">

            <FileText
              size={14}
            />

            <span>
              Energy analysis combines building energy readings,
              historical baselines, floor-level data, occupancy
              signals and backend intelligence.
            </span>

            <span className="footer-live">
              ● Backend data
            </span>

          </div>

        </div>

      </main>

    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="analytics-empty-state">

      <BarChart3
        size={30}
      />

      <strong>
        No Data
      </strong>

      <span>
        {message}
      </span>

    </div>
  );
}

/* =========================================================
   ANALYTICS SOURCE
========================================================= */

function AnalyticsSource({
  icon,
  title,
  value,
  description,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="analytics-source-item">

      <div className="analytics-source-icon">
        {icon}
      </div>

      <div className="analytics-source-content">

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

      <div className="analytics-source-value">
        {value}
      </div>

    </div>
  );
}