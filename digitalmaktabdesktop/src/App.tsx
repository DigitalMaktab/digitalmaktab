import React, { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import StudentListReport from "./screens/StudentListReport";

export default function App() {
  const [screen, setScreen] = useState<"home" | "student-list">("home");

  if (screen === "student-list") {
    return <StudentListReport onBack={() => setScreen("home")} />;
  }

  return <HomeScreen onOpenReport={(r) => setScreen(r as any)} />;
}
