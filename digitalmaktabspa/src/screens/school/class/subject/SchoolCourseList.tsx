import React from "react";
import useSchoolOperations from "../../../../hooks/useSchoolOperations";
import { Course } from "../../../../models/Course";
import CourseList from "../../../course/CourseList";
import { Teacher } from "../../../../models/Teacher";

const SchoolCourseList = () => {
  const { courseList, data, totalPages } = useSchoolOperations();

  return (
    <CourseList
      titleKey="course.list.label"
      fetchData={courseList}
      data={data as Course[]}
      totalPages={totalPages}
      addRoute="/course-editor/new"
      rowLinkTemplate="/course-editor/{id}"
      columns={[
        {
          header: "teacher.firstName.label",
          accessor: "teacher",
          filter: { type: "dropdown" },
          render: (teacher: Teacher) =>
            teacher.firstName + " " + teacher.lastName,
        },
      ]}
    />
  );
};

export default SchoolCourseList;
