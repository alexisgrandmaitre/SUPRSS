import React, { useState } from "react";
import { api } from "./api";

export default function Register({ onRegistered }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!email || !password) {
      setMsg("Email et mot de passe requis.");
      return;
    }
    if (password !== confirm) {
      setMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      await api.post("/register", { email, password });
      const res = await api.post("/login", { email, password });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      if (typeof onRegistered === "function") onRegistered(res.data.user);
      setMsg("Inscription réussie !");
    } catch (err) {
      const msg = err.response?.data?.error || "Erreur lors de l'inscription";
      setMsg(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display:"grid", gap: 10 }}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Confirmer le mot de passe"
        value={confirm}
        onChange={(e)=>setConfirm(e.target.value)}
        required
      />
      {msg && <div className="meta" style={{ color:"#ffd27d" }}>{msg}</div>}
      <button type="submit">Créer mon compte</button>
    </form>
  );
}
