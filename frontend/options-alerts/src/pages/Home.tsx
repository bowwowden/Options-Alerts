import React from "react";
import Post from "../components/Post";

const Home: React.FC = () => {
  const posts = [
    { id: 0, title: "AAPL $200 Calls", content: "Strong bullish momentum on Apple, targeting $200 by next Friday. Volume spike detected.", symbol: "AAPL" },
    { id: 1, title: "TSLA $250 Puts", content: "Bearish setup forming on Tesla. Consider $250 puts expiring in 2 weeks.", symbol: "TSLA" },
    { id: 2, title: "SPY Iron Condor", content: "Market consolidating. Iron condor play between $580-$590 for weekly expiration.", symbol: "SPY" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <h1 style={{ textAlign: "center", marginBottom: "24px" }}>📈 Fresh Options Plays</h1>
      <div style={{
        width: "100%",
        maxWidth: "600px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        paddingBottom: "40px"
      }}>
        {posts.map((post) => (
          <Post key={post.id} id={post.id} title={post.title} content={post.content} symbol={post.symbol} />
        ))}
      </div>
    </div>
  );
};

export default Home;