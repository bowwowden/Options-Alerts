import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems = [
    { path: "/", label: "Home", icon: "🏠" },
    { path: "/search", label: "Search", icon: "🔍" },
    { path: "/trade", label: "Trade", icon: "📊" },
    { path: "/portfolio", label: "Portfolio", icon: "💼" },
  ];

  return (
    <div
      style={{
        width: isMobile ? "60px" : "200px",
        minHeight: "100vh",
        backgroundColor: "transparent",
        padding: "20px 0",
        position: "fixed",
        left: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        borderRight: "1px solid #ccc",
        transition: "width 0.3s",
      }}
    >
      {!isMobile && (
        <div style={{ padding: "0 20px", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>
            Options Alerts
          </h2>
        </div>
      )}

      {menuItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              textDecoration: "none",
              padding: isMobile ? "12px" : "12px 20px",
              color: isActive ? "white" : "inherit",
              backgroundColor: isActive ? "#646cff" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: isMobile ? "center" : "flex-start",
              gap: "12px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span style={{ fontSize: "18px" }}>{item.icon}</span>
            {!isMobile && (
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default Sidebar;
