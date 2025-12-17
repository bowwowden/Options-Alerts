import React, { useState } from "react";
import { Link } from "react-router-dom";
import horseshoeImg from "../assets/horseshoe.png";

const ChatCharacter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  // Render minimized state (small up arrow)
  if (isMinimized) {
    return (
      <div style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 1000
      }}>
        <button
          onClick={handleExpand}
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            backgroundColor: "#646cff",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#535bf2";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#646cff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          ↑
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      bottom: "10px",
      right: "10px",
      zIndex: 1000
    }}>
      {/* Chat Bubble */}
      {isOpen && (
        <div style={{
          position: "absolute",
          bottom: "100px",
          right: "0",
          backgroundColor: "white",
          color: "#333",
          padding: "12px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          width: "min(250px, calc(100vw - 40px))",
          marginBottom: "10px"
        }}>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
            Hey there! I'm here to help you find the best options plays. What can I do for you today?
          </p>
          <Link
            to="/chat"
            style={{
              display: "inline-block",
              padding: "8px 16px",
              backgroundColor: "#646cff",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "500"
            }}
            onClick={() => setIsOpen(false)}
          >
            Open Chat →
          </Link>
          {/* Chat bubble arrow */}
          <div style={{
            position: "absolute",
            bottom: "-10px",
            right: "30px",
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "10px solid white"
          }} />
        </div>
      )}

      {/* Character Container with Controls */}
      <div style={{ position: "relative" }}>
        {/* Minimize Button (down arrow) */}
        <button
          onClick={handleMinimize}
          style={{
            position: "absolute",
            bottom: "0px",
            right: "0px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            backgroundColor: "#646cff",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
            zIndex: 1001,
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#535bf2";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#646cff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          ↓
        </button>

        {/* Character Image */}
        <img
          src={horseshoeImg}
          alt="Horseshoe character"
          onClick={toggleChat}
          style={{
            width: "min(120px, 20vw)",
            height: "min(120px, 20vw)",
            cursor: "pointer",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        />
      </div>
    </div>
  );
};

export default ChatCharacter;