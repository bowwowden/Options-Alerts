import React, { useState } from "react";
import { Link } from "react-router-dom";
import horseshoeImg from "../assets/horseshoe.png";

type Message = {
  id: number;
  text: string;
  sender: "user" | "horseshoe";
  timestamp: Date;
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hey there! I'm here to help you find the best options plays. What can I do for you today?",
      sender: "horseshoe",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (inputValue.trim() === "") return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputValue("");

    // Simulate horseshoe response
    setTimeout(() => {
      const responses = [
        "That's a great question! Let me analyze that for you...",
        "I'm processing the latest market data to give you the best answer.",
        "Interesting! Based on current market trends, here's what I think...",
        "Let me check the options flow for that symbol.",
        "I'm seeing some strong signals in the market right now!",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const botMessage: Message = {
        id: messages.length + 2,
        text: randomResponse,
        sender: "horseshoe",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          borderBottom: "1px solid #ccc",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={horseshoeImg}
            alt="Horseshoe"
            style={{ width: "50px", height: "50px", borderRadius: "50%" }}
          />
          <div>
            <h2 style={{ margin: 0 }}>Chat with Horseshoe</h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
              Your options trading assistant
            </p>
          </div>
        </div>
        <Link to="/" style={{ color: "#646cff", textDecoration: "none" }}>
          ← Back to Home
        </Link>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent:
                message.sender === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            {message.sender === "horseshoe" && (
              <img
                src={horseshoeImg}
                alt="Horseshoe"
                style={{ width: "30px", height: "30px", borderRadius: "50%" }}
              />
            )}
            <div
              style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: "12px",
                backgroundColor:
                  message.sender === "user" ? "#646cff" : "#f0f0f0",
                color: message.sender === "user" ? "white" : "#333",
              }}
            >
              <p style={{ margin: 0 }}>{message.text}</p>
              <span
                style={{
                  fontSize: "11px",
                  opacity: 0.7,
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "16px",
          borderTop: "1px solid #ccc",
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about options plays..."
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: "12px 24px",
            backgroundColor: "#646cff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;