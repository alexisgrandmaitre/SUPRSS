import React, { useEffect, useState } from "react";
import { api, apiUrl } from "./api";

export default function ArticlesList({ feedId, userId, filters = {} }) {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");

  const fetchArticles = async () => {
    if (!feedId || !userId) return;
    try {
      setError("");
      const params = {
        userId,
        feedId,
        status:   filters.status   || "",
        favorite: filters.favorite || "",
        q:        filters.q        || "",
        tags:     filters.tags     || "",
      };
      const res = await api.get("/articles", { params });
      setArticles(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("fetchArticles error:", e);
      setError("Impossible de charger les articles.");
      setArticles([]);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [feedId, userId, filters.status, filters.favorite, filters.q, filters.tags]);

  const toggleRead = async (id, currentRead) => {
    try {
      await api.patch(`/articles/${id}/read`, { read: !currentRead });
      fetchArticles();
    } catch (e) {
      console.error("toggleRead error:", e);
    }
  };

  const toggleFavorite = async (id, currentFavorite) => {
    try {
      await api.patch(`/articles/${id}/favorite`, { favorite: !currentFavorite });
      fetchArticles();
    } catch (e) {
      console.error("toggleFavorite error:", e);
    }
  };

  if (!feedId) return <div>Sélectionnez un flux pour voir ses articles.</div>;

  return (
    <div style={{ marginTop: 8 }}>
      {error && <div style={{ color: "#f66", marginBottom: 8 }}>{error}</div>}

      <div className="articles">
        {articles.length === 0 && !error && <div className="meta">Aucun article trouvé.</div>}

        {articles.map(a => (
          <div key={a.id} className="article" style={{ opacity: a.read ? 0.6 : 1 }}>
            <div className="title">
              <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a>
            </div>

            <div className="meta">
              {a.author || "Auteur inconnu"} • {new Date(a.publishedAt).toLocaleString()}
            </div>

            {a.summary && <div style={{ marginBottom: 8 }}>{a.summary}</div>}

            <div className="badges" style={{ marginBottom: 8 }}>
              {a.read && <span className="badge read">Lu</span>}
              {a.favorite && <span className="badge fav">Favori</span>}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className={a.read ? "ghost" : "success"}
                onClick={() => toggleRead(a.id, a.read)}
              >
                {a.read ? "Marquer non lu" : "Marquer lu"}
              </button>

              <button
                className="ghost"
                onClick={() => toggleFavorite(a.id, a.favorite)}
              >
                {a.favorite ? "★ Retirer des favoris" : "☆ Ajouter aux favoris"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}