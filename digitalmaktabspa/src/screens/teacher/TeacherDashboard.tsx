import React, { useState } from "react";
import { Teacher } from "../../models/Teacher";
import { getUser } from "../../helper/helper";
import AppWelcomeCard from "../../components/card/AppWelcomeCard";
import TeacherTimeTableList from "./timetable/TeacherTimeTableList";
import TeacherCourseList from "./course/TeacherCourseList";

const TeacherDasboard = () => {
  const [teacher] = useState<Teacher>(getUser()!.teacher!);
  return (
    <div className="container-fluid default-dashboard">
      <div className="row">
        <div className="col-md-4" style={{ padding: "-5px" }}>
          <AppWelcomeCard
            welcomeTitle={teacher.firstName + " " + teacher.lastName}
          />
        </div>
        <div className="col-md-8" style={{ padding: "-5px" }}>
          <TeacherCourseList />
        </div>
        <div className="col-md-12">
          <TeacherTimeTableList />
        </div>
      </div>
    </div>
  );
};

export default TeacherDasboard;
