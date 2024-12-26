import React from "react";
import CourseList from "../../course/CourseList";
import { Course } from "../../../models/Course";
import useTeacherOperations from "../../../hooks/useTeacherOperations";

const TeacherCourseList = () => {
  const { courseList, data, totalPages } = useTeacherOperations();

  return (
    <CourseList
      titleKey="course.list.label"
      fetchData={courseList}
      data={data as Course[]}
      totalPages={totalPages}
      addRoute="/course-editor/new"
      rowLinkTemplate="/course-editor/{id}"
    />
  );
};

export default TeacherCourseList;
