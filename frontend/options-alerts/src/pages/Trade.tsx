import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

interface TradeState {
  symbol?: string;
  strikePrice?: number;
  optionType?: string;
  expirationDate?: string;
}

const Trade: React.FC = () => {
  const location = useLocation();
  const state = location.state as TradeState | null;

  const [symbol, setSymbol] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [strikePrice, setStrikePrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [occSymbol, setOccSymbol] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [contractPrice, setContractPrice] = useState<number | null>(null);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string; order?: any } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Pre-fill form if state is provided
  useEffect(() => {
    if (state) {
      if (state.symbol) setSymbol(state.symbol);
      if (state.strikePrice) setStrikePrice(state.strikePrice.toString());
      if (state.optionType) setOptionType(state.optionType as "call" | "put");
      if (state.expirationDate) setExpirationDate(state.expirationDate);
    }
  }, [state]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate OCC symbol whenever form values change
  useEffect(() => {
    if (symbol && expirationDate && strikePrice) {
      const occ = generateOccSymbol(
        symbol.toUpperCase(),
        expirationDate,
        optionType,
        parseFloat(strikePrice)
      );
      setOccSymbol(occ);
    } else {
      setOccSymbol("");
    }
  }, [symbol, expirationDate, optionType, strikePrice]);

  // Generate OCC symbol format: SYMBOL + YYMMDD + C/P + 8-digit strike
  const generateOccSymbol = (
    ticker: string,
    date: string,
    type: "call" | "put",
    strike: number
  ): string => {
    if (!ticker || !date || isNaN(strike)) return "";

    // Parse date string directly to avoid timezone issues
    // Date format from input is YYYY-MM-DD
    const [year, month, day] = date.split('-');
    const yy = year.slice(-2);
    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");
    const formattedDate = `${yy}${mm}${dd}`;

    // Format strike price to 8 digits (multiply by 1000 to handle 3 decimal places)
    const strikeFormatted = String(Math.round(strike * 1000)).padStart(8, "0");

    // Option type: C for call, P for put
    const typeChar = type === "call" ? "C" : "P";

    return `${ticker}${formattedDate}${typeChar}${strikeFormatted}`;
  };

  const handleReviewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReviewing(true);
    setOrderResult(null);
    setContractPrice(null);
    setIsFetchingPrice(true);

    console.log('[TRADE DEBUG] Reviewing order with OCC symbol:', occSymbol);

    // Fetch contract details to get the price
    try {
      const url = `http://192.168.0.129:5000/api/options/contract-details?occ_symbol=${occSymbol}`;
      console.log('[TRADE DEBUG] Fetching contract price from:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('[TRADE DEBUG] Contract API response:', data);

      if (data.success && data.contract) {
        // Extract the latest price from the contract data
        // Alpaca provides close_price, which is the last traded price
        const price = data.contract.close_price || data.contract.ask_price || 0;
        console.log('[TRADE DEBUG] Contract price found:', price);
        setContractPrice(price);
      } else {
        console.error('[TRADE DEBUG] Failed to fetch contract price:', data.error);
        console.error('[TRADE DEBUG] Full response:', data);
      }
    } catch (error) {
      console.error('[TRADE DEBUG] Error fetching contract price:', error);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setOrderResult(null);

    try {
      const response = await fetch("http://192.168.0.129:5000/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          occ_symbol: occSymbol,
          quantity: parseInt(quantity),
          order_type: "market",
          side: "buy",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOrderResult({
          success: true,
          message: "Order submitted successfully to Alpaca paper trading!",
          order: data.order,
        });
        setIsReviewing(false);
      } else {
        setOrderResult({
          success: false,
          message: data.error || "Failed to submit order",
        });
      }
    } catch (error) {
      setOrderResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReview = () => {
    setIsReviewing(false);
    setContractPrice(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const calculateTotalCost = () => {
    if (!contractPrice) return null;
    // Each option contract represents 100 shares
    return contractPrice * parseInt(quantity) * 100;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: isMobile ? "12px" : "0" }}>
        <h1 style={{ fontSize: isMobile ? "24px" : "32px", margin: isMobile ? "0 0 4px 0" : "0 0 8px 0" }}>Trade Options</h1>
        <p style={{ fontSize: isMobile ? "14px" : "16px", margin: 0 }}>Enter option details to generate an OCC symbol and submit your trade.</p>
      </div>

      {state && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            backgroundColor: "rgba(100, 108, 255, 0.1)",
            border: "1px solid #646cff",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#646cff",
          }}
        >
          ✓ Form pre-filled from selected play
        </div>
      )}

      <div
        style={{
          marginTop: "32px",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <form onSubmit={handleReviewOrder}>
          {/* Underlying Symbol */}
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="symbol"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Underlying Symbol
            </label>
            <input
              id="symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., TSLA, AAPL"
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: "transparent",
                color: "inherit",
              }}
            />
          </div>

          {/* Expiration Date */}
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="expirationDate"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Expiration Date
            </label>
            <input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: "transparent",
                color: "inherit",
              }}
            />
          </div>

          {/* Option Type */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Option Type
            </label>
            <div style={{ display: "flex", gap: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="call"
                  checked={optionType === "call"}
                  onChange={(e) => setOptionType(e.target.value as "call")}
                  style={{ marginRight: "8px", cursor: "pointer" }}
                />
                Call
              </label>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="put"
                  checked={optionType === "put"}
                  onChange={(e) => setOptionType(e.target.value as "put")}
                  style={{ marginRight: "8px", cursor: "pointer" }}
                />
                Put
              </label>
            </div>
          </div>

          {/* Strike Price */}
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="strikePrice"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Strike Price ($)
            </label>
            <input
              id="strikePrice"
              type="number"
              step="0.01"
              min="0"
              value={strikePrice}
              onChange={(e) => setStrikePrice(e.target.value)}
              placeholder="e.g., 250.00"
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: "transparent",
                color: "inherit",
              }}
            />
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="quantity"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Quantity (Contracts)
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: "transparent",
                color: "inherit",
              }}
            />
          </div>

          {/* OCC Symbol Display */}
          {occSymbol && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px",
                backgroundColor: "rgba(100, 108, 255, 0.1)",
                borderRadius: "8px",
                border: "1px solid #646cff",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#646cff",
                }}
              >
                Generated OCC Symbol
              </label>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  fontFamily: "monospace",
                  letterSpacing: "1px",
                }}
              >
                {occSymbol}
              </div>
            </div>
          )}


          {/* Order Result */}
          {orderResult && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px",
                backgroundColor: orderResult.success
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
                borderRadius: "8px",
                border: `1px solid ${orderResult.success ? "#22c55e" : "#ef4444"}`,
              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  color: orderResult.success ? "#22c55e" : "#ef4444",
                  marginBottom: "8px",
                }}
              >
                {orderResult.success ? "✓ Success" : "✗ Error"}
              </div>
              <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                {orderResult.message}
              </div>
              {orderResult.success && orderResult.order && (
                <div
                  style={{
                    fontSize: "12px",
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                  }}
                >
                  <div>Order ID: {orderResult.order.id}</div>
                  <div>Status: {orderResult.order.status}</div>
                  <div>Side: {orderResult.order.side}</div>
                  <div>Quantity: {orderResult.order.qty}</div>
                  <div>Type: {orderResult.order.type}</div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: "600",
              backgroundColor: isSubmitting ? "#9ca3af" : "#646cff",
              color: "white",
              border: "1px solid transparent",
              borderRadius: "8px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.25s",
              fontFamily: "inherit",
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = "#535bf2";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = "#646cff";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            Review Order
          </button>
        </form>
      </div>

      {/* Review Order Modal */}
      {isReviewing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            // Close modal if backdrop is clicked
            if (e.target === e.currentTarget && !isSubmitting) {
              handleCancelReview();
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              borderRadius: "16px",
              border: "2px solid #ffbb00",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid rgba(255, 187, 0, 0.3)",
                backgroundColor: "rgba(255, 187, 0, 0.1)",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#ffbb00",
                }}
              >
                Review Your Order
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>Symbol:</span>
                  <span style={{ fontWeight: "700", fontFamily: "monospace", fontSize: "18px", color: "#e0e0e0" }}>{symbol}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>Type:</span>
                  <span style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "16px", color: "#e0e0e0" }}>{optionType}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>Strike Price:</span>
                  <span style={{ fontWeight: "700", fontSize: "16px", color: "#e0e0e0" }}>${strikePrice}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>Expiration:</span>
                  <span style={{ fontWeight: "700", fontSize: "16px", color: "#e0e0e0" }}>{expirationDate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>Quantity:</span>
                  <span style={{ fontWeight: "700", fontSize: "16px", color: "#e0e0e0" }}>{quantity} contracts</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>Order Type:</span>
                  <span style={{ fontWeight: "700", fontSize: "16px", color: "#e0e0e0" }}>Market</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>Side:</span>
                  <span style={{ fontWeight: "700", fontSize: "16px", color: "#22c55e" }}>Buy</span>
                </div>

                {/* OCC Symbol */}
                <div style={{
                  marginTop: "8px",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(255, 187, 0, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
                  <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>OCC Symbol:</span>
                  <div style={{
                    fontWeight: "700",
                    fontFamily: "monospace",
                    fontSize: "18px",
                    padding: "12px",
                    backgroundColor: "rgba(100, 108, 255, 0.2)",
                    borderRadius: "8px",
                    textAlign: "center",
                    letterSpacing: "1px",
                    color: "#a5b4fc"
                  }}>
                    {occSymbol}
                  </div>
                </div>

                {/* Pricing Information */}
                <div style={{
                  marginTop: "8px",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(255, 187, 0, 0.3)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
                    <span style={{ color: "#888", fontWeight: "600", fontSize: "14px" }}>Price per Contract:</span>
                    <span style={{ fontWeight: "700", fontSize: "16px", color: "#e0e0e0" }}>
                      {isFetchingPrice ? (
                        "Loading..."
                      ) : contractPrice !== null ? (
                        formatCurrency(contractPrice)
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <div style={{
                    padding: "16px",
                    backgroundColor: "rgba(255, 187, 0, 0.2)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 187, 0, 0.4)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "700", fontSize: "18px", color: "#fcd34d" }}>Total Cost:</span>
                      <span style={{ fontWeight: "700", fontSize: "28px", color: "#fde047" }}>
                        {isFetchingPrice ? (
                          "Loading..."
                        ) : contractPrice !== null ? (
                          formatCurrency(calculateTotalCost()!)
                        ) : (
                          "N/A"
                        )}
                      </span>
                    </div>
                    {contractPrice !== null && (
                      <div style={{
                        fontSize: "12px",
                        color: "#d1d5db",
                        marginTop: "8px",
                        textAlign: "right"
                      }}>
                        ({formatCurrency(contractPrice)} × {quantity} contracts × 100 shares)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                gap: "12px",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
              }}
            >
              <button
                type="button"
                onClick={handleCancelReview}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: "transparent",
                  color: "#646cff",
                  border: "1px solid #646cff",
                  borderRadius: "8px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  transition: "all 0.25s",
                  fontFamily: "inherit",
                  opacity: isSubmitting ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = "rgba(100, 108, 255, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isSubmitting || isFetchingPrice}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: isSubmitting || isFetchingPrice ? "#9ca3af" : "#22c55e",
                  color: "white",
                  border: "1px solid transparent",
                  borderRadius: "8px",
                  cursor: isSubmitting || isFetchingPrice ? "not-allowed" : "pointer",
                  transition: "all 0.25s",
                  fontFamily: "inherit",
                  opacity: isSubmitting || isFetchingPrice ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && !isFetchingPrice) {
                    e.currentTarget.style.backgroundColor = "#16a34a";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting && !isFetchingPrice) {
                    e.currentTarget.style.backgroundColor = "#22c55e";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {isSubmitting ? "Submitting..." : isFetchingPrice ? "Loading Price..." : "Confirm Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trade;
