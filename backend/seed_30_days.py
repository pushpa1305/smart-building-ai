from datetime import datetime, timedelta
import random

from app import app
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


# ============================================================
# SMARTBUILD AI
# 10 FLOOR / 30 DAY DATABASE SEEDER
# ============================================================


def seed_database():

    print("\n" + "=" * 75)
    print(" SMARTBUILD AI - 10 FLOOR COMMERCIAL BUILDING SEEDER")
    print("=" * 75)

    with app.app_context():

        # ====================================================
        # 1. BUILDING
        # ====================================================

        building = Building.query.first()

        if not building:

            building = Building(
                name="Office Building A",
                location="Vijayawada, Andhra Pradesh"
            )

            db.session.add(building)
            db.session.commit()

            print("\nCreated building: Office Building A")

        else:

            building.name = "Office Building A"
            building.location = "Vijayawada, Andhra Pradesh"

            db.session.commit()

            print(
                f"\nUsing existing building: "
                f"{building.name} "
                f"(ID: {building.id})"
            )

        building_id = building.id

        # ====================================================
        # 2. CLEAR OLD DATA
        # ====================================================

        print("\nClearing old data...")

        EnergyReading.query.filter_by(
            building_id=building_id
        ).delete(
            synchronize_session=False
        )

        OccupancyReading.query.filter_by(
            building_id=building_id
        ).delete(
            synchronize_session=False
        )

        FloorEnergyReading.query.filter_by(
            building_id=building_id
        ).delete(
            synchronize_session=False
        )

        SensorReading.query.filter_by(
            building_id=building_id
        ).delete(
            synchronize_session=False
        )

        AgentActivity.query.filter_by(
            building_id=building_id
        ).delete(
            synchronize_session=False
        )

        Anomaly.query.filter_by(
            building_id=building_id
        ).delete(
            synchronize_session=False
        )

        Recommendation.query.filter_by(
            building_id=building_id
        ).delete(
            synchronize_session=False
        )

        Equipment.query.filter_by(
            building_id=building_id
        ).delete(
            synchronize_session=False
        )

        db.session.commit()

        print("Old data cleared successfully.")

        # ====================================================
        # 3. CONFIGURATION
        # ====================================================

        random.seed(42)

        TOTAL_FLOORS = 10

        WORK_START = 8
        WORK_END = 19

        BASELINE_DAILY = 2500
        CURRENT_DAILY = 3150

        print("\nBuilding Configuration")
        print("-" * 50)
        print("Building       : Office Building A")
        print("Floors         : 10")
        print("Working Hours  : 08:00 - 19:00")
        print("Baseline       : 2500 kWh/day")
        print("Current Target : 3150 kWh/day")

        # ====================================================
        # 4. TEN FLOORS
        # ====================================================

        floors = [
            {
                "number": 1,
                "name": "Ground Floor",
                "base": 220,
                "zone1": "Reception",
                "zone2": "Lobby"
            },
            {
                "number": 2,
                "name": "First Floor",
                "base": 240,
                "zone1": "Conference Room",
                "zone2": "Meeting Room A"
            },
            {
                "number": 3,
                "name": "Second Floor",
                "base": 250,
                "zone1": "Server Room",
                "zone2": "IT Operations"
            },
            {
                "number": 4,
                "name": "Third Floor",
                "base": 255,
                "zone1": "Development Area",
                "zone2": "Testing Lab"
            },
            {
                "number": 5,
                "name": "Fourth Floor",
                "base": 260,
                "zone1": "Finance Department",
                "zone2": "HR Department"
            },
            {
                "number": 6,
                "name": "Fifth Floor",
                "base": 270,
                "zone1": "Floor 6 Workspace",
                "zone2": "Floor 6 Meeting Area"
            },
            {
                "number": 7,
                "name": "Sixth Floor",
                "base": 285,
                "zone1": "Open Workspace A",
                "zone2": "Open Workspace B"
            },
            {
                "number": 8,
                "name": "Seventh Floor",
                "base": 275,
                "zone1": "Training Room",
                "zone2": "Workshop"
            },
            {
                "number": 9,
                "name": "Eighth Floor",
                "base": 265,
                "zone1": "Executive Office",
                "zone2": "Board Room"
            },
            {
                "number": 10,
                "name": "Ninth Floor",
                "base": 255,
                "zone1": "Cafeteria",
                "zone2": "Break Area"
            },
        ]

        print("\nConfigured Floors:")

        for floor in floors:
            print(
                f"Floor {floor['number']:02d} : "
                f"{floor['name']}"
            )

        # ====================================================
        # 5. DATE RANGE
        # ====================================================

        end_time = datetime.now().replace(
            minute=0,
            second=0,
            microsecond=0
        )

        start_time = end_time - timedelta(days=30)

        current_time = start_time

        # ====================================================
        # 6. DATA LISTS
        # ====================================================

        energy_records = []
        occupancy_records = []
        floor_records = []

        hours_created = 0

        # ====================================================
        # 7. GENERATE 30 DAYS HOURLY DATA
        # ====================================================

        print("\nGenerating 30 days of hourly data...")

        while current_time <= end_time:

            hour = current_time.hour
            weekday = current_time.weekday()

            # ------------------------------------------------
            # TIME FACTOR
            # ------------------------------------------------

            if 0 <= hour < 6:
                time_factor = 0.55

            elif 6 <= hour < 8:
                time_factor = 0.72

            elif 8 <= hour < 10:
                time_factor = 0.92

            elif 10 <= hour < 13:
                time_factor = 1.08

            elif 13 <= hour < 17:
                time_factor = 1.15

            elif 17 <= hour < 19:
                time_factor = 1.05

            elif 19 <= hour < 22:
                time_factor = 0.75

            else:
                time_factor = 0.55

            # ------------------------------------------------
            # WEEKEND
            # ------------------------------------------------

            if weekday >= 5:
                weekend_factor = 0.62
            else:
                weekend_factor = 1.0

            # ------------------------------------------------
            # 30-DAY TREND
            # ------------------------------------------------

            days_from_start = (
                current_time - start_time
            ).total_seconds() / 86400

            trend_factor = (
                0.92 +
                (days_from_start / 30) * 0.14
            )

            # ------------------------------------------------
            # OCCUPANCY
            # ------------------------------------------------

            if (
                WORK_START <= hour < WORK_END
                and weekday < 5
            ):

                occupancy_percentage = (
                    62 +
                    random.uniform(-7, 7)
                )

            else:

                occupancy_percentage = (
                    8 +
                    random.uniform(-3, 5)
                )

            occupancy_percentage = max(
                0,
                min(
                    95,
                    occupancy_percentage
                )
            )

            # ------------------------------------------------
            # TOTAL ENERGY
            # ------------------------------------------------

            total_consumption = 0
            total_baseline = 0

            # =================================================
            # EACH FLOOR
            # =================================================

            for floor in floors:

                floor_variation = random.uniform(
                    0.94,
                    1.06
                )

                occupancy_factor = (
                    0.78 +
                    occupancy_percentage / 500
                )

                # ---------------------------------------------
                # ACTUAL FLOOR ENERGY
                # ---------------------------------------------

                floor_consumption = (
                    floor["base"]
                    * time_factor
                    * weekend_factor
                    * trend_factor
                    * floor_variation
                    * occupancy_factor
                )

                floor_consumption += random.uniform(
                    -6,
                    6
                )

                floor_consumption = max(
                    35,
                    floor_consumption
                )

                # ---------------------------------------------
                # FLOOR 6 ANOMALY
                # ---------------------------------------------

                if floor["number"] == 6:

                    if hour >= 19 or hour < 6:

                        # HVAC + lighting remain ON
                        floor_consumption *= 1.55

                # ---------------------------------------------
                # FLOOR BASELINE
                # ---------------------------------------------

                floor_baseline = (
                    floor["base"]
                    * time_factor
                    * weekend_factor
                    * 0.90
                )

                floor_baseline = max(
                    30,
                    floor_baseline
                )

                # ---------------------------------------------
                # SAVE FLOOR RECORD
                # ---------------------------------------------

                floor_records.append(
                    FloorEnergyReading(
                        building_id=building_id,

                        floor=floor["name"],

                        energy=round(
                            floor_consumption,
                            2
                        ),

                        timestamp=current_time
                    )
                )

                total_consumption += floor_consumption
                total_baseline += floor_baseline

            # =================================================
            # SCALE BUILDING ENERGY
            # =================================================

            scaling_factor = (
                CURRENT_DAILY / 3000
            )

            total_consumption *= scaling_factor

            total_baseline *= (
                BASELINE_DAILY / 3000
            )

            # =================================================
            # BUILDING ENERGY RECORD
            # =================================================

            energy_records.append(
                EnergyReading(

                    building_id=building_id,

                    consumption=round(
                        total_consumption,
                        2
                    ),

                    baseline=round(
                        total_baseline,
                        2
                    ),

                    floor="Building",

                    timestamp=current_time
                )
            )

            # =================================================
            # OCCUPANCY RECORD
            # =================================================

            occupancy_records.append(
                OccupancyReading(

                    building_id=building_id,

                    occupancy_percentage=round(
                        occupancy_percentage,
                        2
                    ),

                    timestamp=current_time
                )
            )

            hours_created += 1

            current_time += timedelta(hours=1)

        # ====================================================
        # 8. SAVE HISTORICAL DATA
        # ====================================================

        print(
            f"\nGenerated {hours_created} hourly records."
        )

        print(
            f"Generated {len(floor_records)} floor records."
        )

        # Expected:
        # 30 days × 24 hours × 10 floors
        # approximately 7,200 floor records

        db.session.bulk_save_objects(
            energy_records
        )

        db.session.bulk_save_objects(
            occupancy_records
        )

        db.session.bulk_save_objects(
            floor_records
        )

        db.session.commit()

        print("Historical data saved successfully.")

        # ====================================================
        # 9. EQUIPMENT
        # ====================================================

        print("\nCreating equipment...")

        equipment_data = []

        # Central HVAC

        equipment_data.append(
            Equipment(
                building_id=building_id,
                name="Central HVAC System",
                equipment_type="HVAC",
                status="Running",
                power_consumption=420.0,
                location="Central Plant"
            )
        )

        # 10 FLOOR HVAC SYSTEMS

        hvac_power = [
            85,
            88,
            92,
            95,
            98,
            125,
            102,
            100,
            96,
            94
        ]

        for index, floor in enumerate(floors):

            status = (
                "Warning"
                if floor["number"] == 6
                else "Running"
            )

            equipment_data.append(
                Equipment(
                    building_id=building_id,

                    name=f"Floor {floor['number']} HVAC",

                    equipment_type="HVAC",

                    status=status,

                    power_consumption=hvac_power[index],

                    location=floor["name"]
                )
            )

        # Lighting

        equipment_data.append(
            Equipment(
                building_id=building_id,
                name="Smart Lighting System",
                equipment_type="Lighting",
                status="Running",
                power_consumption=180.0,
                location="All Floors"
            )
        )

        # Elevator

        equipment_data.append(
            Equipment(
                building_id=building_id,
                name="Elevator System",
                equipment_type="Elevator",
                status="Running",
                power_consumption=95.0,
                location="Main Lobby"
            )
        )

        # Server cooling

        equipment_data.append(
            Equipment(
                building_id=building_id,
                name="Server Room Cooling",
                equipment_type="HVAC",
                status="Running",
                power_consumption=150.0,
                location="Second Floor"
            )
        )

        # Generator

        equipment_data.append(
            Equipment(
                building_id=building_id,
                name="Backup Generator",
                equipment_type="Generator",
                status="Standby",
                power_consumption=0.0,
                location="Utility Area"
            )
        )

        db.session.bulk_save_objects(
            equipment_data
        )

        db.session.commit()

        print(
            f"Created {len(equipment_data)} equipment records."
        )

        # ====================================================
        # 10. ANOMALIES
        # ====================================================

        print("\nCreating anomalies...")

        anomalies = [

            Anomaly(
                building_id=building_id,

                title="26% Daily Energy Increase",

                description=(
                    "Current daily consumption is approximately "
                    "3150 kWh compared with the normal baseline "
                    "of 2500 kWh."
                ),

                severity="High",

                status="Active"
            ),

            Anomaly(
                building_id=building_id,

                title="Floor 6 After-Hours Operation",

                description=(
                    "Fifth Floor, corresponding to Floor 6, "
                    "remains highly energized after 7 PM "
                    "while occupancy is zero."
                ),

                severity="High",

                status="Active"
            ),

            Anomaly(
                building_id=building_id,

                title="HVAC Energy Spike",

                description=(
                    "HVAC consumption is above the expected "
                    "baseline during multiple periods."
                ),

                severity="Medium",

                status="Active"
            ),

            Anomaly(
                building_id=building_id,

                title="Unusual Night Consumption",

                description=(
                    "Building energy remains elevated during "
                    "normally low occupancy hours."
                ),

                severity="Medium",

                status="Active"
            ),
        ]

        db.session.bulk_save_objects(
            anomalies
        )

        db.session.commit()

        print(
            f"Created {len(anomalies)} anomalies."
        )

        # ====================================================
        # 11. RECOMMENDATIONS
        # ====================================================

        recommendations = [

            Recommendation(
                building_id=building_id,

                title="Review Floor 6 HVAC Schedule",

                description=(
                    "Review the Floor 6 HVAC schedule and "
                    "enable after-hours energy saving when "
                    "the floor is unoccupied."
                ),

                estimated_savings=185.50,

                status="Awaiting Facility Manager Approval"
            ),

            Recommendation(
                building_id=building_id,

                title="Disable Unoccupied Floor 6 Lighting",

                description=(
                    "Floor 6 lighting remains ON after 7 PM "
                    "when occupancy is zero. Enable "
                    "occupancy-based lighting control."
                ),

                estimated_savings=96.00,

                status="Awaiting Facility Manager Approval"
            ),

            Recommendation(
                building_id=building_id,

                title="Investigate 26% Energy Increase",

                description=(
                    "Investigate the difference between "
                    "2500 kWh baseline and 3150 kWh current "
                    "daily consumption."
                ),

                estimated_savings=240.00,

                status="Pending"
            ),

            Recommendation(
                building_id=building_id,

                title="Optimize HVAC Across Ten Floors",

                description=(
                    "Compare occupancy and HVAC runtime "
                    "across all ten floors and identify "
                    "inefficient schedules."
                ),

                estimated_savings=320.00,

                status="Pending"
            ),
        ]

        db.session.bulk_save_objects(
            recommendations
        )

        db.session.commit()

        print(
            f"Created {len(recommendations)} recommendations."
        )

        # ====================================================
        # 12. AI AGENTS
        # ====================================================

        agents = [

            AgentActivity(
                building_id=building_id,

                name="Building Data Monitoring Agent",

                description=(
                    "Collecting and normalizing smart meter, "
                    "HVAC, lighting, occupancy and equipment data."
                ),

                status="Running",

                updated_at=datetime.now()
            ),

            AgentActivity(
                building_id=building_id,

                name="Energy Consumption Analysis Agent",

                description=(
                    "Comparing current consumption with "
                    "historical baselines."
                ),

                status="Running",

                updated_at=datetime.now()
            ),

            AgentActivity(
                building_id=building_id,

                name="Occupancy & Space Utilization Agent",

                description=(
                    "Analyzing occupied and unoccupied zones."
                ),

                status="Running",

                updated_at=datetime.now()
            ),

            AgentActivity(
                building_id=building_id,

                name="HVAC & Equipment Optimization Agent",

                description=(
                    "Analyzing HVAC schedules and equipment runtime."
                ),

                status="Running",

                updated_at=datetime.now()
            ),

            AgentActivity(
                building_id=building_id,

                name="Anomaly Detection & Fault Analysis Agent",

                description=(
                    "Detecting abnormal energy and equipment behavior."
                ),

                status="Running",

                updated_at=datetime.now()
            ),

            AgentActivity(
                building_id=building_id,

                name="Facility Recommendation & Action Agent",

                description=(
                    "Prioritizing issues and preparing "
                    "facility recommendations."
                ),

                status="Completed",

                updated_at=datetime.now()
            ),
        ]

        db.session.bulk_save_objects(
            agents
        )

        db.session.commit()

        print(
            f"Created {len(agents)} AI agents."
        )

        # ====================================================
        # 13. SENSOR DATA
        # 2 ZONES × 10 FLOORS = 20 ZONES
        # ====================================================

        print("\nCreating sensor data...")

        sensor_records = []

        # Sensor values for each floor

        sensor_values = [
            (23.5, 48, 62, 42, "Normal"),
            (24.0, 50, 58, 38, "Normal"),

            (24.2, 50, 78, 55, "High"),
            (23.9, 51, 68, 48, "Normal"),

            (21.5, 42, 12, 125, "Warning"),
            (22.4, 44, 36, 82, "Normal"),

            (24.4, 52, 65, 64, "Normal"),
            (24.8, 54, 48, 59, "Normal"),

            (23.8, 49, 55, 51, "Normal"),
            (24.1, 50, 51, 47, "Normal"),

            # Floor 6 anomaly
            (27.8, 61, 0, 118, "Low"),
            (27.4, 60, 0, 92, "Low"),

            (24.5, 53, 71, 72, "High"),
            (24.2, 52, 64, 66, "Normal"),

            (24.7, 55, 43, 57, "Normal"),
            (25.0, 56, 38, 52, "Normal"),

            (23.8, 49, 34, 46, "Normal"),
            (24.0, 50, 28, 43, "Normal"),

            (25.2, 58, 38, 44, "Normal"),
            (25.0, 57, 31, 39, "Normal"),
        ]

        value_index = 0

        for floor in floors:

            for zone_name in [
                floor["zone1"],
                floor["zone2"]
            ]:

                temperature = sensor_values[
                    value_index
                ][0]

                humidity = sensor_values[
                    value_index
                ][1]

                occupancy = sensor_values[
                    value_index
                ][2]

                energy = sensor_values[
                    value_index
                ][3]

                status = sensor_values[
                    value_index
                ][4]

                # Floor 6 remains active after hours

                is_floor_6 = (
                    floor["number"] == 6
                )

                sensor_records.append(
                    SensorReading(

                        building_id=building_id,

                        zone=zone_name,

                        floor=floor["name"],

                        temperature=temperature,

                        humidity=humidity,

                        occupancy=occupancy,

                        energy=energy,

                        hvac=True,

                        lighting=True,

                        status=status,

                        timestamp=datetime.now()
                    )
                )

                value_index += 1

        db.session.bulk_save_objects(
            sensor_records
        )

        db.session.commit()

        print(
            f"Created {len(sensor_records)} sensor zones."
        )

        # ====================================================
        # 14. FINAL COUNTS
        # ====================================================

        energy_count = EnergyReading.query.filter_by(
            building_id=building_id
        ).count()

        occupancy_count = OccupancyReading.query.filter_by(
            building_id=building_id
        ).count()

        floor_count = FloorEnergyReading.query.filter_by(
            building_id=building_id
        ).count()

        equipment_count = Equipment.query.filter_by(
            building_id=building_id
        ).count()

        anomaly_count = Anomaly.query.filter_by(
            building_id=building_id
        ).count()

        recommendation_count = Recommendation.query.filter_by(
            building_id=building_id
        ).count()

        agent_count = AgentActivity.query.filter_by(
            building_id=building_id
        ).count()

        sensor_count = SensorReading.query.filter_by(
            building_id=building_id
        ).count()

        # ====================================================
        # 15. FINAL OUTPUT
        # ====================================================

        print("\n" + "=" * 75)
        print(" DATABASE SEEDING COMPLETED")
        print("=" * 75)

        print(f"Building             : Office Building A")
        print(f"Building ID          : {building_id}")
        print(f"Floors               : {TOTAL_FLOORS}")
        print(f"Energy readings      : {energy_count}")
        print(f"Occupancy readings   : {occupancy_count}")
        print(f"Floor readings       : {floor_count}")
        print(f"Equipment            : {equipment_count}")
        print(f"Anomalies            : {anomaly_count}")
        print(f"Recommendations      : {recommendation_count}")
        print(f"AI Agents            : {agent_count}")
        print(f"Sensor Zones         : {sensor_count}")

        print("\nExpected floor readings:")
        print("30 days × 24 hours × 10 floors")
        print("≈ 7,200 floor energy records")

        print("\nScenario:")
        print("Baseline consumption : 2500 kWh/day")
        print("Current consumption  : 3150 kWh/day")
        print("Increase             : 650 kWh/day")
        print("Increase percentage  : 26%")
        print("Floor 6 occupancy    : 0% after 7 PM")
        print("Floor 6 HVAC         : ON after 7 PM")
        print("Floor 6 lighting     : ON after 7 PM")

        print("\nHistorical period:")
        print(f"FROM                 : {start_time}")
        print(f"TO                   : {end_time}")

        print("\nAnalytics periods:")
        print("✓ 24 Hours")
        print("✓ 7 Days")
        print("✓ 30 Days")

        print("\nAI Agent Pipeline:")
        print("1. Building Data Monitoring Agent")
        print("2. Energy Consumption Analysis Agent")
        print("3. Occupancy & Space Utilization Agent")
        print("4. HVAC & Equipment Optimization Agent")
        print("5. Anomaly Detection & Fault Analysis Agent")
        print("6. Facility Recommendation & Action Agent")

        print("\n" + "=" * 75)
        print(" SmartBuild AI - 10 FLOOR DATABASE READY!")
        print("=" * 75 + "\n")


# ============================================================
# RUN SEEDER
# ============================================================

if __name__ == "__main__":
    seed_database()