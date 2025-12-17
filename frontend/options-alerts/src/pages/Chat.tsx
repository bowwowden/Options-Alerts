import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import horseshoeImg from "../assets/horseshoe.png";

type Message = {
  id: number;
  text: string;
  sender: "user" | "horseshoe";
  timestamp: Date;
  occSymbol?: {
    fullSymbol: string;
    ticker: string;
    optionType: string;
    strikePrice: string;
    expirationDate: string;
  };
};

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hey there! I'm here to help you with options trading. How can I assist you today?",
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
    const userInput = inputValue.toLowerCase();
    setInputValue("");

    setTimeout(() => {
      let response = "";

      // Check for OCC symbol format (e.g., BMNR251114C00050000)
      // Pattern: Letters + 6 digits (YYMMDD) + C or P + 8 digits (strike price * 1000)
      const occSymbolPattern = /[A-Z]{2,6}\d{6}[CP]\d{8}/;
      const occSymbolMatch = inputValue.match(occSymbolPattern);

      if (occSymbolMatch) {
        const symbol = occSymbolMatch[0];
        // Parse the symbol to extract details
        const ticker = symbol.match(/[A-Z]+/)?.[0] || "";
        const dateStr = symbol.match(/\d{6}/)?.[0] || "";
        const optionType = symbol.includes("C") ? "Call" : "Put";
        const strikeMatch = symbol.match(/[CP](\d{8})/);
        const strikePrice = strikeMatch ? (parseInt(strikeMatch[1]) / 1000).toFixed(2) : "0";

        // Parse date
        const year = "20" + dateStr.substring(0, 2);
        const month = dateStr.substring(2, 4);
        const day = dateStr.substring(4, 6);
        const expirationDate = `${month}/${day}/${year}`;

        response = "I found an options symbol! Click the card below to view details:";

        const botMessage: Message = {
          id: messages.length + 2,
          text: response,
          sender: "horseshoe",
          timestamp: new Date(),
          occSymbol: {
            fullSymbol: symbol,
            ticker,
            optionType,
            strikePrice,
            expirationDate,
          },
        };
        setMessages((prev) => [...prev, botMessage]);
        return;
      }
      // Check for submit trade questions
      else if (userInput.includes("submit") || userInput.includes("trade") || userInput.includes("execute")) {
        response = "To submit a trade:\n\n1. Navigate to the home page\n2. Click on a post with an options play\n3. Review the details and strike price\n4. Click 'View on Yahoo Finance' to see current pricing\n5. Execute the trade through your broker\n\nAlways verify the strike price, expiration date, and premium before placing your order!";
      }
      // Check for fresh plays questions
      else if (userInput.includes("fresh") || userInput.includes("plays") || userInput.includes("today")) {
        response = "Here are today's fresh plays:\n\n📈 AAPL $200 Calls - Strong bullish momentum\n📉 TSLA $250 Puts - Bearish setup forming\n🎯 SPY Iron Condor - Market consolidating\n\nClick 'Back to Home' to see full details on each play!";
      }
      // Check for ITM/OTM questions
      else if (userInput.includes("itm") || userInput.includes("otm") ||
          userInput.includes("in the money") || userInput.includes("out of the money")) {
        response = "To determine if an option is ITM or OTM:\n\n• CALL options:\n  - ITM: Stock price > Strike price\n  - OTM: Stock price < Strike price\n\n• PUT options:\n  - ITM: Stock price < Strike price\n  - OTM: Stock price > Strike price\n\nTell me the symbol, strike price, and option type (call/put), and I can help you check!";
      }
      // Default help message
      else {
        response = "I can help you with:\n\n1. How to submit a trade\n2. Check if an option is ITM/OTM\n3. Today's fresh plays\n4. Analyze options symbols (just paste the symbol!)\n\nJust ask me about any of these topics!";
      }

      const botMessage: Message = {
        id: messages.length + 2,
        text: response,
        sender: "horseshoe",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const handleSymbolClick = async (occSymbol: NonNullable<Message['occSymbol']>) => {
    try {
      // Parse expiration date from MM/DD/YYYY to MM/DD format for the DB
      const [month, day] = occSymbol.expirationDate.split('/');
      const expirationForDB = `${month}/${day}`;

      // Create the fresh play in the database
      const response = await fetch("http://192.168.0.129:5000/api/fresh-plays/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: occSymbol.ticker,
          price: parseFloat(occSymbol.strikePrice),
          expiration: expirationForDB,
          type: occSymbol.optionType.toLowerCase() + 's', // "call" -> "calls"
          play_date: new Date().toISOString().split('T')[0],
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Navigate to the post detail page with the play ID
        const play = data.data;
        navigate(`/post/${play.id}`, {
          state: {
            title: `${occSymbol.ticker} ${occSymbol.optionType} Option`,
            content: `Options contract for ${occSymbol.ticker}`,
            symbol: occSymbol.ticker,
            plays: [play]
          }
        });
      } else {
        alert(`Failed to create play: ${data.error}`);
      }
    } catch (error) {
      alert(`Error creating play: ${error instanceof Error ? error.message : "Unknown error"}`);
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
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor:
                    message.sender === "user" ? "#646cff" : "#f0f0f0",
                  color: message.sender === "user" ? "white" : "#333",
                }}
              >
                <p style={{ margin: 0, whiteSpace: "pre-line" }}>{message.text}</p>
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

              {/* OCC Symbol Card */}
              {message.occSymbol && (
                <div
                  onClick={() => handleSymbolClick(message.occSymbol!)}
                  style={{
                    marginTop: "8px",
                    padding: "16px",
                    backgroundColor: "rgba(100, 108, 255, 0.1)",
                    border: "2px solid #646cff",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(100, 108, 255, 0.2)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(100, 108, 255, 0.1)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#646cff", marginBottom: "8px" }}>
                    {message.occSymbol.ticker} {message.occSymbol.optionType}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                    💰 Strike: ${message.occSymbol.strikePrice}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
                    📅 Expiration: {message.occSymbol.expirationDate}
                  </div>
                  <div style={{ fontSize: "12px", color: "#646cff", fontWeight: "600" }}>
                    Click to view details →
                  </div>
                </div>
              )}
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
          placeholder="Type your question here..."
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