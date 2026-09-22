import React, { useState } from "react";
import { login as apiLogin } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await apiLogin(email, password);
      login(user);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>Digital Maktab</h1>
        <p style={styles.subtitle}>Desktop Report Manager</p>
        {error && <div style={styles.error}>{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f0f2f5",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 40,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    minWidth: 360,
  },
  title: { margin: 0, textAlign: "center", color: "#1a73e8" },
  subtitle: { margin: 0, textAlign: "center", color: "#666", fontSize: 14 },
  input: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 4,
    fontSize: 14,
    outline: "none",
  },
  button: {
    padding: "10px 12px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 14,
    cursor: "pointer",
  },
  error: {
    color: "#d93025",
    fontSize: 13,
    textAlign: "center",
  },
};
