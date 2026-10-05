import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
      }}
    >
      <h1>Smart Building AI</h1>

      <p>Agentic AI Smart Building Energy Management System</p>

      <button
        onClick={() => navigate("/dashboard")}
        style={{
          padding: "12px 24px",
          background: "#06b6d4",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Open Dashboard
      </button>
    </div>
  );
}