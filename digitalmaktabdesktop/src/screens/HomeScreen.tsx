import React from "react";
import { useAuth } from "../context/AuthContext";

interface Props {
  onOpenReport: (report: string) => void;
}

export default function HomeScreen({ onOpenReport }: Props) {
  const { user, logout } = useAuth();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.logo}>Digital Maktab</h2>
        <div style={styles.headerRight}>
          <span style={styles.role}>{user?.role || "ADMIN"}</span>
          <button onClick={logout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>
      <main style={styles.main}>
        <h3>Reports</h3>
        <div
          style={styles.card}
          onClick={() => onOpenReport("student-list")}
        >
          <span>Student List Per Class</span>
          <span style={styles.badge}>Open →</span>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { height: "100vh", display: "flex", flexDirection: "column", background: "#f0f2f5" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 24px", background: "#1a73e8", color: "#fff",
  },
  logo: { margin: 0, fontSize: 18 },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  role: { fontSize: 13, opacity: 0.85 },
  logoutBtn: {
    padding: "6px 14px", background: "rgba(255,255,255,0.2)", color: "#fff",
    border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4, cursor: "pointer", fontSize: 13,
  },
  main: { padding: 24, flex: 1 },
  card: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", background: "#fff", borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer",
  },
  badge: {
    fontSize: 12, padding: "4px 8px", background: "#e8f0fe",
    color: "#1a73e8", borderRadius: 4,
  },
};
