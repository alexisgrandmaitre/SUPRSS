import React, { useState } from "react";
import Login from "./Login";
import RSSFeeds from "./RSSFeeds";
import "./styles.css";

export default function App(){
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem("user");
    return s ? JSON.parse(s) : null;
  });

  const logout = () => { localStorage.removeItem("user"); setUser(null); };

  return (
    <div className="app-shell">
      <div className="header">
        <div className="title">SUPRSS • Lecteur RSS</div>
        <div className="right">
          {user ? (
            <>
              <span>{user.email}</span>
              <button className="ghost" onClick={logout}>Déconnexion</button>
            </>
          ) : <span className="muted">Non connecté</span>}
        </div>
      </div>

      {user ? (
        <RSSFeeds userId={user.id} />
      ) : (
        <div className="panel">
          <h2>Connexion</h2>
          <Login onLogin={(u)=>{ localStorage.setItem("user", JSON.stringify(u)); setUser(u); }} />
        </div>
      )}
    </div>
  );
}