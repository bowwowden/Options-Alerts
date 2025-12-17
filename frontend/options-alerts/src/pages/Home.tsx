import React, { useState, useEffect } from "react";
import Post from "../components/Post";

interface FreshPlay {
  id: number;
  symbol: string;
  price: number;
  expiration: string;
  type: string;
  play_date: string;
  created_at: string;
}

const Home: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
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

  const fetchFreshPlays = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://192.168.0.129:5000/api/fresh-plays");
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        // Find the most recent date
        const mostRecentDate = data.data.reduce((latest: string, play: FreshPlay) => {
          return play.play_date > latest ? play.play_date : latest;
        }, data.data[0].play_date);

        // Filter plays to only include the most recent date
        const recentPlays = data.data.filter((play: FreshPlay) => play.play_date === mostRecentDate);

        // Group plays by symbol and type
        const grouped = recentPlays.reduce((acc: any, play: FreshPlay) => {
          const key = `${play.symbol}-${play.type}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(play);
          return acc;
        }, {});

        // Transform grouped plays to post format
        const transformedPosts = Object.values(grouped).map((group: any) => {
          const firstPlay = group[0];

          // Parse date as YYYY-MM-DD and format as MM/DD/YYYY
          const [year, month, day] = firstPlay.play_date.split('-');
          const formattedDate = `${month}/${day}/${year}`;

          // If multiple strikes, show range; otherwise show single strike
          let strikeDisplay;
          if (group.length > 1) {
            const prices = group.map((p: FreshPlay) => p.price).sort((a: number, b: number) => a - b);
            strikeDisplay = `$${prices[0]}-${prices[prices.length - 1]}`;
          } else {
            strikeDisplay = `$${firstPlay.price}`;
          }

          const typeCapitalized = firstPlay.type.charAt(0).toUpperCase() + firstPlay.type.slice(1);

          return {
            id: firstPlay.id,
            title: `${firstPlay.symbol} ${strikeDisplay} ${typeCapitalized}`,
            content: `${firstPlay.expiration.charAt(0).toUpperCase() + firstPlay.expiration.slice(1)} expiration - Fresh play from ${formattedDate}`,
            symbol: firstPlay.symbol,
            plays: group // Pass the entire group of plays
          };
        });

        setPosts(transformedPosts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      setError("Error loading fresh plays");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <h1 style={{
        textAlign: "center",
        marginBottom: isMobile ? "12px" : "24px",
        fontSize: isMobile ? "24px" : "32px",
        margin: isMobile ? "0 0 12px 0" : "0 0 24px 0"
      }}>📈 Fresh Options Plays</h1>

      {loading && (
        <div style={{ fontSize: "16px", color: "#666" }}>
          Loading fresh plays...
        </div>
      )}

      {error && (
        <div style={{
          padding: "12px",
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: "8px",
          color: "#c00"
        }}>
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div style={{ fontSize: "16px", color: "#666" }}>
          No fresh plays available
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div style={{
          width: "100%",
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          paddingBottom: "40px"
        }}>
          {posts.map((post) => (
            <Post key={post.id} id={post.id} title={post.title} content={post.content} symbol={post.symbol} plays={post.plays} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;