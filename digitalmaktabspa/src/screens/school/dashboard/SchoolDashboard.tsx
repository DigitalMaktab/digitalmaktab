import React, { useCallback, useEffect, useState } from "react";
import { School } from "../../../models/School";
import { getUser } from "../../../helper/helper";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import AppWelcomeCard from "../../../components/card/AppWelcomeCard";
import AppCard from "../../../components/card/AppCard";
import FeatherIcon from "feather-icons-react";
import * as AIIcons from "react-icons/ai";
import * as PIIcons from "react-icons/pi";
import * as LiaIcons from "react-icons/lia";
import * as SIIcons from "react-icons/si";
import * as FAIcons from "react-icons/fa";
import * as IoIcons from "react-icons/io";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { SchoolDashboardData } from "../../../models/schoolDashboard/SchoolDashboardData";
import AppPieChart from "../../../components/chart/AppPieChart";
import AppBarChart from "../../../components/chart/AppBarChart";

const SchoolDashboard = () => {
  const [school] = useState<School>(getUser()!.school!);
  const { t, formatNumber } = useAppLocalizer();
  const { dashboardData, data: apiData } = useSchoolOperations();
  const [dashData, setDashData] = useState<SchoolDashboardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      await dashboardData();
    };
    fetchData();
  }, []); // Only on initial mount

  useEffect(() => {
    if (apiData) {
      setDashData(apiData as SchoolDashboardData);
    }
  }, [apiData]);

  return (
    <>
      {dashData && (
        <div className="container-fluid default-dashboard">
          <div className="row">
            <div className="col-sm-6 col-xl-4" style={{ padding: "-5px" }}>
              <AppWelcomeCard welcomeTitle={school.schoolName} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <AppCard className="client-card card-hover">
                <div className="row">
                  <div className="col-6 custom-width-1">
                    <h3 className="font-primary">
                      {formatNumber(dashData.totalStudents)}
                    </h3>
                    <h5 className="f-w-600">
                      {t("schoolDashboard.totalStudents")}
                    </h5>
                  </div>
                  <div className="col-6 custom-width-2">
                    <div className="client">
                      <PIIcons.PiStudent size={80} />
                    </div>
                  </div>
                </div>
              </AppCard>
              <AppCard className="client-card card-hover">
                <div className="row">
                  <div className="col-6 custom-width-1">
                    <h3 className="font-primary">
                      {formatNumber(dashData.totalTeachers)}
                    </h3>
                    <h5 className="f-w-600">
                      {t("schoolDashboard.totalTeachers")}
                    </h5>
                  </div>
                  <div className="col-6 custom-width-2">
                    <div className="client">
                      <LiaIcons.LiaChalkboardTeacherSolid size={80} />
                    </div>
                  </div>
                </div>
              </AppCard>
            </div>
            <div className="col-sm-6 col-xl-4">
              <AppCard className="client-card card-hover">
                <div className="row">
                  <div className="col-6 custom-width-1">
                    <h3 className="font-primary">
                      {formatNumber(dashData.totalClasses)}
                    </h3>
                    <h5 className="f-w-600">
                      {t("schoolDashboard.totalClasses")}
                    </h5>
                  </div>
                  <div className="col-6 custom-width-2">
                    <div className="client">
                      <SIIcons.SiGoogleclassroom size={80} />
                    </div>
                  </div>
                </div>
              </AppCard>
              <AppCard className="client-card card-hover">
                <div className="row">
                  <div className="col-6 custom-width-1">
                    <h3 className="font-primary">
                      {formatNumber(dashData.totalBranches)}
                    </h3>
                    <h5 className="f-w-600">
                      {t("schoolDashboard.totalBranches")}
                    </h5>
                  </div>
                  <div className="col-6 custom-width-2">
                    <div className="client">
                      <IoIcons.IoIosGitBranch size={80} />
                    </div>
                  </div>
                </div>
              </AppCard>
            </div>
            <div className="col-md-4 col-xl-4">
              <AppCard className="client-card card-hover">
                <AppPieChart
                  label={t("studentGenderChart.label")}
                  labels={[t("gender.male.label"), t("gender.female.label")]}
                  dataValues={[
                    dashData.genderChart.totalMale,
                    dashData.genderChart.totalFemale,
                  ]}
                />
              </AppCard>
            </div>
            <div className="col-md-4 col-xl-4">
              <AppCard className="client-card card-hover">
                <AppPieChart
                  label={t("teacherGenderChart.label")}
                  labels={[t("gender.male.label"), t("gender.female.label")]}
                  dataValues={[
                    dashData.teachersGenderChart.totalMale,
                    dashData.teachersGenderChart.totalFemale,
                  ]}
                />
              </AppCard>
            </div>
            <div className="col-md-4 col-xl-4">
              <AppCard className="client-card card-hover">
                <AppPieChart
                  label={t("classBranchChart.label")}
                  labels={[
                    t("schoolDashboard.totalClasses"),
                    t("schoolDashboard.totalBranches"),
                    t("schoolDashboard.totalTeachers"),
                  ]}
                  dataValues={[
                    dashData.totalClasses,
                    dashData.totalBranches,
                    dashData.totalTeachers,
                  ]}
                  backgroundColors={["#43B9B2", "#3A8C85", "#A2DED0"]}
                />
              </AppCard>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12">
              <AppCard className="client-card card-hover">
                <AppBarChart
                  displayLegends={false}
                  label={t("classEnrollmentChart.label")}
                  labels={dashData.classEnrollmentChart.map(
                    (item) => item.classNameAndBranch
                  )}
                  dataValues={dashData.classEnrollmentChart.map(
                    (item) => item.enrollmentCount
                  )}
                  xAxisLabel={t("classEnrollmentChart.classes.label")}
                  yAxisLabel={t("classEnrollmentChart.enrollment.label")}
                />
              </AppCard>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SchoolDashboard;
