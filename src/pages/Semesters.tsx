import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, BookOpen, Link, ArrowUp, ArrowDown, CheckCircle, Clock, Search, Printer, AlertTriangle } from 'lucide-react';
import type { Course } from '@/types';

function CourseRow({
  course,
  semesterId,
  gradeOptions,
}: {
  course: Course;
  semesterId: string;
  gradeOptions: string[];
}) {
  const { updateCourse, removeCourse, getGradePoint, gradeScale } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(course.name);
  const [credits, setCredits] = useState(course.creditHours.toString());
  const [grade, setGrade] = useState(course.letterGrade);
  const [courseAvg, setCourseAvg] = useState(course.courseAvg ?? '');

  const gradePoint = getGradePoint(course.letterGrade);
  const scaleEntry = gradeScale.find((e) => e.letter === course.letterGrade);
  const isFailing = scaleEntry ? scaleEntry.gradePoint < 1.0 : false;

  const save = () => {
    updateCourse(semesterId, course.id, {
      name: name.trim() || course.name,
      creditHours: parseFloat(credits) || course.creditHours,
      letterGrade: grade,
      courseAvg: courseAvg || undefined,
    });
    setEditing(false);
  };

  const cancel = () => {
    setName(course.name);
    setCredits(course.creditHours.toString());
    setGrade(course.letterGrade);
    setCourseAvg(course.courseAvg ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="border-b border-border">
        <td className="px-4 py-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-2 py-1 rounded border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </td>
        <td className="px-4 py-2">
          <input type="number" step="0.5" value={credits} onChange={(e) => setCredits(e.target.value)} className="w-20 px-2 py-1 rounded border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" min="0.5" />
        </td>
        <td className="px-4 py-2">
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="px-2 py-1 rounded border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </td>
        <td className="px-4 py-2 text-center text-sm text-text-secondary">{getGradePoint(grade).toFixed(1)}</td>
        <td className="px-4 py-2">
          <select value={courseAvg} onChange={(e) => setCourseAvg(e.target.value)} className={`px-2 py-1 rounded border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent ${courseAvg ? 'text-text' : 'text-text-secondary'}`}>
            <option value="">—</option>
            {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-1 justify-end">
            <button onClick={save} className="p-1 text-success hover:bg-success/10 rounded"><Check className="w-4 h-4" /></button>
            <button onClick={cancel} className="p-1 text-danger hover:bg-danger/10 rounded"><X className="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-border hover:bg-surface-tertiary/50 transition-colors ${isFailing ? 'bg-danger/5' : ''}`}>
      <td className="px-4 py-2 text-sm text-text">
        <div className="flex items-center gap-1.5">
          {isFailing && <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0" />}
          {course.name}
          {course.linkedCourseId && <Link className="w-3 h-3 inline ml-1.5 text-accent" />}
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-text text-center">{course.creditHours}</td>
      <td className={`px-4 py-2 text-sm text-center ${isFailing ? 'text-danger font-medium' : 'text-text'}`}>{course.letterGrade}</td>
      <td className="px-4 py-2 text-sm text-text-secondary text-center">{gradePoint.toFixed(1)}</td>
      <td className="px-4 py-2 text-sm text-text-secondary text-center">{course.courseAvg ?? '—'}</td>
      <td className="px-4 py-2">
        <div className="flex gap-1 justify-end">
          <button onClick={() => setEditing(true)} className="p-1 text-text-secondary hover:text-accent hover:bg-accent/10 rounded"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => removeCourse(semesterId, course.id)} className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
}

function SemesterCard({ semester, index, total }: {
  semester: { id: string; name: string; courses: Course[]; status: 'in-progress' | 'completed' };
  index: number;
  total: number;
}) {
  const { addCourse, addExistingCourse, removeSemester, renameSemester, getSemesterGPA, gradeScale, detailedCourses, setSemesterStatus, moveSemester } = useStore();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(semester.name);
  const [adding, setAdding] = useState(false);
  const [addingExisting, setAddingExisting] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCredits, setCourseCredits] = useState('0.5');
  const [courseGrade, setCourseGrade] = useState(gradeScale[0]?.letter ?? 'A');
  const [newCourseAvg, setNewCourseAvg] = useState('');

  const gradeOptions = gradeScale.map((g) => g.letter);
  const gpa = getSemesterGPA(semester.id);

  const linkedIds = new Set(semester.courses.filter((c) => c.linkedCourseId).map((c) => c.linkedCourseId));
  const availableCourses = detailedCourses.filter((c) => !linkedIds.has(c.id));

  const handleAddCourse = () => {
    if (!courseName.trim()) return;
    addCourse(semester.id, {
      name: courseName.trim(),
      creditHours: parseFloat(courseCredits) || 0.5,
      letterGrade: courseGrade,
      courseAvg: newCourseAvg || undefined,
    });
    setCourseName('');
    setCourseCredits('0.5');
    setCourseGrade(gradeScale[0]?.letter ?? 'A');
    setNewCourseAvg('');
    setAdding(false);
  };

  const handleAddExisting = () => {
    if (!selectedCourseId) return;
    addExistingCourse(semester.id, selectedCourseId);
    setSelectedCourseId('');
    setAddingExisting(false);
  };

  const handleRename = () => {
    if (newName.trim()) renameSemester(semester.id, newName.trim());
    setRenaming(false);
  };

  const toggleStatus = () => {
    setSemesterStatus(semester.id, semester.status === 'completed' ? 'in-progress' : 'completed');
  };

  return (
    <div className="bg-surface-secondary rounded-xl border border-border overflow-hidden">
      {/* Semester Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)} className="text-text-secondary hover:text-text">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="px-2 py-1 rounded border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              <button onClick={handleRename} className="p-1 text-success"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setRenaming(false); setNewName(semester.name); }} className="p-1 text-danger"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <h2 className="text-lg font-semibold text-text">{semester.name}</h2>
          )}
          {/* Status badge */}
          <button
            onClick={toggleStatus}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
              semester.status === 'completed'
                ? 'bg-success/10 text-success hover:bg-success/20'
                : 'bg-warning/10 text-warning hover:bg-warning/20'
            }`}
            title={`Click to mark as ${semester.status === 'completed' ? 'in progress' : 'completed'}`}
          >
            {semester.status === 'completed'
              ? <><CheckCircle className="w-3 h-3" /> Completed</>
              : <><Clock className="w-3 h-3" /> In Progress</>
            }
          </button>
        </div>
        <div className="flex items-center gap-2">
          {semester.courses.length > 0 && (
            <span className={`text-lg font-bold ${gpa >= 3.5 ? 'text-success' : gpa >= 2.5 ? 'text-accent' : gpa >= 1.5 ? 'text-warning' : 'text-danger'}`}>
              GPA: {gpa.toFixed(2)}
            </span>
          )}
          <button onClick={() => moveSemester(semester.id, 'up')} disabled={index === 0} className={`p-1.5 rounded-lg ${index === 0 ? 'text-text-secondary/30' : 'text-text-secondary hover:text-accent hover:bg-accent/10'}`} title="Move up">
            <ArrowUp className="w-4 h-4" />
          </button>
          <button onClick={() => moveSemester(semester.id, 'down')} disabled={index === total - 1} className={`p-1.5 rounded-lg ${index === total - 1 ? 'text-text-secondary/30' : 'text-text-secondary hover:text-accent hover:bg-accent/10'}`} title="Move down">
            <ArrowDown className="w-4 h-4" />
          </button>
          <button onClick={() => { setRenaming(true); setNewName(semester.name); }} className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg" title="Rename">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => removeSemester(semester.id)} className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Courses Table */}
      {expanded && (
        <div>
          {semester.courses.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="bg-surface-tertiary/50 text-xs uppercase text-text-secondary">
                  <th className="px-4 py-2 text-left font-medium">Course</th>
                  <th className="px-4 py-2 text-center font-medium">Weight</th>
                  <th className="px-4 py-2 text-center font-medium">Mark</th>
                  <th className="px-4 py-2 text-center font-medium">Grade</th>
                  <th className="px-4 py-2 text-center font-medium">CourseAvg</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {semester.courses.map((c) => (
                  <CourseRow key={c.id} course={c} semesterId={semester.id} gradeOptions={gradeOptions} />
                ))}
              </tbody>
            </table>
          )}

          {/* Add Course / Add Existing */}
          <div className="px-5 py-3 border-t border-border">
            {adding ? (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Course Name</label>
                  <input value={courseName} onChange={(e) => setCourseName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()} placeholder="e.g. Calculus I" className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" autoFocus />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Weight</label>
                  <input type="number" step="0.5" value={courseCredits} onChange={(e) => setCourseCredits(e.target.value)} className="w-20 px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" min="0.5" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Mark</label>
                  <select value={courseGrade} onChange={(e) => setCourseGrade(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                    {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">CourseAvg</label>
                  <select value={newCourseAvg} onChange={(e) => setNewCourseAvg(e.target.value)} className={`px-3 py-1.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent ${newCourseAvg ? 'text-text' : 'text-text-secondary'}`}>
                    <option value="">—</option>
                    {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <button onClick={handleAddCourse} className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Add</button>
                <button onClick={() => setAdding(false)} className="px-4 py-1.5 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-tertiary transition-colors">Cancel</button>
              </div>
            ) : addingExisting ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-text-secondary block mb-1">Select Course</label>
                  <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="">— Choose a course —</option>
                    {availableCourses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.creditHours} cr)</option>)}
                  </select>
                </div>
                <button onClick={handleAddExisting} className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Add</button>
                <button onClick={() => { setAddingExisting(false); setSelectedCourseId(''); }} className="px-4 py-1.5 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-tertiary transition-colors">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-sm text-accent hover:text-accent-light transition-colors">
                  <Plus className="w-4 h-4" /> Add Course
                </button>
                <span className="text-text-secondary text-sm">/</span>
                <button onClick={() => setAddingExisting(true)} className="flex items-center gap-2 text-sm text-accent hover:text-accent-light transition-colors">
                  <Link className="w-4 h-4" /> Add Existing Course
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PrintView() {
  const { semesters, getSemesterGPA, getCumulativeGPA, getGradePoint } = useStore();

  return (
    <div className="hidden print:block p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900">GradeFlow — Academic Transcript</h1>
      <p className="text-sm text-gray-500 mb-6">Generated {new Date().toLocaleDateString()}</p>

      {semesters.map((s) => {
        const gpa = getSemesterGPA(s.id);
        return (
          <div key={s.id} className="mb-6">
            <div className="flex justify-between items-baseline border-b-2 border-gray-800 pb-1 mb-2">
              <h2 className="text-lg font-bold text-gray-900">{s.name}</h2>
              <div className="text-sm">
                <span className="text-gray-500">{s.status === 'completed' ? 'Completed' : 'In Progress'}</span>
                {s.courses.length > 0 && <span className="ml-4 font-bold">GPA: {gpa.toFixed(2)}</span>}
              </div>
            </div>
            {s.courses.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1 font-medium text-gray-700">Course</th>
                    <th className="text-center py-1 font-medium text-gray-700">Weight</th>
                    <th className="text-center py-1 font-medium text-gray-700">Mark</th>
                    <th className="text-center py-1 font-medium text-gray-700">Grade</th>
                    <th className="text-center py-1 font-medium text-gray-700">CourseAvg</th>
                  </tr>
                </thead>
                <tbody>
                  {s.courses.map((c) => (
                    <tr key={c.id} className="border-b border-gray-200">
                      <td className="py-1 text-gray-900">{c.name}</td>
                      <td className="py-1 text-center text-gray-700">{c.creditHours}</td>
                      <td className="py-1 text-center text-gray-900">{c.letterGrade}</td>
                      <td className="py-1 text-center text-gray-700">{getGradePoint(c.letterGrade).toFixed(1)}</td>
                      <td className="py-1 text-center text-gray-700">{c.courseAvg ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400 italic">No courses.</p>
            )}
          </div>
        );
      })}

      <div className="border-t-2 border-gray-800 pt-3 mt-6 flex justify-between">
        <span className="font-bold text-gray-900">Cumulative GPA</span>
        <span className="text-xl font-bold text-gray-900">{getCumulativeGPA().toFixed(2)}</span>
      </div>
    </div>
  );
}

export function Semesters() {
  const { semesters, addSemester } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  const filteredSemesters = useMemo(() => {
    if (!search.trim()) return semesters;
    const q = search.toLowerCase();
    return semesters.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.courses.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [semesters, search]);

  const handleAdd = () => {
    if (!name.trim()) return;
    addSemester(name.trim());
    setName('');
    setAdding(false);
  };

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text">Semesters</h1>
          <div className="flex items-center gap-2">
            {semesters.length > 0 && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-tertiary transition-colors"
                title="Print transcript"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            )}
            {!adding && (
              <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Add Semester
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {semesters.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search semesters or courses..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-surface-secondary text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        {adding && (
          <div className="bg-surface-secondary rounded-xl p-5 border border-border flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm text-text-secondary block mb-1">Semester Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="e.g. Fall 2024" className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent" autoFocus />
            </div>
            <button onClick={handleAdd} className="px-5 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity">Create</button>
            <button onClick={() => { setAdding(false); setName(''); }} className="px-5 py-2 border border-border text-text-secondary rounded-lg hover:bg-surface-tertiary transition-colors">Cancel</button>
          </div>
        )}

        {filteredSemesters.length === 0 && !adding ? (
          <div className="bg-surface-secondary rounded-xl p-12 border border-border text-center">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-accent" />
            </div>
            {search ? (
              <>
                <p className="font-medium text-text mb-1">No results found</p>
                <p className="text-sm text-text-secondary">No semesters or courses match "{search}". Try a different search term.</p>
              </>
            ) : (
              <>
                <p className="font-medium text-text mb-1">No semesters yet</p>
                <p className="text-sm text-text-secondary mb-5">Create your first semester to start tracking your courses and GPA.</p>
                <button
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> Add Semester
                </button>
              </>
            )}
          </div>
        ) : (
          filteredSemesters.map((s, i) => (
            <SemesterCard key={s.id} semester={s} index={i} total={filteredSemesters.length} />
          ))
        )}
      </div>

      {/* Print-only transcript view */}
      <PrintView />
    </>
  );
}
