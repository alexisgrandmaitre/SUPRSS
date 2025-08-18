import React from "react";

export default function FiltersBar({ filters, setFilters }) {
  return (
    <div
      style={{
        margin: "20px auto",
        padding: 16,
        borderBottom: "1px solid #ddd",
        maxWidth: 600,
        display: "flex",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <input
        type="text"
        placeholder="Recherche..."
        value={filters.q}
        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        style={{ flex: 2, padding: 8 }}
      />

      <select
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        style={{ flex: 1, padding: 8 }}
      >
        <option value="">Tous</option>
        <option value="read">Lus</option>
        <option value="unread">Non lus</option>
      </select>

      <select
        value={filters.favorite}
        onChange={(e) => setFilters({ ...filters, favorite: e.target.value })}
        style={{ flex: 1, padding: 8 }}
      >
        <option value="">Tous</option>
        <option value="true">Favoris</option>
        <option value="false">Non favoris</option>
      </select>
    </div>
  );
}