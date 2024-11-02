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
import ClassList from "./screens/school/class/ClassList";
import ClassEditor from "./screens/school/class/ClassEditor";
import TeacherList from "./screens/school/teacher/TeacherList";
import TeacherEditor from "./screens/school/teacher/TeacherEditor";
import StudentList from "./screens/school/student/StudentList";
import StudentEditor from "./screens/school/student/StudentEditor";

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
              {/* School */}
              <Route path="home" element={<AdminDashboard />}>
                <Route path="profile" element={<SchoolProfile />} />
                {/* Classes */}
                <Route path="class-list" element={<ClassList />} />
                <Route path="class-editor/new" element={<ClassEditor />} />
                <Route path="class-editor/:id" element={<ClassEditor />} />
                {/* Teachers */}
                <Route path="teacher-list" element={<TeacherList />} />
                <Route path="teacher-editor/new" element={<TeacherEditor />} />
                <Route path="teacher-editor/:id" element={<TeacherEditor />} />
                {/* Stuents */}
                <Route path="student-list" element={<StudentList />} />
                <Route path="student-editor/new" element={<StudentEditor />} />
                <Route path="student-editor/:id" element={<StudentEditor />} />
              </Route>
              {/* Student */}
              <Route path="student-dashboard" element={<StudentDashboard />} />
              {/* Teacher */}
              <Route path="teacher-dashboard" element={<TeacherDashboard />} />
              {/* Root User */}
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
