import React, { useState } from "react";
import { Link } from "react-router-dom";

type PostProps = {
  id: number;
  title: string;
  content: string;
  symbol: string;
};

const Post: React.FC<PostProps> = ({ id, title, content, symbol }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: 12,
        borderRadius: "8px",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        transform: isHovered ? "scale(1.02)" : "scale(1)",
        boxShadow: isHovered ? "0 4px 12px rgba(0, 0, 0, 0.15)" : "none"
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to={`/post/${id}`}
        style={{
          textDecoration: "none",
          color: "inherit"
        }}
      >
        <h2 style={{ margin: "0 0 12px 0" }}>{title}</h2>
      </Link>
      <p>{content}</p>
      <a
        href={`https://finance.yahoo.com/quote/${symbol}/`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          marginTop: "8px",
          fontSize: "14px",
          textDecoration: "none"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        View {symbol} on Yahoo Finance →
      </a>
    </div>
  );
};

export default Post;
