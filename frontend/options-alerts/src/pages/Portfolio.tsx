import React from "react";

const Portfolio: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <h1>Portfolio</h1>
      <p>View and track your options portfolio here.</p>

      <div style={{
        marginTop: "32px",
        padding: "24px",
        backgroundColor: "rgba(100, 108, 255, 0.1)",
        borderRadius: "12px",
        border: "1px solid #646cff"
      }}>
        <h2>Coming Soon</h2>
        <p>Portfolio tracking and analytics features will be available here.</p>
      </div>
    </div>
  );
};

export default Portfolio;
