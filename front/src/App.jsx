import React, { useState } from "react";
import Login from "./Login";
import RSSFeeds from "./RSSFeeds";

function App() {
  const [user, setUser] = useState(null);

  return (
    <div>
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <>
          <div style={{ textAlign: "right", margin: 12 }}>
            Connecté en tant que <b>{user.email}</b>
            <button style={{ marginLeft: 10 }} onClick={() => setUser(null)}>
              Déconnexion
            </button>
          </div>
          <RSSFeeds userId={user.id} />
        </>
      )}
    </div>
  );
}

export default App;