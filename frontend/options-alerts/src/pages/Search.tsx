import React, { useState } from "react";

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <h1>Search</h1>
      <p>Search for options alerts and contracts.</p>

      <div style={{ marginTop: "24px" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for tickers"
          style={{
            width: "100%",
            maxWidth: "600px",
            padding: "12px 16px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#646cff";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#ccc";
          }}
        />
      </div>

      <div style={{
        marginTop: "32px",
        padding: "24px",
        backgroundColor: "rgba(100, 108, 255, 0.1)",
        borderRadius: "12px",
        border: "1px solid #646cff"
      }}>
        <h2>Coming Soon</h2>
        <p>Search functionality will be available here.</p>
      </div>
    </div>
  );
};

export default Search;
