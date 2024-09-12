import React from "react";
import "./App.css";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider } from "./helper/auth/AuthProvider";
import AuthRoute from "./helper/auth/AuthRoute";
import Login from "./screens/auth/Login";
import Signup from "./screens/auth/Signup";
import StudentDashboard from "./screens/student/StudentDashboard";
import AdminDashboard from "./screens/school/AdminDashboard";
import TeacherDashboard from "./screens/teacher/TeacherDashboard";
import Dashboard from "./screens/root/Dashboard";

function App() {
  return (
    <>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/" element={<AuthRoute />}>
              <Route path="/student-dashboard" element={<StudentDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;
