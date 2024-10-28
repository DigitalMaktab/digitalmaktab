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
import "./locale/i18n";
import Auth from "./screens/auth/Auth";
import { LoaderProvider } from "./contexts/LoaderContext";
import PublicScreen from "./screens/public/PublicScreen";
import SchoolProfile from "./screens/school/SchoolProfile";
import Home from "./screens/Home";
import ClassList from "./screens/school/ClassList";

function App() {
  return (
    <LoaderProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <Auth>
                  <PublicScreen />
                </Auth>
              }
            />
            <Route
              path="/login"
              element={
                <Auth>
                  <Login />
                </Auth>
              }
            />
            <Route
              path="/signup"
              element={
                <Auth>
                  <Signup />
                </Auth>
              }
            />
            <Route element={<AuthRoute />}>
              <Route path="home" element={<AdminDashboard />}>
                <Route path="profile" element={<SchoolProfile />} />
                <Route path="class-list" element={<ClassList />} />
              </Route>
              <Route path="student-dashboard" element={<StudentDashboard />} />
              <Route path="teacher-dashboard" element={<TeacherDashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route />
            </Route>
            <Route path="student-dashboard" element={<StudentDashboard />} />
            <Route path="teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </Router>
    </LoaderProvider>
  );
}

export default App;
