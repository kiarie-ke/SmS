/** Domain constants shared by the API and the web app. */

export const TIMEZONE = "Africa/Nairobi";
export const CURRENCY = "KES";

export const ROLES = [
  "ADMIN",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "BURSAR",
  "LIBRARIAN",
] as const;
export type Role = (typeof ROLES)[number];

export const SCHOOL_LEVELS = ["PRIMARY", "JSS", "SECONDARY"] as const;
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];

export const SCHOOL_TYPES = ["PUBLIC", "PRIVATE"] as const;
export type SchoolType = (typeof SCHOOL_TYPES)[number];

export const SCHOOL_CATEGORIES = ["DAY", "BOARDING", "MIXED"] as const;
export type SchoolCategory = (typeof SCHOOL_CATEGORIES)[number];

/**
 * CBC_8_4_4 = numeric 8-4-4 grading (A-E bands), CBC = performance levels.
 * Mirrors `School.gradeScaleType` / `GradeScale.type` in the Prisma schema.
 */
export const GRADE_SCALE_TYPES = ["CBC_8_4_4", "CBC"] as const;
export type GradeScaleType = (typeof GRADE_SCALE_TYPES)[number];

export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

export const BOARDING_STATUSES = ["DAY", "BOARDER"] as const;
export type BoardingStatus = (typeof BOARDING_STATUSES)[number];

export const RELATIONSHIPS = [
  "MOTHER",
  "FATHER",
  "AUNT",
  "UNCLE",
  "GRANDPARENT",
  "SPONSOR",
  "OTHER",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const EMPLOYMENT_TYPES = ["TSC", "BOM", "INTERN"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SUBJECT_LEVELS = ["PRIMARY", "JSS", "SECONDARY"] as const;
export type SubjectLevel = (typeof SUBJECT_LEVELS)[number];

export const CLASS_LEVELS = [
  "PP1",
  "PP2",
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
  "STD1",
  "STD2",
  "STD3",
  "STD4",
  "STD5",
  "STD6",
  "STD7",
  "STD8",
  "FORM1",
  "FORM2",
  "FORM3",
  "FORM4",
] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const TERM_NUMBERS = [1, 2, 3] as const;
export type TermNumber = (typeof TERM_NUMBERS)[number];

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const LESSON_PLAN_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REVISION_REQUESTED",
] as const;
export type LessonPlanStatus = (typeof LESSON_PLAN_STATUSES)[number];

export const CALENDAR_EVENT_TYPES = [
  "TERM",
  "HOLIDAY",
  "EXAM",
  "MEETING",
  "SCHOOL_EVENT",
  "OTHER",
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const EXAM_NAMES = ["CAT1", "MIDTERM", "ENDTERM", "MOCK"] as const;
export type ExamName = (typeof EXAM_NAMES)[number];

export const FEE_CATEGORIES = [
  "TUITION",
  "LUNCH",
  "TRANSPORT",
  "BOARDING",
  "ACTIVITY",
  "EXAM",
  "OTHER",
] as const;
export type FeeCategory = (typeof FEE_CATEGORIES)[number];

export const INVOICE_STATUSES = ["UNPAID", "PARTIAL", "PAID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ["MPESA", "CASH", "BANK", "CHEQUE"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FINANCE_TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type FinanceTransactionType = (typeof FINANCE_TRANSACTION_TYPES)[number];

export const BOOK_TYPES = ["TEXTBOOK", "STORY", "OTHER"] as const;
export type BookType = (typeof BOOK_TYPES)[number];

export const BOOK_COPY_STATUSES = [
  "AVAILABLE",
  "LOANED",
  "LOST",
  "DAMAGED",
] as const;
export type BookCopyStatus = (typeof BOOK_COPY_STATUSES)[number];

export const REPORT_TEMPLATES = ["CBC", "EIGHT_FOUR_FOUR"] as const;
export type ReportTemplate = (typeof REPORT_TEMPLATES)[number];

export const NOTIFICATION_CHANNELS = [
  "IN_APP",
  "SMS",
  "EMAIL",
  "BOTH",
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  "ABSENCE",
  "RESULTS_PUBLISHED",
  "FEE_REMINDER",
  "GENERAL",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CBC_PERFORMANCE_LEVELS = ["EE", "ME", "AE", "BE"] as const;
export type PerformanceLevel = (typeof CBC_PERFORMANCE_LEVELS)[number];

export const CBC_PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  EE: "Exceeding Expectation",
  ME: "Meeting Expectation",
  AE: "Approaching Expectation",
  BE: "Below Expectation",
};

export interface GradeBand {
  min: number;
  max: number;
  grade: string;
  points: number;
  remark: string;
}

/** Default Kenyan 8-4-4 grading bands, seeded into every school's GradeScale. */
export const KENYAN_844_GRADE_BANDS: readonly GradeBand[] = [
  { min: 80, max: 100, grade: "A", points: 12, remark: "Excellent" },
  { min: 75, max: 79, grade: "A-", points: 11, remark: "Very good" },
  { min: 70, max: 74, grade: "B+", points: 10, remark: "Good" },
  { min: 65, max: 69, grade: "B", points: 9, remark: "Good" },
  { min: 60, max: 64, grade: "B-", points: 8, remark: "Fairly good" },
  { min: 55, max: 59, grade: "C+", points: 7, remark: "Fair" },
  { min: 50, max: 54, grade: "C", points: 6, remark: "Fair" },
  { min: 45, max: 49, grade: "C-", points: 5, remark: "Average" },
  { min: 40, max: 44, grade: "D+", points: 4, remark: "Below average" },
  { min: 35, max: 39, grade: "D", points: 3, remark: "Weak" },
  { min: 30, max: 34, grade: "D-", points: 2, remark: "Very weak" },
  { min: 0, max: 29, grade: "E", points: 1, remark: "Poor" },
] as const;

/** Default CBC performance-level descriptors. */
export const CBC_GRADE_BANDS: readonly GradeBand[] = [
  {
    min: 80,
    max: 100,
    grade: "EE",
    points: 4,
    remark: "Exceeding Expectation",
  },
  { min: 65, max: 79, grade: "ME", points: 3, remark: "Meeting Expectation" },
  {
    min: 50,
    max: 64,
    grade: "AE",
    points: 2,
    remark: "Approaching Expectation",
  },
  { min: 0, max: 49, grade: "BE", points: 1, remark: "Below Expectation" },
] as const;

/** E.164 Kenyan number: +254 followed by 9 digits. */
export const KENYAN_PHONE_REGEX = /^\+254[17]\d{8}$/;

/**
 * Normalizes common Kenyan phone formats to E.164:
 * 0712 345 678 -> +254712345678, 254712345678 -> +254712345678.
 * Returns null when the input is not a Kenyan mobile number.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+?254/, "+254");
  const withPrefix = digits.startsWith("+254")
    ? digits
    : digits.replace(/^0/, "+254");
  return KENYAN_PHONE_REGEX.test(withPrefix) ? withPrefix : null;
}

/** Returns the grade band for a numeric score, or null when out of range. */
export function findGradeBand(
  score: number,
  bands: readonly GradeBand[],
): GradeBand | null {
  return bands.find((band) => score >= band.min && score <= band.max) ?? null;
}

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
  BURSAR: "/bursar",
  LIBRARIAN: "/librarian",
};
