import apiClient from "./client";

export interface ClassDto {
  id: string;
  classNameValue: string;
  className: string;
  classTypeValue: string;
  shiftValue: string;
  branchId: string;
  calendarYearId: string;
  branch?: { branchNameValue: string };
  calendarYear?: { nativeYear: string };
  teacher?: { firstNameNative: string; lastNameNative: string };
}

export interface StudentDto {
  id: string;
  asasNumber: number;
  firstNameNative: string;
  lastNameNative: string;
  fatherNameNative: string;
  grandFatherNameNative: string;
  firstNameEnglish: string;
  lastNameEnglish: string;
  fatherNameEnglish: string;
  grandFatherNameEnglish: string;
  genderValue: string;
  dateOfBirth: string;
  bloodGroupValue: string;
  disabilityTypeValue: string;
  isOrphanValue: string;
  motherTongue: string;
  email: string;
  phoneNumber?: { phoneNumber: string };
  status: boolean;
}

export interface EnrollmentDto {
  id: string;
  student: StudentDto;
  class: ClassDto;
  enrollmentDate: string;
}

export async function getClasses(params: Record<string, any> = {}): Promise<ClassDto[]> {
  const res = await apiClient.get("/School/classes", {
    params: { pageSize: 50, ...params },
  });
  return res.data;
}

export async function getClassStudents(
  classId: string,
  calendarYearId: string,
  params: Record<string, any> = {}
): Promise<EnrollmentDto[]> {
  const res = await apiClient.get(
    `/School/classStudents/${classId}/${calendarYearId}`,
    { params: { pageSize: 50, ...params } }
  );
  return res.data;
}
