from datetime import datetime, timedelta

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
    Notification,
    EnergyInsight,
    SystemEvent,
)


# ============================================================
# SEED DATABASE
# ============================================================

def seed_database():

    with app.app_context():

        print()
        print("=" * 60)
        print("STARTING SMARTBUILD AI DATABASE SEED")
        print("=" * 60)

        # ====================================================
        # DELETE OLD DATA
        # ====================================================

        print("\nClearing existing data...")

        SystemEvent.query.delete()
        EnergyInsight.query.delete()
        Notification.query.delete()
        SensorReading.query.delete()
        FloorEnergyReading.query.delete()
        AgentActivity.query.delete()
        Recommendation.query.delete()
        Anomaly.query.delete()
        Equipment.query.delete()
        OccupancyReading.query.delete()
        EnergyReading.query.delete()
        Building.query.delete()

        db.session.commit()

        print("Old data cleared successfully.")

        # ====================================================
        # CURRENT TIME
        # ====================================================

        now = datetime.utcnow()

        # ====================================================
        # BUILDING 1 - 10 FLOORS
        # ====================================================

        building1 = Building(
            name="SmartBuild Headquarters",
            location="Vijayawada, Andhra Pradesh",
            description=(
                "AI-enabled smart commercial building "
                "for energy optimization and facility management."
            ),
            total_floors=10,
            total_area=150000,
            status="Active",
            created_at=now - timedelta(days=365),
            updated_at=now,
        )

        # ====================================================
        # BUILDING 2
        # ====================================================

        building2 = Building(
            name="Innovation Center",
            location="Hyderabad, Telangana",
            description=(
                "Modern technology and innovation center "
                "with intelligent energy monitoring."
            ),
            total_floors=6,
            total_area=90000,
            status="Active",
            created_at=now - timedelta(days=250),
            updated_at=now,
        )

        db.session.add_all([
            building1,
            building2
        ])

        db.session.commit()

        print("\nBuildings created:")
        print(f"  1. {building1.name} - 10 floors")
        print(f"  2. {building2.name} - 6 floors")

        # ====================================================
        # ENERGY READINGS - 24 HOURS
        # ====================================================

        energy_values = [
            (2450, 2500),
            (2380, 2450),
            (2320, 2400),
            (2280, 2350),
            (2250, 2300),
            (2300, 2350),
            (2420, 2450),
            (2580, 2500),
            (2710, 2550),
            (2840, 2600),
            (2920, 2650),
            (3010, 2700),
            (3150, 2800),
            (3080, 2750),
            (3260, 2850),
            (3190, 2800),
            (3340, 2900),
            (3210, 2850),
            (3150, 2800),
            (3080, 2750),
            (2990, 2700),
            (2880, 2650),
            (2760, 2550),
            (2640, 2500),
        ]

        for index, (consumption, baseline) in enumerate(
            energy_values
        ):

            reading = EnergyReading(
                building_id=building1.id,
                consumption=consumption,
                baseline=baseline,
                floor="All Floors",
                source="Smart Meter",
                unit="kWh",
                timestamp=now - timedelta(
                    hours=len(energy_values) - index
                ),
            )

            db.session.add(reading)

        db.session.commit()

        print(
            f"\nEnergy readings created: "
            f"{EnergyReading.query.count()}"
        )

        # ====================================================
        # FLOOR ENERGY - 10 FLOORS
        # ====================================================

        floor_data = [
            ("Floor 1", 620, 560),
            ("Floor 2", 710, 620),
            ("Floor 3", 540, 500),
            ("Floor 4", 680, 590),
            ("Floor 5", 600, 530),
            ("Floor 6", 750, 640),
            ("Floor 7", 690, 610),
            ("Floor 8", 580, 520),
            ("Floor 9", 720, 630),
            ("Floor 10", 640, 570),
        ]

        for floor, energy, baseline in floor_data:

            floor_reading = FloorEnergyReading(
                building_id=building1.id,
                floor=floor,
                energy=energy,
                baseline=baseline,
                timestamp=now,
            )

            db.session.add(floor_reading)

        db.session.commit()

        print(
            f"Floor energy readings created: "
            f"{FloorEnergyReading.query.count()}"
        )

        # ====================================================
        # OCCUPANCY - 10 FLOORS
        # ====================================================

        occupancy_data = [
            ("Floor 1", "Reception", 72),
            ("Floor 2", "Development Zone", 84),
            ("Floor 3", "Testing Zone", 63),
            ("Floor 4", "Meeting Zone", 51),
            ("Floor 5", "Operations Zone", 76),
            ("Floor 6", "Development Zone", 88),
            ("Floor 7", "Research Zone", 69),
            ("Floor 8", "Training Zone", 47),
            ("Floor 9", "Management Zone", 58),
            ("Floor 10", "Conference Zone", 41),
        ]

        for floor, zone, percentage in occupancy_data:

            occupancy = OccupancyReading(
                building_id=building1.id,
                occupancy_percentage=percentage,
                floor=floor,
                zone=zone,
                timestamp=now,
            )

            db.session.add(occupancy)

        db.session.commit()

        print(
            f"Occupancy readings created: "
            f"{OccupancyReading.query.count()}"
        )

        # ====================================================
        # EQUIPMENT - 10 FLOORS
        # ====================================================

        equipment_data = [
            (
                "HVAC-F1",
                "HVAC",
                "Running",
                620,
                800,
                "Floor 1 HVAC Room",
                "Floor 1",
                "Reception",
            ),
            (
                "HVAC-F2",
                "HVAC",
                "Running",
                710,
                850,
                "Floor 2 HVAC Room",
                "Floor 2",
                "Development Zone",
            ),
            (
                "HVAC-F3",
                "HVAC",
                "Running",
                540,
                750,
                "Floor 3 HVAC Room",
                "Floor 3",
                "Testing Zone",
            ),
            (
                "HVAC-F4",
                "HVAC",
                "Running",
                680,
                800,
                "Floor 4 HVAC Room",
                "Floor 4",
                "Meeting Zone",
            ),
            (
                "HVAC-F5",
                "HVAC",
                "Running",
                600,
                780,
                "Floor 5 HVAC Room",
                "Floor 5",
                "Operations Zone",
            ),
            (
                "HVAC-F6",
                "HVAC",
                "Running",
                750,
                900,
                "Floor 6 HVAC Room",
                "Floor 6",
                "Development Zone",
            ),
            (
                "HVAC-F7",
                "HVAC",
                "Running",
                690,
                850,
                "Floor 7 HVAC Room",
                "Floor 7",
                "Research Zone",
            ),
            (
                "HVAC-F8",
                "HVAC",
                "Running",
                580,
                760,
                "Floor 8 HVAC Room",
                "Floor 8",
                "Training Zone",
            ),
            (
                "HVAC-F9",
                "HVAC",
                "Running",
                720,
                850,
                "Floor 9 HVAC Room",
                "Floor 9",
                "Management Zone",
            ),
            (
                "HVAC-F10",
                "HVAC",
                "Running",
                640,
                800,
                "Floor 10 HVAC Room",
                "Floor 10",
                "Conference Zone",
            ),

            (
                "Lighting-F1",
                "Lighting",
                "On",
                120,
                180,
                "Floor 1",
                "Floor 1",
                "Reception",
            ),
            (
                "Lighting-F2",
                "Lighting",
                "On",
                160,
                220,
                "Floor 2",
                "Floor 2",
                "Development Zone",
            ),
            (
                "Lighting-F3",
                "Lighting",
                "On",
                130,
                200,
                "Floor 3",
                "Floor 3",
                "Testing Zone",
            ),
            (
                "Lighting-F4",
                "Lighting",
                "On",
                145,
                210,
                "Floor 4",
                "Floor 4",
                "Meeting Zone",
            ),
            (
                "Lighting-F5",
                "Lighting",
                "On",
                155,
                220,
                "Floor 5",
                "Floor 5",
                "Operations Zone",
            ),
            (
                "Lighting-F6",
                "Lighting",
                "On",
                175,
                240,
                "Floor 6",
                "Floor 6",
                "Development Zone",
            ),
            (
                "Lighting-F7",
                "Lighting",
                "On",
                150,
                220,
                "Floor 7",
                "Floor 7",
                "Research Zone",
            ),
            (
                "Lighting-F8",
                "Lighting",
                "On",
                110,
                180,
                "Floor 8",
                "Floor 8",
                "Training Zone",
            ),
            (
                "Lighting-F9",
                "Lighting",
                "On",
                135,
                200,
                "Floor 9",
                "Floor 9",
                "Management Zone",
            ),
            (
                "Lighting-F10",
                "Lighting",
                "On",
                140,
                210,
                "Floor 10",
                "Floor 10",
                "Conference Zone",
            ),
        ]

        for data in equipment_data:

            equipment = Equipment(
                building_id=building1.id,
                name=data[0],
                equipment_type=data[1],
                status=data[2],
                power_consumption=data[3],
                rated_power=data[4],
                location=data[5],
                floor=data[6],
                zone=data[7],
                last_maintenance=now - timedelta(days=30),
                next_maintenance=now + timedelta(days=60),
                created_at=now - timedelta(days=100),
                updated_at=now,
            )

            db.session.add(equipment)

        db.session.commit()

        print(
            f"Equipment created: "
            f"{Equipment.query.count()}"
        )

        # ====================================================
        # ANOMALIES
        # ====================================================

        anomalies = [

            Anomaly(
                building_id=building1.id,
                title="HVAC Overconsumption Detected",
                description=(
                    "HVAC energy consumption is significantly "
                    "higher than the historical baseline."
                ),
                severity="High",
                status="Active",
                category="HVAC",
                source="Energy Agent",
                detected_value=820,
                expected_value=650,
                floor="Floor 1",
                zone="Reception",
                created_at=now - timedelta(minutes=25),
            ),

            Anomaly(
                building_id=building1.id,
                title="Lighting Active During Low Occupancy",
                description=(
                    "Lighting is operating while occupancy "
                    "is significantly below normal levels."
                ),
                severity="Medium",
                status="Active",
                category="Lighting",
                source="Occupancy Agent",
                detected_value=175,
                expected_value=100,
                floor="Floor 3",
                zone="Testing Zone",
                created_at=now - timedelta(minutes=45),
            ),

            Anomaly(
                building_id=building1.id,
                title="Energy Spike Detected",
                description=(
                    "Unexpected energy increase detected "
                    "during the current monitoring period."
                ),
                severity="High",
                status="Active",
                category="Energy",
                source="Anomaly Agent",
                detected_value=3340,
                expected_value=2900,
                floor="Floor 6",
                zone="Development Zone",
                created_at=now - timedelta(hours=1),
            ),

            Anomaly(
                building_id=building1.id,
                title="Temperature Above Target",
                description=(
                    "Temperature in the development zone "
                    "is above the configured comfort range."
                ),
                severity="Low",
                status="Active",
                category="Temperature",
                source="Sensor Agent",
                detected_value=27.8,
                expected_value=24,
                floor="Floor 2",
                zone="Development Zone",
                created_at=now - timedelta(hours=2),
            ),

            Anomaly(
                building_id=building1.id,
                title="Unoccupied Floor Equipment",
                description=(
                    "HVAC equipment is operating in an area "
                    "with very low occupancy."
                ),
                severity="Medium",
                status="Active",
                category="Occupancy",
                source="Occupancy Agent",
                detected_value=5,
                expected_value=30,
                floor="Floor 8",
                zone="Training Zone",
                created_at=now - timedelta(hours=3),
            ),

            Anomaly(
                building_id=building1.id,
                title="High Energy Usage on Floor 9",
                description=(
                    "Energy consumption on Floor 9 is above "
                    "its historical baseline."
                ),
                severity="Medium",
                status="Active",
                category="Energy",
                source="Energy Agent",
                detected_value=720,
                expected_value=630,
                floor="Floor 9",
                zone="Management Zone",
                created_at=now - timedelta(hours=4),
            ),
        ]

        db.session.add_all(anomalies)

        # ====================================================
        # RECOMMENDATIONS
        # ====================================================

        recommendations = [

            Recommendation(
                building_id=building1.id,
                title="Optimize HVAC Schedule",
                description=(
                    "Reduce HVAC operation during low occupancy "
                    "periods and align operation with occupancy."
                ),
                estimated_savings=180,
                savings_unit="kWh/day",
                priority="High",
                status="Pending",
                category="HVAC",
                generated_by="Energy Optimization Agent",
                floor="Floor 1",
                created_at=now - timedelta(minutes=20),
            ),

            Recommendation(
                building_id=building1.id,
                title="Enable Occupancy-Based Lighting",
                description=(
                    "Automatically switch off lighting in zones "
                    "with no detected occupants."
                ),
                estimated_savings=95,
                savings_unit="kWh/day",
                priority="High",
                status="Pending",
                category="Lighting",
                generated_by="Occupancy Agent",
                floor="Floor 3",
                created_at=now - timedelta(minutes=40),
            ),

            Recommendation(
                building_id=building1.id,
                title="Adjust Temperature Setpoint",
                description=(
                    "Increase cooling efficiency by adjusting "
                    "the HVAC temperature setpoint."
                ),
                estimated_savings=140,
                savings_unit="kWh/day",
                priority="Medium",
                status="Pending",
                category="HVAC",
                generated_by="Energy Agent",
                floor="Floor 2",
                created_at=now - timedelta(hours=1),
            ),

            Recommendation(
                building_id=building1.id,
                title="Reduce After-Hours Energy Usage",
                description=(
                    "Schedule non-critical equipment to turn off "
                    "outside working hours."
                ),
                estimated_savings=235,
                savings_unit="kWh/day",
                priority="Medium",
                status="Pending",
                category="Energy",
                generated_by="Intelligence Agent",
                floor="All Floors",
                created_at=now - timedelta(hours=2),
            ),

            Recommendation(
                building_id=building1.id,
                title="Optimize Floor 8 HVAC",
                description=(
                    "Reduce HVAC operation because Floor 8 "
                    "currently has low occupancy."
                ),
                estimated_savings=85,
                savings_unit="kWh/day",
                priority="High",
                status="Pending",
                category="Occupancy",
                generated_by="Occupancy Agent",
                floor="Floor 8",
                created_at=now - timedelta(hours=3),
            ),

            Recommendation(
                building_id=building1.id,
                title="Review Floor 9 Energy Usage",
                description=(
                    "Investigate higher-than-baseline energy "
                    "consumption on Floor 9."
                ),
                estimated_savings=110,
                savings_unit="kWh/day",
                priority="Medium",
                status="Pending",
                category="Energy",
                generated_by="Anomaly Agent",
                floor="Floor 9",
                created_at=now - timedelta(hours=4),
            ),
        ]

        db.session.add_all(recommendations)

        # ====================================================
        # AI AGENT ACTIVITY
        # ====================================================

        agent_activities = [

            AgentActivity(
                building_id=building1.id,
                name="Energy Monitoring Agent",
                description=(
                    "Monitoring real-time energy consumption "
                    "across all ten floors."
                ),
                agent_type="Energy Agent",
                status="Running",
                action="Analyzing current energy usage",
                result=(
                    "Energy usage is above the historical "
                    "baseline."
                ),
                created_at=now - timedelta(minutes=5),
                updated_at=now,
            ),

            AgentActivity(
                building_id=building1.id,
                name="Occupancy Agent",
                description=(
                    "Analyzing building occupancy patterns "
                    "across all floors."
                ),
                agent_type="Occupancy Agent",
                status="Running",
                action="Comparing occupancy with equipment usage",
                result=(
                    "Multiple low-occupancy zones identified."
                ),
                created_at=now - timedelta(minutes=10),
                updated_at=now,
            ),

            AgentActivity(
                building_id=building1.id,
                name="Anomaly Detection Agent",
                description=(
                    "Detecting abnormal energy and equipment "
                    "patterns."
                ),
                agent_type="Anomaly Agent",
                status="Completed",
                action="Analyzed latest sensor readings",
                result="6 active anomalies identified.",
                created_at=now - timedelta(minutes=20),
                updated_at=now,
            ),

            AgentActivity(
                building_id=building1.id,
                name="Recommendation Agent",
                description=(
                    "Generating energy-saving recommendations "
                    "based on detected anomalies."
                ),
                agent_type="Recommendation Agent",
                status="Running",
                action="Evaluating optimization opportunities",
                result=(
                    "845 kWh/day potential savings identified."
                ),
                created_at=now - timedelta(minutes=30),
                updated_at=now,
            ),

            AgentActivity(
                building_id=building1.id,
                name="Forecasting Agent",
                description=(
                    "Predicting future energy consumption "
                    "using historical patterns."
                ),
                agent_type="Forecasting Agent",
                status="Running",
                action="Generating 24-hour energy forecast",
                result=(
                    "Expected peak consumption during working hours."
                ),
                created_at=now - timedelta(minutes=40),
                updated_at=now,
            ),

            AgentActivity(
                building_id=building1.id,
                name="Equipment Agent",
                description=(
                    "Monitoring HVAC and lighting equipment "
                    "status."
                ),
                agent_type="Equipment Agent",
                status="Running",
                action="Checking equipment operating states",
                result=(
                    "2 equipment optimization opportunities found."
                ),
                created_at=now - timedelta(minutes=50),
                updated_at=now,
            ),
        ]

        db.session.add_all(agent_activities)

        # ====================================================
        # SENSOR READINGS - 10 FLOORS
        # ====================================================

        sensor_data = [

            (
                "Sensor-001",
                "Reception",
                "Floor 1",
                24.2,
                52,
                72,
                620,
                True,
                True,
                "Normal",
            ),

            (
                "Sensor-002",
                "Development Zone",
                "Floor 2",
                25.1,
                55,
                84,
                710,
                True,
                True,
                "Normal",
            ),

            (
                "Sensor-003",
                "Testing Zone",
                "Floor 3",
                27.8,
                61,
                63,
                540,
                True,
                True,
                "Warning",
            ),

            (
                "Sensor-004",
                "Meeting Zone",
                "Floor 4",
                24.8,
                54,
                51,
                680,
                True,
                True,
                "Normal",
            ),

            (
                "Sensor-005",
                "Operations Zone",
                "Floor 5",
                24.5,
                53,
                76,
                600,
                True,
                True,
                "Normal",
            ),

            (
                "Sensor-006",
                "Development Zone",
                "Floor 6",
                25.7,
                57,
                88,
                750,
                True,
                True,
                "Normal",
            ),

            (
                "Sensor-007",
                "Research Zone",
                "Floor 7",
                24.9,
                55,
                69,
                690,
                True,
                True,
                "Normal",
            ),

            (
                "Sensor-008",
                "Training Zone",
                "Floor 8",
                26.8,
                60,
                5,
                580,
                True,
                True,
                "Warning",
            ),

            (
                "Sensor-009",
                "Management Zone",
                "Floor 9",
                25.4,
                56,
                58,
                720,
                True,
                True,
                "Warning",
            ),

            (
                "Sensor-010",
                "Conference Zone",
                "Floor 10",
                24.7,
                52,
                41,
                640,
                True,
                True,
                "Normal",
            ),
        ]

        for data in sensor_data:

            sensor = SensorReading(
                building_id=building1.id,
                sensor_id=data[0],
                zone=data[1],
                floor=data[2],
                temperature=data[3],
                humidity=data[4],
                occupancy=data[5],
                energy=data[6],
                hvac=data[7],
                lighting=data[8],
                status=data[9],
                sensor_type="Environmental Sensor",
                timestamp=now,
            )

            db.session.add(sensor)

        # ====================================================
        # NOTIFICATIONS
        # ====================================================

        notifications = [

            Notification(
                building_id=building1.id,
                title="High Energy Consumption",
                message=(
                    "Building energy consumption is above "
                    "the historical baseline."
                ),
                notification_type="Energy",
                severity="High",
                is_read=False,
                created_at=now - timedelta(minutes=10),
            ),

            Notification(
                building_id=building1.id,
                title="HVAC Optimization Available",
                message=(
                    "AI identified an opportunity to reduce "
                    "HVAC energy consumption."
                ),
                notification_type="Recommendation",
                severity="Medium",
                is_read=False,
                created_at=now - timedelta(minutes=20),
            ),

            Notification(
                building_id=building1.id,
                title="Low Occupancy Detected",
                message=(
                    "Low occupancy detected on Floor 8 while "
                    "HVAC and lighting systems remain active."
                ),
                notification_type="Occupancy",
                severity="Medium",
                is_read=False,
                created_at=now - timedelta(minutes=30),
            ),

            Notification(
                building_id=building1.id,
                title="Energy Spike Detected",
                message=(
                    "Unexpected energy spike detected on "
                    "Floor 6."
                ),
                notification_type="Anomaly",
                severity="High",
                is_read=False,
                created_at=now - timedelta(hours=1),
            ),

            Notification(
                building_id=building1.id,
                title="Temperature Warning",
                message=(
                    "Floor 3 temperature is above the "
                    "configured comfort range."
                ),
                notification_type="Temperature",
                severity="Medium",
                is_read=True,
                created_at=now - timedelta(hours=2),
            ),
        ]

        db.session.add_all(notifications)

        # ====================================================
        # ENERGY INSIGHTS
        # ====================================================

        insights = [

            EnergyInsight(
                building_id=building1.id,
                title="Energy Consumption Above Baseline",
                description=(
                    "Current building consumption exceeds the "
                    "historical baseline primarily due to HVAC usage."
                ),
                insight_type="Energy Analysis",
                energy_consumption=3150,
                baseline_consumption=2800,
                avoidable_energy=350,
                confidence=92,
                severity="High",
                created_at=now,
            ),

            EnergyInsight(
                building_id=building1.id,
                title="Occupancy-Based Optimization",
                description=(
                    "Several zones have low occupancy while "
                    "HVAC and lighting systems remain active."
                ),
                insight_type="Occupancy Analysis",
                energy_consumption=600,
                baseline_consumption=480,
                avoidable_energy=170,
                confidence=88,
                severity="Medium",
                created_at=now,
            ),

            EnergyInsight(
                building_id=building1.id,
                title="Floor 6 Energy Peak",
                description=(
                    "Floor 6 shows elevated energy usage "
                    "during high occupancy periods."
                ),
                insight_type="Floor Analysis",
                energy_consumption=750,
                baseline_consumption=640,
                avoidable_energy=110,
                confidence=90,
                severity="Medium",
                created_at=now,
            ),
        ]

        db.session.add_all(insights)

        # ====================================================
        # SYSTEM EVENTS
        # ====================================================

        events = [

            SystemEvent(
                building_id=building1.id,
                event_type="ANOMALY_DETECTED",
                message=(
                    "High HVAC energy consumption detected "
                    "on Floor 1."
                ),
                source="Anomaly Agent",
                severity="High",
                created_at=now - timedelta(minutes=15),
            ),

            SystemEvent(
                building_id=building1.id,
                event_type="RECOMMENDATION_CREATED",
                message=(
                    "HVAC optimization recommendation generated."
                ),
                source="Recommendation Agent",
                severity="Medium",
                created_at=now - timedelta(minutes=25),
            ),

            SystemEvent(
                building_id=building1.id,
                event_type="OCCUPANCY_ANALYSIS",
                message=(
                    "Low occupancy detected on Floor 8."
                ),
                source="Occupancy Agent",
                severity="Medium",
                created_at=now - timedelta(minutes=35),
            ),

            SystemEvent(
                building_id=building1.id,
                event_type="ENERGY_SPIKE",
                message=(
                    "Energy spike detected on Floor 6."
                ),
                source="Energy Agent",
                severity="High",
                created_at=now - timedelta(hours=1),
            ),

            SystemEvent(
                building_id=building1.id,
                event_type="SYSTEM_MONITORING",
                message=(
                    "All ten floors are currently being monitored."
                ),
                source="SmartBuild AI",
                severity="Info",
                created_at=now,
            ),
        ]

        db.session.add_all(events)

        # ====================================================
        # FINAL COMMIT
        # ====================================================

        db.session.commit()

        # ====================================================
        # DISPLAY SUMMARY
        # ====================================================

        print()
        print("=" * 60)
        print("SMARTBUILD AI DATABASE SEEDED SUCCESSFULLY")
        print("=" * 60)

        print(
            f"Buildings        : "
            f"{Building.query.count()}"
        )

        print(
            f"Energy Readings  : "
            f"{EnergyReading.query.count()}"
        )

        print(
            f"Floor Energy     : "
            f"{FloorEnergyReading.query.count()}"
        )

        print(
            f"Occupancy        : "
            f"{OccupancyReading.query.count()}"
        )

        print(
            f"Equipment        : "
            f"{Equipment.query.count()}"
        )

        print(
            f"Anomalies        : "
            f"{Anomaly.query.count()}"
        )

        print(
            f"Recommendations  : "
            f"{Recommendation.query.count()}"
        )

        print(
            f"Agent Activities : "
            f"{AgentActivity.query.count()}"
        )

        print(
            f"Sensors          : "
            f"{SensorReading.query.count()}"
        )

        print(
            f"Notifications    : "
            f"{Notification.query.count()}"
        )

        print(
            f"Energy Insights  : "
            f"{EnergyInsight.query.count()}"
        )

        print(
            f"System Events    : "
            f"{SystemEvent.query.count()}"
        )

        print("=" * 60)

        print("\n10-floor energy data:")

        for floor, energy, baseline in floor_data:

            print(
                f"  {floor:<10} "
                f"Energy: {energy:>5} kWh   "
                f"Baseline: {baseline:>5} kWh"
            )

        print("=" * 60)
        print()


# ============================================================
# RUN SEED
# ============================================================

if __name__ == "__main__":
    seed_database()