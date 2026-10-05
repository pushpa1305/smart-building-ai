import json
from agents.building_data_monitoring import run as run_building_data_agent
from agents.energy_consumption_analysis import run as run_energy_consumption_analysis_agent
from agents.occupancy_space_utilization import run as run_occupancy_space_utilization_agent
from agents.hvac_equipment_optimization import run as run_hvac_equipment_optimization_agent
from agents.anomaly_detection_fault_analysis import (
    run as run_anomaly_detection_fault_analysis_agent
)
from agents.facility_recommendation_action import (
    run as run_facility_recommendation_action_agent
)

from flask import Flask, jsonify, request
from flask_cors import CORS

from database import db
from models import (
    Building,
    EnergyReading,
    OccupancyReading,
    Equipment,
    Anomaly,
    Recommendation,
    AgentActivity,
    FloorEnergyReading,
    SensorReading,
)

from sqlalchemy import inspect
from datetime import datetime


# =========================================================
# FLASK APP CONFIGURATION
# =========================================================

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///smartbuild.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

CORS(app)

db.init_app(app)


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def model_to_dict(obj):
    """
    Convert any SQLAlchemy model object into a dictionary.
    This avoids depending on exact model field names.
    """

    if obj is None:
        return None

    try:
        mapper = inspect(obj.__class__)

        result = {}

        for column in mapper.columns:
            value = getattr(obj, column.key, None)

            if isinstance(value, datetime):
                value = value.isoformat()

            result[column.key] = value

        return result

    except Exception:
        return {}


def safe_number(value, default=0):
    """
    Convert a value safely to float.
    """

    try:
        if value is None:
            return default

        return float(value)

    except (TypeError, ValueError):
        return default


def get_value(obj, possible_names, default=None):
    """
    Find a value from multiple possible model field names.
    """

    if obj is None:
        return default

    for name in possible_names:

        if hasattr(obj, name):

            value = getattr(obj, name)

            if value is not None:
                return value

    return default


def get_building_id():
    """
    Read building_id from query parameters.

    Supports:
        ?building_id=1
        ?buildingId=1
    """

    building_id = request.args.get("building_id")

    if building_id is None:
        building_id = request.args.get("buildingId")

    return building_id


def filter_by_building(query, model, building_id):
    """
    Apply building filtering only when the model contains
    a building_id/buildingId field.
    """

    if building_id is None:
        return query

    if hasattr(model, "building_id"):
        return query.filter(model.building_id == building_id)

    if hasattr(model, "buildingId"):
        return query.filter(model.buildingId == building_id)

    return query


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return jsonify({
        "status": "success",
        "message": "SmartBuild AI backend is running"
    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/api/health")
def health():

    return jsonify({
        "status": "healthy",
        "service": "SmartBuild AI Backend"
    })


# =========================================================
# BUILDINGS
# =========================================================

@app.route("/api/buildings", methods=["GET"])
def get_buildings():

    try:

        buildings = Building.query.all()

        result = []

        for building in buildings:
            result.append(model_to_dict(building))

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# ENERGY DATA
# =========================================================

@app.route("/api/energy", methods=["GET"])
def get_energy():

    try:

        building_id = get_building_id()

        query = EnergyReading.query

        query = filter_by_building(
            query,
            EnergyReading,
            building_id
        )

        readings = query.order_by(
            EnergyReading.id.asc()
        ).all()

        result = []

        for reading in readings:

            data = model_to_dict(reading)

            timestamp = get_value(
                reading,
                [
                    "timestamp",
                    "time",
                    "datetime",
                    "date"
                ],
                ""
            )

            consumption = get_value(
                reading,
                [
                    "consumption",
                    "energy",
                    "value",
                    "actual"
                ],
                0
            )

            baseline = get_value(
                reading,
                [
                    "baseline",
                    "baseline_energy",
                    "baselineEnergy"
                ],
                0
            )

            result.append({
                **data,
                "timestamp": timestamp,
                "consumption": safe_number(consumption),
                "baseline": safe_number(baseline)
            })

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# FLOOR ENERGY
# =========================================================

@app.route("/api/floor-energy", methods=["GET"])
def get_floor_energy():

    try:

        building_id = get_building_id()

        query = FloorEnergyReading.query

        query = filter_by_building(
            query,
            FloorEnergyReading,
            building_id
        )

        readings = query.order_by(
            FloorEnergyReading.id.asc()
        ).all()

        result = []

        for reading in readings:

            data = model_to_dict(reading)

            floor = get_value(
                reading,
                [
                    "floor",
                    "floor_name",
                    "floorName",
                    "name"
                ],
                "Unknown Floor"
            )

            energy = get_value(
                reading,
                [
                    "energy",
                    "consumption",
                    "actual",
                    "value"
                ],
                0
            )

            baseline = get_value(
                reading,
                [
                    "baseline",
                    "baseline_energy",
                    "baselineEnergy"
                ],
                0
            )

            result.append({
                **data,
                "floor": str(floor),
                "energy": safe_number(energy),
                "baseline": safe_number(baseline)
            })

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# DASHBOARD
# =========================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    try:

        building_id = get_building_id()

        # -------------------------------------------------
        # ENERGY
        # -------------------------------------------------

        energy_query = EnergyReading.query

        energy_query = filter_by_building(
            energy_query,
            EnergyReading,
            building_id
        )

        energy_readings = energy_query.order_by(
            EnergyReading.id.asc()
        ).all()

        current_energy = 0
        baseline_energy = 0

        if energy_readings:

            latest = energy_readings[-1]

            current_energy = safe_number(
                get_value(
                    latest,
                    [
                        "consumption",
                        "energy",
                        "value",
                        "actual"
                    ],
                    0
                )
            )

            baseline_energy = safe_number(
                get_value(
                    latest,
                    [
                        "baseline",
                        "baseline_energy",
                        "baselineEnergy"
                    ],
                    0
                )
            )

        # -------------------------------------------------
        # OCCUPANCY
        # -------------------------------------------------

        occupancy_query = OccupancyReading.query

        occupancy_query = filter_by_building(
            occupancy_query,
            OccupancyReading,
            building_id
        )

        occupancy_readings = occupancy_query.order_by(
            OccupancyReading.id.asc()
        ).all()

        occupancy = 0

        if occupancy_readings:

            latest_occupancy = occupancy_readings[-1]

            occupancy = safe_number(
                get_value(
                    latest_occupancy,
                    [
                        "occupancy",
                        "occupancy_percentage",
                        "occupancyPercentage",
                        "percentage",
                        "count",
                        "people",
                        "occupancy_count",
                        "value"
                    ],
                    0
                )
            )

        # -------------------------------------------------
        # ANOMALIES
        # -------------------------------------------------

        anomaly_query = Anomaly.query

        anomaly_query = filter_by_building(
            anomaly_query,
            Anomaly,
            building_id
        )

        anomalies = anomaly_query.all()

        active_anomalies = 0

        for anomaly in anomalies:

            status = str(
                get_value(
                    anomaly,
                    ["status", "state"],
                    "active"
                )
            ).lower()

            if status not in [
                "resolved",
                "closed",
                "completed"
            ]:
                active_anomalies += 1

        # -------------------------------------------------
        # RECOMMENDATIONS
        # -------------------------------------------------

        recommendation_query = Recommendation.query

        recommendation_query = filter_by_building(
            recommendation_query,
            Recommendation,
            building_id
        )

        recommendations = recommendation_query.all()

        potential_savings = 0

        for recommendation in recommendations:

            savings = get_value(
                recommendation,
                [
                    "potential_savings",
                    "potentialSavings",
                    "estimated_savings",
                    "estimatedSavings",
                    "savings"
                ],
                0
            )

            potential_savings += safe_number(savings)

        # -------------------------------------------------
        # BUILDING HEALTH
        # -------------------------------------------------

        health_score = 100

        if active_anomalies > 0:

            health_score -= min(
                active_anomalies * 5,
                30
            )

        if baseline_energy > 0 and current_energy > baseline_energy:

            excess_percentage = (
                (current_energy - baseline_energy)
                / baseline_energy
            ) * 100

            health_score -= min(
                int(excess_percentage),
                20
            )

        health_score = max(
            0,
            min(100, health_score)
        )

        # -------------------------------------------------
        # ENERGY CHANGE
        # -------------------------------------------------

        energy_change = 0

        if baseline_energy > 0:

            energy_change = (
                (current_energy - baseline_energy)
                / baseline_energy
            ) * 100

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return jsonify({

            "status": "success",

            "building": None,

            "current_energy": round(
                current_energy,
                2
            ),

            "baseline_energy": round(
                baseline_energy,
                2
            ),

            "energy_change": round(
                energy_change,
                2
            ),

            "occupancy": round(
                occupancy,
                2
            ),

            "active_anomalies": active_anomalies,

            "potential_savings": round(
                potential_savings,
                2
            ),

            "health_score": health_score,

            "energy_unit": "kWh",

            "occupancy_unit": "percent",

            "message": "Dashboard data loaded successfully"

        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# ANOMALIES
# =========================================================

@app.route("/api/anomalies", methods=["GET"])
def get_anomalies():

    try:

        building_id = get_building_id()

        query = Anomaly.query

        query = filter_by_building(
            query,
            Anomaly,
            building_id
        )

        anomalies = query.order_by(
            Anomaly.id.desc()
        ).all()

        return jsonify([
            model_to_dict(anomaly)
            for anomaly in anomalies
        ])

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# RECOMMENDATIONS
# =========================================================

@app.route("/api/recommendations", methods=["GET"])
def get_recommendations():

    try:

        building_id = get_building_id()

        query = Recommendation.query

        query = filter_by_building(
            query,
            Recommendation,
            building_id
        )

        recommendations = query.order_by(
            Recommendation.id.desc()
        ).all()

        return jsonify([
            model_to_dict(recommendation)
            for recommendation in recommendations
        ])

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# OCCUPANCY
# =========================================================

# =========================================================
# RECOMMENDATION APPROVAL / DISMISSAL
# =========================================================

@app.route(
    "/api/recommendations/<int:recommendation_id>/approve",
    methods=["PATCH", "POST"]
)
def approve_recommendation(recommendation_id):
    """
    Persist human approval for a recommendation.

    This endpoint records the approval in the Recommendation.status
    field. It does not directly modify building equipment, HVAC,
    lighting, or other critical settings.
    """

    try:
        recommendation = Recommendation.query.get(recommendation_id)

        if not recommendation:
            return jsonify({
                "status": "error",
                "message": "Recommendation not found"
            }), 404

        # Prevent accidental re-approval of a dismissed/completed item.
        current_status = str(
            recommendation.status or ""
        ).strip().lower()

        if current_status == "dismissed":
            return jsonify({
                "status": "error",
                "message": "Dismissed recommendations cannot be approved."
            }), 409

        recommendation.status = "Approved"
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Recommendation approved successfully.",
            "recommendation": model_to_dict(recommendation),
            "human_approval_required": True,
            "automatic_changes_applied": False
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route(
    "/api/recommendations/<int:recommendation_id>/dismiss",
    methods=["PATCH", "POST"]
)
def dismiss_recommendation(recommendation_id):
    """
    Persist human dismissal for a recommendation.

    Dismissing a recommendation is advisory only and does not
    change any building equipment or operational settings.
    """

    try:
        recommendation = Recommendation.query.get(recommendation_id)

        if not recommendation:
            return jsonify({
                "status": "error",
                "message": "Recommendation not found"
            }), 404

        current_status = str(
            recommendation.status or ""
        ).strip().lower()

        if current_status == "approved":
            return jsonify({
                "status": "error",
                "message": "Approved recommendations cannot be dismissed."
            }), 409

        recommendation.status = "Dismissed"
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Recommendation dismissed successfully.",
            "recommendation": model_to_dict(recommendation),
            "human_approval_required": False,
            "automatic_changes_applied": False
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route("/api/occupancy", methods=["GET"])
def get_occupancy():

    try:

        building_id = get_building_id()

        query = OccupancyReading.query

        query = filter_by_building(
            query,
            OccupancyReading,
            building_id
        )

        readings = query.order_by(
            OccupancyReading.id.asc()
        ).all()

        result = []

        for reading in readings:

            data = model_to_dict(reading)

            occupancy = get_value(
                reading,
                [
                    "occupancy",
                    "count",
                    "people",
                    "occupancy_count",
                    "value"
                ],
                0
            )

            result.append({
                **data,
                "occupancy": safe_number(
                    occupancy
                )
            })

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route("/api/occupancy/zones", methods=["GET"])
def get_occupancy_zones():
    """
    Return zone/floor occupancy summaries from real SensorReading data.

    Historical occupancy trend data remains on /api/occupancy.
    This endpoint is intentionally separate so zone-level analysis does
    not fabricate floor/zone labels for building-level historical readings.
    """
    try:
        building_id = get_building_id()

        query = SensorReading.query
        query = filter_by_building(
            query,
            SensorReading,
            building_id
        )

        readings = query.order_by(
            SensorReading.timestamp.asc(),
            SensorReading.id.asc()
        ).all()

        groups = {}

        for reading in readings:
            floor = str(
                get_value(
                    reading,
                    ["floor", "floor_name", "floorName"],
                    "Unknown Floor"
                ) or "Unknown Floor"
            )

            zone = str(
                get_value(
                    reading,
                    ["zone", "zone_name", "zoneName"],
                    "Unknown Zone"
                ) or "Unknown Zone"
            )

            occupancy = safe_number(
                get_value(
                    reading,
                    [
                        "occupancy",
                        "occupancy_percentage",
                        "percentage",
                        "value"
                    ],
                    0
                )
            )

            key = f"{floor}||{zone}"

            if key not in groups:
                groups[key] = {
                    "floor": floor,
                    "zone": zone,
                    "values": [],
                    "timestamps": [],
                }

            groups[key]["values"].append(occupancy)

            timestamp = get_value(
                reading,
                ["timestamp", "datetime", "time", "date"],
                None
            )

            groups[key]["timestamps"].append(timestamp)

        result = []

        for group in groups.values():
            values = group["values"]

            if not values:
                continue

            latest_index = len(values) - 1
            latest_occupancy = values[latest_index]

            occupied_readings = sum(
                1 for value in values if value > 0
            )

            result.append({
                "floor": group["floor"],
                "zone": group["zone"],
                "occupancy": round(latest_occupancy, 2),
                "average_occupancy": round(
                    sum(values) / len(values),
                    2
                ),
                "peak_occupancy": round(
                    max(values),
                    2
                ),
                "minimum_occupancy": round(
                    min(values),
                    2
                ),
                "readings": len(values),
                "occupied_readings": occupied_readings,
                "timestamp": (
                    group["timestamps"][latest_index].isoformat()
                    if isinstance(
                        group["timestamps"][latest_index],
                        datetime
                    )
                    else group["timestamps"][latest_index]
                ),
                "source": "SensorReading",
            })

        result.sort(
            key=lambda item: item["average_occupancy"],
            reverse=True
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# FORECAST
# =========================================================

@app.route("/api/forecast", methods=["GET"])
def get_forecast():
    """
    Generate a realistic daily energy forecast from the building's
    historical EnergyReading data.

    The database readings may be hourly/sub-hourly. They are therefore
    aggregated by calendar day first. The forecast then uses historical
    weekday behaviour together with the recent consumption-vs-baseline
    ratio. This prevents a raw hourly value from being incorrectly
    extrapolated as a daily value.
    """
    try:
        building_id = get_building_id()
        raw_range = request.args.get("range", "7")

        try:
            forecast_days = max(1, min(int(raw_range), 30))
        except (TypeError, ValueError):
            forecast_days = 7

        query = EnergyReading.query
        query = filter_by_building(query, EnergyReading, building_id)
        readings = query.order_by(EnergyReading.id.asc()).all()

        raw_history = []

        for reading in readings:
            value = get_value(
                reading,
                ["consumption", "energy", "value", "actual"],
                None,
            )
            timestamp = get_value(
                reading,
                ["timestamp", "time", "datetime", "date"],
                None,
            )
            baseline = get_value(
                reading,
                ["baseline", "baseline_energy", "baselineEnergy"],
                None,
            )

            energy_value = safe_number(value, None)
            if energy_value is None or energy_value < 0 or timestamp is None:
                continue

            # Support both SQLAlchemy datetime objects and ISO strings.
            if isinstance(timestamp, datetime):
                parsed_dt = timestamp
            else:
                try:
                    parsed_dt = datetime.fromisoformat(
                        str(timestamp).replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    continue

            baseline_value = safe_number(baseline, None)
            if baseline_value is not None and baseline_value < 0:
                baseline_value = None

            raw_history.append({
                "datetime": parsed_dt,
                "energy": energy_value,
                "baseline": baseline_value,
            })

        if not raw_history:
            return jsonify([])

        raw_history.sort(key=lambda item: item["datetime"])

        # ---------------------------------------------------------
        # DAILY AGGREGATION
        # ---------------------------------------------------------
        # EnergyReading can contain multiple readings per day. Sum
        # consumption and baseline for that day so the API returns a
        # genuine daily kWh forecast.
        daily = {}

        for item in raw_history:
            day = item["datetime"].date()
            bucket = daily.setdefault(
                day,
                {
                    "energy": 0.0,
                    "baseline": 0.0,
                    "baseline_count": 0,
                    "reading_count": 0,
                },
            )

            bucket["energy"] += item["energy"]
            bucket["reading_count"] += 1

            if item["baseline"] is not None:
                bucket["baseline"] += item["baseline"]
                bucket["baseline_count"] += 1

        daily_history = []
        for day in sorted(daily.keys()):
            bucket = daily[day]
            baseline_value = (
                bucket["baseline"]
                if bucket["baseline_count"] > 0
                else None
            )

            daily_history.append({
                "date": day,
                "energy": bucket["energy"],
                "baseline": baseline_value,
                "reading_count": bucket["reading_count"],
            })

        if not daily_history:
            return jsonify([])

        # Use enough history for weekday seasonality while keeping the
        # forecast responsive to the latest operating conditions.
        history_window = daily_history[-35:]
        recent_window = history_window[-14:]

        latest_day = history_window[-1]["date"]
        latest_daily_energy = history_window[-1]["energy"]

        # ---------------------------------------------------------
        # ROBUST RECENT CONSUMPTION / BASELINE RATIO
        # ---------------------------------------------------------
        ratio_samples = []
        for item in recent_window:
            baseline_value = item["baseline"]
            if baseline_value is not None and baseline_value > 0:
                ratio_samples.append(item["energy"] / baseline_value)

        if ratio_samples:
            ratio_samples.sort()
            middle = len(ratio_samples) // 2
            if len(ratio_samples) % 2:
                recent_ratio = ratio_samples[middle]
            else:
                recent_ratio = (
                    ratio_samples[middle - 1] + ratio_samples[middle]
                ) / 2
        else:
            recent_ratio = 1.0

        # Keep isolated historical spikes from dominating every future day.
        recent_ratio = max(0.80, min(recent_ratio, 1.40))

        # Recent daily consumption average.
        recent_energy_values = [
            item["energy"] for item in recent_window
        ]
        recent_average = (
            sum(recent_energy_values) / len(recent_energy_values)
            if recent_energy_values
            else latest_daily_energy
        )

        # Overall baseline fallback.
        baseline_values = [
            item["baseline"]
            for item in history_window
            if item["baseline"] is not None and item["baseline"] > 0
        ]
        overall_baseline = (
            sum(baseline_values) / len(baseline_values)
            if baseline_values
            else recent_average
        )

        # ---------------------------------------------------------
        # FORECAST
        # ---------------------------------------------------------
        from datetime import timedelta

        result = []

        for offset in range(1, forecast_days + 1):
            future_day = latest_day + timedelta(days=offset)
            weekday = future_day.weekday()

            # Same-weekday history gives the building's recurring
            # weekday pattern. Keep the most recent four matches.
            same_weekday = [
                item for item in history_window
                if item["date"].weekday() == weekday
            ][-4:]

            seasonal_energy = None
            seasonal_baseline = None

            if same_weekday:
                seasonal_energy = (
                    sum(item["energy"] for item in same_weekday)
                    / len(same_weekday)
                )

                weekday_baselines = [
                    item["baseline"]
                    for item in same_weekday
                    if item["baseline"] is not None
                    and item["baseline"] > 0
                ]

                if weekday_baselines:
                    seasonal_baseline = (
                        sum(weekday_baselines)
                        / len(weekday_baselines)
                    )

            if seasonal_baseline is None:
                seasonal_baseline = overall_baseline

            # Blend recurring weekday behaviour with recent operation.
            # The baseline ratio carries the latest efficiency/usage level
            # into the future without extrapolating raw sensor spikes.
            baseline_based_forecast = (
                seasonal_baseline * recent_ratio
            )

            if seasonal_energy is not None:
                predicted = (
                    0.70 * baseline_based_forecast
                    + 0.30 * seasonal_energy
                )
            else:
                predicted = (
                    0.70 * baseline_based_forecast
                    + 0.30 * recent_average
                )

            # A final sanity bound based on observed daily history prevents
            # impossible forecasts caused by a corrupted sensor reading.
            observed_daily_values = [
                item["energy"] for item in history_window
                if item["energy"] >= 0
            ]

            if observed_daily_values:
                observed_min = min(observed_daily_values)
                observed_max = max(observed_daily_values)
                lower_bound = observed_min * 0.75
                upper_bound = observed_max * 1.10
                predicted = max(
                    lower_bound,
                    min(predicted, upper_bound),
                )

            baseline_for_day = seasonal_baseline

            result.append({
                "date": future_day.isoformat(),
                "datetime": future_day.isoformat(),
                "predicted": round(max(0.0, predicted), 2),
                "prediction": round(max(0.0, predicted), 2),
                "forecast": round(max(0.0, predicted), 2),
                "baseline": round(max(0.0, baseline_for_day), 2),
                "unit": "kWh/day",
                "method": "Historical weekday seasonality + recent baseline ratio",
                # Historical metadata is returned in both camelCase and
                # snake_case because the frontend normalizer supports the
                # snake_case contract used by api.ts / Forecasting.tsx.
                "history_points": len(raw_history),
                "historicalReadings": len(raw_history),
                "historical_readings": len(raw_history),
                "historyDays": len(daily_history),
                "history_days": len(daily_history),
                "historicalLatest": round(latest_daily_energy, 2),
                "historical_latest": round(latest_daily_energy, 2),
                "historical_latest_energy": round(latest_daily_energy, 2),
                "historical_latest_datetime": latest_day.isoformat(),
                "historical_latest_baseline": (
                    round(seasonal_baseline, 2)
                    if seasonal_baseline is not None
                    else None
                ),
                "recent_ratio": round(recent_ratio, 4),
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
        }), 500


@app.route("/api/forecasting", methods=["GET"])
def get_forecasting():
    # Keep the legacy endpoint compatible with the forecast endpoint.
    return get_forecast()


# =========================================================
# LIVE MONITORING
# =========================================================

@app.route("/api/live-monitoring", methods=["GET"])
def get_live_monitoring():

    try:

        building_id = get_building_id()

        query = SensorReading.query

        query = filter_by_building(
            query,
            SensorReading,
            building_id
        )

        sensors = query.order_by(
            SensorReading.id.desc()
        ).limit(50).all()

        return jsonify({

            "status": "success",

            "sensors": [
                model_to_dict(sensor)
                for sensor in sensors
            ],

            "summary": {},

            "alerts": [],

            "insights": []

        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# REPORTS
# =========================================================

@app.route("/api/reports", methods=["GET"])
def get_reports():

    try:

        return jsonify([])

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# BUILDING DATA MONITORING AGENT
# =========================================================

@app.route(
    "/api/agents/building-data/run",
    methods=["POST"]
)
def run_building_data_monitoring_agent():

    try:

        data = request.get_json(silent=True) or {}

        building_id = data.get("building_id")

        if not building_id:

            return jsonify({
                "status": "error",
                "message": "building_id is required"
            }), 400

        activity = AgentActivity.query.filter_by(
            building_id=building_id,
            name="Building Data Monitoring Agent"
        ).first()

        if not activity:

            return jsonify({
                "status": "error",
                "message": (
                    "Building Data Monitoring Agent "
                    "activity not found"
                )
            }), 404

        # -------------------------------------------------
        # MARK AGENT AS RUNNING
        # -------------------------------------------------

        activity.set_status("Running")

        activity.action = (
            "Collecting and normalizing building data."
        )

        db.session.commit()

        # -------------------------------------------------
        # EXECUTE AGENT
        # -------------------------------------------------

        result = run_building_data_agent(
            building_id
        )

        # -------------------------------------------------
        # MARK AGENT AS COMPLETED
        # -------------------------------------------------

        activity.set_status("Completed")

        activity.action = (
            "Building data collected and normalized."
        )

        activity.result = json.dumps(
            result,
            default=str
        )

        db.session.commit()

        return jsonify({

            "status": "success",

            "agent": (
                "Building Data Monitoring Agent"
            ),

            "result": result

        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# ENERGY CONSUMPTION ANALYSIS AGENT
# =========================================================

@app.route(
    "/api/agents/energy-analysis/run",
    methods=["POST"]
)
def run_energy_consumption_analysis_agent_route():

    try:

        data = request.get_json(silent=True) or {}

        building_id = data.get("building_id")

        if not building_id:
            return jsonify({
                "status": "error",
                "message": "building_id is required"
            }), 400

        activity = AgentActivity.query.filter_by(
            building_id=building_id,
            name="Energy Consumption Analysis Agent"
        ).first()

        if not activity:
            return jsonify({
                "status": "error",
                "message": (
                    "Energy Consumption Analysis Agent "
                    "activity not found"
                )
            }), 404

        # -------------------------------------------------
        # MARK AGENT AS RUNNING
        # -------------------------------------------------

        activity.set_status("Running")

        activity.action = (
            "Analyzing building energy consumption."
        )

        db.session.commit()

        # -------------------------------------------------
        # EXECUTE AGENT
        # -------------------------------------------------

        result = run_energy_consumption_analysis_agent(
            building_id
        )

        # -------------------------------------------------
        # MARK AGENT AS COMPLETED
        # -------------------------------------------------

        activity.set_status("Completed")

        activity.action = (
            "Energy consumption analysis completed."
        )

        activity.result = json.dumps(
            result,
            default=str
        )

        db.session.commit()

        return jsonify({
            "status": "success",
            "agent": (
                "Energy Consumption Analysis Agent"
            ),
            "result": result
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# OCCUPANCY & SPACE UTILIZATION AGENT
# =========================================================

@app.route(
    "/api/agents/occupancy-analysis/run",
    methods=["POST"]
)
def run_occupancy_space_utilization_agent_route():

    try:
        data = request.get_json(silent=True) or {}
        building_id = data.get("building_id")

        if not building_id:
            return jsonify({
                "status": "error",
                "message": "building_id is required"
            }), 400

        activity = AgentActivity.query.filter_by(
            building_id=building_id,
            name="Occupancy & Space Utilization Agent"
        ).first()

        if not activity:
            return jsonify({
                "status": "error",
                "message": (
                    "Occupancy & Space Utilization Agent "
                    "activity not found"
                )
            }), 404

        activity.set_status("Running")
        activity.action = (
            "Analyzing occupancy and space utilization."
        )
        db.session.commit()

        result = run_occupancy_space_utilization_agent(
            building_id
        )

        activity.set_status("Completed")
        activity.action = (
            "Occupancy and space utilization analysis completed."
        )
        activity.result = json.dumps(
            result,
            default=str
        )
        db.session.commit()

        return jsonify({
            "status": "success",
            "agent": "Occupancy & Space Utilization Agent",
            "result": result
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500



# =========================================================
# HVAC & EQUIPMENT OPTIMIZATION AGENT
# =========================================================

@app.route(
    "/api/agents/equipment-optimization/run",
    methods=["POST"]
)
def run_hvac_equipment_optimization_agent_route():

    try:

        data = request.get_json(silent=True) or {}
        building_id = data.get("building_id")

        if not building_id:
            return jsonify({
                "status": "error",
                "message": "building_id is required"
            }), 400

        activity = AgentActivity.query.filter_by(
            building_id=building_id,
            name="HVAC & Equipment Optimization Agent"
        ).first()

        if not activity:
            return jsonify({
                "status": "error",
                "message": (
                    "HVAC & Equipment Optimization Agent "
                    "activity not found"
                )
            }), 404

        # -------------------------------------------------
        # MARK AGENT AS RUNNING
        # -------------------------------------------------

        activity.set_status("Running")
        activity.action = (
            "Analyzing HVAC and equipment optimization opportunities."
        )
        db.session.commit()

        # -------------------------------------------------
        # EXECUTE AGENT
        # -------------------------------------------------

        result = run_hvac_equipment_optimization_agent(
            building_id
        )

        # -------------------------------------------------
        # MARK AGENT AS COMPLETED
        # -------------------------------------------------

        activity.set_status("Completed")
        activity.action = (
            "HVAC and equipment optimization analysis completed."
        )
        activity.result = json.dumps(
            result,
            default=str
        )

        db.session.commit()

        return jsonify({
            "status": "success",
            "agent": "HVAC & Equipment Optimization Agent",
            "result": result
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# ANOMALY DETECTION & FAULT ANALYSIS AGENT
# =========================================================

@app.route(
    "/api/agents/anomaly-detection/run",
    methods=["POST"]
)
def run_anomaly_detection_fault_analysis_agent_route():
    try:
        data = request.get_json(silent=True) or {}
        building_id = data.get("building_id")

        if not building_id:
            return jsonify({
                "status": "error",
                "message": "building_id is required"
            }), 400

        activity = AgentActivity.query.filter_by(
            building_id=building_id,
            name="Anomaly Detection & Fault Analysis Agent"
        ).first()

        if not activity:
            return jsonify({
                "status": "error",
                "message": (
                    "Anomaly Detection & Fault Analysis Agent "
                    "activity not found"
                )
            }), 404

        activity.set_status("Running")
        activity.action = (
            "Detecting anomalies and analyzing possible faults."
        )
        db.session.commit()

        result = run_anomaly_detection_fault_analysis_agent(
            building_id
        )

        activity.set_status("Completed")
        activity.action = (
            "Anomaly detection and fault analysis completed."
        )
        activity.result = json.dumps(
            result,
            default=str
        )
        db.session.commit()

        return jsonify({
            "status": "success",
            "agent": "Anomaly Detection & Fault Analysis Agent",
            "result": result
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# FACILITY RECOMMENDATION & ACTION AGENT
# =========================================================

@app.route(
    "/api/agents/facility-recommendation/run",
    methods=["POST"]
)
def run_facility_recommendation_action_agent_route():
    try:
        data = request.get_json(silent=True) or {}
        building_id = data.get("building_id")

        if not building_id:
            return jsonify({
                "status": "error",
                "message": "building_id is required"
            }), 400

        activity = AgentActivity.query.filter_by(
            building_id=building_id,
            name="Facility Recommendation & Action Agent"
        ).first()

        if not activity:
            return jsonify({
                "status": "error",
                "message": (
                    "Facility Recommendation & Action Agent "
                    "activity not found"
                )
            }), 404

        activity.set_status("Running")
        activity.action = (
            "Generating facility recommendations and action plan."
        )
        db.session.commit()

        result = run_facility_recommendation_action_agent(
            building_id
        )

        activity.set_status("Completed")
        activity.action = (
            "Facility recommendations and action plan completed."
        )
        activity.result = json.dumps(
            result,
            default=str
        )
        db.session.commit()

        return jsonify({
            "status": "success",
            "agent": "Facility Recommendation & Action Agent",
            "result": result
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# AGENT ACTIVITY
# =========================================================

@app.route(
    "/api/agent-activity",
    methods=["GET"]
)
def get_agent_activity():

    try:

        activities = AgentActivity.query.order_by(
            AgentActivity.id.desc()
        ).limit(20).all()

        return jsonify([
            model_to_dict(activity)
            for activity in activities
        ])

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# EQUIPMENT
# =========================================================

@app.route("/api/equipment", methods=["GET"])
def get_equipment():

    try:

        building_id = get_building_id()

        query = Equipment.query

        query = filter_by_building(
            query,
            Equipment,
            building_id
        )

        equipment = query.all()

        return jsonify([
            model_to_dict(item)
            for item in equipment
        ])

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

with app.app_context():

    db.create_all()


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )