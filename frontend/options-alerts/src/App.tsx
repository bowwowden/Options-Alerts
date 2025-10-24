import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import PostDetail from "./pages/PostDetail";
import Chat from "./pages/Chat";
import ChatCharacter from "./components/ChatCharacter";

const AppContent: React.FC = () => {
  const location = useLocation();
  const isOnChatPage = location.pathname === "/chat";

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
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
