import { useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import TaskBoard from "./components/TaskBoard.jsx";

const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const handleAuth = (data) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <div className="app-shell">
      {token ? (
        <TaskBoard token={token} user={user} onLogout={handleLogout} />
      ) : (
        <AuthPanel onAuth={handleAuth} />
      )}
    </div>
  );
};

export default App;
