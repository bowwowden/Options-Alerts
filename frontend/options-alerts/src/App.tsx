import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import PostDetail from "./pages/PostDetail";
import Chat from "./pages/Chat";
import Trade from "./pages/Trade";
import Portfolio from "./pages/Portfolio";
import Sidebar from "./components/Sidebar";
import ChatCharacter from "./components/ChatCharacter";

const AppContent: React.FC = () => {
  const location = useLocation();
  const isOnChatPage = location.pathname === "/chat";
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarWidth = isMobile ? 60 : 200;

  return (
    <>
      {!isOnChatPage && <Sidebar />}
      <div style={{ marginLeft: isOnChatPage ? 0 : `${sidebarWidth}px`, transition: "margin-left 0.3s" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Routes>
      </div>
      {!isOnChatPage && <ChatCharacter />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
