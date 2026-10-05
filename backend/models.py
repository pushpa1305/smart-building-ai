from datetime import datetime

from database import db


# ============================================================
# BUILDING
# ============================================================

class Building(db.Model):
    __tablename__ = "buildings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    location = db.Column(
        db.String(200),
        nullable=True
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    total_floors = db.Column(
        db.Integer,
        default=1
    )

    total_area = db.Column(
        db.Float,
        default=0
    )

    status = db.Column(
        db.String(50),
        default="Active"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    energy_readings = db.relationship(
        "EnergyReading",
        backref="building",
        lazy=True,
        cascade="all, delete-orphan"
    )

    occupancy_readings = db.relationship(
        "OccupancyReading",
        backref="building",
        lazy=True,
        cascade="all, delete-orphan"
    )

    equipment = db.relationship(
        "Equipment",
        backref="building",
        lazy=True,
        cascade="all, delete-orphan"
    )

    anomalies = db.relationship(
        "Anomaly",
        backref="building",
        lazy=True,
        cascade="all, delete-orphan"
    )

    recommendations = db.relationship(
        "Recommendation",
        backref="building",
        lazy=True,
        cascade="all, delete-orphan"
    )

    agent_activities = db.relationship(
        "AgentActivity",
        backref="building",
        lazy=True,
        cascade="all, delete-orphan"
    )

    floor_energy_readings = db.relationship(
        "FloorEnergyReading",
        backref="building",
        lazy=True,
        cascade="all, delete-orphan"
    )

    sensor_readings = db.relationship(
        "SensorReading",
        backref="building",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Building {self.name}>"


# ============================================================
# ENERGY READING
# ============================================================

class EnergyReading(db.Model):
    __tablename__ = "energy_readings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    consumption = db.Column(
        db.Float,
        nullable=False
    )

    baseline = db.Column(
        db.Float,
        nullable=False
    )

    floor = db.Column(
        db.String(100),
        nullable=True
    )

    source = db.Column(
        db.String(100),
        default="Smart Meter"
    )

    unit = db.Column(
        db.String(30),
        default="kWh"
    )

    timestamp = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # --------------------------------------------------------
    # COMPUTED ENERGY VARIANCE
    # --------------------------------------------------------

    @property
    def variance(self):
        return self.consumption - self.baseline

    @property
    def variance_percentage(self):
        if not self.baseline:
            return 0

        return (
            (self.consumption - self.baseline)
            / self.baseline
        ) * 100

    def __repr__(self):
        return f"<EnergyReading {self.consumption} kWh>"


# ============================================================
# OCCUPANCY READING
# ============================================================

class OccupancyReading(db.Model):
    __tablename__ = "occupancy_readings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    occupancy_percentage = db.Column(
        db.Float,
        nullable=False
    )

    floor = db.Column(
        db.String(100),
        nullable=True
    )

    zone = db.Column(
        db.String(100),
        nullable=True
    )

    timestamp = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    @property
    def is_occupied(self):
        return self.occupancy_percentage > 0

    def __repr__(self):
        return f"<OccupancyReading {self.occupancy_percentage}%>"


# ============================================================
# EQUIPMENT
# ============================================================

class Equipment(db.Model):
    __tablename__ = "equipment"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    equipment_type = db.Column(
        db.String(100),
        nullable=False
    )

    status = db.Column(
        db.String(50),
        nullable=False,
        default="Off"
    )

    power_consumption = db.Column(
        db.Float,
        default=0
    )

    rated_power = db.Column(
        db.Float,
        default=0
    )

    location = db.Column(
        db.String(150),
        nullable=True
    )

    floor = db.Column(
        db.String(100),
        nullable=True
    )

    zone = db.Column(
        db.String(100),
        nullable=True
    )

    last_maintenance = db.Column(
        db.DateTime,
        nullable=True
    )

    next_maintenance = db.Column(
        db.DateTime,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    @property
    def is_running(self):
        return self.status.lower() in [
            "on",
            "running",
            "active"
        ]

    def __repr__(self):
        return f"<Equipment {self.name}>"


# ============================================================
# ANOMALY
# ============================================================

class Anomaly(db.Model):
    __tablename__ = "anomalies"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    severity = db.Column(
        db.String(50),
        nullable=False,
        default="Medium"
    )

    status = db.Column(
        db.String(50),
        default="Active"
    )

    category = db.Column(
        db.String(100),
        nullable=True
    )

    source = db.Column(
        db.String(100),
        default="AI Agent"
    )

    detected_value = db.Column(
        db.Float,
        nullable=True
    )

    expected_value = db.Column(
        db.Float,
        nullable=True
    )

    floor = db.Column(
        db.String(100),
        nullable=True
    )

    zone = db.Column(
        db.String(100),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    resolved_at = db.Column(
        db.DateTime,
        nullable=True
    )

    # --------------------------------------------------------
    # STATUS HELPERS
    # --------------------------------------------------------

    def resolve(self):
        self.status = "Resolved"
        self.resolved_at = datetime.utcnow()

    def __repr__(self):
        return f"<Anomaly {self.title}>"


# ============================================================
# RECOMMENDATION
# ============================================================

class Recommendation(db.Model):
    __tablename__ = "recommendations"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    estimated_savings = db.Column(
        db.Float,
        default=0
    )

    savings_unit = db.Column(
        db.String(30),
        default="kWh"
    )

    priority = db.Column(
        db.String(50),
        default="Medium"
    )

    status = db.Column(
        db.String(50),
        default="Pending"
    )

    category = db.Column(
        db.String(100),
        nullable=True
    )

    generated_by = db.Column(
        db.String(100),
        default="Energy Agent"
    )

    floor = db.Column(
        db.String(100),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    implemented_at = db.Column(
        db.DateTime,
        nullable=True
    )

    completed_at = db.Column(
        db.DateTime,
        nullable=True
    )

    # --------------------------------------------------------
    # RECOMMENDATION STATUS
    # --------------------------------------------------------

    def mark_implemented(self):
        self.status = "Implemented"
        self.implemented_at = datetime.utcnow()

    def mark_completed(self):
        self.status = "Completed"
        self.completed_at = datetime.utcnow()

    def __repr__(self):
        return f"<Recommendation {self.title}>"


# ============================================================
# AI AGENT ACTIVITY
# ============================================================

class AgentActivity(db.Model):
    __tablename__ = "agent_activities"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    agent_type = db.Column(
        db.String(100),
        nullable=True
    )

    status = db.Column(
        db.String(50),
        nullable=False,
        default="Ready"
    )

    action = db.Column(
        db.String(200),
        nullable=True
    )

    result = db.Column(
        db.Text,
        nullable=True
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # --------------------------------------------------------
    # AGENT STATUS
    # --------------------------------------------------------

    def set_status(self, status):
        self.status = status
        self.updated_at = datetime.utcnow()

    def __repr__(self):
        return f"<AgentActivity {self.name}>"


# ============================================================
# FLOOR ENERGY READING
# ============================================================

class FloorEnergyReading(db.Model):
    __tablename__ = "floor_energy_readings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    floor = db.Column(
        db.String(100),
        nullable=False
    )

    energy = db.Column(
        db.Float,
        nullable=False
    )

    baseline = db.Column(
        db.Float,
        default=0
    )

    timestamp = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    @property
    def variance(self):
        return self.energy - self.baseline

    def __repr__(self):
        return f"<FloorEnergyReading {self.floor}: {self.energy} kWh>"


# ============================================================
# SENSOR READING
# ============================================================

class SensorReading(db.Model):
    __tablename__ = "sensor_readings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    zone = db.Column(
        db.String(100),
        nullable=False
    )

    floor = db.Column(
        db.String(100),
        nullable=False
    )

    temperature = db.Column(
        db.Float,
        nullable=False
    )

    humidity = db.Column(
        db.Float,
        nullable=False
    )

    occupancy = db.Column(
        db.Float,
        nullable=False
    )

    energy = db.Column(
        db.Float,
        nullable=False
    )

    hvac = db.Column(
        db.Boolean,
        default=False
    )

    lighting = db.Column(
        db.Boolean,
        default=False
    )

    status = db.Column(
        db.String(50),
        default="Normal"
    )

    sensor_type = db.Column(
        db.String(100),
        nullable=True
    )

    sensor_id = db.Column(
        db.String(100),
        nullable=True
    )

    timestamp = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # --------------------------------------------------------
    # SENSOR ANALYSIS
    # --------------------------------------------------------

    @property
    def is_occupied(self):
        return self.occupancy > 0

    @property
    def hvac_running_when_unoccupied(self):
        return (
            self.hvac is True
            and self.occupancy <= 0
        )

    @property
    def lighting_running_when_unoccupied(self):
        return (
            self.lighting is True
            and self.occupancy <= 0
        )

    @property
    def potential_waste(self):
        """
        Basic estimate of avoidable energy consumption
        when HVAC or lighting is operating in an
        unoccupied zone.
        """

        if self.occupancy <= 0 and (
            self.hvac or self.lighting
        ):
            return self.energy

        return 0

    def __repr__(self):
        return f"<SensorReading {self.zone}>"


# ============================================================
# NOTIFICATION
# ============================================================

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=True
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    notification_type = db.Column(
        db.String(100),
        default="Info"
    )

    severity = db.Column(
        db.String(50),
        default="Normal"
    )

    is_read = db.Column(
        db.Boolean,
        default=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def mark_as_read(self):
        self.is_read = True

    def __repr__(self):
        return f"<Notification {self.title}>"


# ============================================================
# AI ANALYSIS / ENERGY INSIGHT
# ============================================================

class EnergyInsight(db.Model):
    __tablename__ = "energy_insights"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    insight_type = db.Column(
        db.String(100),
        nullable=False
    )

    energy_consumption = db.Column(
        db.Float,
        default=0
    )

    baseline_consumption = db.Column(
        db.Float,
        default=0
    )

    avoidable_energy = db.Column(
        db.Float,
        default=0
    )

    confidence = db.Column(
        db.Float,
        default=0
    )

    severity = db.Column(
        db.String(50),
        default="Medium"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def __repr__(self):
        return f"<EnergyInsight {self.title}>"


# ============================================================
# SYSTEM EVENT LOG
# ============================================================

class SystemEvent(db.Model):
    __tablename__ = "system_events"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    building_id = db.Column(
        db.Integer,
        db.ForeignKey("buildings.id"),
        nullable=True
    )

    event_type = db.Column(
        db.String(100),
        nullable=False
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    source = db.Column(
        db.String(100),
        default="System"
    )

    severity = db.Column(
        db.String(50),
        default="Info"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def __repr__(self):
        return f"<SystemEvent {self.event_type}>"