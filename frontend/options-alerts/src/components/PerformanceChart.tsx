import React from "react";

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

interface PerformanceChartProps {
  data: HistoricalData;
  height?: number;
  timeRange?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, height = 400, timeRange = '1D' }) => {
  const [hoveredPoint, setHoveredPoint] = React.useState<{ x: number; y: number; price: number; time: string } | null>(null);

  console.log('[CHART DEBUG] PerformanceChart rendering with data:', {
    symbol: data?.symbol,
    barCount: data?.bar_count,
    barsLength: data?.bars?.length,
    timeRange: timeRange
  });

  // Defensive check for data
  if (!data || !data.bars || !Array.isArray(data.bars) || data.bars.length === 0) {
    console.error('[CHART DEBUG] Invalid data:', data);
    return (
      <div style={{ padding: "20px", color: "#ef4444", textAlign: "center" }}>
        No chart data available
      </div>
    );
  }

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const chartHeight = isMobile ? 300 : height;
  const padding = { top: 20, right: 60, bottom: 50, left: 60 }; // Increased right padding for price label
  const chartWidth = isMobile ? 320 : 700;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Extract prices
  const prices = data.bars.map(bar => bar.close);
  const minPrice = 0; // Always start Y-axis at zero
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Find the snapshot point (current price) if it exists
  const snapshotBar = data.bars.find(bar => bar.isSnapshot);
  const currentPrice = snapshotBar ? snapshotBar.close : null;

  // Create path for line chart
  const points = data.bars.map((bar, i) => {
    const x = (i / (data.bars.length - 1)) * innerWidth;
    const y = innerHeight - ((bar.close - minPrice) / priceRange) * innerHeight;
    return { x, y, price: bar.close, timestamp: bar.timestamp };
  });

  const pathData = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    minPrice + (priceRange / (yTicks - 1)) * i
  );

  // X-axis time markers - adjust based on time range
  const xTimeMarkers: Array<{ index: number; time: string }> = [];

  if (timeRange === '1D') {
    // For 1 day: show every hour
    const seenHours = new Set<number>();
    data.bars.forEach((bar, index) => {
      const date = new Date(bar.timestamp);
      const hour = date.getHours();
      const minute = date.getMinutes();

      // Mark the beginning of each hour (within first few minutes)
      if (minute < 5 && !seenHours.has(hour)) {
        seenHours.add(hour);
        xTimeMarkers.push({
          index,
          time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        });
      }
    });

    // If we have very few markers, add some evenly spaced ones
    if (xTimeMarkers.length < 3) {
      xTimeMarkers.length = 0;
      const step = Math.floor(data.bars.length / 5);
      for (let i = 0; i < data.bars.length; i += step) {
        const date = new Date(data.bars[i].timestamp);
        xTimeMarkers.push({
          index: i,
          time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        });
      }
    }
  } else if (timeRange === '1W') {
    // For 1 week: show each day
    const seenDays = new Set<string>();
    data.bars.forEach((bar, index) => {
      const date = new Date(bar.timestamp);
      const dayKey = date.toDateString();

      if (!seenDays.has(dayKey)) {
        seenDays.add(dayKey);
        xTimeMarkers.push({
          index,
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    });
  } else {
    // For 1M, 3M, 1Y, ALL: show dates 1 week apart
    const seenWeeks = new Set<string>();
    data.bars.forEach((bar, index) => {
      const date = new Date(bar.timestamp);
      // Get the week number (approximate: day of year / 7)
      const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
      const weekKey = `${date.getFullYear()}-${Math.floor(dayOfYear / 7)}`;

      if (!seenWeeks.has(weekKey)) {
        seenWeeks.add(weekKey);
        xTimeMarkers.push({
          index,
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    });

    // Ensure we have at least 3 markers
    if (xTimeMarkers.length < 3) {
      xTimeMarkers.length = 0;
      const step = Math.floor(data.bars.length / 5);
      for (let i = 0; i < data.bars.length; i += step) {
        const date = new Date(data.bars[i].timestamp);
        xTimeMarkers.push({
          index: i,
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find the closest data point by X position
    const relativeX = mouseX - padding.left;
    if (relativeX < 0 || relativeX > innerWidth) {
      setHoveredPoint(null);
      return;
    }

    // Calculate which data point index we're closest to
    const index = Math.round((relativeX / innerWidth) * (points.length - 1));
    if (index >= 0 && index < points.length) {
      const point = points[index];
      const bar = data.bars[index];
      const date = new Date(bar.timestamp);

      setHoveredPoint({
        x: point.x + padding.left,
        y: point.y + padding.top,
        price: bar.close,
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        width={chartWidth}
        height={chartHeight}
        style={{ display: "block", margin: "0 auto", backgroundColor: "white", borderRadius: "8px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* White background */}
        <rect
          x="0"
          y="0"
          width={chartWidth}
          height={chartHeight}
          fill="white"
        />

        {/* Y-axis label */}
        <text
          x={15}
          y={chartHeight / 2}
          textAnchor="middle"
          fill="#666"
          fontSize="14"
          fontWeight="bold"
          transform={`rotate(-90, 15, ${chartHeight / 2})`}
        >
          Close Price
        </text>

        {/* X-axis label */}
        <text
          x={chartWidth / 2}
          y={chartHeight - 3}
          textAnchor="middle"
          fill="#666"
          fontSize="12"
          fontWeight="bold"
        >
          Time
        </text>

        {/* Y-axis grid lines */}
        {yTickValues.map((value, i) => {
          const y = innerHeight - ((value - minPrice) / priceRange) * innerHeight + padding.top;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#333"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="#999"
                fontSize="12"
              >
                ${value.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Current price horizontal line (red dotted) */}
        {currentPrice !== null && (() => {
          const y = innerHeight - ((currentPrice - minPrice) / priceRange) * innerHeight + padding.top;
          return (
            <g>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.8"
              />
              <text
                x={chartWidth - padding.right + 5}
                y={y + 4}
                textAnchor="start"
                fill="#ef4444"
                fontSize="11"
                fontWeight="bold"
              >
                ${currentPrice.toFixed(2)}
              </text>
            </g>
          );
        })()}

        {/* Line chart */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          <path
            d={pathData}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
          />

          {/* Data points */}
          {points.map((point, i) => {
            const bar = data.bars[i];
            const isSnapshot = bar.isSnapshot || false;
            const dotColor = isSnapshot ? "#ef4444" : "#22c55e"; // Red for snapshot, green for historical
            const dotRadius = isSnapshot ? (isMobile ? "3" : "4") : (isMobile ? "1" : "2"); // Larger for snapshot

            return (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={dotRadius}
                fill={dotColor}
                stroke={isSnapshot ? "white" : "none"}
                strokeWidth={isSnapshot ? "1" : "0"}
              >
                <title>
                  ${point.price.toFixed(2)} - {new Date(point.timestamp).toLocaleString()}
                  {isSnapshot ? " (Live)" : ""}
                </title>
              </circle>
            );
          })}
        </g>

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={chartWidth - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="#999"
          strokeWidth="1"
        />

        {/* X-axis time markers */}
        {xTimeMarkers.map((marker, i) => {
          const x = padding.left + (marker.index / (data.bars.length - 1)) * innerWidth;
          const y = chartHeight - padding.bottom;

          return (
            <g key={i}>
              {/* Tick mark */}
              <line
                x1={x}
                y1={y}
                x2={x}
                y2={y + 5}
                stroke="#999"
                strokeWidth="1"
              />
              {/* Time label */}
              <text
                x={x}
                y={y + 18}
                textAnchor="middle"
                fill="#666"
                fontSize={isMobile ? "10" : "11"}
              >
                {marker.time}
              </text>
            </g>
          );
        })}

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={chartHeight - padding.bottom}
          stroke="#999"
          strokeWidth="1"
        />

        {/* Hover tooltip and highlight */}
        {hoveredPoint && (() => {
          // Find the bar at the hovered index to check if it's a snapshot
          const hoveredIndex = points.findIndex(p => p.x === hoveredPoint.x - padding.left && p.y === hoveredPoint.y - padding.top);
          const isHoveredSnapshot = hoveredIndex >= 0 && data.bars[hoveredIndex]?.isSnapshot;
          const highlightColor = isHoveredSnapshot ? "#ef4444" : "#22c55e"; // Red for snapshot, green for historical

          // Determine tooltip position - flip to left if near right edge
          const tooltipWidth = 100;
          const tooltipHeight = 50;
          const isNearRightEdge = hoveredPoint.x + tooltipWidth + 15 > chartWidth;
          const isNearTopEdge = hoveredPoint.y - tooltipHeight / 2 < padding.top;
          const isNearBottomEdge = hoveredPoint.y + tooltipHeight / 2 > chartHeight - padding.bottom;

          // Calculate tooltip position
          const tooltipX = isNearRightEdge ? hoveredPoint.x - tooltipWidth - 10 : hoveredPoint.x + 10;
          let tooltipY = hoveredPoint.y - tooltipHeight / 2;

          // Adjust Y position if near top or bottom
          if (isNearTopEdge) {
            tooltipY = padding.top + 5;
          } else if (isNearBottomEdge) {
            tooltipY = chartHeight - padding.bottom - tooltipHeight - 5;
          }

          // Calculate delta from current price if available
          const delta = currentPrice !== null ? Math.abs(hoveredPoint.price - currentPrice) : null;
          const hasThreeLines = delta !== null;

          const textX = tooltipX + tooltipWidth / 2;
          const textY1 = hasThreeLines ? tooltipY + tooltipHeight / 2 - 10 : tooltipY + tooltipHeight / 2 - 5;
          const textY2 = hasThreeLines ? tooltipY + tooltipHeight / 2 + 5 : tooltipY + tooltipHeight / 2 + 15;
          const textY3 = tooltipY + tooltipHeight / 2 + 20;

          return (
            <>
              {/* Vertical crosshair line */}
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={chartHeight - padding.bottom}
                stroke={highlightColor}
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.6"
              />

              {/* Highlight the hovered point */}
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill={highlightColor}
                stroke="white"
                strokeWidth="2"
              />

              {/* Tooltip box */}
              <g>
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={hasThreeLines ? 65 : tooltipHeight}
                  fill="#1a1a1a"
                  stroke={highlightColor}
                  strokeWidth="2"
                  rx="4"
                  opacity="0.95"
                />
                <text
                  x={textX}
                  y={textY1}
                  textAnchor="middle"
                  fill={highlightColor}
                  fontSize="14"
                  fontWeight="bold"
                >
                  ${hoveredPoint.price.toFixed(2)}
                </text>
                {delta !== null && (
                  <text
                    x={textX}
                    y={textY2}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    Δ ${delta.toFixed(2)}
                  </text>
                )}
                <text
                  x={textX}
                  y={hasThreeLines ? textY3 : textY2}
                  textAnchor="middle"
                  fill="#999"
                  fontSize="11"
                >
                  {hoveredPoint.time}
                </text>
              </g>
            </>
          );
        })()}
      </svg>

      <div
        style={{
          marginTop: "12px",
          fontSize: isMobile ? "10px" : "12px",
          color: "#999",
          textAlign: "center",
          padding: "0 4px",
        }}
      >
        {isMobile ? (
          <>
            {data.symbol}<br />
            {data.bar_count} bars
          </>
        ) : (
          `${data.symbol} • ${data.bar_count} bars • ${new Date(data.start_time).toLocaleString()} - ${new Date(data.end_time).toLocaleString()}`
        )}
      </div>
    </div>
  );
};

export default PerformanceChart;
