import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import LiveMonitoring from "./pages/LiveMonitoring";
import EnergyAnalytics from "./pages/EnergyAnalytics";
import OccupancyAnalytics from "./pages/OccupancyAnalytics";
import EquipmentMonitoring from "./pages/EquipmentMonitoring";
import AnomalyCenter from "./pages/AnomalyCenter";
import Forecasting from "./pages/Forecasting";
import Recommendations from "./pages/Recommendations";
import ActionTracker from "./pages/ActionTracker";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            STARTING PAGE
        ===================================================== */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* =====================================================
            DASHBOARD
        ===================================================== */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* =====================================================
            LIVE MONITORING
        ===================================================== */}
        <Route
          path="/live-monitoring"
          element={<LiveMonitoring />}
        />

        {/* =====================================================
            ENERGY ANALYTICS
        ===================================================== */}
        <Route
          path="/energy-analytics"
          element={<EnergyAnalytics />}
        />

        {/* =====================================================
            OCCUPANCY ANALYTICS
        ===================================================== */}
        <Route
          path="/occupancy-analytics"
          element={<OccupancyAnalytics />}
        />

        {/* =====================================================
            EQUIPMENT MONITORING
        ===================================================== */}
        <Route
          path="/equipment-monitoring"
          element={<EquipmentMonitoring />}
        />

        {/* =====================================================
            ANOMALY CENTER
        ===================================================== */}
        <Route
          path="/anomalies"
          element={<AnomalyCenter />}
        />

        {/* =====================================================
            FORECASTING
        ===================================================== */}
        <Route
          path="/forecasting"
          element={<Forecasting />}
        />

        {/* =====================================================
            RECOMMENDATIONS
        ===================================================== */}
        <Route
          path="/recommendations"
          element={<Recommendations />}
        />

        {/* =====================================================
            ACTION TRACKER
        ===================================================== */}
        <Route
          path="/actions"
          element={<ActionTracker />}
        />

        {/* =====================================================
            REPORTS
        ===================================================== */}
        <Route
          path="/reports"
          element={<Reports />}
        />

        {/* =====================================================
            SETTINGS
        ===================================================== */}
        <Route
          path="/settings"
          element={<Settings />}
        />

        {/* =====================================================
            UNKNOWN URL
        ===================================================== */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;