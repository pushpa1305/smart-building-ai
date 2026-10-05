# 🏢 Agentic AI Smart Building Energy & Facility Management System

> An intelligent multi-agent AI platform for monitoring, analyzing, optimizing, and managing building energy consumption, occupancy, equipment, anomalies, and facility operations.

---

## 📌 Project Overview

The **Agentic AI Smart Building Energy & Facility Management System** is an AI-powered platform designed to make commercial and institutional buildings more energy-efficient, operationally intelligent, and easier to manage.

The system combines:

- IoT and simulated building sensor data
- Multi-agent AI architecture
- Energy analytics
- Occupancy analysis
- HVAC and equipment optimization
- Statistical anomaly detection
- Energy forecasting
- AI-generated recommendations
- Human-in-the-loop approval
- Facility action planning
- Reports and dashboards

Instead of relying on a single AI model, the system uses multiple specialized agents, where each agent is responsible for a specific building-management function.

---

# 🎯 Objectives

The primary objectives of the system are:

1. Monitor building energy and environmental data.
2. Analyze energy consumption and identify inefficiencies.
3. Understand occupancy and space utilization.
4. Optimize HVAC and equipment operation.
5. Detect abnormal energy, temperature, humidity, and equipment behavior.
6. Forecast future energy consumption.
7. Generate actionable recommendations.
8. Estimate potential energy savings.
9. Provide human approval before critical operational actions.
10. Maintain visibility into agent execution and decisions.
11. Generate comprehensive facility-management reports.

---

# 🤖 Multi-Agent Architecture

The platform contains **six mandatory specialized AI agents**.

```text
                    ┌──────────────────────────┐
                    │       Smart Building     │
                    │        Data Sources      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Building Data Monitoring │
                    │          Agent           │
                    └────────────┬─────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
       ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
       │ Energy         │ │ Occupancy &  │ │ HVAC &         │
       │ Analysis Agent │ │ Space Agent  │ │ Equipment Agent│
       └───────┬────────┘ └──────┬───────┘ └───────┬────────┘
               │                 │                  │
               └─────────────────┼──────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Anomaly Detection &     │
                    │     Fault Analysis Agent │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Facility Recommendation  │
                    │      & Action Agent       │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Human Approval / Facility │
                    │       Action Workflow     │
                    └──────────────────────────┘
```

---

# 🧠 AI Agents

## 1. Building Data Monitoring Agent

Responsible for collecting, validating, normalizing, and preparing building data.

### Responsibilities

- Collect energy readings
- Collect occupancy readings
- Collect environmental sensor readings
- Monitor equipment data
- Normalize incoming data
- Detect missing or invalid readings
- Provide current building state
- Prepare data for downstream agents

### Example Data

```text
Energy:
1666.87 kWh

Occupancy:
9.52%

Equipment:
Central HVAC System

Power:
420 kW

Building:
Office Building A
```

---

## 2. Energy Consumption Analysis Agent

Analyzes building energy consumption and compares it against historical baselines.

### Responsibilities

- Calculate current energy consumption
- Calculate historical baseline
- Calculate energy variance
- Calculate percentage change
- Identify consumption peaks
- Compare energy usage across time
- Identify unusual or avoidable consumption
- Estimate potential energy waste

### Example

```text
Current Energy      : 1666.87 kWh
Baseline Energy     : 1390.50 kWh
Variance            : 276.37 kWh
Variance Percentage : 19.88%
Status              : Warning
```

The system uses deterministic calculations for numerical analysis rather than relying on an LLM to perform arithmetic.

---

## 3. Occupancy & Space Utilization Agent

Analyzes building occupancy and determines whether spaces and equipment are being used efficiently.

### Responsibilities

- Identify occupied and unoccupied periods
- Calculate average occupancy
- Calculate peak occupancy
- Detect low-utilization periods
- Identify equipment operating during low occupancy
- Detect HVAC or lighting operation in empty spaces
- Analyze space utilization patterns

### Example

```text
Average Occupancy : 25.18%
Latest Occupancy  : 9.52%
Occupied          : 58.11%
Unoccupied        : 41.89%
```

---

## 4. HVAC & Equipment Optimization Agent

Analyzes equipment operation and identifies opportunities for optimization.

### Responsibilities

- Analyze HVAC schedules
- Analyze equipment runtime
- Compare equipment usage with occupancy
- Identify high-power equipment
- Detect inefficient schedules
- Identify equipment operating during low occupancy
- Analyze available temperature/setpoint information
- Identify potential HVAC optimization opportunities

### Safety Principle

The system does **not automatically modify critical equipment settings**.

Critical recommendations require human approval.

```text
AI Recommendation
        │
        ▼
Human Review
        │
   ┌────┴────┐
   ▼         ▼
Approve    Dismiss
   │
   ▼
Facility Action
```

---

## 5. Anomaly Detection & Fault Analysis Agent

Detects abnormal patterns in energy and environmental data.

### Detection Areas

- Energy spikes
- Abnormal temperature
- Abnormal humidity
- Sensor inconsistencies
- Equipment anomalies
- HVAC operation during low occupancy
- Lighting operation during low occupancy
- Unusual energy consumption

### Statistical Method

The system currently uses statistical **Z-score based anomaly detection**.

Example thresholds:

```text
Medium   : Z-score >= 1.5
High     : Z-score >= 2.0
Critical : Z-score >= 3.0
```

The agent also provides a reason for detected anomalies.

### Example

```text
Anomaly:
Energy Consumption Spike

Observed:
3043.70 kWh

Baseline:
2220.94 kWh

Variance:
37.05%

Z-score:
2.068

Severity:
High
```

---

## 6. Facility Recommendation & Action Agent

Consolidates information from the other agents and converts analysis into actionable facility recommendations.

### Responsibilities

- Consolidate agent findings
- Prioritize recommendations
- Identify high-impact opportunities
- Estimate potential savings
- Generate recommended actions
- Assign actions to responsible agents
- Track recommendation status
- Support human approval
- Generate facility action plans

### Example

```text
Priority:
High

Recommendation:
Review HVAC operation during low occupancy.

Estimated Savings:
Potential reduction in energy consumption.

Approval:
Human approval required.

Automatic Action:
Disabled.
```

---

# 🔍 Optional Reviewer / Critic Agent

A future extension can include a reviewer agent responsible for evaluating the outputs of other agents.

Possible responsibilities:

- Validate recommendations
- Detect conflicting recommendations
- Review confidence
- Check safety requirements
- Identify unsupported assumptions
- Approve or reject agent-generated recommendations before human review

---

# 🔄 Agent-to-Agent Communication

The agents operate as a coordinated workflow rather than independent systems.

```text
Building Data
     │
     ▼
Monitoring Agent
     │
     ├──────────────► Energy Agent
     │
     ├──────────────► Occupancy Agent
     │
     └──────────────► Equipment/HVAC Agent
                         │
                         ▼
                 Anomaly Agent
                         │
                         ▼
               Recommendation Agent
                         │
                         ▼
                  Human Approval
                         │
                         ▼
                 Facility Action
```

This architecture allows information generated by one agent to become input for another agent.

---

# 👨‍💼 Human-in-the-Loop

Safety is an important part of the platform.

The system does **not blindly execute AI recommendations**.

Critical recommendations follow a human approval workflow.

```text
AI Detection
     ↓
AI Analysis
     ↓
Recommendation
     ↓
Human Review
     ↓
 ┌───────────────┐
 │               │
Approve        Dismiss
 │
 ▼
Action
```

This approach is particularly important for:

- HVAC settings
- Critical equipment
- Building operational schedules
- High-impact energy changes
- Other operational changes that could affect building safety or comfort

---

# 📊 Energy Analytics

The Energy Analytics module provides:

- Current energy consumption
- Historical energy consumption
- Baseline comparison
- Percentage variance
- Peak consumption
- Consumption trends
- Potential energy waste
- Energy-saving opportunities

Example:

```text
Current Energy      : 1666.87 kWh
Baseline            : 1390.50 kWh
Energy Difference   : +276.37 kWh
Change              : +19.88%
```

---

# 👥 Occupancy Analytics

The Occupancy Analytics module provides:

- Current occupancy
- Average occupancy
- Peak occupancy
- Occupancy trends
- Occupied percentage
- Unoccupied percentage
- Floor/zone analysis
- Space utilization
- Low-utilization detection

Example:

```text
Current Occupancy : 9.52%
Average Occupancy : 9.52%
Peak Occupancy    : 12.90%
```

---

# 🏢 Space Utilization

The system analyzes whether building spaces are being used efficiently.

It can identify:

- Underutilized spaces
- Low-occupancy periods
- Equipment running in empty spaces
- HVAC operation during low occupancy
- Lighting operation during low occupancy

This information is used by the optimization and recommendation agents.

---

# ⚙️ Equipment Monitoring

The Equipment Monitoring module provides visibility into building equipment.

Tracked information can include:

- Equipment name
- Equipment type
- Current status
- Power consumption
- Rated power
- Floor
- Zone
- Runtime
- Operational condition

Example:

```text
Equipment:
Central HVAC System

Power:
420 kW

Status:
Running

Optimization Priority:
High
```

---

# 🚨 Anomaly Center

The Anomaly Center provides a centralized view of detected issues.

Example anomaly categories:

| Category | Example |
|---|---|
| Energy | Unexpected energy spike |
| Temperature | Abnormal room temperature |
| Humidity | Unusual humidity |
| HVAC | HVAC running during low occupancy |
| Lighting | Lighting active in empty spaces |
| Sensor | Sensor producing unusual values |
| Equipment | Abnormal equipment behavior |

Anomalies are assigned severity levels:

```text
Low
Medium
High
Critical
```

---

# 📈 Energy Forecasting

The forecasting module estimates future energy consumption based on historical energy readings.

The current implementation uses a deterministic historical trend approach.

### Forecasting Process

```text
Historical Energy Data
          │
          ▼
Data Validation
          │
          ▼
Historical Trend
          │
          ▼
Linear Trend Calculation
          │
          ▼
Future Energy Forecast
```

The forecasting API supports configurable forecast ranges.

Example:

```text
Forecast Range:
7 Days

Historical Data:
Available energy readings

Output:
Predicted energy consumption
```

---

# 💰 Energy-Saving Estimation

The system estimates potential savings based on detected inefficiencies.

Possible savings opportunities include:

- HVAC optimization
- Lighting optimization
- Equipment scheduling
- Reducing operation during low occupancy
- Eliminating unnecessary runtime
- Correcting abnormal consumption

Savings estimates are intended as **decision-support estimates**, not guaranteed financial savings.

---

# 📋 Recommendations

The Recommendations module consolidates AI findings into actionable recommendations.

Each recommendation can contain:

- Title
- Description
- Priority
- Category
- Estimated savings
- Responsible agent
- Floor
- Status
- Creation timestamp
- Implementation information

Possible statuses include:

```text
Pending
Approved
Dismissed
Implemented
Completed
```

---

# ✅ Recommendation Approval

Recommendations can be approved or dismissed through the frontend.

### Approval Flow

```text
Recommendation
      │
      ▼
   Pending
      │
 ┌────┴────┐
 ▼         ▼
Approve   Dismiss
 │
 ▼
Approved
```

Approval information is persisted in the backend.

Critical equipment changes are not automatically applied by the system.

---

# 📝 Facility Actions

The Facility Action workflow converts approved recommendations into actionable tasks.

Example:

```text
Recommendation
      ↓
Action Created
      ↓
Responsible Agent
      ↓
Human Approval
      ↓
Implementation
      ↓
Completion
```

This allows the platform to move from:

**Detection → Analysis → Recommendation → Approval → Action**

rather than simply displaying analytics.

---

# 📊 Reports

The system provides reporting capabilities for:

- Energy
- Occupancy
- Equipment
- Anomalies
- Forecasting
- Optimization
- Recommendations
- Facility actions

Reports are designed to provide facility managers with a consolidated view of the building.

---

# 👁️ Agent Execution Visibility

The platform provides visibility into agent execution.

The system tracks information such as:

- Agent name
- Agent type
- Status
- Description
- Action
- Result
- Created timestamp
- Updated timestamp

Example:

```text
Building Data Monitoring Agent
Status: Success

Energy Analysis Agent
Status: Success

Occupancy Agent
Status: Warning

HVAC Optimization Agent
Status: Critical

Anomaly Detection Agent
Status: Success

Facility Recommendation Agent
Status: High
```

This improves transparency and makes the system more explainable.

---

# 🖥️ Frontend Modules

The frontend contains dedicated modules for:

```text
Dashboard
Live Monitoring
Energy Analytics
Occupancy Analytics
Equipment Monitoring
Anomaly Center
Forecasting
Recommendations
Actions
Reports
Settings
```

---

# 📊 Dashboard

The main dashboard provides a high-level building overview.

It can display:

- Current energy
- Baseline energy
- Energy change
- Occupancy
- Active anomalies
- Potential savings
- Building health score
- Agent activity

Example:

```text
┌──────────────────────────────────────────┐
│           SMART BUILDING DASHBOARD       │
├──────────────────────────────────────────┤
│ Energy          Occupancy      Anomalies │
│ 1666.87 kWh     9.52%          4         │
│                                          │
│ Baseline        Change         Savings   │
│ 1390.50 kWh     +19.88%        Potential │
└──────────────────────────────────────────┘
```

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      React Frontend  │
                    │     TypeScript / UI  │
                    └──────────┬───────────┘
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │    Flask Backend     │
                    │     REST Services    │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌────────────┐    ┌─────────────┐   ┌────────────┐
      │ AI Agents  │    │ Analytics   │   │ Forecasting│
      └────────────┘    └─────────────┘   └────────────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Database        │
                    │ SQLite / SQLAlchemy  │
                    └──────────────────────┘
```

---

# 🧰 Technology Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- Component-based UI
- Data visualization

## Backend

- Python
- Flask
- Flask-SQLAlchemy
- REST APIs

## Data & Analytics

- Pandas
- NumPy
- Statistical analysis
- Z-score anomaly detection
- Historical trend analysis
- Deterministic calculations

## Database

Current development implementation:

- SQLite
- SQLAlchemy ORM

Planned production database:

- PostgreSQL

## AI / Agent Layer

- Specialized AI agents
- Agent-to-agent workflow
- LLM-assisted reasoning where applicable
- Deterministic tools for numerical calculations
- Human-in-the-loop approval

---

# 📁 Project Structure

```text
smart-building-ai/
│
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── agents/
│   │   ├── building_data_monitoring.py
│   │   ├── energy_analysis.py
│   │   ├── occupancy_space_utilization.py
│   │   ├── hvac_equipment_optimization.py
│   │   ├── anomaly_detection.py
│   │   └── facility_recommendation.py
│   │
│   ├── instance/
│   │   └── smartbuild.db
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── LiveMonitoring.tsx
│   │   │   ├── EnergyAnalytics.tsx
│   │   │   ├── OccupancyAnalytics.tsx
│   │   │   ├── EquipmentMonitoring.tsx
│   │   │   ├── Anomalies.tsx
│   │   │   ├── Forecasting.tsx
│   │   │   ├── Recommendations.tsx
│   │   │   ├── Actions.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── services/
│   │   │   └── api.ts
│   │   │
│   │   └── components/
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── README.md
└── .gitignore
```

> File names may vary depending on the final project structure and implementation.

---

# 🗄️ Database Design

The system maintains structured data for building operations.

## Buildings

Stores building information.

```text
Building
├── ID
├── Name
├── Location
└── Status
```

## Energy Readings

Stores energy consumption measurements.

```text
EnergyReading
├── Building
├── Timestamp
├── Energy
└── Unit
```

## Occupancy Readings

Stores occupancy information.

```text
OccupancyReading
├── Building
├── Timestamp
├── Occupancy
└── Zone/Floor
```

## Sensor Readings

Stores environmental/sensor measurements.

```text
SensorReading
├── Sensor
├── Timestamp
├── Value
├── Unit
├── Floor
└── Zone
```

## Equipment

Stores equipment information.

```text
Equipment
├── Name
├── Type
├── Status
├── Power Consumption
├── Rated Power
├── Floor
└── Zone
```

## Recommendations

Stores AI-generated recommendations.

```text
Recommendation
├── Title
├── Description
├── Priority
├── Status
├── Estimated Savings
├── Category
├── Responsible Agent
└── Timestamps
```

## Agent Activity

Stores agent execution information.

```text
AgentActivity
├── Agent Name
├── Agent Type
├── Status
├── Action
├── Result
└── Timestamps
```

---

# 🔌 API Overview

The backend exposes REST APIs for the frontend.

Important API areas include:

```text
/api/dashboard

/api/buildings

/api/occupancy

/api/occupancy/zones

/api/forecast

/api/forecasting

/api/recommendations

/api/recommendations/<id>/approve

/api/recommendations/<id>/dismiss

/api/equipment

/api/reports

/api/live-monitoring

/api/agents/building-data

/api/agents/energy-analysis

/api/agents/occupancy

/api/agents/hvac-optimization

/api/agents/anomaly-detection

/api/agents/facility-recommendation

/api/agent-activity
```

---

# 🔐 Environment Variables

Environment variables should be used for sensitive configuration.

Example:

```env
DATABASE_URL=
SECRET_KEY=
API_KEY=
```

Do **not** commit secrets to GitHub.

The `.gitignore` file should exclude:

```text
.env
backend/.env
*.db
__pycache__/
node_modules/
```

---

# 🚀 Local Development

## 1. Clone the Repository

```bash
git clone https://github.com/pushpa1305/smart-building-ai.git
```

```bash
cd smart-building-ai
```

---

# ⚙️ Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

### Windows

Activate the environment:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
python app.py
```

---

# 💻 Frontend Setup

Open another terminal and navigate to:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

---

# 🔗 Frontend ↔ Backend

The frontend communicates with the Flask backend through REST APIs.

```text
React
  │
  │ HTTP Requests
  ▼
Flask API
  │
  ▼
AI Agents / Analytics
  │
  ▼
Database
```

The API service layer handles backend communication and normalizes backend responses for frontend components.

---

# 🧪 Testing Requirements

The system should be tested against the following scenarios.

## Test 1 — Normal Operation

Expected behavior:

- Energy remains within normal range.
- No critical anomalies.
- Occupancy is consistent.
- Equipment operates normally.

## Test 2 — Energy Spike

Inject an abnormal energy reading.

Expected behavior:

```text
Energy Spike
     ↓
Energy Agent
     ↓
Anomaly Agent
     ↓
High/Critical Anomaly
     ↓
Recommendation
```

## Test 3 — HVAC During Low Occupancy

Scenario:

```text
Occupancy = Very Low
HVAC = Running
```

Expected result:

- Occupancy agent detects low utilization.
- HVAC agent identifies optimization opportunity.
- Recommendation agent creates an actionable recommendation.

## Test 4 — Overnight Lighting

Scenario:

```text
Time       : Overnight
Occupancy  : 0%
Lighting   : ON
```

Expected result:

- System identifies unnecessary operation.
- Anomaly/occupancy agents report the issue.
- Recommendation agent suggests schedule optimization.

## Test 5 — Abnormal Temperature

Inject abnormal temperature readings.

Expected result:

- Anomaly Detection Agent identifies the deviation.
- Severity is calculated.
- Fault hypothesis is generated.
- Recommendation can be created.

## Test 6 — Forecasting

Provide historical energy readings.

Expected result:

```text
Historical Data
      ↓
Trend Analysis
      ↓
Future Prediction
      ↓
Forecast Visualization
```

---

# 📈 Example Agent Execution

A typical complete execution can look like:

```text
1. Building Data Monitoring Agent
   ↓
   Collects latest building data

2. Energy Analysis Agent
   ↓
   Detects 19.88% energy increase

3. Occupancy Agent
   ↓
   Detects low occupancy

4. HVAC Optimization Agent
   ↓
   Detects HVAC operating during low occupancy

5. Anomaly Detection Agent
   ↓
   Detects energy and sensor anomalies

6. Facility Recommendation Agent
   ↓
   Consolidates findings

7. Human Approval
   ↓
   Facility manager reviews recommendation

8. Facility Action
   ↓
   Approved action is tracked
```

---

# 🧩 Example Building Scenario

Consider an office building where:

```text
Energy Consumption:
1666.87 kWh

Historical Baseline:
1390.50 kWh

Energy Increase:
19.88%

Current Occupancy:
9.52%

HVAC:
420 kW

HVAC Status:
Running
```

The system can reason:

```text
Low Occupancy
      +
High HVAC Power
      +
Above-Baseline Energy
      ↓
Potential Energy Inefficiency
      ↓
Optimization Opportunity
      ↓
Human Approval Required
```

This demonstrates how multiple agents cooperate to identify a meaningful operational issue.

---

# 🛡️ Safety & Security

The system follows a human-supervised approach for critical facility operations.

### Principles

- AI recommendations are explainable.
- Critical actions require human approval.
- Automatic critical equipment modification is disabled.
- Numerical calculations use deterministic methods.
- Sensitive credentials should be stored in environment variables.
- Secrets should never be committed to source control.
- API access should be secured in production.
- Database credentials should not be hard-coded.

---

# ☁️ Deployment

The project can be deployed using separate frontend and backend services.

Example architecture:

```text
                   Internet
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   Frontend Hosting         Backend Hosting
      Vercel                    Render
          │                       │
          │       REST API        │
          └───────────────────────┘
                      │
                      ▼
                   Database
```

---

# 📦 Production Architecture

The recommended production architecture is:

```text
                       USERS
                         │
                         ▼
                ┌─────────────────┐
                │ React Frontend  │
                │   TypeScript    │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   API Gateway   │
                └────────┬────────┘
                         │
             ┌───────────┼───────────┐
             │           │           │
             ▼           ▼           ▼
          Energy     Occupancy    Equipment
          Agent       Agent        Agent
             │           │           │
             └───────────┼───────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Anomaly Agent │
                 └───────┬───────┘
                         │
                         ▼
               ┌──────────────────┐
               │ Recommendation   │
               │      Agent       │
               └────────┬─────────┘
                        │
                        ▼
                 Human Approval
                        │
                        ▼
                Facility Actions
                        │
                        ▼
                   PostgreSQL
```

---

# 🔮 Future Enhancements

## AI & Agents

- Advanced LLM-based reasoning
- Reviewer/Critic Agent
- More sophisticated agent orchestration
- Agent confidence scoring
- Agent memory
- Cross-agent conflict resolution

## Machine Learning

- Isolation Forest
- Autoencoders
- Residual-based anomaly detection
- Advanced time-series forecasting
- Predictive maintenance
- Equipment failure prediction

## IoT

- Real IoT sensor integration
- MQTT
- Edge devices
- Real-time sensor streaming
- Smart meters
- Building Management System integration

## Infrastructure

- PostgreSQL production database
- Redis
- Message queues
- Docker
- Kubernetes

## Dashboard

- Real-time WebSocket updates
- Interactive floor maps
- Building heatmaps
- Energy Sankey diagrams
- Equipment health visualization
- Advanced analytics

## Automation

- Approved automated schedules
- Smart HVAC control
- Automated lighting optimization
- Smart equipment scheduling

All critical automation should continue to follow appropriate safety and approval policies.

---

# 📋 Project Requirements Compliance

| Requirement | Implementation |
|---|---|
| Building data monitoring | ✅ |
| Energy analysis | ✅ |
| Occupancy analysis | ✅ |
| Space utilization | ✅ |
| HVAC optimization | ✅ |
| Equipment optimization | ✅ |
| Anomaly detection | ✅ |
| Fault analysis | ✅ |
| Energy forecasting | ✅ |
| Recommendations | ✅ |
| Energy-saving estimation | ✅ |
| Human-in-the-loop | ✅ |
| Agent execution visibility | ✅ |
| Facility actions | ✅ |
| Reports | ✅ |
| Dashboard | ✅ |
| REST APIs | ✅ |
| Database persistence | ✅ |
| Frontend visualization | ✅ |

---

# 🧪 Current Example Results

During testing, the system demonstrated:

### Energy Analysis

```text
Current Energy       : 1666.87 kWh
Baseline             : 1390.50 kWh
Variance             : 276.37 kWh
Variance Percentage  : 19.88%
Peak                 : 3043.70 kWh
```

### Occupancy

```text
Average Occupancy    : 25.18%
Latest Occupancy     : 9.52%
Occupied             : 58.11%
Unoccupied           : 41.89%
```

### HVAC Optimization

```text
High Priority Opportunities : 12
Potential Optimization Items: 13
Human Approval              : Required
Automatic Changes            : Disabled
```

### Anomaly Detection

```text
Total Anomalies : 9
High            : 8
Medium          : 1
Critical        : 0
```

### Facility Recommendations

```text
Recommendations : 4
Priority        : High
Estimated Saving: 230.99 kWh
Human Approval  : Required
```

> These values represent the project's current test/demo dataset and may change when new building data is loaded.

---

# 🎬 Recommended Demo Flow

For a project demonstration, the following sequence can be used:

```text
1. Open Dashboard
        ↓
2. Show current building state
        ↓
3. Open Energy Analytics
        ↓
4. Show consumption and baseline comparison
        ↓
5. Open Occupancy Analytics
        ↓
6. Show low occupancy
        ↓
7. Open Equipment Monitoring
        ↓
8. Show HVAC equipment
        ↓
9. Open Anomaly Center
        ↓
10. Show detected anomalies
        ↓
11. Open Forecasting
        ↓
12. Show predicted energy consumption
        ↓
13. Open Recommendations
        ↓
14. Show AI-generated recommendations
        ↓
15. Approve/Dismiss recommendation
        ↓
16. Open Actions
        ↓
17. Show facility action workflow
        ↓
18. Open Reports
        ↓
19. Show consolidated building report
```

---

# 🏆 Key Innovation

The main innovation of this project is the combination of:

> **Multi-Agent AI + Building Analytics + IoT Data + Anomaly Detection + Forecasting + Human-in-the-Loop Facility Management**

Rather than creating a dashboard that only displays sensor data, the platform creates an intelligent operational loop:

```text
MONITOR
   ↓
ANALYZE
   ↓
UNDERSTAND
   ↓
DETECT
   ↓
PREDICT
   ↓
RECOMMEND
   ↓
APPROVE
   ↓
ACT
   ↓
TRACK
```

This transforms the system from a passive monitoring dashboard into an **AI-assisted facility management platform**.

---

# 📌 Project Status

The project currently includes:

- Multi-agent architecture
- Building monitoring
- Energy analytics
- Occupancy analytics
- Equipment monitoring
- HVAC optimization
- Statistical anomaly detection
- Energy forecasting
- AI-generated recommendations
- Human approval workflow
- Facility actions
- Agent activity tracking
- Reporting
- React frontend
- Flask backend
- Database persistence
- REST API integration

The system is currently suitable for **academic demonstration, prototype evaluation, and further development toward production deployment**.

---

# 🚀 Future Vision

The long-term vision is to evolve the platform into a fully intelligent building-management ecosystem capable of:

```text
                     SMART BUILDING
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
          ENERGY       OCCUPANCY     EQUIPMENT
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                    AI AGENT SYSTEM
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
          DETECT        PREDICT       OPTIMIZE
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                     RECOMMEND
                           │
                           ▼
                    HUMAN APPROVAL
                           │
                           ▼
                         ACT
                           │
                           ▼
                       MEASURE
                           │
                           └───────────────►
                              CONTINUOUS
                              IMPROVEMENT
```

---

# 👨‍💻 Author

**RAVI VENKATA PUSHPA LATHA**

B.Tech – Computer Science and Engineering

Lakireddy Bali Reddy College of Engineering

---

# 🔗 Project Repository

GitHub:

https://github.com/pushpa1305/smart-building-ai

---

# 📄 License

This project is developed for educational, research, prototype, and demonstration purposes.

---

# ⭐ Acknowledgement

This project demonstrates how **Agentic AI, data analytics, machine learning concepts, IoT-style building data, and human-supervised automation** can be combined to create intelligent solutions for modern facility management.

---

## Smart Buildings. Smarter Decisions. Sustainable Operations. 🏢⚡🤖
