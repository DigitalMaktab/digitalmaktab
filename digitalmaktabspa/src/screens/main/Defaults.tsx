import React, { useMemo, useState, useEffect } from "react";
import useMainOperations from "../../hooks/useMainOperations";
import AppCard from "../../components/card/AppCard";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import AppTable from "../../components/table/AppTable";
import { Country } from "../../models/Country";
import { Column } from "../../components/table/properties/TableProps";
import { EnumDto } from "../../models/EnumDto";

const Defaults = () => {
  const {
    fetchCountries,
    fetchClassTypes,
    fetchBloodGroups,
    fetchGenders,
    fetchDisabilities,
    fetchExamTypes,
    fetchLanguages,
    fetchIsOrphans,
    fetchMonths,
    fetchDays,
    fetchScheduleTimes,
    fetchShifts,
    fetchAddressTypes,
    fetchSchoolTypes,
    totalPages,
  } = useMainOperations();
  const { t } = useAppLocalizer();

  const [countriesData, setCountriesData] = useState<Country[]>([]);
  const [classTypesData, setClassTypesData] = useState<EnumDto[]>([]);
  const [bloodGroupsData, setBloodGroupsData] = useState<EnumDto[]>([]);
  const [gendersData, setGendersData] = useState<EnumDto[]>([]);
  const [disabilitiesData, setDisabilitiesData] = useState<EnumDto[]>([]);
  const [examTypesData, setExamTypesData] = useState<EnumDto[]>([]);
  const [languagesData, setLanguagesData] = useState<EnumDto[]>([]);
  const [isOrphansData, setIsOrphansData] = useState<EnumDto[]>([]);
  const [monthsData, setMonthsData] = useState<EnumDto[]>([]);
  const [daysData, setDaysData] = useState<EnumDto[]>([]);
  const [scheduleTimesData, setScheduleTimesData] = useState<EnumDto[]>([]);
  const [shiftsData, setShiftsData] = useState<EnumDto[]>([]);
  const [addressTypesData, setAddressTypesData] = useState<EnumDto[]>([]);
  const [schoolTypesData, setSchoolTypesData] = useState<EnumDto[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const countriesResult = await fetchCountries(1, 10, {});
      const classTypesResult = await fetchClassTypes(1, 10, {});
      const bloodGroupsResult = await fetchBloodGroups(1, 10, {});
      const gendersResult = await fetchGenders(1, 10, {});
      const disabilitiesResult = await fetchDisabilities(1, 10, {});
      const examTypesResult = await fetchExamTypes(1, 10, {});
      const languagesResult = await fetchLanguages(1, 10, {});
      const isOrphansResult = await fetchIsOrphans(1, 10, {});
      const monthsResult = await fetchMonths(1, 10, {});
      const daysResult = await fetchDays(1, 10, {});
      const scheduleTimesResult = await fetchScheduleTimes(1, 10, {});
      const shiftsResult = await fetchShifts(1, 10, {});
      const addressTypesResult = await fetchAddressTypes(1, 10, {});
      const schoolTypesResult = await fetchSchoolTypes(1, 10, {});

      setCountriesData(countriesResult.data);
      setClassTypesData(classTypesResult.data);
      setBloodGroupsData(bloodGroupsResult.data);
      setGendersData(gendersResult.data);
      setDisabilitiesData(disabilitiesResult.data);
      setExamTypesData(examTypesResult.data);
      setLanguagesData(languagesResult.data);
      setIsOrphansData(isOrphansResult.data);
      setMonthsData(monthsResult.data);
      setDaysData(daysResult.data);
      setScheduleTimesData(scheduleTimesResult.data);
      setShiftsData(shiftsResult.data);
      setAddressTypesData(addressTypesResult.data);
      setSchoolTypesData(schoolTypesResult.data);
    };
    fetchData();
  }, [t]);

  const countryColumns: Column<Country>[] = useMemo(
    () => [
      {
        header: "country.countryName.label",
        accessor: "countryName",
      },
    ],
    []
  );

  const classTypeColumns: Column<EnumDto>[] = useMemo(
    () => [
      {
        header: "classType.classTypeName.label",
        accessor: "name",
      },
    ],
    []
  );

  const enumColumns: Column<EnumDto>[] = useMemo(
    () => [
      {
        header: "enum.name.label",
        accessor: "name",
      },
    ],
    []
  );

  return (
    <div>
      <div className="row">
        <div className="col-md-6">
          <AppCard title={t("country.countryList.label")}>
            <AppTable
              data={countriesData}
              columns={countryColumns}
              totalPages={totalPages}
              fetchPageData={fetchCountries}
              reportTitle={t("country.countryList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("classType.classTypeList.label")}>
            <AppTable
              data={classTypesData}
              columns={classTypeColumns}
              totalPages={totalPages}
              fetchPageData={fetchClassTypes}
              reportTitle={t("classType.classTypeList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("bloodGroup.bloodGroupList.label")}>
            <AppTable
              data={bloodGroupsData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchBloodGroups}
              reportTitle={t("bloodGroup.bloodGroupList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("gender.genderList.label")}>
            <AppTable
              data={gendersData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchGenders}
              reportTitle={t("gender.genderList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("disability.disabilityList.label")}>
            <AppTable
              data={disabilitiesData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchDisabilities}
              reportTitle={t("disability.disabilityList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("examType.examTypeList.label")}>
            <AppTable
              data={examTypesData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchExamTypes}
              reportTitle={t("examType.examTypeList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("language.languageList.label")}>
            <AppTable
              data={languagesData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchLanguages}
              reportTitle={t("language.languageList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("isOrphan.isOrphanList.label")}>
            <AppTable
              data={isOrphansData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchIsOrphans}
              reportTitle={t("isOrphan.isOrphanList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("month.monthList.label")}>
            <AppTable
              data={monthsData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchMonths}
              reportTitle={t("month.monthList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("day.dayList.label")}>
            <AppTable
              data={daysData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchDays}
              reportTitle={t("day.dayList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("scheduleTime.scheduleTimeList.label")}>
            <AppTable
              data={scheduleTimesData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchScheduleTimes}
              reportTitle={t("scheduleTime.scheduleTimeList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("shift.shiftList.label")}>
            <AppTable
              data={shiftsData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchShifts}
              reportTitle={t("shift.shiftList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("addressType.addressTypeList.label")}>
            <AppTable
              data={addressTypesData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchAddressTypes}
              reportTitle={t("addressType.addressTypeList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
        <div className="col-md-6">
          <AppCard title={t("schoolType.schoolTypeList.label")}>
            <AppTable
              data={schoolTypesData}
              columns={enumColumns}
              totalPages={totalPages}
              fetchPageData={fetchSchoolTypes}
              reportTitle={t("schoolType.schoolTypeList.label")}
              showExport={false}
              showPageSizer={false}
            />
          </AppCard>
        </div>
      </div>
    </div>
  );
};

export default Defaults;
