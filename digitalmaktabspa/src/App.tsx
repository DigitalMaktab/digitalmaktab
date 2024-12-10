import React from "react";
import "./App.css";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider } from "./helper/auth/AuthProvider";
import AuthRoute from "./helper/auth/AuthRoute";
import Login from "./screens/auth/Login";
import Signup from "./screens/auth/Signup";
import StudentDashboard from "./screens/student/StudentDashboard";
import TeacherDashboard from "./screens/teacher/TeacherDashboard";
import Dashboard from "./screens/root/Dashboard";
import "./locale/i18n";
import { LoaderProvider } from "./contexts/LoaderContext";
import PublicScreen from "./screens/public/PublicScreen";
import SchoolProfile from "./screens/school/SchoolProfile";
import ClassList from "./screens/school/class/ClassList";
import ClassEditor from "./screens/school/class/ClassEditor";
import TeacherList from "./screens/school/teacher/TeacherList";
import TeacherEditor from "./screens/school/teacher/TeacherEditor";
import StudentList from "./screens/school/student/StudentList";
import StudentEditor from "./screens/school/student/StudentEditor";
import { UserRole } from "./models/UserRole";
import Unauthorized from "./screens/UnAuthorized";
import Auth from "./helper/auth/Auth";
import SchoolHome from "./screens/school/SchoolHome";
import SchoolDashboard from "./screens/school/dashboard/SchoolDashboard";
import BranchList from "./screens/school/branch/BranchList";
import BranchEditor from "./screens/school/branch/BranchEditor";
import ScheduleList from "./screens/school/schedule/ScheduleList";
import LibraryHome from "./screens/library/LibraryHome";
import OnlineLibrary from "./screens/library/OnlineLibrary";
import Library from "./screens/library/Library";
import LibraryEditor from "./screens/library/LibraryEditor";
import RootHome from "./screens/root/RootHome";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import CalendarYearList from "./screens/root/calendarYear/CalendarYearList";
import CalendarYearEditor from "./screens/root/calendarYear/CalendarYearEditor";
import SubjectList from "./screens/root/subject/SubjectList";
import SubjectEditor from "./screens/root/subject/SubjectEditor";
import ClassSubjectEditor from "./screens/school/class/subject/ClassSubjectEditor";
import ClassSubjectList from "./screens/school/class/subject/ClassSubjectList";
import ScheduleEditor from "./screens/school/schedule/ScheduleEditor";

// // Set up worker
// import { pdfjs } from "react-pdf";

// pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.js`;

function App() {
  // console.log(pdfjs.GlobalWorkerOptions.workerSrc);
  return (
    <LoaderProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PublicScreen />} />

            {/* Auth Routes for Login and Signup with Redirect */}
            <Route element={<Auth />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes */}
            <Route element={<AuthRoute requiredRole={UserRole.ADMIN} />}>
              <Route path="/" element={<LibraryHome />}>
                <Route path="online-library" element={<OnlineLibrary />} />
                <Route path="library" element={<Library />} />
                <Route path="library-editor/new" element={<LibraryEditor />} />
                <Route path="library-editor/:id" element={<LibraryEditor />} />
              </Route>
              <Route path="/" element={<SchoolHome />}>
                <Route path="home" element={<SchoolDashboard />} />
                <Route path="profile" element={<SchoolProfile />} />

                <Route path="branch-list" element={<BranchList />} />
                <Route path="branch-editor/new" element={<BranchEditor />} />
                <Route path="branch-editor/:id" element={<BranchEditor />} />

                <Route path="class-list" element={<ClassList />} />
                <Route path="class-editor/new" element={<ClassEditor />} />
                <Route path="class-editor/:id" element={<ClassEditor />} />

                <Route
                  path="class-subject-list"
                  element={<ClassSubjectList />}
                />
                <Route
                  path="class-subject-editor/new"
                  element={<ClassSubjectEditor />}
                />
                <Route
                  path="class-subject-editor/:id"
                  element={<ClassSubjectEditor />}
                />

                <Route path="teacher-list" element={<TeacherList />} />
                <Route path="teacher-editor/new" element={<TeacherEditor />} />
                <Route path="teacher-editor/:id" element={<TeacherEditor />} />

                <Route path="student-list" element={<StudentList />} />
                <Route path="student-editor/new" element={<StudentEditor />} />
                <Route path="student-editor/:id" element={<StudentEditor />} />

                <Route path="timetable" element={<ScheduleList />} />
                <Route
                  path="timetable-editor/new"
                  element={<ScheduleEditor />}
                />
                <Route
                  path="timetable-editor/:id"
                  element={<ScheduleEditor />}
                />
              </Route>
            </Route>

            <Route element={<AuthRoute requiredRole={UserRole.STUDENT} />}>
              <Route path="student-dashboard" element={<StudentDashboard />} />
            </Route>

            <Route element={<AuthRoute requiredRole={UserRole.TEACHER} />}>
              <Route path="teacher-dashboard" element={<TeacherDashboard />} />
            </Route>

            <Route element={<AuthRoute requiredRole={UserRole.ROOT_USER} />}>
              <Route path="/" element={<RootHome />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route
                  path="calendar-year-list"
                  element={<CalendarYearList />}
                />
                <Route
                  path="calendar-year-editor/new"
                  element={<CalendarYearEditor />}
                />
                <Route
                  path="calendar-year-editor/:id"
                  element={<CalendarYearEditor />}
                />

                <Route path="subject-list" element={<SubjectList />} />
                <Route path="subject-editor/new" element={<SubjectEditor />} />
                <Route path="subject-editor/:id" element={<SubjectEditor />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </LoaderProvider>
  );
}

export default App;
