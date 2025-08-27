import React from "react";

export default function FiltersBar({ filters, setFilters, categories = [] }) {
  return (
    <div
      style={{
        margin: "20px auto",
        padding: 16,
        borderBottom: "1px solid #ddd",
        maxWidth: 800,
        display: "flex",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <input
        type="text"
        placeholder="Recherche..."
        value={filters.q}
        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        style={{ flex: "2 1 240px", padding: 8 }}
      />

      <select
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        style={{ flex: "1 1 140px", padding: 8 }}
      >
        <option value="">Tous</option>
        <option value="read">Lus</option>
        <option value="unread">Non lus</option>
      </select>

      <select
        value={filters.favorite}
        onChange={(e) => setFilters({ ...filters, favorite: e.target.value })}
        style={{ flex: "1 1 140px", padding: 8 }}
      >
        <option value="">Tous</option>
        <option value="true">Favoris</option>
        <option value="false">Non favoris</option>
      </select>

      {/* NOUVEAU : filtre par catégories (tags) */}
      <select
        value={filters.tags || ""}
        onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
        style={{ flex: "1 1 180px", padding: 8 }}
      >
        <option value="">Toutes catégories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}