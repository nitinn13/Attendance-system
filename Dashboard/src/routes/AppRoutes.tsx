import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout";

import TeacherDashboard from "../views/teacher/TeacherDashboard";
import StudentDashboard from "../views/student/StudentDashboard";
import Timetable from "../views/student/Timetable";
import Login from "../views/Login";
import Signup from "../views/Signup";
import TeacherClasses from "../views/teacher/TeacherClasses";
import ClassAttendance from "../views/teacher/ClassAttendance";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup/>}/>

      {/* Teacher routes */}
      <Route path="teacher" element={<Layout />}>
        <Route index element={<TeacherDashboard />} />
        <Route path="my-classes" element={<TeacherClasses />} />
        <Route path="attendance/:classId" element={<ClassAttendance />} />
        <Route path="*" element={<TeacherDashboard />} />
      </Route>

      {/* Student routes */}
      <Route path="student" element={<Layout />}>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="*" element={<StudentDashboard />} />
      </Route>
    </Routes>
  );
}
