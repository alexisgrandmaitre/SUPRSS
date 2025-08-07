import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ArticlesList({ feedId }) {
  const [articles, setArticles] = useState([]);

  const fetchArticles = async () => {
    const res = await axios.get(`http://localhost:3001/articles/${feedId}`);
    setArticles(res.data);
  };

  useEffect(() => {
    if (feedId) {
      fetchArticles();
    }
  }, [feedId]);

  const toggleRead = async (id, currentRead) => {
    await axios.patch(`http://localhost:3001/articles/${id}/read`, { read: !currentRead });
    fetchArticles();
  };

  if (!feedId) return <div>Sélectionnez un flux pour voir ses articles.</div>;

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Articles du flux</h3>
      {articles.length === 0 && <div>Aucun article trouvé.</div>}
      <ul>
        {articles.map(a => (
          <li key={a.id} style={{ marginBottom: 8, opacity: a.read ? 0.6 : 1 }}>
            <a href={a.url} target="_blank" rel="noopener noreferrer"><b>{a.title}</b></a>
            <br />
            <span style={{ fontSize: 12 }}>
              {a.author || "?"} | {new Date(a.publishedAt).toLocaleString()}
              {a.read ? "(lu)" : "(non lu)"}
            </span>
            <br />
            <span style={{ fontSize: 13 }}>{a.summary}</span>
            <br />
            <button onClick={() => toggleRead(a.id, a.read)}>
              Marquer comme {a.read ? "non lu" : "lu"}
            </button>
            <button
              style={{ marginLeft: 8, fontSize: 12, color: a.favorite ? "#e1b800" : "#666" }}
              onClick={async () => {
                await axios.patch(`http://localhost:3001/articles/${a.id}/favorite`, { favorite: !a.favorite });
                fetchArticles();
              }}
            >
              {a.favorite ? "★ Favori" : "☆ Favori"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}