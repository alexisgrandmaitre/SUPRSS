import React, { useEffect, useState } from "react";
import axios from "axios";

export default function FeedsList({ onSelectFeed }) {
  const [feeds, setFeeds] = useState([]);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [message, setMessage] = useState("");

  const fetchFeeds = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      const res = await axios.get(`http://localhost:3001/feeds/${user.id}`);
      setFeeds(res.data);
    } catch (err) {
      console.error("Erreur récupération feeds:", err);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleAddFeed = async (e) => {
    e.preventDefault();
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.post("http://localhost:3001/feeds", {
        url: newFeedUrl,
        userId: user.id,
      });
      setMessage("Flux ajouté !");
      setNewFeedUrl("");
      fetchFeeds();
    } catch (err) {
      console.error("Erreur ajout feed:", err);
      setMessage("Impossible d'ajouter ce flux.");
    }
  };

  return (
    <div style={{ padding: 20, borderRight: "1px solid #ddd" }}>
      <h3>Mes flux RSS</h3>
      <form onSubmit={handleAddFeed} style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="URL du flux RSS"
          value={newFeedUrl}
          onChange={(e) => setNewFeedUrl(e.target.value)}
          style={{ width: "80%", padding: 5 }}
        />
        <button type="submit">Ajouter</button>
      </form>
      {message && <div style={{ color: "green", fontSize: 12 }}>{message}</div>}
      <ul>
        {feeds.map((f) => (
          <li
            key={f.id}
            style={{ cursor: "pointer", marginBottom: 8 }}
            onClick={() => onSelectFeed(f.id)}
          >
            📡 {f.title || f.url}
          </li>
        ))}
      </ul>
    </div>
  );
}