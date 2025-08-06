import React, { useEffect, useState } from "react";
import axios from "axios";

export default function RSSFeeds({ userId }) {
  const [feeds, setFeeds] = useState([]);
  const [form, setForm] = useState({ title: "", url: "", description: "", categories: "" });
  const [message, setMessage] = useState("");

  // Récupère la liste des flux à l'ouverture du composant
  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/rssfeeds/${userId}`);
      setFeeds(response.data);
    } catch (error) {
      setMessage("Erreur lors de la récupération des flux.");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddFeed = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await axios.post("http://localhost:3001/rssfeeds", { ...form, userId });
      setMessage("Flux ajouté !");
      setForm({ title: "", url: "", description: "", categories: "" });
      fetchFeeds();
    } catch (error) {
      setMessage("Erreur lors de l'ajout du flux (URL déjà existante ?)");
    }
  };

  const handleDeleteFeed = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/rssfeeds/${id}`);
      setMessage("Flux supprimé !");
      fetchFeeds();
    } catch (error) {
      setMessage("Erreur lors de la suppression du flux.");
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "60px auto", padding: 32, border: "1px solid #ddd", borderRadius: 16 }}>
      <h2>Mes flux RSS</h2>
      <form onSubmit={handleAddFeed} style={{ marginBottom: 24 }}>
        <input name="title" value={form.title} onChange={handleChange} placeholder="Titre" required style={{ marginBottom: 8, width: "100%" }} />
        <input name="url" value={form.url} onChange={handleChange} placeholder="URL du flux" required style={{ marginBottom: 8, width: "100%" }} />
        <input name="description" value={form.description} onChange={handleChange} placeholder="Description" style={{ marginBottom: 8, width: "100%" }} />
        <input name="categories" value={form.categories} onChange={handleChange} placeholder="Catégories (séparées par des virgules)" style={{ marginBottom: 8, width: "100%" }} />
        <button type="submit" style={{ marginTop: 8 }}>Ajouter</button>
      </form>
      {message && <div style={{ marginBottom: 16 }}>{message}</div>}
      <ul>
        {feeds.map(feed => (
          <li key={feed.id} style={{ marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
            <strong>{feed.title}</strong> (<a href={feed.url} target="_blank" rel="noopener noreferrer">{feed.url}</a>)<br />
            <small>{feed.description}</small>
            <div>Catégories : {feed.categories || "-"}</div>
            <button onClick={() => handleDeleteFeed(feed.id)} style={{ marginTop: 4, color: "#b00" }}>Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
