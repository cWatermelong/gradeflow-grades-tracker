export interface GradeScaleEntry {
  id: string;
  meaning: string;
  letter: string;
  minPercent: number;
  maxPercent: number;
  gradePoint: number;
}

export interface Assessment {
  id: string;
  name: string;
  type: string;
  weight: number;        // percentage, e.g. 30 means 30%
  gradeInput: string;    // raw input: "90" or "45/50"
}

export interface DetailedCourse {
  id: string;
  name: string;
  creditHours: number;
  assessments: Assessment[];
  courseAvg?: string; // letter grade for class average
}

export interface Course {
  id: string;
  name: string;
  creditHours: number;
  letterGrade: string;
  percentage?: number;
  linkedCourseId?: string;
  courseAvg?: string; // letter grade for class average
}

export type SemesterStatus = 'in-progress' | 'completed';

export interface Semester {
  id: string;
  name: string;
  courses: Course[];
  status: SemesterStatus;
}

export type Theme = 'light' | 'dark';
