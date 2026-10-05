from datetime import datetime
from models import OccupancyReading, Equipment


AGENT_NAME = "Occupancy & Space Utilization Agent"


def run(building_id):
    """
    Analyze occupancy and space utilization for a building.

    The agent:
    - Identifies occupied and unoccupied zones
    - Calculates average occupancy
    - Detects equipment running during low/no occupancy
    - Detects potential HVAC/lighting waste
    - Analyzes floor/zone utilization
    - Identifies underutilized spaces
    """

    readings = (
        OccupancyReading.query
        .filter_by(building_id=building_id)
        .order_by(OccupancyReading.timestamp.asc())
        .all()
    )

    if not readings:
        return {
            "agent": AGENT_NAME,
            "status": "Completed",
            "building_id": building_id,
            "message": "No occupancy data available for analysis.",
            "summary": {},
            "zones": [],
            "floor_analysis": [],
            "equipment_analysis": [],
            "assessment": {
                "severity": "Unknown",
                "message": "Occupancy analysis could not be performed because no occupancy data is available."
            },
            "metadata": {
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "total_readings": 0
            }
        }

    # ---------------------------------------------------------
    # BASIC OCCUPANCY ANALYSIS
    # ---------------------------------------------------------

    valid_readings = [
        r for r in readings
        if r.occupancy_percentage is not None
    ]

    if not valid_readings:
        return {
            "agent": AGENT_NAME,
            "status": "Completed",
            "building_id": building_id,
            "message": "No valid occupancy readings available.",
            "summary": {},
            "zones": [],
            "floor_analysis": [],
            "equipment_analysis": [],
            "assessment": {
                "severity": "Unknown",
                "message": "No valid occupancy values were found."
            },
            "metadata": {
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "total_readings": len(readings),
                "valid_readings": 0
            }
        }

    latest = valid_readings[-1]

    average_occupancy = (
        sum(r.occupancy_percentage for r in valid_readings)
        / len(valid_readings)
    )

    occupied_readings = [
        r for r in valid_readings
        if r.occupancy_percentage > 10
    ]

    unoccupied_readings = [
        r for r in valid_readings
        if r.occupancy_percentage <= 10
    ]

    occupied_percentage = (
        len(occupied_readings) / len(valid_readings) * 100
    )

    unoccupied_percentage = (
        len(unoccupied_readings) / len(valid_readings) * 100
    )

    # ---------------------------------------------------------
    # ZONE ANALYSIS
    # ---------------------------------------------------------

    zone_groups = {}

    for reading in valid_readings:
        zone = reading.zone or "Unknown Zone"

        if zone not in zone_groups:
            zone_groups[zone] = []

        zone_groups[zone].append(reading)

    zones = []

    for zone, zone_readings in zone_groups.items():

        avg_occupancy = (
            sum(r.occupancy_percentage for r in zone_readings)
            / len(zone_readings)
        )

        occupied_count = sum(
            1
            for r in zone_readings
            if r.occupancy_percentage > 10
        )

        unoccupied_count = len(zone_readings) - occupied_count

        utilization_percentage = (
            occupied_count / len(zone_readings) * 100
        )

        if utilization_percentage < 20:
            utilization_status = "Underutilized"
        elif utilization_percentage < 50:
            utilization_status = "Low Utilization"
        elif utilization_percentage < 80:
            utilization_status = "Moderate Utilization"
        else:
            utilization_status = "High Utilization"

        zones.append({
            "zone": zone,
            "floor": zone_readings[-1].floor,
            "average_occupancy": round(avg_occupancy, 2),
            "utilization_percentage": round(
                utilization_percentage, 2
            ),
            "occupied_readings": occupied_count,
            "unoccupied_readings": unoccupied_count,
            "reading_count": len(zone_readings),
            "status": utilization_status
        })

    # ---------------------------------------------------------
    # FLOOR ANALYSIS
    # ---------------------------------------------------------

    floor_groups = {}

    for reading in valid_readings:
        floor = reading.floor or "Building"

        if floor not in floor_groups:
            floor_groups[floor] = []

        floor_groups[floor].append(reading)

    floor_analysis = []

    for floor, floor_readings in floor_groups.items():

        avg_occupancy = (
            sum(r.occupancy_percentage for r in floor_readings)
            / len(floor_readings)
        )

        occupied_count = sum(
            1
            for r in floor_readings
            if r.occupancy_percentage > 10
        )

        utilization_percentage = (
            occupied_count / len(floor_readings) * 100
        )

        floor_analysis.append({
            "floor": floor,
            "average_occupancy": round(avg_occupancy, 2),
            "utilization_percentage": round(
                utilization_percentage, 2
            ),
            "reading_count": len(floor_readings)
        })

    # ---------------------------------------------------------
    # EQUIPMENT ANALYSIS
    # ---------------------------------------------------------

    equipment = (
        Equipment.query
        .filter_by(building_id=building_id)
        .all()
    )

    equipment_analysis = []

    for item in equipment:

        equipment_type = (
            item.equipment_type or ""
        ).lower()

        equipment_status = (
            item.status or ""
        ).lower()

        running = equipment_status in [
            "running",
            "active",
            "on"
        ]

        related_readings = [
            r for r in valid_readings
            if (
                r.floor == item.floor
                or r.zone == item.zone
            )
        ]

        if not related_readings:
            continue

        low_occupancy_readings = [
            r
            for r in related_readings
            if r.occupancy_percentage <= 10
        ]

        waste_percentage = (
            len(low_occupancy_readings)
            / len(related_readings)
            * 100
        )

        potential_waste = (
            running
            and waste_percentage >= 20
            and equipment_type in [
                "hvac",
                "lighting",
                "air conditioning",
                "ac"
            ]
        )

        equipment_analysis.append({
            "equipment_id": item.id,
            "equipment_name": item.name,
            "equipment_type": item.equipment_type,
            "status": item.status,
            "floor": item.floor,
            "zone": item.zone,
            "power_consumption": item.power_consumption,
            "related_occupancy_readings": len(
                related_readings
            ),
            "low_occupancy_readings": len(
                low_occupancy_readings
            ),
            "low_occupancy_percentage": round(
                waste_percentage,
                2
            ),
            "potential_waste": potential_waste
        })

    # ---------------------------------------------------------
    # POTENTIAL WASTE
    # ---------------------------------------------------------

    potential_waste_equipment = [
        item
        for item in equipment_analysis
        if item["potential_waste"]
    ]

    # ---------------------------------------------------------
    # ASSESSMENT
    # ---------------------------------------------------------

    if len(potential_waste_equipment) > 0:
        severity = "Warning"

        message = (
            f"{len(potential_waste_equipment)} equipment item(s) "
            "may be operating during low-occupancy periods. "
            "HVAC and lighting schedules should be reviewed."
        )

    elif average_occupancy < 20:
        severity = "Elevated"

        message = (
            "Average building occupancy is low. "
            "Space utilization and equipment schedules "
            "should be reviewed."
        )

    elif average_occupancy < 40:
        severity = "Normal"

        message = (
            "Occupancy is moderate. Some zones may have "
            "opportunities for improved space utilization."
        )

    else:
        severity = "Normal"

        message = (
            "Occupancy levels appear healthy with no major "
            "space utilization concerns detected."
        )

    # ---------------------------------------------------------
    # FINAL RESULT
    # ---------------------------------------------------------

    return {
        "agent": AGENT_NAME,
        "status": "Completed",
        "building_id": building_id,

        "summary": {
            "latest_occupancy": round(
                latest.occupancy_percentage,
                2
            ),
            "average_occupancy": round(
                average_occupancy,
                2
            ),
            "occupied_percentage": round(
                occupied_percentage,
                2
            ),
            "unoccupied_percentage": round(
                unoccupied_percentage,
                2
            ),
            "occupied_readings": len(
                occupied_readings
            ),
            "unoccupied_readings": len(
                unoccupied_readings
            ),
            "total_readings": len(
                valid_readings
            )
        },

        "latest": {
            "occupancy_percentage": round(
                latest.occupancy_percentage,
                2
            ),
            "floor": latest.floor,
            "zone": latest.zone,
            "timestamp": (
                latest.timestamp.isoformat()
                if latest.timestamp
                else None
            ),
            "is_occupied": (
                latest.occupancy_percentage > 10
            )
        },

        "zones": zones,

        "floor_analysis": floor_analysis,

        "equipment_analysis": equipment_analysis,

        "potential_waste_equipment": (
            potential_waste_equipment
        ),

        "assessment": {
            "severity": severity,
            "message": message
        },

        "metadata": {
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "total_readings": len(readings),
            "valid_readings": len(valid_readings),
            "zones_analyzed": len(zones),
            "floors_analyzed": len(floor_analysis),
            "equipment_analyzed": len(
                equipment_analysis
            ),
            "potential_waste_count": len(
                potential_waste_equipment
            )
        }
    }