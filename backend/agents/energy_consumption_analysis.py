from datetime import datetime
from models import EnergyReading


AGENT_NAME = "Energy Consumption Analysis Agent"


def run(building_id):
    """
    Agent 2: Energy Consumption Analysis Agent

    Performs deterministic energy analysis using stored EnergyReading data.
    No LLM arithmetic is used here.
    """

    # ---------------------------------------------------------
    # 1. Fetch historical energy readings
    # ---------------------------------------------------------
    readings = (
        EnergyReading.query
        .filter_by(building_id=building_id)
        .order_by(EnergyReading.timestamp.asc())
        .all()
    )

    if not readings:
        return {
            "agent": AGENT_NAME,
            "building_id": building_id,
            "status": "No Data",
            "message": "No energy readings found for this building.",
            "data": {}
        }

    # Keep only readings with usable consumption and baseline values
    valid_readings = [
        reading
        for reading in readings
        if reading.consumption is not None
        and reading.baseline is not None
    ]

    if not valid_readings:
        return {
            "agent": AGENT_NAME,
            "building_id": building_id,
            "status": "No Data",
            "message": "Energy readings exist, but consumption/baseline data is unavailable.",
            "data": {}
        }

    # ---------------------------------------------------------
    # 2. Latest energy reading
    # ---------------------------------------------------------
    latest = valid_readings[-1]

    current_consumption = float(latest.consumption)
    current_baseline = float(latest.baseline)

    variance = current_consumption - current_baseline

    if current_baseline != 0:
        variance_percentage = (variance / current_baseline) * 100
    else:
        variance_percentage = 0.0

    # Avoidable consumption = energy above baseline
    avoidable_energy = max(variance, 0)

    # ---------------------------------------------------------
    # 3. Historical averages
    # ---------------------------------------------------------
    average_consumption = sum(
        float(r.consumption) for r in valid_readings
    ) / len(valid_readings)

    average_baseline = sum(
        float(r.baseline) for r in valid_readings
    ) / len(valid_readings)

    # ---------------------------------------------------------
    # 4. Peak consumption
    # ---------------------------------------------------------
    peak_reading = max(
        valid_readings,
        key=lambda r: float(r.consumption)
    )

    peak_consumption = float(peak_reading.consumption)

    peak_variance = (
        peak_consumption - float(peak_reading.baseline)
    )

    # ---------------------------------------------------------
    # 5. Historical change
    # ---------------------------------------------------------
    if average_consumption != 0:
        historical_change_percentage = (
            (current_consumption - average_consumption)
            / average_consumption
        ) * 100
    else:
        historical_change_percentage = 0.0

    # ---------------------------------------------------------
    # 6. Determine energy severity
    # ---------------------------------------------------------
    if variance_percentage >= 20:
        severity = "Critical"
    elif variance_percentage >= 10:
        severity = "Warning"
    elif variance_percentage > 0:
        severity = "Elevated"
    else:
        severity = "Normal"

    # ---------------------------------------------------------
    # 7. Building-level assessment
    # ---------------------------------------------------------
    if variance_percentage >= 20:
        assessment = (
            "Energy consumption is significantly above the baseline. "
            "Immediate investigation is recommended."
        )
    elif variance_percentage >= 10:
        assessment = (
            "Energy consumption is moderately above the baseline. "
            "Potential efficiency issues should be investigated."
        )
    elif variance_percentage > 0:
        assessment = (
            "Energy consumption is slightly above the baseline. "
            "Monitor consumption for avoidable usage."
        )
    else:
        assessment = (
            "Energy consumption is at or below the baseline."
        )

    # ---------------------------------------------------------
    # 8. Floor-level analysis
    # ---------------------------------------------------------
    floor_groups = {}

    for reading in valid_readings:
        floor = reading.floor

        if floor is None:
            floor = "Building Total"

        if floor not in floor_groups:
            floor_groups[floor] = []

        floor_groups[floor].append(reading)

    floor_analysis = []

    for floor, floor_readings in floor_groups.items():

        floor_consumption = sum(
            float(r.consumption)
            for r in floor_readings
        )

        floor_baseline = sum(
            float(r.baseline)
            for r in floor_readings
        )

        if floor_baseline != 0:
            floor_variance_percentage = (
                (floor_consumption - floor_baseline)
                / floor_baseline
            ) * 100
        else:
            floor_variance_percentage = 0.0

        floor_analysis.append({
            "floor": floor,
            "reading_count": len(floor_readings),
            "total_consumption": round(floor_consumption, 2),
            "total_baseline": round(floor_baseline, 2),
            "variance": round(
                floor_consumption - floor_baseline,
                2
            ),
            "variance_percentage": round(
                floor_variance_percentage,
                2
            ),
            "avoidable_energy": round(
                max(floor_consumption - floor_baseline, 0),
                2
            )
        })

    # ---------------------------------------------------------
    # 9. Final agent result
    # ---------------------------------------------------------
    result = {
        "agent": AGENT_NAME,
        "building_id": building_id,
        "status": "Completed",

        "current": {
            "consumption": round(current_consumption, 2),
            "baseline": round(current_baseline, 2),
            "variance": round(variance, 2),
            "variance_percentage": round(
                variance_percentage,
                2
            ),
            "avoidable_energy": round(
                avoidable_energy,
                2
            ),
            "unit": latest.unit or "kWh",
            "timestamp": (
                latest.timestamp.isoformat()
                if latest.timestamp
                else None
            )
        },

        "historical": {
            "reading_count": len(valid_readings),
            "average_consumption": round(
                average_consumption,
                2
            ),
            "average_baseline": round(
                average_baseline,
                2
            ),
            "change_from_average_percentage": round(
                historical_change_percentage,
                2
            )
        },

        "peak": {
            "consumption": round(
                peak_consumption,
                2
            ),
            "baseline": round(
                float(peak_reading.baseline),
                2
            ),
            "variance": round(
                peak_variance,
                2
            ),
            "timestamp": (
                peak_reading.timestamp.isoformat()
                if peak_reading.timestamp
                else None
            ),
            "floor": peak_reading.floor
        },

        "floor_analysis": floor_analysis,

        "assessment": {
            "severity": severity,
            "message": assessment
        },

        "metadata": {
            "total_readings": len(readings),
            "valid_readings": len(valid_readings),
            "analysis_timestamp": datetime.utcnow().isoformat()
        }
    }

    return result