import { useState } from 'react';
import { useStore } from '@/store';
import { Plus, X, Calculator } from 'lucide-react';

interface ProjectorCourse {
  id: number;
  name: string;
  credits: string;
  grade: string;
}

interface AcademicPeriod {
  id: number;
  name: string;
  courses: ProjectorCourse[];
}

let nextCourseId = 1;
let nextPeriodId = 1;

function makeDefaultCourses(count: number): ProjectorCourse[] {
  return Array.from({ length: count }, (_, i) => ({
    id: nextCourseId++,
    name: `Course ${i + 1}`,
    credits: '0.5',
    grade: '',
  }));
}

export function GPAProjector() {
  const { gradeScale, getGradePoint } = useStore();

  const [currentCGPA, setCurrentCGPA] = useState('');
  const [earnedCredits, setEarnedCredits] = useState('');
  const [periods, setPeriods] = useState<AcademicPeriod[]>([
    { id: nextPeriodId++, name: 'Academic Period', courses: makeDefaultCourses(5) },
  ]);

  // Grade options with percentage range
  const gradeOptions = gradeScale.map((g) => ({
    value: g.letter,
    label: `${g.letter} (${g.minPercent}-${g.maxPercent})`,
  }));

  // --- Period mutations ---
  const addPeriod = () => {
    setPeriods([...periods, {
      id: nextPeriodId++,
      name: 'Academic Period',
      courses: makeDefaultCourses(5),
    }]);
  };

  const removePeriod = (periodId: number) => {
    if (periods.length <= 1) return;
    setPeriods(periods.filter((p) => p.id !== periodId));
  };

  // --- Course mutations ---
  const addCourse = (periodId: number) => {
    setPeriods(periods.map((p) => {
      if (p.id !== periodId) return p;
      return {
        ...p,
        courses: [...p.courses, {
          id: nextCourseId++,
          name: `Course ${p.courses.length + 1}`,
          credits: '0.5',
          grade: '',
        }],
      };
    }));
  };

  const removeCourse = (periodId: number, courseId: number) => {
    setPeriods(periods.map((p) => {
      if (p.id !== periodId) return p;
      return { ...p, courses: p.courses.filter((c) => c.id !== courseId) };
    }));
  };

  const updateCourse = (periodId: number, courseId: number, field: keyof ProjectorCourse, value: string) => {
    setPeriods(periods.map((p) => {
      if (p.id !== periodId) return p;
      return {
        ...p,
        courses: p.courses.map((c) =>
          c.id === courseId ? { ...c, [field]: value } : c
        ),
      };
    }));
  };

  // --- Calculations ---
  const calcPeriodGPA = (courses: ProjectorCourse[]): { gpa: number; credits: number; points: number } | null => {
    const graded = courses.filter((c) => c.grade && parseFloat(c.credits) > 0);
    if (graded.length === 0) return null;
    const totalCredits = graded.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
    if (totalCredits === 0) return null;
    const totalPoints = graded.reduce((sum, c) => {
      const cr = parseFloat(c.credits) || 0;
      return sum + getGradePoint(c.grade) * cr;
    }, 0);
    return { gpa: totalPoints / totalCredits, credits: totalCredits, points: totalPoints };
  };

  // All new periods combined
  const allNewCourses = periods.flatMap((p) => p.courses).filter((c) => c.grade && parseFloat(c.credits) > 0);
  const totalNewCredits = allNewCourses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
  const totalNewPoints = allNewCourses.reduce((sum, c) => {
    return sum + getGradePoint(c.grade) * (parseFloat(c.credits) || 0);
  }, 0);
  const agpa = totalNewCredits > 0 ? totalNewPoints / totalNewCredits : null;

  // Projected CGPA
  const prevCGPA = parseFloat(currentCGPA) || 0;
  const prevCredits = parseFloat(earnedCredits) || 0;
  const prevPoints = prevCGPA * prevCredits;
  const projectedCGPA = (prevCredits + totalNewCredits) > 0
    ? (prevPoints + totalNewPoints) / (prevCredits + totalNewCredits)
    : null;

  const inputClass = "px-3 py-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text">GPA Projector</h1>

      {/* Step 1: Current CGPA */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-3">1. Enter Your Current CGPA</h2>
        <div className="bg-surface-secondary rounded-xl p-5 border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary block mb-1">Current CGPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4.0"
                value={currentCGPA}
                onChange={(e) => setCurrentCGPA(e.target.value)}
                placeholder="e.g. 2.8"
                className={`w-full ${inputClass}`}
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary block mb-1">How many credits have you earned so far?</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={earnedCredits}
                onChange={(e) => setEarnedCredits(e.target.value)}
                placeholder="e.g. 5"
                className={`w-full ${inputClass}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Academic Periods */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-3">2. Enter Your Existing or Expected Grades</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {periods.map((period) => {
            const periodResult = calcPeriodGPA(period.courses);

            return (
              <div key={period.id} className="bg-surface-secondary rounded-xl border border-border overflow-hidden">
                {/* Period header */}
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-text">Academic Period</h3>
                  {periods.length > 1 && (
                    <button
                      onClick={() => removePeriod(period.id)}
                      className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded"
                      title="Remove period"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Course rows */}
                <div className="p-4 space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_80px_1fr_32px] gap-2 text-xs font-medium text-text-secondary px-1">
                    <span>Course</span>
                    <span>Weight</span>
                    <span>Grade</span>
                    <span></span>
                  </div>

                  {period.courses.map((course) => (
                    <div key={course.id} className="grid grid-cols-[1fr_80px_1fr_32px] gap-2 items-center">
                      <input
                        value={course.name}
                        onChange={(e) => updateCourse(period.id, course.id, 'name', e.target.value)}
                        className="px-2 py-1.5 rounded border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={course.credits}
                        onChange={(e) => updateCourse(period.id, course.id, 'credits', e.target.value)}
                        className="px-2 py-1.5 rounded border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <select
                        value={course.grade}
                        onChange={(e) => updateCourse(period.id, course.id, 'grade', e.target.value)}
                        className={`px-2 py-1.5 rounded border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
                          course.grade ? 'text-text' : 'text-text-secondary'
                        }`}
                      >
                        <option value="">Select a grade:</option>
                        {gradeOptions.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeCourse(period.id, course.id)}
                        className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded justify-self-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Course + Add Period buttons */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => addCourse(period.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary dark:bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Course
                  </button>
                  {period.id === periods[0].id && (
                    <button
                      onClick={addPeriod}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-light dark:bg-accent-light text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Academic Period
                    </button>
                  )}
                </div>

                {/* Period SGPA */}
                <div className="px-4 pb-4">
                  <div className="bg-surface-tertiary/50 rounded-lg p-3">
                    <span className="text-sm font-bold text-text">SGPA: </span>
                    <span className="text-lg font-bold text-text">
                      {periodResult ? periodResult.gpa.toFixed(2) : 'TBD'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Summary */}
      {(agpa !== null || projectedCGPA !== null) && (
        <div className="bg-surface-secondary rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text">Projected Results</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* AGPA - Average of all new periods */}
            <div className="bg-surface-tertiary/50 rounded-lg p-4 text-center">
              <p className="text-sm font-bold text-text-secondary mb-1">AGPA</p>
              <p className="text-xs text-text-secondary mb-2">Avg. of new periods</p>
              <p className="text-2xl font-bold text-text">
                {agpa !== null ? agpa.toFixed(2) : 'TBD'}
              </p>
            </div>

            {/* Previous CGPA */}
            <div className="bg-surface-tertiary/50 rounded-lg p-4 text-center">
              <p className="text-sm font-bold text-text-secondary mb-1">Current CGPA</p>
              <p className="text-xs text-text-secondary mb-2">Before new courses</p>
              <p className="text-2xl font-bold text-text">
                {prevCGPA > 0 ? prevCGPA.toFixed(2) : '—'}
              </p>
            </div>

            {/* Projected CGPA */}
            <div className={`rounded-lg p-4 text-center ${
              projectedCGPA !== null && projectedCGPA >= 3.5
                ? 'bg-success/10 border border-success/30'
                : projectedCGPA !== null && projectedCGPA >= 2.5
                  ? 'bg-accent/10 border border-accent/30'
                  : projectedCGPA !== null && projectedCGPA >= 1.5
                    ? 'bg-warning/10 border border-warning/30'
                    : 'bg-surface-tertiary/50'
            }`}>
              <p className="text-sm font-bold text-text-secondary mb-1">Projected CGPA</p>
              <p className="text-xs text-text-secondary mb-2">After new courses</p>
              <p className={`text-2xl font-bold ${
                projectedCGPA !== null && projectedCGPA >= 3.5
                  ? 'text-success'
                  : projectedCGPA !== null && projectedCGPA >= 2.5
                    ? 'text-accent'
                    : projectedCGPA !== null && projectedCGPA >= 1.5
                      ? 'text-warning'
                      : 'text-text'
              }`}>
                {projectedCGPA !== null ? projectedCGPA.toFixed(2) : 'TBD'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
