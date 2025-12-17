import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate, useParams } from "react-router-dom";
import PerformanceChart from "../components/PerformanceChart";

interface FreshPlay {
  id: number;
  symbol: string;
  price: number;
  expiration: string;
  type: string;
  play_date: string;
  created_at: string;
}

interface BarData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count: number;
  vwap: number;
  symbol: string;
  isSnapshot?: boolean; // Mark if this is a real-time snapshot point
}

interface HistoricalData {
  symbol: string;
  start_time: string;
  end_time: string;
  bar_count: number;
  bars: BarData[];
}

const PostDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState(location.state as { title: string; content: string; symbol: string; plays?: FreshPlay[] } | null);
  const [loading, setLoading] = useState(!location.state && !!id);
  const [hoveredPlayId, setHoveredPlayId] = useState<number | null>(null);
  const [selectedPlayForChart, setSelectedPlayForChart] = useState<FreshPlay | null>(null);
  const [chartData, setChartData] = useState<HistoricalData | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('1D');

  useEffect(() => {
    // If we have state, don't fetch
    if (location.state) {
      return;
    }

    // If we have an ID but no state, fetch the play
    if (id) {
      fetchPlayById(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location.state]);

  // Automatically load chart if there's only one play
  useEffect(() => {
    if (post?.plays && post.plays.length === 1 && !selectedPlayForChart && !loadingChart) {
      console.log('[DEBUG] Auto-loading chart for single play');
      const syntheticEvent = {
        stopPropagation: () => {},
      } as React.MouseEvent;

      handlePerformanceClick(syntheticEvent, post.plays[0], selectedTimeRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  // Refetch chart data when time range changes
  useEffect(() => {
    if (selectedPlayForChart) {
      console.log('[DEBUG] Time range changed to:', selectedTimeRange, '- Refetching data');
      // Create a synthetic event to pass to handlePerformanceClick
      const syntheticEvent = {
        stopPropagation: () => {},
      } as React.MouseEvent;

      handlePerformanceClick(syntheticEvent, selectedPlayForChart, selectedTimeRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeRange]);

  const fetchPlayById = async (playId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://192.168.0.129:5000/api/fresh-plays/${playId}`);
      const data = await response.json();

      if (data.success && data.data) {
        const play = data.data;
        setPost({
          title: `${play.symbol} ${play.type.charAt(0).toUpperCase() + play.type.slice(1)} Option`,
          content: `Options contract for ${play.symbol}`,
          symbol: play.symbol,
          plays: [play]
        });
      } else {
        setPost(null);
      }
    } catch (err) {
      console.error("Error fetching play:", err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <h2>Post not found</h2>
        <Link to="/" style={{ color: "#646cff" }}>← Back to Home</Link>
      </div>
    );
  }

  const generateOccSymbol = (play: FreshPlay): string => {
    let formattedDate: string;

    if (play.expiration.toLowerCase() === 'weekly') {
      // For weekly options, calculate the next Friday
      // Parse date in local timezone to avoid UTC offset issues
      const [year, month, day] = play.play_date.split('-').map(Number);
      const playDate = new Date(year, month - 1, day);
      const dayOfWeek = playDate.getDay(); // 0 = Sunday, 5 = Friday

      // Calculate days until Friday (or 0 if already Friday)
      const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;

      const nextFriday = new Date(playDate);
      nextFriday.setDate(playDate.getDate() + daysUntilFriday);

      // Format as YYMMDD
      const yy = nextFriday.getFullYear().toString().slice(-2);
      const mm = String(nextFriday.getMonth() + 1).padStart(2, "0");
      const dd = String(nextFriday.getDate()).padStart(2, "0");
      formattedDate = `${yy}${mm}${dd}`;
    } else {
      // Parse expiration date in MM/DD format
      const [month, day] = play.expiration.split('/').map(num => num.trim());
      const [year, playMonth, playDay] = play.play_date.split('-').map(Number);

      // Determine the correct year
      const expirationMonth = parseInt(month) - 1;
      const expirationDay = parseInt(day);

      let expirationYear = year;
      if (expirationMonth < playMonth - 1 || (expirationMonth === playMonth - 1 && expirationDay < playDay)) {
        expirationYear = year + 1;
      }

      // Format date as YYMMDD
      const yy = expirationYear.toString().slice(-2);
      const mm = month.padStart(2, "0");
      const dd = day.padStart(2, "0");
      formattedDate = `${yy}${mm}${dd}`;
    }

    // Format strike price to 8 digits (multiply by 1000)
    const strikeFormatted = String(Math.round(play.price * 1000)).padStart(8, "0");

    // Option type: C for call, P for put
    const typeChar = play.type.toLowerCase() === "calls" ? "C" : "P";

    return `${play.symbol}${formattedDate}${typeChar}${strikeFormatted}`;
  };

  const handlePerformanceClick = async (e: React.MouseEvent, play: FreshPlay, timeRange?: string) => {
    e.stopPropagation(); // Prevent triggering the trade navigation
    console.log('[DEBUG] Performance clicked for:', play.symbol, 'Time range:', timeRange || selectedTimeRange);

    try {
      setSelectedPlayForChart(play);
      setLoadingChart(true);
      setChartError(null);
      setChartData(null);
      console.log('[DEBUG] Downloading real historical data from Alpaca...');

      // Generate OCC symbol
      const occSymbol = generateOccSymbol(play);
      console.log('[DEBUG] OCC Symbol:', occSymbol);

      // Use the provided time range or the selected one
      const range = timeRange || selectedTimeRange;

      // Fetch both historical bars and current snapshot
      // Pass play_date and expiration for historical plays
      const playDateParam = encodeURIComponent(play.play_date);
      const expirationParam = encodeURIComponent(play.expiration);

      const [barsResponse, snapshotResponse] = await Promise.all([
        fetch(`http://192.168.0.129:5000/api/download-historical-bars/${occSymbol}?time_range=${range}&play_date=${playDateParam}&expiration=${expirationParam}`),
        fetch(`http://192.168.0.129:5000/api/fetch-options-snapshot?symbol=${occSymbol}`)
      ]);

      const barsData = await barsResponse.json();
      const snapshotData = await snapshotResponse.json();

      console.log('[DEBUG] Bars API response:', barsData);
      console.log('[DEBUG] Snapshot API response:', snapshotData);

      if (barsData.success) {
        const historicalData = barsData.data;

        // If we have a snapshot, append it as the latest data point
        if (snapshotData.success && snapshotData.data) {
          const snapshot = snapshotData.data[occSymbol] || snapshotData.data;
          console.log('[DEBUG] Snapshot data:', snapshot);

          // The snapshot data structure varies - try to find the price
          let price = 0;
          let timestamp = new Date().toISOString();

          // Try different ways to extract the price from the snapshot
          if (snapshot.latestTrade) {
            // Check if latestTrade has 'p' or 'price' property
            price = parseFloat(snapshot.latestTrade.p || snapshot.latestTrade.price || 0);
            timestamp = snapshot.latestTrade.t || snapshot.latestTrade.timestamp || timestamp;
          } else if (snapshot.latest_trade) {
            // Alternative field name
            price = parseFloat(snapshot.latest_trade.p || snapshot.latest_trade.price || 0);
            timestamp = snapshot.latest_trade.t || snapshot.latest_trade.timestamp || timestamp;
          } else if (typeof snapshot === 'object') {
            // Check for direct properties in the snapshot object
            console.log('[DEBUG] Snapshot keys:', Object.keys(snapshot));
            // Try to find a price field
            for (const key of Object.keys(snapshot)) {
              const value = snapshot[key];
              if (typeof value === 'object' && value !== null) {
                if (value.p || value.price) {
                  price = parseFloat(value.p || value.price);
                  timestamp = value.t || value.timestamp || timestamp;
                  console.log('[DEBUG] Found price in:', key, price);
                  break;
                }
              }
            }
          }

          if (price > 0) {
            const snapshotBar: BarData = {
              timestamp: timestamp,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 0,
              trade_count: 0,
              vwap: price,
              symbol: occSymbol,
              isSnapshot: true // Mark this as a snapshot point
            };

            historicalData.bars.push(snapshotBar);
            historicalData.bar_count = historicalData.bars.length;
            console.log('[DEBUG] Added snapshot as red dot:', snapshotBar);
          } else {
            console.log('[DEBUG] Could not extract price from snapshot');
          }
        }

        console.log('[DEBUG] Setting chart data with', historicalData.bars.length, 'bars (including snapshot)');
        setChartData(historicalData);
      } else {
        console.error('[DEBUG] API error:', barsData.error);
        setChartError(barsData.error || "Failed to load chart data");
      }
      setLoadingChart(false);
    } catch (error) {
      console.error('[DEBUG] Error in handlePerformanceClick:', error);
      setChartError(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setLoadingChart(false);
    }
  };

  const handlePlayClick = (play: FreshPlay) => {
    console.log('[DEBUG] Play clicked:', play);

    let formattedDate: string;

    if (play.expiration.toLowerCase() === 'weekly') {
      // For weekly options, calculate the next Friday
      // Parse date in local timezone to avoid UTC offset issues
      const [year, month, day] = play.play_date.split('-').map(Number);
      const playDate = new Date(year, month - 1, day);
      const dayOfWeek = playDate.getDay(); // 0 = Sunday, 5 = Friday

      console.log('[DEBUG] Play date:', play.play_date, 'Day of week:', dayOfWeek);

      // Calculate days until Friday (or 0 if already Friday)
      const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;

      const nextFriday = new Date(playDate);
      nextFriday.setDate(playDate.getDate() + daysUntilFriday);

      formattedDate = nextFriday.toISOString().split('T')[0];
      console.log('[DEBUG] Weekly expiration, using next Friday:', formattedDate, 'Days added:', daysUntilFriday);
    } else {
      // Parse expiration date from the play
      // Expiration is in format like "11/21" (MM/DD)
      const [month, day] = play.expiration.split('/').map(num => num.trim());
      const playDate = new Date(play.play_date);
      const currentYear = playDate.getFullYear();

      // Create expiration date with the current year
      // If the expiration month is less than play month, use next year
      const expirationMonth = parseInt(month) - 1; // JavaScript months are 0-indexed
      const expirationDay = parseInt(day);
      const playMonth = playDate.getMonth();

      let year = currentYear;
      if (expirationMonth < playMonth || (expirationMonth === playMonth && expirationDay < playDate.getDate())) {
        year = currentYear + 1;
      }

      const expirationDate = new Date(year, expirationMonth, expirationDay);
      formattedDate = expirationDate.toISOString().split('T')[0];
    }

    // Navigate to trade page with pre-filled data
    // Convert "calls" -> "call", "puts" -> "put"
    const normalizedType = play.type.toLowerCase().replace(/s$/, '');

    console.log('[DEBUG] Navigating to /trade with state:', {
      symbol: play.symbol,
      strikePrice: play.price,
      optionType: normalizedType,
      expirationDate: formattedDate,
    });

    navigate('/trade', {
      state: {
        symbol: play.symbol,
        strikePrice: play.price,
        optionType: normalizedType,
        expirationDate: formattedDate,
      }
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      padding: "24px",
      maxWidth: "800px",
      margin: "0 auto"
    }}>
      <Link to="/" style={{ color: "#646cff", textDecoration: "none", fontSize: "14px" }}>
        ← Back to all posts
      </Link>

      <div style={{ marginTop: "24px" }}>
        <h1>{post.title}</h1>

        {post.plays && post.plays.length > 0 && (
          <div style={{
            marginTop: "32px",
            padding: "20px",
            backgroundColor: "rgba(100, 108, 255, 0.05)",
            borderRadius: "8px",
            border: "1px solid #ccc"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Related Plays</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {post.plays.map((play) => {
                const typeCapitalized = play.type.charAt(0).toUpperCase() + play.type.slice(1);
                const [year, month, day] = play.play_date.split('-');
                const formattedDate = `${month}/${day}/${year}`;
                const isHovered = hoveredPlayId === play.id;

                return (
                  <div
                    key={play.id}
                    onClick={() => handlePlayClick(play)}
                    onMouseEnter={() => setHoveredPlayId(play.id)}
                    onMouseLeave={() => setHoveredPlayId(null)}
                    style={{
                      padding: "12px 16px",
                      backgroundColor: isHovered ? "rgba(100, 108, 255, 0.2)" : "rgba(255, 255, 255, 0.9)",
                      borderRadius: "8px",
                      border: `1px solid ${isHovered ? "#646cff" : "#ccc"}`,
                      fontSize: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      transform: isHovered ? "translateX(4px)" : "translateX(0)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>{play.symbol} ${play.price} {typeCapitalized}</strong>
                      <div style={{ fontSize: "14px", color: "#999", marginTop: "4px" }}>
                        {play.expiration} expiration • {formattedDate}
                      </div>
                      {isHovered && (
                        <div style={{ fontSize: "12px", color: "#646cff", marginTop: "6px" }}>
                          Click to trade →
                        </div>
                      )}
                    </div>
                    <div
                      onClick={(e) => handlePerformanceClick(e, play)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        marginLeft: "16px",
                        opacity: 0.7,
                        cursor: "pointer",
                        padding: "8px",
                        borderRadius: "6px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.7";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 3v18h18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7 16l4-8 4 4 4-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="7" cy="16" r="1.5" fill="currentColor" />
                        <circle cx="11" cy="8" r="1.5" fill="currentColor" />
                        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="19" cy="6" r="1.5" fill="currentColor" />
                      </svg>
                      <span style={{ fontSize: "10px", color: "#666", whiteSpace: "nowrap" }}>
                        See Performance
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance Section */}
        <div style={{
          marginTop: "32px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Performance</h3>

            {/* Time Range Buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              {['1D', '1W', '1M', '3M', '1Y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: selectedTimeRange === range ? "#646cff" : "transparent",
                    color: selectedTimeRange === range ? "white" : "#646cff",
                    border: `1px solid ${selectedTimeRange === range ? "#646cff" : "#ccc"}`,
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTimeRange !== range) {
                      e.currentTarget.style.backgroundColor = "rgba(100, 108, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTimeRange !== range) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {!selectedPlayForChart && !chartData && !loadingChart && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              gap: "12px"
            }}>
              {/* Graph Icon */}
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ opacity: 0.6 }}
              >
                <path
                  d="M3 3v18h18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 16l4-8 4 4 4-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="16" r="1.5" fill="currentColor" />
                <circle cx="11" cy="8" r="1.5" fill="currentColor" />
                <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                <circle cx="19" cy="6" r="1.5" fill="currentColor" />
              </svg>
              <div style={{ fontSize: "14px", color: "#999" }}>
                Click "See Performance" on any play to view its chart
              </div>
            </div>
          )}

          {loadingChart && (
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
              Loading chart data...
            </div>
          )}

          {chartError && (
            <div style={{
              padding: "20px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              color: "#ef4444",
            }}>
              {chartError}
            </div>
          )}

          {chartData && !loadingChart && !chartError && selectedPlayForChart && (
            <div>
              <div style={{
                marginBottom: "16px",
                padding: "12px",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "700" }}>
                    {selectedPlayForChart.symbol} ${selectedPlayForChart.price} {selectedPlayForChart.type}
                  </div>
                  <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                    Expires: {selectedPlayForChart.expiration}
                  </div>
                </div>
              </div>
              <PerformanceChart data={chartData} height={400} timeRange={selectedTimeRange} />
            </div>
          )}
        </div>

        <div style={{ marginTop: "32px" }}>
          <a
            href={`https://finance.yahoo.com/quote/${post.symbol}/`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#646cff",
              color: "white",
              textDecoration: "none",
              borderRadius: "8px",
              fontSize: "16px"
            }}
          >
            View {post.symbol} on Yahoo Finance →
          </a>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;