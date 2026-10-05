from datetime import datetime
from statistics import mean, pstdev

from models import EnergyReading, OccupancyReading, SensorReading, Equipment


AGENT_NAME = "Anomaly Detection & Fault Analysis Agent"


def calculate_z_score(value, values):
    """
    Calculate a standard Z-score.

    Z-score is used to identify observations that are
    significantly different from the historical distribution.
    """

    if len(values) < 3:
        return 0

    average = mean(values)
    deviation = pstdev(values)

    if deviation == 0:
        return 0

    return (value - average) / deviation


def severity_from_z_score(z_score):
    """
    Convert statistical deviation into an anomaly severity.
    """

    absolute_score = abs(z_score)

    if absolute_score >= 3:
        return "Critical"

    if absolute_score >= 2:
        return "High"

    if absolute_score >= 1.5:
        return "Medium"

    return "Normal"


def run(building_id):
    """
    Detect abnormal energy, occupancy and sensor behavior.

    Method:
        - Statistical Z-score analysis
        - Baseline comparison
        - Sensor consistency checks
        - Equipment/occupancy correlation
        - Fault hypothesis generation

    The agent detects and explains possible faults.
    It does not automatically modify equipment.
    """

    # =========================================================
    # LOAD DATA
    # =========================================================

    energy_readings = (
        EnergyReading.query
        .filter_by(building_id=building_id)
        .order_by(EnergyReading.timestamp.asc())
        .all()
    )

    occupancy_readings = (
        OccupancyReading.query
        .filter_by(building_id=building_id)
        .order_by(OccupancyReading.timestamp.asc())
        .all()
    )

    sensor_readings = (
        SensorReading.query
        .filter_by(building_id=building_id)
        .order_by(SensorReading.timestamp.asc())
        .all()
    )

    equipment = (
        Equipment.query
        .filter_by(building_id=building_id)
        .all()
    )

    anomalies = []

    # =========================================================
    # ENERGY ANOMALY DETECTION
    # =========================================================

    energy_values = [
        float(reading.consumption)
        for reading in energy_readings
        if reading.consumption is not None
    ]

    energy_baselines = [
        float(reading.baseline)
        for reading in energy_readings
        if reading.baseline is not None
    ]

    if len(energy_values) >= 3:

        average_energy = mean(energy_values)

        for reading in energy_readings:

            if reading.consumption is None:
                continue

            consumption = float(reading.consumption)

            z_score = calculate_z_score(
                consumption,
                energy_values
            )

            severity = severity_from_z_score(
                z_score
            )

            baseline_variance = 0

            if (
                reading.baseline is not None
                and float(reading.baseline) > 0
            ):
                baseline_variance = (
                    (
                        consumption
                        - float(reading.baseline)
                    )
                    / float(reading.baseline)
                ) * 100

            # Detect statistically unusual consumption
            if abs(z_score) >= 2:

                if consumption > average_energy:

                    anomaly_type = (
                        "Energy Consumption Spike"
                    )

                    description = (
                        f"Energy consumption of "
                        f"{consumption:.2f} kWh is "
                        f"statistically higher than "
                        f"historical behavior."
                    )

                    hypothesis = (
                        "Possible causes include abnormal "
                        "equipment operation, HVAC overuse, "
                        "lighting operation or unusual building load."
                    )

                else:

                    anomaly_type = (
                        "Unusual Energy Reduction"
                    )

                    description = (
                        f"Energy consumption of "
                        f"{consumption:.2f} kWh is "
                        f"significantly below historical behavior."
                    )

                    hypothesis = (
                        "Possible causes include reduced "
                        "occupancy, equipment shutdown, "
                        "sensor issues or incomplete data."
                    )

                anomalies.append({
                    "type": anomaly_type,
                    "category": "Energy",
                    "severity": severity,
                    "timestamp": (
                        reading.timestamp.isoformat()
                        if reading.timestamp
                        else None
                    ),
                    "observed_value": round(
                        consumption,
                        2
                    ),
                    "baseline": (
                        round(
                            float(reading.baseline),
                            2
                        )
                        if reading.baseline is not None
                        else None
                    ),
                    "baseline_variance_percentage": round(
                        baseline_variance,
                        2
                    ),
                    "z_score": round(
                        z_score,
                        3
                    ),
                    "description": description,
                    "fault_hypothesis": hypothesis
                })

    # =========================================================
    # OCCUPANCY ANOMALY DETECTION
    # =========================================================

    occupancy_values = [
        float(reading.occupancy_percentage)
        for reading in occupancy_readings
        if reading.occupancy_percentage is not None
    ]

    if len(occupancy_values) >= 3:

        average_occupancy = mean(
            occupancy_values
        )

        for reading in occupancy_readings:

            if reading.occupancy_percentage is None:
                continue

            occupancy = float(
                reading.occupancy_percentage
            )

            z_score = calculate_z_score(
                occupancy,
                occupancy_values
            )

            if abs(z_score) >= 2:

                if occupancy > average_occupancy:

                    anomaly_type = (
                        "Unusual Occupancy Increase"
                    )

                    hypothesis = (
                        "Possible event, abnormal occupancy "
                        "pattern or occupancy sensor issue."
                    )

                else:

                    anomaly_type = (
                        "Unusual Occupancy Drop"
                    )

                    hypothesis = (
                        "Possible building closure, "
                        "unexpected low occupancy or sensor issue."
                    )

                anomalies.append({
                    "type": anomaly_type,
                    "category": "Occupancy",
                    "severity": severity_from_z_score(
                        z_score
                    ),
                    "timestamp": (
                        reading.timestamp.isoformat()
                        if reading.timestamp
                        else None
                    ),
                    "observed_value": round(
                        occupancy,
                        2
                    ),
                    "average_value": round(
                        average_occupancy,
                        2
                    ),
                    "z_score": round(
                        z_score,
                        3
                    ),
                    "description": (
                        "Occupancy behavior differs "
                        "significantly from historical patterns."
                    ),
                    "fault_hypothesis": hypothesis
                })

    # =========================================================
    # SENSOR ANOMALY DETECTION
    # =========================================================

    sensor_temperature_values = [
        float(sensor.temperature)
        for sensor in sensor_readings
        if sensor.temperature is not None
    ]

    sensor_humidity_values = [
        float(sensor.humidity)
        for sensor in sensor_readings
        if sensor.humidity is not None
    ]

    sensor_energy_values = [
        float(sensor.energy)
        for sensor in sensor_readings
        if sensor.energy is not None
    ]

    # ---------------------------------------------------------
    # TEMPERATURE
    # ---------------------------------------------------------

    if len(sensor_temperature_values) >= 3:

        for sensor in sensor_readings:

            if sensor.temperature is None:
                continue

            temperature = float(
                sensor.temperature
            )

            z_score = calculate_z_score(
                temperature,
                sensor_temperature_values
            )

            if abs(z_score) >= 2:

                anomalies.append({
                    "type": "Abnormal Temperature",
                    "category": "Sensor",
                    "severity": severity_from_z_score(
                        z_score
                    ),
                    "timestamp": (
                        sensor.timestamp.isoformat()
                        if sensor.timestamp
                        else None
                    ),
                    "observed_value": round(
                        temperature,
                        2
                    ),
                    "z_score": round(
                        z_score,
                        3
                    ),
                    "floor": sensor.floor,
                    "zone": sensor.zone,
                    "description": (
                        "Temperature differs significantly "
                        "from the historical sensor distribution."
                    ),
                    "fault_hypothesis": (
                        "Possible HVAC malfunction, "
                        "environmental change or temperature "
                        "sensor fault."
                    )
                })

    # ---------------------------------------------------------
    # HUMIDITY
    # ---------------------------------------------------------

    if len(sensor_humidity_values) >= 3:

        for sensor in sensor_readings:

            if sensor.humidity is None:
                continue

            humidity = float(
                sensor.humidity
            )

            z_score = calculate_z_score(
                humidity,
                sensor_humidity_values
            )

            if abs(z_score) >= 2:

                anomalies.append({
                    "type": "Abnormal Humidity",
                    "category": "Sensor",
                    "severity": severity_from_z_score(
                        z_score
                    ),
                    "timestamp": (
                        sensor.timestamp.isoformat()
                        if sensor.timestamp
                        else None
                    ),
                    "observed_value": round(
                        humidity,
                        2
                    ),
                    "z_score": round(
                        z_score,
                        3
                    ),
                    "floor": sensor.floor,
                    "zone": sensor.zone,
                    "description": (
                        "Humidity differs significantly "
                        "from historical sensor behavior."
                    ),
                    "fault_hypothesis": (
                        "Possible HVAC or ventilation issue "
                        "or humidity sensor fault."
                    )
                })

    # ---------------------------------------------------------
    # SENSOR ENERGY
    # ---------------------------------------------------------

    if len(sensor_energy_values) >= 3:

        for sensor in sensor_readings:

            if sensor.energy is None:
                continue

            energy = float(
                sensor.energy
            )

            z_score = calculate_z_score(
                energy,
                sensor_energy_values
            )

            if abs(z_score) >= 2:

                anomalies.append({
                    "type": "Abnormal Sensor Energy",
                    "category": "Sensor",
                    "severity": severity_from_z_score(
                        z_score
                    ),
                    "timestamp": (
                        sensor.timestamp.isoformat()
                        if sensor.timestamp
                        else None
                    ),
                    "observed_value": round(
                        energy,
                        2
                    ),
                    "z_score": round(
                        z_score,
                        3
                    ),
                    "description": (
                        "Sensor energy measurement differs "
                        "significantly from historical behavior."
                    ),
                    "fault_hypothesis": (
                        "Possible equipment load change, "
                        "sensor malfunction or abnormal consumption."
                    )
                })

    # =========================================================
    # HVAC + OCCUPANCY CORRELATION
    # =========================================================

    low_occupancy_count = 0
    hvac_low_occupancy_count = 0

    for sensor in sensor_readings:

        occupancy = (
            float(sensor.occupancy)
            if sensor.occupancy is not None
            else None
        )

        if occupancy is None:
            continue

        if occupancy <= 10:

            low_occupancy_count += 1

            # CORRECTED:
            # Use the existing model property instead of
            # sensor.hvac_running.
            if sensor.hvac_running_when_unoccupied:
                hvac_low_occupancy_count += 1

    if hvac_low_occupancy_count > 0:

        anomalies.append({
            "type": "HVAC Running During Low Occupancy",
            "category": "Equipment",
            "severity": "High",
            "timestamp": datetime.utcnow().isoformat(),
            "observed_value": hvac_low_occupancy_count,
            "low_occupancy_readings": low_occupancy_count,
            "description": (
                "HVAC operation was detected during "
                "low-occupancy sensor periods."
            ),
            "fault_hypothesis": (
                "Possible scheduling inefficiency, "
                "occupancy-control failure or unnecessary HVAC runtime."
            )
        })

    # =========================================================
    # LIGHTING + OCCUPANCY CORRELATION
    # =========================================================

    lighting_low_occupancy_count = 0

    for sensor in sensor_readings:

        occupancy = (
            float(sensor.occupancy)
            if sensor.occupancy is not None
            else None
        )

        if occupancy is None:
            continue

        if (
            occupancy <= 10
            and sensor.lighting_running_when_unoccupied
        ):
            lighting_low_occupancy_count += 1

    if lighting_low_occupancy_count > 0:

        anomalies.append({
            "type": "Lighting Running During Low Occupancy",
            "category": "Equipment",
            "severity": "Medium",
            "timestamp": datetime.utcnow().isoformat(),
            "observed_value": lighting_low_occupancy_count,
            "description": (
                "Lighting operation was detected "
                "during low-occupancy periods."
            ),
            "fault_hypothesis": (
                "Possible lighting schedule or occupancy "
                "control inefficiency."
            )
        })

    # =========================================================
    # SENSOR CONSISTENCY CHECK
    # =========================================================

    sensor_failure_count = 0

    for sensor in sensor_readings:

        sensor_status = (
            str(sensor.status).lower()
            if sensor.status is not None
            else ""
        )

        if sensor_status in [
            "offline",
            "error",
            "failed",
            "fault"
        ]:

            sensor_failure_count += 1

            anomalies.append({
                "type": "Sensor Failure",
                "category": "Sensor",
                "severity": "High",
                "timestamp": (
                    sensor.timestamp.isoformat()
                    if sensor.timestamp
                    else None
                ),
                "sensor_id": sensor.sensor_id,
                "description": (
                    "Sensor reports an unhealthy or "
                    "failed operational status."
                ),
                "fault_hypothesis": (
                    "Possible sensor communication failure, "
                    "hardware failure or connectivity issue."
                )
            })

    # =========================================================
    # EQUIPMENT FAULT INDICATION
    # =========================================================

    equipment_fault_count = 0

    for item in equipment:

        status = (
            str(item.status).lower()
            if item.status is not None
            else ""
        )

        if status in [
            "fault",
            "failed",
            "error",
            "offline"
        ]:

            equipment_fault_count += 1

            anomalies.append({
                "type": "Equipment Fault",
                "category": "Equipment",
                "severity": "Critical",
                "equipment_id": item.id,
                "equipment_name": item.name,
                "timestamp": datetime.utcnow().isoformat(),
                "description": (
                    f"Equipment '{item.name}' "
                    "reports an unhealthy status."
                ),
                "fault_hypothesis": (
                    "Possible equipment malfunction, "
                    "maintenance requirement or communication failure."
                )
            })

    # =========================================================
    # PRIORITIZE ANOMALIES
    # =========================================================

    severity_order = {
        "Critical": 4,
        "High": 3,
        "Medium": 2,
        "Normal": 1
    }

    anomalies.sort(
        key=lambda anomaly: severity_order.get(
            anomaly.get("severity"),
            0
        ),
        reverse=True
    )

    # =========================================================
    # SUMMARY
    # =========================================================

    critical_count = sum(
        1
        for anomaly in anomalies
        if anomaly.get("severity") == "Critical"
    )

    high_count = sum(
        1
        for anomaly in anomalies
        if anomaly.get("severity") == "High"
    )

    medium_count = sum(
        1
        for anomaly in anomalies
        if anomaly.get("severity") == "Medium"
    )

    if critical_count > 0:

        overall_severity = "Critical"

        message = (
            f"{critical_count} critical anomaly/anomalies "
            "require immediate investigation."
        )

    elif high_count > 0:

        overall_severity = "High"

        message = (
            f"{high_count} high-severity anomaly/anomalies "
            "were detected."
        )

    elif medium_count > 0:

        overall_severity = "Medium"

        message = (
            f"{medium_count} medium-severity anomaly/anomalies "
            "were detected."
        )

    elif anomalies:

        overall_severity = "Low"

        message = (
            f"{len(anomalies)} anomaly/anomalies detected "
            "for monitoring."
        )

    else:

        overall_severity = "Normal"

        message = (
            "No statistically significant anomalies "
            "were detected."
        )

    # =========================================================
    # RETURN RESULT
    # =========================================================

    return {
        "agent": AGENT_NAME,
        "status": "Completed",
        "building_id": building_id,

        "detection_method": {
            "primary_method": "Statistical Z-score",
            "z_score_thresholds": {
                "medium": 1.5,
                "high": 2.0,
                "critical": 3.0
            },
            "additional_checks": [
                "Baseline comparison",
                "Sensor consistency",
                "HVAC and occupancy correlation",
                "Lighting and occupancy correlation",
                "Equipment status analysis"
            ]
        },

        "summary": {
            "total_anomalies": len(anomalies),
            "critical": critical_count,
            "high": high_count,
            "medium": medium_count,
            "low": len(anomalies) - (
                critical_count
                + high_count
                + medium_count
            ),
            "energy_readings_analyzed": len(
                energy_readings
            ),
            "occupancy_readings_analyzed": len(
                occupancy_readings
            ),
            "sensor_readings_analyzed": len(
                sensor_readings
            ),
            "equipment_analyzed": len(
                equipment
            ),
            "sensor_failures": sensor_failure_count,
            "equipment_faults": equipment_fault_count
        },

        "anomalies": anomalies,

        "assessment": {
            "severity": overall_severity,
            "message": message
        },

        "safety": {
            "automatic_changes_applied": False,
            "human_approval_required": True,
            "message": (
                "Anomalies are detected and explained by "
                "the agent. Equipment changes are not "
                "automatically applied."
            )
        },

        "metadata": {
            "analysis_timestamp": (
                datetime.utcnow().isoformat()
            ),
            "algorithm": "Z-score statistical analysis"
        }
    }