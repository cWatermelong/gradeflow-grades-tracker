import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { GradeScaleEntry, Semester, Course, DetailedCourse, Assessment, Theme, SemesterStatus } from './types';

const DEFAULT_GRADE_SCALE: GradeScaleEntry[] = [
  { id: uuidv4(), meaning: 'Excellent', letter: 'A+', minPercent: 90, maxPercent: 100, gradePoint: 4.0 },
  { id: uuidv4(), meaning: 'Excellent', letter: 'A', minPercent: 85, maxPercent: 89, gradePoint: 4.0 },
  { id: uuidv4(), meaning: 'Excellent', letter: 'A-', minPercent: 80, maxPercent: 84, gradePoint: 3.7 },
  { id: uuidv4(), meaning: 'Good', letter: 'B+', minPercent: 77, maxPercent: 79, gradePoint: 3.3 },
  { id: uuidv4(), meaning: 'Good', letter: 'B', minPercent: 73, maxPercent: 76, gradePoint: 3.0 },
  { id: uuidv4(), meaning: 'Good', letter: 'B-', minPercent: 70, maxPercent: 72, gradePoint: 2.7 },
  { id: uuidv4(), meaning: 'Adequate', letter: 'C+', minPercent: 67, maxPercent: 69, gradePoint: 2.3 },
  { id: uuidv4(), meaning: 'Adequate', letter: 'C', minPercent: 63, maxPercent: 66, gradePoint: 2.0 },
  { id: uuidv4(), meaning: 'Adequate', letter: 'C-', minPercent: 60, maxPercent: 62, gradePoint: 1.7 },
  { id: uuidv4(), meaning: 'Marginal', letter: 'D+', minPercent: 57, maxPercent: 59, gradePoint: 1.3 },
  { id: uuidv4(), meaning: 'Marginal', letter: 'D', minPercent: 53, maxPercent: 56, gradePoint: 1.0 },
  { id: uuidv4(), meaning: 'Marginal', letter: 'D-', minPercent: 50, maxPercent: 52, gradePoint: 0.7 },
  { id: uuidv4(), meaning: 'Inadequate', letter: 'F', minPercent: 0, maxPercent: 49, gradePoint: 0.0 },
];

export function parseGradeInput(input: string): { percent: number; isValid: boolean } {
  const trimmed = input.trim();
  if (!trimmed) return { percent: 0, isValid: false };

  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    if (den === 0) return { percent: 0, isValid: false };
    return { percent: (num / den) * 100, isValid: true };
  }

  const num = parseFloat(trimmed);
  if (isNaN(num)) return { percent: 0, isValid: false };
  return { percent: num, isValid: true };
}

export function calculateCourseGrade(assessments: Assessment[]): number | null {
  if (assessments.length === 0) return null;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const a of assessments) {
    const { percent, isValid } = parseGradeInput(a.gradeInput);
    if (!isValid || a.weight <= 0) continue;
    totalWeightedScore += (percent * a.weight) / 100;
    totalWeight += a.weight;
  }

  if (totalWeight === 0) return null;
  const finalGrade = (totalWeightedScore / totalWeight) * 100;
  return Math.round(finalGrade * 100) / 100;
}

/** Calculate what-if: existing assessments + hypothetical ones */
export function calculateWhatIf(
  existingAssessments: Assessment[],
  hypothetical: Assessment[]
): number | null {
  return calculateCourseGrade([...existingAssessments, ...hypothetical]);
}

// ---- Undo/Redo history (in-memory, not persisted) ----
interface Snapshot {
  gradeScale: GradeScaleEntry[];
  semesters: Semester[];
  detailedCourses: DetailedCourse[];
}

const MAX_HISTORY = 50;
let historyStack: Snapshot[] = [];
let historyPointer = -1;
let isUndoRedoing = false;

function captureSnapshot(state: AppState): Snapshot {
  return {
    gradeScale: JSON.parse(JSON.stringify(state.gradeScale)),
    semesters: JSON.parse(JSON.stringify(state.semesters)),
    detailedCourses: JSON.parse(JSON.stringify(state.detailedCourses)),
  };
}

interface AppState {
  theme: Theme;
  gradeScale: GradeScaleEntry[];
  semesters: Semester[];
  detailedCourses: DetailedCourse[];

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Grade scale
  setGradeScale: (scale: GradeScaleEntry[]) => void;
  updateGradeScaleEntry: (id: string, entry: Partial<GradeScaleEntry>) => void;
  addGradeScaleEntry: (entry: Omit<GradeScaleEntry, 'id'>) => void;
  removeGradeScaleEntry: (id: string) => void;
  resetGradeScale: () => void;

  // Semesters
  addSemester: (name: string) => void;
  removeSemester: (id: string) => void;
  renameSemester: (id: string, name: string) => void;
  setSemesterStatus: (id: string, status: SemesterStatus) => void;
  moveSemester: (id: string, direction: 'up' | 'down') => void;

  // Semester courses
  addCourse: (semesterId: string, course: Omit<Course, 'id'>) => void;
  updateCourse: (semesterId: string, courseId: string, course: Partial<Course>) => void;
  removeCourse: (semesterId: string, courseId: string) => void;
  addExistingCourse: (semesterId: string, detailedCourseId: string) => void;

  // Detailed courses
  addDetailedCourse: (name: string, creditHours: number) => void;
  removeDetailedCourse: (id: string) => void;
  updateDetailedCourse: (id: string, data: Partial<Pick<DetailedCourse, 'name' | 'creditHours' | 'courseAvg'>>) => void;
  moveDetailedCourse: (id: string, direction: 'up' | 'down') => void;
  addAssessment: (courseId: string, assessment: Omit<Assessment, 'id'>) => void;
  updateAssessment: (courseId: string, assessmentId: string, data: Partial<Assessment>) => void;
  removeAssessment: (courseId: string, assessmentId: string) => void;
  moveAssessment: (courseId: string, assessmentId: string, direction: 'up' | 'down') => void;
  getDetailedCourseGrade: (courseId: string) => number | null;
  getDetailedCourseLetter: (courseId: string) => string;

  // Sync linked courses
  syncLinkedCourses: (detailedCourseId: string) => void;

  // Calculations
  getGradePoint: (letter: string) => number;
  getLetterForPercent: (percent: number) => string;
  getSemesterGPA: (semesterId: string) => number;
  getCumulativeGPA: () => number;
  getCompletedGPA: () => number;
  getProjectedGPA: () => number;

  // Target GPA
  calculateRequiredGPA: (targetCumGPA: number, plannedCredits: number) => number | null;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Export/Import
  exportData: () => string;
  importData: (json: string) => boolean;
}

function pushHistory(state: AppState) {
  if (isUndoRedoing) return;
  const snap = captureSnapshot(state);
  // Remove future history if we're not at the end
  historyStack = historyStack.slice(0, historyPointer + 1);
  historyStack.push(snap);
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
  historyPointer = historyStack.length - 1;
}

function moveInArray<T>(arr: T[], index: number, direction: 'up' | 'down'): T[] {
  const newArr = [...arr];
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= newArr.length) return newArr;
  [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
  return newArr;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      gradeScale: DEFAULT_GRADE_SCALE,
      semesters: [],
      detailedCourses: [],

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // Grade scale
      setGradeScale: (scale) => { pushHistory(get()); set({ gradeScale: scale }); },
      updateGradeScaleEntry: (id, entry) => {
        pushHistory(get());
        set((state) => ({
          gradeScale: state.gradeScale.map((e) => e.id === id ? { ...e, ...entry } : e),
        }));
      },
      addGradeScaleEntry: (entry) => {
        pushHistory(get());
        set((state) => ({
          gradeScale: [...state.gradeScale, { ...entry, id: uuidv4() }],
        }));
      },
      removeGradeScaleEntry: (id) => {
        pushHistory(get());
        set((state) => ({
          gradeScale: state.gradeScale.filter((e) => e.id !== id),
        }));
      },
      resetGradeScale: () => { pushHistory(get()); set({ gradeScale: DEFAULT_GRADE_SCALE }); },

      // Semesters
      addSemester: (name) => {
        pushHistory(get());
        set((state) => ({
          semesters: [...state.semesters, { id: uuidv4(), name, courses: [], status: 'in-progress' }],
        }));
      },
      removeSemester: (id) => {
        pushHistory(get());
        set((state) => ({
          semesters: state.semesters.filter((s) => s.id !== id),
        }));
      },
      renameSemester: (id, name) => {
        pushHistory(get());
        set((state) => ({
          semesters: state.semesters.map((s) => s.id === id ? { ...s, name } : s),
        }));
      },
      setSemesterStatus: (id, status) => {
        pushHistory(get());
        set((state) => ({
          semesters: state.semesters.map((s) => s.id === id ? { ...s, status } : s),
        }));
      },
      moveSemester: (id, direction) => {
        pushHistory(get());
        set((state) => {
          const idx = state.semesters.findIndex((s) => s.id === id);
          if (idx === -1) return state;
          return { semesters: moveInArray(state.semesters, idx, direction) };
        });
      },

      // Semester courses
      addCourse: (semesterId, course) => {
        pushHistory(get());
        set((state) => ({
          semesters: state.semesters.map((s) =>
            s.id === semesterId
              ? { ...s, courses: [...s.courses, { ...course, id: uuidv4() }] }
              : s
          ),
        }));
      },
      updateCourse: (semesterId, courseId, course) => {
        pushHistory(get());
        set((state) => ({
          semesters: state.semesters.map((s) =>
            s.id === semesterId
              ? { ...s, courses: s.courses.map((c) => c.id === courseId ? { ...c, ...course } : c) }
              : s
          ),
        }));
      },
      removeCourse: (semesterId, courseId) => {
        pushHistory(get());
        set((state) => ({
          semesters: state.semesters.map((s) =>
            s.id === semesterId
              ? { ...s, courses: s.courses.filter((c) => c.id !== courseId) }
              : s
          ),
        }));
      },
      addExistingCourse: (semesterId, detailedCourseId) => {
        const dc = get().detailedCourses.find((c) => c.id === detailedCourseId);
        if (!dc) return;
        const grade = get().getDetailedCourseGrade(detailedCourseId);
        const letter = grade !== null ? get().getLetterForPercent(grade) : get().gradeScale[get().gradeScale.length - 1]?.letter ?? 'F';
        get().addCourse(semesterId, {
          name: dc.name,
          creditHours: dc.creditHours,
          letterGrade: letter,
          percentage: grade ?? undefined,
          linkedCourseId: detailedCourseId,
        });
      },

      // Detailed courses
      addDetailedCourse: (name, creditHours) => {
        pushHistory(get());
        set((state) => ({
          detailedCourses: [...state.detailedCourses, { id: uuidv4(), name, creditHours, assessments: [] }],
        }));
      },
      removeDetailedCourse: (id) => {
        pushHistory(get());
        set((state) => ({
          detailedCourses: state.detailedCourses.filter((c) => c.id !== id),
        }));
      },
      updateDetailedCourse: (id, data) => {
        pushHistory(get());
        set((state) => ({
          detailedCourses: state.detailedCourses.map((c) => c.id === id ? { ...c, ...data } : c),
        }));
        get().syncLinkedCourses(id);
      },
      moveDetailedCourse: (id, direction) => {
        pushHistory(get());
        set((state) => {
          const idx = state.detailedCourses.findIndex((c) => c.id === id);
          if (idx === -1) return state;
          return { detailedCourses: moveInArray(state.detailedCourses, idx, direction) };
        });
      },
      addAssessment: (courseId, assessment) => {
        pushHistory(get());
        set((state) => ({
          detailedCourses: state.detailedCourses.map((c) =>
            c.id === courseId
              ? { ...c, assessments: [...c.assessments, { ...assessment, id: uuidv4() }] }
              : c
          ),
        }));
        get().syncLinkedCourses(courseId);
      },
      updateAssessment: (courseId, assessmentId, data) => {
        pushHistory(get());
        set((state) => ({
          detailedCourses: state.detailedCourses.map((c) =>
            c.id === courseId
              ? { ...c, assessments: c.assessments.map((a) => a.id === assessmentId ? { ...a, ...data } : a) }
              : c
          ),
        }));
        get().syncLinkedCourses(courseId);
      },
      removeAssessment: (courseId, assessmentId) => {
        pushHistory(get());
        set((state) => ({
          detailedCourses: state.detailedCourses.map((c) =>
            c.id === courseId
              ? { ...c, assessments: c.assessments.filter((a) => a.id !== assessmentId) }
              : c
          ),
        }));
        get().syncLinkedCourses(courseId);
      },
      moveAssessment: (courseId, assessmentId, direction) => {
        pushHistory(get());
        set((state) => ({
          detailedCourses: state.detailedCourses.map((c) => {
            if (c.id !== courseId) return c;
            const idx = c.assessments.findIndex((a) => a.id === assessmentId);
            if (idx === -1) return c;
            return { ...c, assessments: moveInArray(c.assessments, idx, direction) };
          }),
        }));
      },
      getDetailedCourseGrade: (courseId) => {
        const dc = get().detailedCourses.find((c) => c.id === courseId);
        if (!dc) return null;
        return calculateCourseGrade(dc.assessments);
      },
      getDetailedCourseLetter: (courseId) => {
        const grade = get().getDetailedCourseGrade(courseId);
        if (grade === null) return '—';
        return get().getLetterForPercent(grade);
      },

      // Sync linked courses: update all semester courses linked to this detailed course
      syncLinkedCourses: (detailedCourseId) => {
        const dc = get().detailedCourses.find((c) => c.id === detailedCourseId);
        if (!dc) return;
        const grade = calculateCourseGrade(dc.assessments);
        const letter = grade !== null ? get().getLetterForPercent(grade) : get().gradeScale[get().gradeScale.length - 1]?.letter ?? 'F';

        set((state) => ({
          semesters: state.semesters.map((s) => ({
            ...s,
            courses: s.courses.map((c) =>
              c.linkedCourseId === detailedCourseId
                ? { ...c, name: dc.name, creditHours: dc.creditHours, letterGrade: letter, percentage: grade ?? undefined }
                : c
            ),
          })),
        }));
      },

      // Calculations
      getGradePoint: (letter) => {
        const entry = get().gradeScale.find((e) => e.letter === letter);
        return entry?.gradePoint ?? 0;
      },
      getLetterForPercent: (percent) => {
        const rounded = Math.round(percent);
        const sorted = [...get().gradeScale].sort((a, b) => b.minPercent - a.minPercent);
        for (const entry of sorted) {
          if (rounded >= entry.minPercent && rounded <= entry.maxPercent) {
            return entry.letter;
          }
        }
        return get().gradeScale[get().gradeScale.length - 1]?.letter ?? 'F';
      },
      getSemesterGPA: (semesterId) => {
        const semester = get().semesters.find((s) => s.id === semesterId);
        if (!semester || semester.courses.length === 0) return 0;
        const totalCredits = semester.courses.reduce((sum, c) => sum + c.creditHours, 0);
        if (totalCredits === 0) return 0;
        const totalPoints = semester.courses.reduce(
          (sum, c) => sum + get().getGradePoint(c.letterGrade) * c.creditHours, 0
        );
        return totalPoints / totalCredits;
      },
      getCumulativeGPA: () => {
        const allCourses = get().semesters.flatMap((s) => s.courses);
        if (allCourses.length === 0) return 0;
        const totalCredits = allCourses.reduce((sum, c) => sum + c.creditHours, 0);
        if (totalCredits === 0) return 0;
        const totalPoints = allCourses.reduce(
          (sum, c) => sum + get().getGradePoint(c.letterGrade) * c.creditHours, 0
        );
        return totalPoints / totalCredits;
      },
      getCompletedGPA: () => {
        const completedCourses = get().semesters
          .filter((s) => s.status === 'completed')
          .flatMap((s) => s.courses);
        if (completedCourses.length === 0) return 0;
        const totalCredits = completedCourses.reduce((sum, c) => sum + c.creditHours, 0);
        if (totalCredits === 0) return 0;
        const totalPoints = completedCourses.reduce(
          (sum, c) => sum + get().getGradePoint(c.letterGrade) * c.creditHours, 0
        );
        return totalPoints / totalCredits;
      },
      getProjectedGPA: () => {
        // Includes all semesters (completed + in-progress)
        return get().getCumulativeGPA();
      },

      // Target GPA: what GPA do you need over `plannedCredits` to reach `targetCumGPA`?
      calculateRequiredGPA: (targetCumGPA, plannedCredits) => {
        const completedCourses = get().semesters
          .filter((s) => s.status === 'completed')
          .flatMap((s) => s.courses);
        const completedCredits = completedCourses.reduce((sum, c) => sum + c.creditHours, 0);
        const completedPoints = completedCourses.reduce(
          (sum, c) => sum + get().getGradePoint(c.letterGrade) * c.creditHours, 0
        );

        if (plannedCredits <= 0) return null;
        const totalCreditsNeeded = completedCredits + plannedCredits;
        const totalPointsNeeded = targetCumGPA * totalCreditsNeeded;
        const requiredPoints = totalPointsNeeded - completedPoints;
        const requiredGPA = requiredPoints / plannedCredits;

        if (requiredGPA < 0) return 0;
        return Math.round(requiredGPA * 100) / 100;
      },

      // Undo/Redo
      undo: () => {
        if (historyPointer <= 0) return;
        // Save current state if at the end
        if (historyPointer === historyStack.length - 1) {
          historyStack.push(captureSnapshot(get()));
          // Don't increment pointer — we want to go back
        }
        historyPointer--;
        isUndoRedoing = true;
        const snap = historyStack[historyPointer];
        set({
          gradeScale: JSON.parse(JSON.stringify(snap.gradeScale)),
          semesters: JSON.parse(JSON.stringify(snap.semesters)),
          detailedCourses: JSON.parse(JSON.stringify(snap.detailedCourses)),
        });
        isUndoRedoing = false;
      },
      redo: () => {
        if (historyPointer >= historyStack.length - 1) return;
        historyPointer++;
        isUndoRedoing = true;
        const snap = historyStack[historyPointer];
        set({
          gradeScale: JSON.parse(JSON.stringify(snap.gradeScale)),
          semesters: JSON.parse(JSON.stringify(snap.semesters)),
          detailedCourses: JSON.parse(JSON.stringify(snap.detailedCourses)),
        });
        isUndoRedoing = false;
      },
      canUndo: () => historyPointer > 0,
      canRedo: () => historyPointer < historyStack.length - 1,

      // Export/Import
      exportData: () => {
        const { gradeScale, semesters, detailedCourses } = get();
        return JSON.stringify({ gradeScale, semesters, detailedCourses }, null, 2);
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.gradeScale && data.semesters) {
            pushHistory(get());
            // Migrate old semesters without status
            const semesters = data.semesters.map((s: Semester) => ({
              ...s,
              status: s.status ?? 'completed',
            }));
            set({
              gradeScale: data.gradeScale,
              semesters,
              detailedCourses: data.detailedCourses ?? [],
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'gradeflow-storage',
      // Migrate old data without status field
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        if (state && Array.isArray(state.semesters)) {
          state.semesters = (state.semesters as Semester[]).map((s) => ({
            ...s,
            status: s.status ?? 'completed',
          }));
        }
        if (state && !state.detailedCourses) {
          state.detailedCourses = [];
        }
        return state as unknown as AppState;
      },
      version: 1,
    }
  )
);
