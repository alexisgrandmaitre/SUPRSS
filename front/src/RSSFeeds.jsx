import React, { useEffect, useState } from "react";
import { api, apiUrl } from "./api";
import ArticlesList from "./ArticlesList";
import FiltersBar from "./FiltersBar";

export default function RSSFeeds({ userId }) {
  const [feeds, setFeeds] = useState([]);
  const [form, setForm] = useState({ title: "", url: "", description: "", categories: "" });
  const [message, setMessage] = useState("");
  const [openFeedId, setOpenFeedId] = useState(null);

  const [filters, setFilters] = useState({
    q: "",
    status: "",
    tags: "",
    favorite: ""
  });

const [opmlFile, setOpmlFile] = useState(null);

const handleImportOPML = async (e) => {
  e.preventDefault();
  if (!opmlFile) return;
  const form = new FormData();
  form.append('file', opmlFile);
  form.append('userId', String(userId));
  await axios.post('/import/opml', form, { headers: { 'Content-Type': 'multipart/form-data' }});
  setMessage('Import OPML terminé');
  setOpmlFile(null);
  fetchFeeds();
};

  
  const fetchFeeds = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/rssfeeds/${userId}`);
      setFeeds(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("fetchFeeds error:", e);
      setMessage("Erreur lors de la récupération des flux.");
      setFeeds([]);
    }
  };

  useEffect(() => {
    if (userId) fetchFeeds();
  }, [userId]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAddFeed = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await axios.post("http://localhost:3001/rssfeeds", { ...form, userId });
      setMessage("Flux ajouté.");
      setForm({ title: "", url: "", description: "", categories: "" });
      fetchFeeds();
    } catch (e) {
      console.error(e);
      setMessage("Erreur lors de l'ajout du flux.");
    }
  };

  const handleDeleteFeed = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/rssfeeds/${id}`);
      setMessage("Flux supprimé.");
      if (openFeedId === id) setOpenFeedId(null);
      fetchFeeds();
    } catch (e) {
      console.error(e);
      setMessage("Erreur lors de la suppression du flux.");
    }
  };

  const handleRefreshFeed = async (feed) => {
    try {
      await axios.post(`http://localhost:3001/rssfeeds/${feed.id}/refresh`);
      setMessage(`Flux "${feed.title}" rafraîchi`);
    } catch (e) {
      console.error(e);
      setMessage("Erreur au rafraîchissement.");
    }
  };

  return (
    <div className="center-wrap">
      <div className="grid">
        {/* Colonne gauche : sidebar / gestion des flux */}
        <div className="panel">
          <h2>Mes flux</h2>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <a href={apiUrl(`/export/opml?userId=${userId}`)} target="_blank" rel="noreferrer">
              <button className="ghost">Exporter OPML</button>
            </a>
            <a href={apiUrl(`/export/json?userId=${userId}&withArticles=true`)} target="_blank" rel="noreferrer">
              <button className="ghost">Exporter JSON</button>
            </a>
            <a href={apiUrl(`/export/csv?userId=${userId}`)} target="_blank" rel="noreferrer">
              <button className="ghost">Exporter CSV</button>
            </a>
          </div>

          <form onSubmit={handleImportOPML} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input type="file" accept=".opml,.xml" onChange={(e)=>setOpmlFile(e.target.files?.[0] || null)} />
            <button type="submit">Importer OPML</button>
          </form>



          <form onSubmit={handleAddFeed} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <input name="title" value={form.title} onChange={handleChange} placeholder="Titre" required />
            <input name="url" value={form.url} onChange={handleChange} placeholder="URL du flux" required />
            <input name="description" value={form.description} onChange={handleChange} placeholder="Description" />
            <input name="categories" value={form.categories} onChange={handleChange} placeholder="Catégories (ex: tech, actu)" />
            <button type="submit">Ajouter le flux</button>
          </form>

          {message && <div className="meta" style={{ marginBottom: 8 }}>{message}</div>}

          <ul className="feed-list">
            {feeds.map(feed => (
              <li key={feed.id} className="feed-item">
                <div
                  className="feed-title"
                  onClick={() => setOpenFeedId(openFeedId === feed.id ? null : feed.id)}
                  title="Afficher les articles de ce flux"
                >
                  {feed.title}
                </div>
                <div className="meta">
                  <a href={feed.url} target="_blank" rel="noreferrer">{feed.url}</a>
                  <br />{feed.description || "—"}
                  <br />Catégories : {feed.categories || "—"}
                </div>
                <div className="feed-actions">
                  <button className="ghost" onClick={() => handleRefreshFeed(feed)}>Rafraîchir</button>
                  <button className="danger" onClick={() => handleDeleteFeed(feed.id)}>Supprimer</button>
                </div>
              </li>
            ))}
            {feeds.length === 0 && <li className="meta">Aucun flux pour l’instant.</li>}
          </ul>
        </div>

        {/* Colonne droite : contenu (articles du flux sélectionné OU accueil) */}
        <div className="panel">
          {openFeedId ? (
            <>
              <h2>Articles</h2>
              <FiltersBar filters={filters} setFilters={setFilters} />
              <ArticlesList feedId={openFeedId} userId={userId} filters={filters} />
            </>
          ) : (
            <>
              <h2>Bienvenue 👋</h2>
              <div className="meta">Clique un flux à gauche pour afficher ses articles ici.</div>
              <div className="sep"></div>
              <div className="badges">
                <span className="badge">Lu / Non lu</span>
                <span className="badge fav">Favoris</span>
                <span className="badge">Recherche</span>
                <span className="badge">Tags</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}