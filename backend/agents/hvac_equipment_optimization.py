from datetime import datetime

from models import Equipment, OccupancyReading, EnergyReading


AGENT_NAME = "HVAC & Equipment Optimization Agent"


def run(building_id):
    """
    Analyze HVAC and equipment operation against occupancy and
    energy conditions.

    The agent recommends optimization opportunities but DOES NOT
    directly modify equipment settings.
    """

    equipment = (
        Equipment.query
        .filter_by(building_id=building_id)
        .all()
    )

    occupancy_readings = (
        OccupancyReading.query
        .filter_by(building_id=building_id)
        .order_by(OccupancyReading.timestamp.asc())
        .all()
    )

    energy_readings = (
        EnergyReading.query
        .filter_by(building_id=building_id)
        .order_by(EnergyReading.timestamp.asc())
        .all()
    )

    if not equipment:
        return {
            "agent": AGENT_NAME,
            "status": "Completed",
            "building_id": building_id,
            "message": "No equipment data available.",
            "equipment_analysis": [],
            "optimization_opportunities": [],
            "assessment": {
                "severity": "Unknown",
                "message": "HVAC and equipment optimization could not be performed."
            },
            "metadata": {
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "equipment_analyzed": 0
            }
        }

    # ---------------------------------------------------------
    # BUILD OCCUPANCY SUMMARY
    # ---------------------------------------------------------

    valid_occupancy = [
        reading
        for reading in occupancy_readings
        if reading.occupancy_percentage is not None
    ]

    average_occupancy = 0

    if valid_occupancy:
        average_occupancy = (
            sum(
                reading.occupancy_percentage
                for reading in valid_occupancy
            )
            / len(valid_occupancy)
        )

    low_occupancy_count = sum(
        1
        for reading in valid_occupancy
        if reading.occupancy_percentage <= 10
    )

    low_occupancy_percentage = 0

    if valid_occupancy:
        low_occupancy_percentage = (
            low_occupancy_count
            / len(valid_occupancy)
            * 100
        )

    # ---------------------------------------------------------
    # ENERGY SUMMARY
    # ---------------------------------------------------------

    valid_energy = [
        reading
        for reading in energy_readings
        if (
            reading.consumption is not None
            and reading.baseline is not None
        )
    ]

    latest_energy = None
    energy_variance_percentage = 0

    if valid_energy:
        latest_energy = valid_energy[-1]

        if latest_energy.baseline > 0:
            energy_variance_percentage = (
                (
                    latest_energy.consumption
                    - latest_energy.baseline
                )
                / latest_energy.baseline
            ) * 100

    # ---------------------------------------------------------
    # EQUIPMENT ANALYSIS
    # ---------------------------------------------------------

    equipment_analysis = []
    optimization_opportunities = []

    for item in equipment:

        equipment_type = (
            item.equipment_type or ""
        )

        equipment_type_lower = equipment_type.lower()

        status = item.status or ""

        status_lower = status.lower()

        is_hvac = (
            "hvac" in equipment_type_lower
            or "air conditioning" in equipment_type_lower
            or equipment_type_lower == "ac"
        )

        is_lighting = (
            "lighting" in equipment_type_lower
        )

        is_running = status_lower in [
            "running",
            "active",
            "on"
        ]

        power = (
            float(item.power_consumption)
            if item.power_consumption is not None
            else 0
        )

        rated_power = (
            float(item.rated_power)
            if item.rated_power is not None
            else None
        )

        power_utilization = None

        if rated_power and rated_power > 0:
            power_utilization = (
                power / rated_power
            ) * 100

        # -----------------------------------------------------
        # LOW OCCUPANCY OPERATION
        # -----------------------------------------------------

        low_occupancy_operation = (
            is_running
            and low_occupancy_percentage >= 20
            and (is_hvac or is_lighting)
        )

        # -----------------------------------------------------
        # HIGH POWER EQUIPMENT
        # -----------------------------------------------------

        high_power_equipment = (
            power >= 100
        )

        # -----------------------------------------------------
        # ENERGY ABOVE BASELINE
        # -----------------------------------------------------

        energy_concern = (
            energy_variance_percentage >= 10
        )

        # -----------------------------------------------------
        # OPTIMIZATION SCORE
        # -----------------------------------------------------

        optimization_score = 0

        if low_occupancy_operation:
            optimization_score += 50

        if high_power_equipment:
            optimization_score += 20

        if energy_concern:
            optimization_score += 20

        if power_utilization is not None:
            if power_utilization > 90:
                optimization_score += 10

        optimization_score = min(
            optimization_score,
            100
        )

        # -----------------------------------------------------
        # CLASSIFICATION
        # -----------------------------------------------------

        if optimization_score >= 70:
            optimization_status = "High Priority"

        elif optimization_score >= 40:
            optimization_status = "Optimization Recommended"

        elif optimization_score > 0:
            optimization_status = "Monitor"

        else:
            optimization_status = "Normal"

        analysis = {
            "equipment_id": item.id,
            "equipment_name": item.name,
            "equipment_type": equipment_type,
            "status": status,
            "floor": item.floor,
            "zone": item.zone,
            "power_consumption": power,
            "rated_power": rated_power,
            "power_utilization_percentage": (
                round(power_utilization, 2)
                if power_utilization is not None
                else None
            ),
            "is_hvac": is_hvac,
            "is_lighting": is_lighting,
            "running_during_low_occupancy": (
                low_occupancy_operation
            ),
            "high_power_equipment": (
                high_power_equipment
            ),
            "energy_above_baseline": (
                energy_concern
            ),
            "optimization_score": optimization_score,
            "optimization_status": optimization_status
        }

        equipment_analysis.append(analysis)

        # -----------------------------------------------------
        # GENERATE RECOMMENDATION
        # -----------------------------------------------------

        if low_occupancy_operation:

            if is_hvac:
                recommendation = (
                    "Review HVAC scheduling and consider "
                    "occupancy-based operation during low-"
                    "occupancy periods. Do not change critical "
                    "HVAC settings without human approval."
                )

            elif is_lighting:
                recommendation = (
                    "Review lighting schedules and consider "
                    "occupancy-based or automatic lighting "
                    "controls during low-occupancy periods."
                )

            else:
                recommendation = (
                    "Review equipment operating schedule "
                    "during low-occupancy periods."
                )

            optimization_opportunities.append({
                "equipment_id": item.id,
                "equipment_name": item.name,
                "equipment_type": equipment_type,
                "priority": optimization_status,
                "optimization_score": optimization_score,
                "reason": (
                    "Equipment is running while the building "
                    "has significant low-occupancy periods."
                ),
                "recommendation": recommendation,
                "estimated_power": power,
                "requires_human_approval": True
            })

        elif high_power_equipment and energy_concern:

            optimization_opportunities.append({
                "equipment_id": item.id,
                "equipment_name": item.name,
                "equipment_type": equipment_type,
                "priority": optimization_status,
                "optimization_score": optimization_score,
                "reason": (
                    "High-power equipment is operating while "
                    "building energy consumption is above baseline."
                ),
                "recommendation": (
                    "Review runtime, operating schedule, "
                    "maintenance condition and load profile."
                ),
                "estimated_power": power,
                "requires_human_approval": True
            })

    # ---------------------------------------------------------
    # PRIORITIZE OPPORTUNITIES
    # ---------------------------------------------------------

    optimization_opportunities.sort(
        key=lambda item: item["optimization_score"],
        reverse=True
    )

    # ---------------------------------------------------------
    # OVERALL ASSESSMENT
    # ---------------------------------------------------------

    high_priority_count = sum(
        1
        for item in equipment_analysis
        if item["optimization_status"] == "High Priority"
    )

    recommended_count = len(
        optimization_opportunities
    )

    if high_priority_count > 0:

        severity = "Critical"

        message = (
            f"{high_priority_count} equipment item(s) "
            "require high-priority optimization review."
        )

    elif recommended_count > 0:

        severity = "Warning"

        message = (
            f"{recommended_count} optimization opportunity(ies) "
            "were identified for HVAC and equipment operation."
        )

    elif energy_variance_percentage >= 10:

        severity = "Elevated"

        message = (
            "Building energy consumption is above baseline, "
            "but no specific equipment optimization opportunity "
            "was strongly identified."
        )

    else:

        severity = "Normal"

        message = (
            "No major HVAC or equipment optimization issues "
            "were identified."
        )

    # ---------------------------------------------------------
    # FINAL RESULT
    # ---------------------------------------------------------

    return {
        "agent": AGENT_NAME,
        "status": "Completed",
        "building_id": building_id,

        "summary": {
            "equipment_count": len(equipment),
            "equipment_analyzed": len(equipment_analysis),
            "optimization_opportunities": (
                recommended_count
            ),
            "high_priority_items": (
                high_priority_count
            ),
            "average_occupancy": round(
                average_occupancy,
                2
            ),
            "low_occupancy_percentage": round(
                low_occupancy_percentage,
                2
            ),
            "latest_energy_variance_percentage": round(
                energy_variance_percentage,
                2
            )
        },

        "equipment_analysis": equipment_analysis,

        "optimization_opportunities": (
            optimization_opportunities
        ),

        "assessment": {
            "severity": severity,
            "message": message
        },

        "safety": {
            "automatic_changes_applied": False,
            "human_approval_required": True,
            "message": (
                "This agent only analyzes and recommends "
                "optimization actions. It does not directly "
                "modify critical HVAC or equipment settings."
            )
        },

        "metadata": {
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "equipment_analyzed": len(equipment_analysis),
            "occupancy_readings_analyzed": len(
                valid_occupancy
            ),
            "energy_readings_analyzed": len(
                valid_energy
            )
        }
    }