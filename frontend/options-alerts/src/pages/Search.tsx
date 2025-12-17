import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface FreshPlay {
  id: number;
  symbol: string;
  price: number;
  expiration: string;
  type: string;
  play_date: string;
  created_at: string;
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [freshPlays, setFreshPlays] = useState<FreshPlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    fetchFreshPlays();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFreshPlays = async (symbol?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = symbol
        ? `http://192.168.0.129:5000/api/fresh-plays?symbol=${symbol.toUpperCase()}`
        : `http://192.168.0.129:5000/api/fresh-plays`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setFreshPlays(data.data);
      } else {
        setError(data.error || "Failed to fetch fresh plays");
      }
    } catch (err) {
      setError("Error connecting to backend. Make sure it's running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchFreshPlays(searchQuery.trim());
    } else {
      fetchFreshPlays();
    }
  };

  const handlePlayClick = (play: FreshPlay) => {
    // Navigate to the post detail page for this play
    navigate(`/post/${play.id}`, {
      state: {
        title: `${play.symbol} ${play.type.charAt(0).toUpperCase() + play.type.slice(1)} Option`,
        content: `Options contract for ${play.symbol}`,
        symbol: play.symbol,
        plays: [play]
      }
    });
  };

  const filteredPlays = searchQuery
    ? freshPlays.filter(play =>
        play.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : freshPlays;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: isMobile ? "12px" : "24px" }}>
        <h1 style={{ fontSize: isMobile ? "24px" : "32px", margin: isMobile ? "0 0 4px 0" : "0 0 8px 0" }}>Search</h1>
        <p style={{ fontSize: isMobile ? "14px" : "16px", margin: 0 }}>Search for options alerts and contracts.</p>
      </div>

      <form onSubmit={handleSearch} style={{ marginTop: isMobile ? "16px" : "24px" }}>
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
      </form>

      {loading && (
        <div style={{ marginTop: "24px", fontSize: "16px" }}>
          Loading fresh plays...
        </div>
      )}

      {error && (
        <div style={{
          marginTop: "24px",
          padding: "12px",
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: "8px",
          color: "#c00"
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ marginTop: "32px" }}>
          <h2>Fresh Plays ({filteredPlays.length})</h2>

          {filteredPlays.length === 0 ? (
            <p>No fresh plays found.</p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
              marginTop: "16px"
            }}>
              {filteredPlays.map((play) => (
                <div
                  key={play.id}
                  onClick={() => handlePlayClick(play)}
                  style={{
                    padding: "16px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    backgroundColor: play.type === "calls" ? "rgba(0, 200, 0, 0.05)" : "rgba(200, 0, 0, 0.05)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    marginBottom: "8px"
                  }}>
                    {play.symbol}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                    <strong>Strike:</strong> ${play.price}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                    <strong>Type:</strong> {play.type.toUpperCase()}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                    <strong>Expiration:</strong> {play.expiration}
                  </div>
                  <div style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
                    {(() => {
                      const [year, month, day] = play.play_date.split('-');
                      return `${month}/${day}/${year}`;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
