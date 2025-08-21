import React, { useEffect, useState } from "react";
import { api } from "./api";

export default function FeedsList({ onSelectFeed }) {
  const [feeds, setFeeds] = useState([]);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [message, setMessage] = useState("");

  //const fetchFeeds = async () => {
  //  try {
  //    const user = JSON.parse(localStorage.getItem("user"));
  //    if (!user) return;
  //    const res = await api.get(`/rssfeeds/${user.id}`);
  //    setFeeds(res.data);
  //  } catch (err) {
  //    console.error("Erreur récupération feeds:", err);
  //  }
  //};
  const fetchFeeds = async () => {
    console.log("🚀 Début fetchFeeds");
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      console.log("🔍 User récupéré:", user);
      
      if (!user) {
        console.log("❌ Pas d'utilisateur en localStorage");
        return;
      }
      
      console.log("🔍 URL appelée:", `/rssfeeds/${user.id}`);
      const res = await api.get(`/rssfeeds/${user.id}`);
      console.log("✅ Réponse API:", res);
      console.log("✅ Data reçue:", res.data);
      
      setFeeds(res.data);
      console.log("✅ Feeds mis à jour dans le state");
    } catch (err) {
      console.log("❌ Erreur complète:", err);
      console.log("❌ Erreur response:", err.response?.data);
      console.log("❌ Erreur status:", err.response?.status);
    }
  };
  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleAddFeed = async (e) => {
    e.preventDefault();
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      await api.post("/rssfeeds", {
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