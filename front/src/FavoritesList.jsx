import React, { useEffect, useState } from "react";
import axios from "axios";

export default function FavoritesList({ userId }) {
  const [favorites, setFavorites] = useState([]);
  
  const fetchFavorites = async () => {
  const res = await axios.get(`http://localhost:3001/favorites/${userId}`);
  setFavorites(res.data);
};

  useEffect(() => {
    axios.get(`http://localhost:3001/favorites/${userId}`)
      .then(res => setFavorites(res.data))
      .catch(() => setFavorites([]));
      fetchFavorites();
  }, [userId]);

  return (
    <div style={{ marginTop: 32 }}>
      <h3>Mes articles favoris</h3>
      {favorites.length === 0 && <div>Aucun favori pour le moment.</div>}
      <ul>
        {favorites.map(a => (
          <li key={a.id} style={{ marginBottom: 8 }}>
            <a href={a.url} target="_blank" rel="noopener noreferrer"><b>{a.title}</b></a>
            <br />
            <span style={{ fontSize: 12 }}>{a.author || "?"} | {new Date(a.publishedAt).toLocaleString()}</span>
            <br />
            <span style={{ fontSize: 13 }}>{a.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
