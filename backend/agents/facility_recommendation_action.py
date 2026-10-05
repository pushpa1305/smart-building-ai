from datetime import datetime

from models import (
    EnergyReading,
    OccupancyReading,
    Equipment,
    Anomaly,
    Recommendation,
)


AGENT_NAME = "Facility Recommendation & Action Agent"


def priority_score(severity):
    """
    Convert severity into a numerical priority.
    """

    severity = str(severity).lower()

    if severity == "critical":
        return 100

    if severity == "high":
        return 80

    if severity == "medium":
        return 60

    if severity == "low":
        return 40

    return 20


def run(building_id):
    """
    Facility Recommendation & Action Agent.

    Responsibilities:
        - Consolidate findings from building data
        - Analyze anomalies and energy conditions
        - Prioritize facility issues
        - Generate actionable recommendations
        - Estimate potential impact
        - Identify actions requiring human approval
        - Track existing recommendation/action status

    IMPORTANT:
        This agent does not directly modify critical
        equipment or HVAC settings.
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

    equipment = (
        Equipment.query
        .filter_by(building_id=building_id)
        .all()
    )

    anomalies = (
        Anomaly.query
        .filter_by(building_id=building_id)
        .order_by(Anomaly.created_at.desc())
        .all()
    )

    existing_recommendations = (
        Recommendation.query
        .filter_by(building_id=building_id)
        .order_by(Recommendation.created_at.desc())
        .all()
    )

    recommendations = []

    # =========================================================
    # ENERGY ANALYSIS
    # =========================================================

    latest_energy = None
    latest_baseline = None
    energy_variance = 0

    if energy_readings:

        latest = energy_readings[-1]

        if latest.consumption is not None:
            latest_energy = float(latest.consumption)

        if latest.baseline is not None:
            latest_baseline = float(latest.baseline)

            if latest_baseline > 0 and latest_energy is not None:
                energy_variance = (
                    (
                        latest_energy
                        - latest_baseline
                    )
                    / latest_baseline
                ) * 100

    # =========================================================
    # OCCUPANCY ANALYSIS
    # =========================================================

    average_occupancy = 0
    latest_occupancy = 0

    occupancy_values = [
        float(reading.occupancy_percentage)
        for reading in occupancy_readings
        if reading.occupancy_percentage is not None
    ]

    if occupancy_values:

        average_occupancy = (
            sum(occupancy_values)
            / len(occupancy_values)
        )

        latest_occupancy = occupancy_values[-1]

    # =========================================================
    # ANOMALY ANALYSIS
    # =========================================================

    critical_anomalies = []
    high_anomalies = []
    medium_anomalies = []

    for anomaly in anomalies:

        severity = (
            str(anomaly.severity).lower()
            if anomaly.severity
            else ""
        )

        if severity == "critical":
            critical_anomalies.append(anomaly)

        elif severity == "high":
            high_anomalies.append(anomaly)

        elif severity == "medium":
            medium_anomalies.append(anomaly)

    # =========================================================
    # RECOMMENDATION 1
    # ENERGY OPTIMIZATION
    # =========================================================

    if energy_variance > 10:

        estimated_savings = round(
            max(
                energy_variance,
                0
            ) * 0.05,
            2
        )

        recommendations.append({
            "title": "Investigate Above-Baseline Energy Consumption",
            "category": "Energy Optimization",
            "priority": "High",
            "priority_score": 85,
            "description": (
                f"Current building energy consumption is "
                f"{energy_variance:.2f}% above the latest baseline. "
                "Review HVAC runtime, lighting schedules, equipment "
                "loads and unnecessary operation."
            ),
            "recommended_action": (
                "Review high-energy equipment and operating schedules "
                "before approving optimization changes."
            ),
            "estimated_impact": (
                f"Potential reduction opportunity based on "
                f"{energy_variance:.2f}% baseline deviation."
            ),
            "estimated_savings": estimated_savings,
            "unit": "kWh",
            "requires_human_approval": True,
            "source": "Energy Consumption Analysis Agent"
        })

    # =========================================================
    # RECOMMENDATION 2
    # HVAC / OCCUPANCY
    # =========================================================

    low_occupancy_count = 0

    for reading in occupancy_readings:

        if reading.occupancy_percentage is not None:

            if float(reading.occupancy_percentage) <= 10:
                low_occupancy_count += 1

    running_hvac = []

    for item in equipment:

        equipment_type = (
            str(item.equipment_type).lower()
            if item.equipment_type
            else ""
        )

        status = (
            str(item.status).lower()
            if item.status
            else ""
        )

        if (
            "hvac" in equipment_type
            and status == "running"
        ):
            running_hvac.append(item)

    if (
        low_occupancy_count > 0
        and running_hvac
    ):

        recommendations.append({
            "title": "Optimize HVAC During Low Occupancy",
            "category": "HVAC Optimization",
            "priority": "High",
            "priority_score": 90,
            "description": (
                f"{len(running_hvac)} HVAC equipment item(s) "
                "are running while the building has recorded "
                "low-occupancy periods."
            ),
            "recommended_action": (
                "Review HVAC schedules and consider occupancy-based "
                "operation during low-demand periods."
            ),
            "estimated_impact": (
                "Reduced unnecessary HVAC runtime and improved "
                "building energy efficiency."
            ),
            "estimated_savings": round(
                len(running_hvac) * 20,
                2
            ),
            "unit": "kWh",
            "requires_human_approval": True,
            "source": "HVAC & Equipment Optimization Agent"
        })

    # =========================================================
    # RECOMMENDATION 3
    # LIGHTING
    # =========================================================

    running_lighting = []

    for item in equipment:

        equipment_type = (
            str(item.equipment_type).lower()
            if item.equipment_type
            else ""
        )

        status = (
            str(item.status).lower()
            if item.status
            else ""
        )

        if (
            "lighting" in equipment_type
            and status == "running"
        ):
            running_lighting.append(item)

    if (
        low_occupancy_count > 0
        and running_lighting
    ):

        recommendations.append({
            "title": "Review Lighting During Low Occupancy",
            "category": "Lighting Optimization",
            "priority": "Medium",
            "priority_score": 70,
            "description": (
                f"{len(running_lighting)} lighting equipment item(s) "
                "are running while low occupancy has been recorded."
            ),
            "recommended_action": (
                "Review lighting schedules and occupancy-based "
                "controls for underutilized areas."
            ),
            "estimated_impact": (
                "Reduced unnecessary lighting consumption."
            ),
            "estimated_savings": round(
                len(running_lighting) * 10,
                2
            ),
            "unit": "kWh",
            "requires_human_approval": True,
            "source": "Occupancy & Space Utilization Agent"
        })

    # =========================================================
    # RECOMMENDATION 4
    # ANOMALY INVESTIGATION
    # =========================================================

    if critical_anomalies:

        recommendations.append({
            "title": "Investigate Critical Facility Anomalies",
            "category": "Fault Investigation",
            "priority": "Critical",
            "priority_score": 100,
            "description": (
                f"{len(critical_anomalies)} critical anomaly/anomalies "
                "require immediate facility investigation."
            ),
            "recommended_action": (
                "Assign the affected equipment or sensor issue "
                "to a facility engineer for inspection."
            ),
            "estimated_impact": (
                "Early fault investigation can prevent equipment "
                "damage, energy waste and operational disruption."
            ),
            "estimated_savings": 0,
            "unit": "kWh",
            "requires_human_approval": True,
            "source": "Anomaly Detection & Fault Analysis Agent"
        })

    # =========================================================
    # RECOMMENDATION 5
    # HIGH-SEVERITY ANOMALIES
    # =========================================================

    if high_anomalies:

        recommendations.append({
            "title": "Review High-Severity Anomalies",
            "category": "Fault Investigation",
            "priority": "High",
            "priority_score": 85,
            "description": (
                f"{len(high_anomalies)} high-severity anomalies "
                "were detected by the anomaly analysis process."
            ),
            "recommended_action": (
                "Review anomaly timestamps, affected zones, "
                "sensor readings and equipment operation."
            ),
            "estimated_impact": (
                "Potential reduction of recurring energy waste "
                "and improved equipment reliability."
            ),
            "estimated_savings": 0,
            "unit": "kWh",
            "requires_human_approval": True,
            "source": "Anomaly Detection & Fault Analysis Agent"
        })

    # =========================================================
    # RECOMMENDATION 6
    # SENSOR HEALTH
    # =========================================================

    sensor_failure_count = sum(
        1
        for anomaly in anomalies
        if anomaly.category
        and str(anomaly.category).lower() == "sensor"
        and anomaly.severity
        and str(anomaly.severity).lower()
        in ["critical", "high"]
    )

    if sensor_failure_count > 0:

        recommendations.append({
            "title": "Inspect Sensor Health",
            "category": "Sensor Maintenance",
            "priority": "High",
            "priority_score": 80,
            "description": (
                f"{sensor_failure_count} high or critical "
                "sensor-related issue(s) require investigation."
            ),
            "recommended_action": (
                "Inspect sensor connectivity, calibration and "
                "hardware condition."
            ),
            "estimated_impact": (
                "Improved data reliability and more accurate "
                "building optimization decisions."
            ),
            "estimated_savings": 0,
            "unit": "kWh",
            "requires_human_approval": True,
            "source": "Anomaly Detection & Fault Analysis Agent"
        })

    # =========================================================
    # SORT RECOMMENDATIONS
    # =========================================================

    recommendations.sort(
        key=lambda item: item["priority_score"],
        reverse=True
    )

    # =========================================================
    # ACTION PLAN
    # =========================================================

    action_plan = []

    for index, recommendation in enumerate(
        recommendations,
        start=1
    ):

        action_plan.append({
            "action_id": index,
            "title": recommendation["title"],
            "priority": recommendation["priority"],
            "category": recommendation["category"],
            "recommended_action": recommendation[
                "recommended_action"
            ],
            "requires_human_approval": recommendation[
                "requires_human_approval"
            ],
            "status": "Pending Approval",
            "assigned_to": "Facility Manager",
            "source_agent": recommendation["source"]
        })

    # =========================================================
    # TOTAL POTENTIAL SAVINGS
    # =========================================================

    total_estimated_savings = round(
        sum(
            float(item.get("estimated_savings", 0))
            for item in recommendations
        ),
        2
    )

    # =========================================================
    # OVERALL ASSESSMENT
    # =========================================================

    if critical_anomalies:

        overall_severity = "Critical"

        message = (
            "Critical facility issues require immediate "
            "human review and action assignment."
        )

    elif high_anomalies or energy_variance > 10:

        overall_severity = "High"

        message = (
            "Multiple high-priority optimization and "
            "investigation opportunities were identified."
        )

    elif recommendations:

        overall_severity = "Medium"

        message = (
            "Facility optimization opportunities were identified "
            "and are ready for human review."
        )

    else:

        overall_severity = "Normal"

        message = (
            "No major facility actions require immediate attention."
        )

    # =========================================================
    # RETURN RESULT
    # =========================================================

    return {
        "agent": AGENT_NAME,
        "status": "Completed",
        "building_id": building_id,

        "assessment": {
            "severity": overall_severity,
            "message": message
        },

        "building_metrics": {
            "latest_energy": (
                round(latest_energy, 2)
                if latest_energy is not None
                else None
            ),
            "latest_baseline": (
                round(latest_baseline, 2)
                if latest_baseline is not None
                else None
            ),
            "energy_variance_percentage": round(
                energy_variance,
                2
            ),
            "average_occupancy": round(
                average_occupancy,
                2
            ),
            "latest_occupancy": round(
                latest_occupancy,
                2
            ),
            "low_occupancy_readings": low_occupancy_count
        },

        "recommendations": recommendations,

        "action_plan": action_plan,

        "summary": {
            "recommendations_generated": len(
                recommendations
            ),
            "actions_generated": len(
                action_plan
            ),
            "critical_anomalies": len(
                critical_anomalies
            ),
            "high_anomalies": len(
                high_anomalies
            ),
            "medium_anomalies": len(
                medium_anomalies
            ),
            "equipment_analyzed": len(
                equipment
            ),
            "energy_readings_analyzed": len(
                energy_readings
            ),
            "occupancy_readings_analyzed": len(
                occupancy_readings
            ),
            "existing_recommendations": len(
                existing_recommendations
            ),
            "total_estimated_savings": (
                total_estimated_savings
            )
        },

        "approval": {
            "human_approval_required": True,
            "automatic_changes_applied": False,
            "message": (
                "Recommendations and actions require human "
                "approval before critical facility changes "
                "are implemented."
            )
        },

        "metadata": {
            "analysis_timestamp": (
                datetime.utcnow().isoformat()
            ),
            "agent_version": "1.0",
            "purpose": (
                "Facility recommendation, prioritization "
                "and human-approved action planning."
            )
        }
    }