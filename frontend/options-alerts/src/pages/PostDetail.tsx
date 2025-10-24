import React from "react";
import { useParams, Link } from "react-router-dom";

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // In a real app, you'd fetch this data based on the ID
  // For now, we'll use mock data
  const postData: { [key: string]: { title: string; content: string; symbol: string; details: string } } = {
    "0": {
      title: "AAPL $200 Calls",
      content: "Strong bullish momentum on Apple, targeting $200 by next Friday. Volume spike detected.",
      symbol: "AAPL",
      details: "Apple has shown strong bullish momentum with significant volume increases. Technical indicators suggest a move toward $200 in the short term. Consider entry points around current levels with a target of $200 by next week's expiration."
    },
    "1": {
      title: "TSLA $250 Puts",
      content: "Bearish setup forming on Tesla. Consider $250 puts expiring in 2 weeks.",
      symbol: "TSLA",
      details: "Tesla is showing signs of weakness with a bearish pattern forming on the daily chart. The $250 level appears to be a strong support that could be tested. Two-week expiration gives enough time for the move to play out."
    },
    "2": {
      title: "SPY Iron Condor",
      content: "Market consolidating. Iron condor play between $580-$590 for weekly expiration.",
      symbol: "SPY",
      details: "SPY has been trading in a tight range, making it an ideal candidate for an iron condor strategy. Sell the $580 put and $590 call while buying further OTM options for protection. This weekly play benefits from theta decay as the market consolidates."
    }
  };

  const post = id ? postData[id] : null;

  if (!post) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <h2>Post not found</h2>
        <Link to="/" style={{ color: "#646cff" }}>← Back to Home</Link>
      </div>
    );
  }

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
        <p style={{ fontSize: "18px", lineHeight: "1.6", marginTop: "16px" }}>
          {post.content}
        </p>

        <div style={{
          marginTop: "32px",
          padding: "20px",
          backgroundColor: "rgba(100, 108, 255, 0.1)",
          borderRadius: "8px",
          borderLeft: "4px solid #646cff"
        }}>
          <h3>Detailed Analysis</h3>
          <p style={{ lineHeight: "1.6" }}>{post.details}</p>
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