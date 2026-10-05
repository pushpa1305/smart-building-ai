from datetime import datetime

from models import (
    Building,
    EnergyReading,
    OccupancyReading,
    Equipment,
    SensorReading,
)


AGENT_NAME = "Building Data Monitoring Agent"


def run(building_id):
    """
    Collect and normalize the latest building data.

    This agent does not make recommendations.
    It only prepares reliable input data for downstream agents.
    """

    building = Building.query.get(building_id)

    if not building:
        raise ValueError(f"Building {building_id} not found")

    latest_energy = (
        EnergyReading.query
        .filter_by(building_id=building_id)
        .order_by(EnergyReading.timestamp.desc())
        .first()
    )

    latest_occupancy = (
        OccupancyReading.query
        .filter_by(building_id=building_id)
        .order_by(OccupancyReading.timestamp.desc())
        .first()
    )

    sensors = (
        SensorReading.query
        .filter_by(building_id=building_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(100)
        .all()
    )

    equipment = (
        Equipment.query
        .filter_by(building_id=building_id)
        .all()
    )

    result = {
        "agent": AGENT_NAME,

        "building": {
            "id": building.id,
            "name": building.name,
            "location": building.location,
            "status": building.status,
        },

        "energy": {
            "consumption": (
                latest_energy.consumption
                if latest_energy else None
            ),
            "baseline": (
                latest_energy.baseline
                if latest_energy else None
            ),
            "unit": (
                latest_energy.unit
                if latest_energy else "kWh"
            ),
            "timestamp": (
                latest_energy.timestamp.isoformat()
                if latest_energy else None
            ),
        },

        "occupancy": {
            "percentage": (
                latest_occupancy.occupancy_percentage
                if latest_occupancy else None
            ),
            "floor": (
                latest_occupancy.floor
                if latest_occupancy else None
            ),
            "zone": (
                latest_occupancy.zone
                if latest_occupancy else None
            ),
            "timestamp": (
                latest_occupancy.timestamp.isoformat()
                if latest_occupancy else None
            ),
        },

        "sensors": [
            {
                "zone": sensor.zone,
                "floor": sensor.floor,
                "temperature": sensor.temperature,
                "humidity": sensor.humidity,
                "occupancy": sensor.occupancy,
                "energy": sensor.energy,
                "hvac": sensor.hvac,
                "lighting": sensor.lighting,
                "status": sensor.status,
                "sensor_type": sensor.sensor_type,
                "sensor_id": sensor.sensor_id,
                "timestamp": (
                    sensor.timestamp.isoformat()
                    if sensor.timestamp else None
                ),
            }
            for sensor in sensors
        ],

        "equipment": [
            {
                "id": item.id,
                "name": item.name,
                "type": item.equipment_type,
                "status": item.status,
                "power_consumption": item.power_consumption,
                "rated_power": item.rated_power,
                "floor": item.floor,
                "zone": item.zone,
            }
            for item in equipment
        ],

        "metadata": {
            "sensor_count": len(sensors),
            "equipment_count": len(equipment),
            "collected_at": datetime.utcnow().isoformat(),
        },
    }

    return result