import { ClassDto, StudentDto, EnrollmentDto } from "./school";

const mockClasses: ClassDto[] = [
  {
    id: "c1",
    classNameValue: "Class 1 - A",
    className: "CLASS_1",
    classTypeValue: "General",
    shiftValue: "Morning",
    branchId: "b1",
    calendarYearId: "cy1",
    branch: { branchNameValue: "Main Branch" },
    calendarYear: { nativeYear: "1403" },
    teacher: { firstNameNative: "احمد", lastNameNative: "کریمی" },
  },
  {
    id: "c2",
    classNameValue: "Class 2 - A",
    className: "CLASS_2",
    classTypeValue: "General",
    shiftValue: "Morning",
    branchId: "b1",
    calendarYearId: "cy1",
    branch: { branchNameValue: "Main Branch" },
    calendarYear: { nativeYear: "1403" },
    teacher: { firstNameNative: "فاطمه", lastNameNative: "احمدی" },
  },
  {
    id: "c3",
    classNameValue: "Class 3 - B",
    className: "CLASS_3",
    classTypeValue: "General",
    shiftValue: "Afternoon",
    branchId: "b2",
    calendarYearId: "cy1",
    branch: { branchNameValue: "West Branch" },
    calendarYear: { nativeYear: "1403" },
    teacher: { firstNameNative: "محمد", lastNameNative: "نوری" },
  },
];

const mockStudents: StudentDto[] = [
  {
    id: "s1", asasNumber: 101,
    firstNameNative: "علی", lastNameNative: "احمدی",
    fatherNameNative: "محمد", grandFatherNameNative: "عبدالله",
    firstNameEnglish: "Ali", lastNameEnglish: "Ahmadi",
    fatherNameEnglish: "Mohammad", grandFatherNameEnglish: "Abdullah",
    genderValue: "Male", dateOfBirth: "2015-03-12",
    bloodGroupValue: "A+", disabilityTypeValue: "None",
    isOrphanValue: "No", motherTongue: "Dari",
    email: "ali@example.com", status: true,
  },
  {
    id: "s2", asasNumber: 102,
    firstNameNative: "زهرا", lastNameNative: "کریمی",
    fatherNameNative: "احمد", grandFatherNameNative: "حسین",
    firstNameEnglish: "Zahra", lastNameEnglish: "Karimi",
    fatherNameEnglish: "Ahmad", grandFatherNameEnglish: "Hussain",
    genderValue: "Female", dateOfBirth: "2014-07-22",
    bloodGroupValue: "B+", disabilityTypeValue: "None",
    isOrphanValue: "No", motherTongue: "Pashto",
    email: "zahra@example.com", status: true,
  },
  {
    id: "s3", asasNumber: 103,
    firstNameNative: "حسن", lastNameNative: "نوری",
    fatherNameNative: "عبدالرحمن", grandFatherNameNative: "غلام",
    firstNameEnglish: "Hassan", lastNameEnglish: "Noori",
    fatherNameEnglish: "Abdulrahman", grandFatherNameEnglish: "Ghulam",
    genderValue: "Male", dateOfBirth: "2015-01-05",
    bloodGroupValue: "O+", disabilityTypeValue: "None",
    isOrphanValue: "Yes", motherTongue: "Dari",
    email: "hassan@example.com", status: true,
  },
  {
    id: "s4", asasNumber: 104,
    firstNameNative: "مریم", lastNameNative: "سادات",
    fatherNameNative: "سید علی", grandFatherNameNative: "سید حسن",
    firstNameEnglish: "Maryam", lastNameEnglish: "Sadat",
    fatherNameEnglish: "Sayed Ali", grandFatherNameEnglish: "Sayed Hassan",
    genderValue: "Female", dateOfBirth: "2014-11-18",
    bloodGroupValue: "AB+", disabilityTypeValue: "None",
    isOrphanValue: "No", motherTongue: "Dari",
    email: "maryam@example.com", status: true,
  },
  {
    id: "s5", asasNumber: 105,
    firstNameNative: "احمد", lastNameNative: "ستانکزی",
    fatherNameNative: "نورالله", grandFatherNameNative: "فضل الرحمن",
    firstNameEnglish: "Ahmad", lastNameEnglish: "Stanekzai",
    fatherNameEnglish: "Noorullah", grandFatherNameEnglish: "Fazl Rahman",
    genderValue: "Male", dateOfBirth: "2015-06-30",
    bloodGroupValue: "A-", disabilityTypeValue: "None",
    isOrphanValue: "No", motherTongue: "Pashto",
    email: "ahmad@example.com", status: true,
  },
  {
    id: "s6", asasNumber: 106,
    firstNameNative: "سمیه", lastNameNative: "رحیمی",
    fatherNameNative: "رحیم", grandFatherNameNative: "کریم",
    firstNameEnglish: "Sumaya", lastNameEnglish: "Rahimi",
    fatherNameEnglish: "Rahim", grandFatherNameEnglish: "Karim",
    genderValue: "Female", dateOfBirth: "2015-09-14",
    bloodGroupValue: "B-", disabilityTypeValue: "None",
    isOrphanValue: "No", motherTongue: "Dari",
    email: "sumaya@example.com", status: true,
  },
  {
    id: "s7", asasNumber: 107,
    firstNameNative: "یوسف", lastNameNative: "حیدری",
    fatherNameNative: "حیدر", grandFatherNameNative: "اکبر",
    firstNameEnglish: "Yousuf", lastNameEnglish: "Haidari",
    fatherNameEnglish: "Haidar", grandFatherNameEnglish: "Akbar",
    genderValue: "Male", dateOfBirth: "2014-04-08",
    bloodGroupValue: "O-", disabilityTypeValue: "None",
    isOrphanValue: "No", motherTongue: "Dari",
    email: "yousuf@example.com", status: true,
  },
  {
    id: "s8", asasNumber: 108,
    firstNameNative: "نرگس", lastNameNative: "فیضی",
    fatherNameNative: "فیض محمد", grandFatherNameNative: "نور محمد",
    firstNameEnglish: "Narges", lastNameEnglish: "Faizi",
    fatherNameEnglish: "Faiz Mohammad", grandFatherNameEnglish: "Noor Mohammad",
    genderValue: "Female", dateOfBirth: "2015-12-01",
    bloodGroupValue: "A+", disabilityTypeValue: "None",
    isOrphanValue: "No", motherTongue: "Pashto",
    email: "narges@example.com", status: true,
  },
];

// Map students to classes: first 5 in class 1, next 3 in class 2
const classStudentMap: Record<string, StudentDto[]> = {
  c1: mockStudents.slice(0, 5),
  c2: mockStudents.slice(5, 8),
  c3: mockStudents.slice(2, 6),
};

export function getMockClasses(): ClassDto[] {
  return mockClasses;
}

export function getMockClassStudents(classId: string): EnrollmentDto[] {
  const students = classStudentMap[classId] || [];
  const cls = mockClasses.find((c) => c.id === classId)!;
  return students.map((s, i) => ({
    id: `enr-${classId}-${i}`,
    student: s,
    class: cls,
    enrollmentDate: "2024-03-01",
  }));
}
