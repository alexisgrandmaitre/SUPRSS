import React, { useState } from "react";
import { api, apiUrl } from "./api";
export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const response = await api.post("/login", {
        email,
        password,
      });
      setMessage("Connexion réussie !");
      localStorage.setItem("user", JSON.stringify(response.data.user));
      if (typeof onLogin === "function") {
        onLogin(response.data.user);
      }
    } catch (error) {
      setMessage((error.response?.data?.error || "Erreur lors de la connexion"));
    }
  };



  return (
    <div style={{ maxWidth: 350, margin: "80px auto", padding: 32, border: "1px solid #ddd", borderRadius: 16 }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            required
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            required
          />
        </div>
        <button type="submit" style={{ padding: "8px 16px", borderRadius: 8, background: "#007bff", color: "#fff", border: "none" }}>
          Se connecter
        </button>
      </form>
      {message && <div style={{ marginTop: 16 }}>{message}</div>}
    </div>
  );
}