import React, { useState, useEffect } from "react";

interface Position {
  symbol: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  avg_entry_price: string;
  asset_class: string;
}

interface AccountData {
  cash: string;
  portfolio_value: string;
  buying_power: string;
  equity: string;
  last_equity: string;
}

const Portfolio: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sellingSymbol, setSellingSymbol] = useState<string | null>(null);

  useEffect(() => {
    fetchPositions();
    fetchAccountData();

    // Handle window resize for responsive layout
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchPositions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://192.168.0.129:5000/api/positions");
      const data = await response.json();

      if (data.success) {
        setPositions(data.positions);
      } else {
        setError(data.error || "Failed to fetch positions");
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountData = async () => {
    try {
      const response = await fetch("http://192.168.0.129:5000/api/account");
      const data = await response.json();

      if (data.success) {
        setAccountData(data.account);
      } else {
        console.error("Failed to fetch account data:", data.error);
      }
    } catch (err) {
      console.error("Error fetching account data:", err);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`;
  };

  const formatPercentage = (value: string) => {
    const num = parseFloat(value) * 100;
    return isNaN(num) ? "0.00%" : `${num.toFixed(2)}%`;
  };

  const handleSell = async (symbol: string) => {
    if (!confirm(`Are you sure you want to sell all of ${symbol}?`)) {
      return;
    }

    setSellingSymbol(symbol);

    try {
      const response = await fetch("http://192.168.0.129:5000/api/close-position", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully sold ${symbol}!`);
        // Refresh positions after successful sale
        await fetchPositions();
        await fetchAccountData();
      } else {
        alert(`Failed to sell ${symbol}: ${data.error}`);
      }
    } catch (err) {
      alert(`Error selling ${symbol}: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSellingSymbol(null);
    }
  };

  const totalMarketValue = positions.reduce((sum, pos) => sum + parseFloat(pos.market_value || "0"), 0);
  const totalUnrealizedPL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pl || "0"), 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: isMobile ? "12px" : "24px" }}>
        <h1 style={{ fontSize: isMobile ? "24px" : "32px", margin: isMobile ? "0 0 4px 0" : "0 0 8px 0" }}>Portfolio</h1>
        <p style={{ fontSize: isMobile ? "14px" : "16px", margin: 0 }}>View and track your options portfolio here.</p>
      </div>

      {/* Account Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
        gap: isMobile ? "12px" : "16px",
        marginBottom: isMobile ? "16px" : "24px"
      }}>
        <div style={{
          padding: isMobile ? "12px 16px" : "20px",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          borderRadius: "12px",
          border: "1px solid #22c55e"
        }}>
          <div style={{ fontSize: isMobile ? "12px" : "14px", color: "#999", marginBottom: isMobile ? "4px" : "8px" }}>Cash</div>
          <div style={{ fontSize: isMobile ? "20px" : "28px", fontWeight: "700" }}>
            {accountData ? formatCurrency(accountData.cash) : "$0.00"}
          </div>
        </div>
        <div style={{
          padding: isMobile ? "12px 16px" : "20px",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          borderRadius: "12px",
          border: "1px solid #22c55e"
        }}>
          <div style={{ fontSize: isMobile ? "12px" : "14px", color: "#999", marginBottom: isMobile ? "4px" : "8px" }}>Portfolio Value</div>
          <div style={{ fontSize: isMobile ? "20px" : "28px", fontWeight: "700" }}>
            {accountData ? formatCurrency(accountData.portfolio_value) : "$0.00"}
          </div>
        </div>
      </div>

      {/* Position Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
        gap: isMobile ? "12px" : "16px",
        marginBottom: "32px"
      }}>
        <div style={{
          padding: isMobile ? "12px 16px" : "20px",
          backgroundColor: "rgba(100, 108, 255, 0.1)",
          borderRadius: "12px",
          border: "1px solid #646cff"
        }}>
          <div style={{ fontSize: isMobile ? "12px" : "14px", color: "#999", marginBottom: isMobile ? "4px" : "8px" }}>Total Positions</div>
          <div style={{ fontSize: isMobile ? "20px" : "28px", fontWeight: "700" }}>{positions.length}</div>
        </div>
        <div style={{
          padding: isMobile ? "12px 16px" : "20px",
          backgroundColor: "rgba(100, 108, 255, 0.1)",
          borderRadius: "12px",
          border: "1px solid #646cff"
        }}>
          <div style={{ fontSize: isMobile ? "12px" : "14px", color: "#999", marginBottom: isMobile ? "4px" : "8px" }}>Positions Market Value</div>
          <div style={{ fontSize: isMobile ? "20px" : "28px", fontWeight: "700" }}>{formatCurrency(totalMarketValue.toString())}</div>
        </div>
        <div style={{
          padding: isMobile ? "12px 16px" : "20px",
          backgroundColor: totalUnrealizedPL >= 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
          borderRadius: "12px",
          border: `1px solid ${totalUnrealizedPL >= 0 ? "#22c55e" : "#ef4444"}`
        }}>
          <div style={{ fontSize: isMobile ? "12px" : "14px", color: "#999", marginBottom: isMobile ? "4px" : "8px" }}>Total P/L</div>
          <div style={{
            fontSize: isMobile ? "20px" : "28px",
            fontWeight: "700",
            color: totalUnrealizedPL >= 0 ? "#22c55e" : "#ef4444"
          }}>
            {formatCurrency(totalUnrealizedPL.toString())}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: "16px", color: "#666", textAlign: "center", padding: "40px" }}>
          Loading positions...
        </div>
      )}

      {error && (
        <div style={{
          padding: "16px",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid #ef4444",
          borderRadius: "8px",
          color: "#ef4444",
          marginBottom: "24px"
        }}>
          {error}
        </div>
      )}

      {!loading && !error && positions.length === 0 && (
        <div style={{
          padding: "40px",
          textAlign: "center",
          backgroundColor: "rgba(100, 108, 255, 0.05)",
          borderRadius: "12px",
          border: "1px solid #ccc"
        }}>
          <h2>No Positions</h2>
          <p>You don't have any open positions yet. Start trading to see your portfolio here!</p>
        </div>
      )}

      {!loading && !error && positions.length > 0 && (
        <>
          {/* Desktop Table View - Hidden on mobile */}
          <div style={{ overflowX: "auto", display: !isMobile ? "block" : "none" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              overflow: "hidden"
            }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(100, 108, 255, 0.1)", borderBottom: "2px solid #646cff" }}>
                  <th style={{ padding: "16px", textAlign: "left", fontWeight: "600" }}>Symbol</th>
                  <th style={{ padding: "16px", textAlign: "right", fontWeight: "600" }}>Quantity</th>
                  <th style={{ padding: "16px", textAlign: "right", fontWeight: "600" }}>Avg Entry</th>
                  <th style={{ padding: "16px", textAlign: "right", fontWeight: "600" }}>Current Price</th>
                  <th style={{ padding: "16px", textAlign: "right", fontWeight: "600" }}>Market Value</th>
                  <th style={{ padding: "16px", textAlign: "right", fontWeight: "600" }}>Cost Basis</th>
                  <th style={{ padding: "16px", textAlign: "right", fontWeight: "600" }}>P/L</th>
                  <th style={{ padding: "16px", textAlign: "right", fontWeight: "600" }}>P/L %</th>
                  <th style={{ padding: "16px", textAlign: "center", fontWeight: "600" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => {
                  const pl = parseFloat(position.unrealized_pl || "0");
                  const plColor = pl >= 0 ? "#22c55e" : "#ef4444";

                  return (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(100, 108, 255, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td style={{ padding: "16px", fontFamily: "monospace", fontWeight: "600" }}>
                        {position.symbol}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>{position.qty}</td>
                      <td style={{ padding: "16px", textAlign: "right" }}>{formatCurrency(position.avg_entry_price)}</td>
                      <td style={{ padding: "16px", textAlign: "right" }}>{formatCurrency(position.current_price)}</td>
                      <td style={{ padding: "16px", textAlign: "right", fontWeight: "600" }}>
                        {formatCurrency(position.market_value)}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>{formatCurrency(position.cost_basis)}</td>
                      <td style={{ padding: "16px", textAlign: "right", fontWeight: "600", color: plColor }}>
                        {formatCurrency(position.unrealized_pl)}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right", fontWeight: "600", color: plColor }}>
                        {formatPercentage(position.unrealized_plpc)}
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <button
                          onClick={() => handleSell(position.symbol)}
                          disabled={sellingSymbol === position.symbol}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: sellingSymbol === position.symbol ? "#9ca3af" : "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: sellingSymbol === position.symbol ? "not-allowed" : "pointer",
                            transition: "background-color 0.2s",
                            opacity: sellingSymbol === position.symbol ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (sellingSymbol !== position.symbol) {
                              e.currentTarget.style.backgroundColor = "#dc2626";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (sellingSymbol !== position.symbol) {
                              e.currentTarget.style.backgroundColor = "#ef4444";
                            }
                          }}
                        >
                          {sellingSymbol === position.symbol ? "Selling..." : "Sell"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - Hidden on desktop */}
          <div style={{ display: isMobile ? "flex" : "none", flexDirection: "column", gap: "16px" }}>
            {positions.map((position, index) => {
              const pl = parseFloat(position.unrealized_pl || "0");
              const plColor = pl >= 0 ? "#22c55e" : "#ef4444";

              return (
                <div
                  key={index}
                  style={{
                    padding: "16px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    border: "1px solid #ccc",
                  }}
                >
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: "18px",
                    fontWeight: "700",
                    marginBottom: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                  }}>
                    {position.symbol}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#999", fontSize: "14px" }}>Quantity:</span>
                      <span style={{ fontWeight: "600" }}>{position.qty}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#999", fontSize: "14px" }}>Market Value:</span>
                      <span style={{ fontWeight: "600" }}>{formatCurrency(position.market_value)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#999", fontSize: "14px" }}>Avg Entry:</span>
                      <span>{formatCurrency(position.avg_entry_price)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#999", fontSize: "14px" }}>Current Price:</span>
                      <span>{formatCurrency(position.current_price)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#999", fontSize: "14px" }}>Cost Basis:</span>
                      <span>{formatCurrency(position.cost_basis)}</span>
                    </div>

                    <div style={{
                      marginTop: "8px",
                      paddingTop: "12px",
                      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <div style={{ color: "#999", fontSize: "12px", marginBottom: "4px" }}>Unrealized P/L</div>
                        <div style={{ fontWeight: "700", fontSize: "18px", color: plColor }}>
                          {formatCurrency(position.unrealized_pl)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#999", fontSize: "12px", marginBottom: "4px" }}>P/L %</div>
                        <div style={{ fontWeight: "700", fontSize: "18px", color: plColor }}>
                          {formatPercentage(position.unrealized_plpc)}
                        </div>
                      </div>
                    </div>

                    {/* Sell Button */}
                    <button
                      onClick={() => handleSell(position.symbol)}
                      disabled={sellingSymbol === position.symbol}
                      style={{
                        width: "100%",
                        marginTop: "16px",
                        padding: "12px",
                        backgroundColor: sellingSymbol === position.symbol ? "#9ca3af" : "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: sellingSymbol === position.symbol ? "not-allowed" : "pointer",
                        transition: "background-color 0.2s",
                        opacity: sellingSymbol === position.symbol ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (sellingSymbol !== position.symbol) {
                          e.currentTarget.style.backgroundColor = "#dc2626";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (sellingSymbol !== position.symbol) {
                          e.currentTarget.style.backgroundColor = "#ef4444";
                        }
                      }}
                    >
                      {sellingSymbol === position.symbol ? "Selling..." : "Sell"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Portfolio;
