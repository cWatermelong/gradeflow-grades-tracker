import { useState, useMemo } from 'react';
import { useStore, parseGradeInput, calculateWhatIf } from '@/store';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, ClipboardList, ArrowUp, ArrowDown, Calculator, AlertTriangle, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Assessment, DetailedCourse } from '@/types';

const ASSESSMENT_TYPES = ['Assignment', 'Quiz', 'Exam', 'Test', 'Midterm', 'Final', 'Project', 'Lab', 'Participation', 'Other'];

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

function AssessmentRow({
  assessment,
  courseId,
  index,
  total,
}: {
  assessment: Assessment;
  courseId: string;
  index: number;
  total: number;
}) {
  const { updateAssessment, removeAssessment, moveAssessment } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(assessment.name);
  const [type, setType] = useState(assessment.type);
  const [weight, setWeight] = useState(assessment.weight.toString());
  const [gradeInput, setGradeInput] = useState(assessment.gradeInput);

  const parsed = parseGradeInput(assessment.gradeInput);
  const isLow = parsed.isValid && parsed.percent < 50;

  const save = () => {
    updateAssessment(courseId, assessment.id, {
      name: name.trim() || assessment.name,
      type,
      weight: parseFloat(weight) || assessment.weight,
      gradeInput: gradeInput.trim() || assessment.gradeInput,
    });
    setEditing(false);
  };

  const cancel = () => {
    setName(assessment.name);
    setType(assessment.type);
    setWeight(assessment.weight.toString());
    setGradeInput(assessment.gradeInput);
    setEditing(false);
  };

  const inputClass = "px-2 py-1 rounded border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  if (editing) {
    return (
      <tr className="border-b border-border">
        <td className="px-4 py-2"><input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} w-full`} /></td>
        <td className="px-4 py-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-1">
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={`${inputClass} w-16 text-center`} min="0" max="100" />
            <span className="text-text-secondary text-sm">%</span>
          </div>
        </td>
        <td className="px-4 py-2">
          <input value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} placeholder="90 or 45/50" className={`${inputClass} w-24 text-center`} />
        </td>
        <td className="px-4 py-2 text-center text-sm text-text-secondary">—</td>
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
    <tr className={`border-b border-border hover:bg-surface-tertiary/50 transition-colors ${isLow ? 'bg-danger/5' : ''}`}>
      <td className="px-4 py-2 text-sm text-text">
        <div className="flex items-center gap-1.5">
          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0" />}
          {assessment.name}
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-text-secondary text-center">{assessment.type}</td>
      <td className="px-4 py-2 text-sm text-text text-center">{assessment.weight}%</td>
      <td className="px-4 py-2 text-sm text-text text-center font-mono">{assessment.gradeInput}</td>
      <td className={`px-4 py-2 text-sm text-center font-mono ${isLow ? 'text-danger font-medium' : 'text-text-secondary'}`}>
        {parsed.isValid ? `${parsed.percent.toFixed(2)}%` : '—'}
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-0.5 justify-end">
          <button onClick={() => moveAssessment(courseId, assessment.id, 'up')} disabled={index === 0} className={`p-1 rounded ${index === 0 ? 'text-text-secondary/30' : 'text-text-secondary hover:text-accent hover:bg-accent/10'}`} title="Move up">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => moveAssessment(courseId, assessment.id, 'down')} disabled={index === total - 1} className={`p-1 rounded ${index === total - 1 ? 'text-text-secondary/30' : 'text-text-secondary hover:text-accent hover:bg-accent/10'}`} title="Move down">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditing(true)} className="p-1 text-text-secondary hover:text-accent hover:bg-accent/10 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => removeAssessment(courseId, assessment.id)} className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

function BreakdownChart({ assessments }: { assessments: Assessment[] }) {
  const data = assessments
    .filter((a) => a.weight > 0)
    .map((a) => {
      const parsed = parseGradeInput(a.gradeInput);
      return {
        name: a.name,
        weight: a.weight,
        contribution: parsed.isValid ? (parsed.percent * a.weight) / 100 : 0,
      };
    });

  if (data.length === 0) return null;

  return (
    <div className="px-5 py-3 border-t border-border">
      <h3 className="text-sm font-medium text-text mb-2">Weight Distribution</h3>
      <div className="flex items-center gap-4">
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="weight"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={50}
                strokeWidth={2}
                stroke="var(--color-surface-secondary)"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)',
                  fontSize: '12px',
                }}
                formatter={(value) => [`${value}%`, 'Weight']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-text-secondary truncate">{d.name}</span>
              <span className="text-text ml-auto">{d.weight}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatIfCalculator({ course }: { course: DetailedCourse }) {
  const { gradeScale } = useStore();
  const [hypotheticals, setHypotheticals] = useState<{ name: string; weight: string; grade: string }[]>([
    { name: '', weight: '', grade: '' },
  ]);

  const totalExistingWeight = course.assessments.reduce((sum, a) => sum + a.weight, 0);
  const remainingWeight = 100 - totalExistingWeight;

  const hypotheticalAssessments: Assessment[] = hypotheticals
    .filter((h) => h.weight && h.grade)
    .map((h, i) => ({
      id: `hyp-${i}`,
      name: h.name || `Hypothetical ${i + 1}`,
      type: 'Other',
      weight: parseFloat(h.weight) || 0,
      gradeInput: h.grade,
    }));

  const projectedGrade = calculateWhatIf(course.assessments, hypotheticalAssessments);

  const projectedLetter = projectedGrade !== null
    ? (() => {
        const rounded = Math.round(projectedGrade);
        const sorted = [...gradeScale].sort((a, b) => b.minPercent - a.minPercent);
        for (const entry of sorted) {
          if (rounded >= entry.minPercent && rounded <= entry.maxPercent) return entry.letter;
        }
        return gradeScale[gradeScale.length - 1]?.letter ?? 'F';
      })()
    : '—';

  const addRow = () => setHypotheticals([...hypotheticals, { name: '', weight: '', grade: '' }]);
  const removeRow = (i: number) => setHypotheticals(hypotheticals.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: string, value: string) => {
    setHypotheticals(hypotheticals.map((h, idx) => idx === i ? { ...h, [field]: value } : h));
  };

  return (
    <div className="px-5 py-4 border-t border-border bg-accent/5 dark:bg-accent/10">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-medium text-text">What-If Calculator</h3>
        {remainingWeight > 0 && (
          <span className="text-xs text-text-secondary ml-auto">{remainingWeight}% weight remaining</span>
        )}
      </div>

      <div className="space-y-2 mb-3">
        {hypotheticals.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={h.name}
              onChange={(e) => updateRow(i, 'name', e.target.value)}
              placeholder={`Assessment ${i + 1}`}
              className="flex-1 px-2 py-1 rounded border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={h.weight}
                onChange={(e) => updateRow(i, 'weight', e.target.value)}
                placeholder="Wt%"
                className="w-16 px-2 py-1 rounded border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="text-text-secondary text-xs">%</span>
            </div>
            <input
              value={h.grade}
              onChange={(e) => updateRow(i, 'grade', e.target.value)}
              placeholder="Grade"
              className="w-20 px-2 py-1 rounded border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {hypotheticals.length > 1 && (
              <button onClick={() => removeRow(i)} className="p-1 text-text-secondary hover:text-danger"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={addRow} className="text-xs text-accent hover:text-accent-light">+ Add row</button>
        {projectedGrade !== null && (
          <div className="text-right">
            <span className="text-sm text-text-secondary mr-2">Projected:</span>
            <span className="text-lg font-bold text-text">{projectedGrade.toFixed(2)}%</span>
            <span className={`ml-2 font-bold ${projectedGrade >= 80 ? 'text-success' : projectedGrade >= 60 ? 'text-warning' : 'text-danger'}`}>
              {projectedLetter}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: DetailedCourse }) {
  const { removeDetailedCourse, updateDetailedCourse, addAssessment, getDetailedCourseGrade, getDetailedCourseLetter, moveDetailedCourse, detailedCourses, gradeScale } = useStore();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(course.name);
  const [newCredits, setNewCredits] = useState(course.creditHours.toString());
  const [adding, setAdding] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [aName, setAName] = useState('');
  const [aType, setAType] = useState('Assignment');
  const [aWeight, setAWeight] = useState('');
  const [aGrade, setAGrade] = useState('');

  const finalGrade = getDetailedCourseGrade(course.id);
  const letterGrade = getDetailedCourseLetter(course.id);
  const totalWeight = course.assessments.reduce((sum, a) => sum + a.weight, 0);
  const courseIndex = detailedCourses.findIndex((c) => c.id === course.id);

  // Grade notification
  const isFailing = finalGrade !== null && finalGrade < 50;
  const isLow = finalGrade !== null && finalGrade >= 50 && finalGrade < 60;

  const handleAddAssessment = () => {
    if (!aName.trim() || !aWeight.trim()) return;
    addAssessment(course.id, {
      name: aName.trim(),
      type: aType,
      weight: parseFloat(aWeight) || 0,
      gradeInput: aGrade.trim() || '0',
    });
    setAName('');
    setAType('Assignment');
    setAWeight('');
    setAGrade('');
    setAdding(false);
  };

  const handleRename = () => {
    updateDetailedCourse(course.id, {
      name: newName.trim() || course.name,
      creditHours: parseFloat(newCredits) || course.creditHours,
    });
    setRenaming(false);
  };

  return (
    <div className={`bg-surface-secondary rounded-xl border overflow-hidden ${
      isFailing ? 'border-danger/50' : isLow ? 'border-warning/50' : 'border-border'
    }`}>
      {/* Grade warning banner */}
      {isFailing && (
        <div className="px-5 py-2 bg-danger/10 text-danger text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Course grade is below 50% — at risk of failing.
        </div>
      )}
      {isLow && (
        <div className="px-5 py-2 bg-warning/10 text-warning text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Course grade is below 60% — consider using the What-If calculator.
        </div>
      )}

      {/* Course Header */}
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
              <input
                type="number"
                step="0.5"
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
                min="0.5"
              />
              <button onClick={handleRename} className="p-1 text-success"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setRenaming(false); setNewName(course.name); setNewCredits(course.creditHours.toString()); }} className="p-1 text-danger"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-text">{course.name}</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary">{course.creditHours} credit{course.creditHours !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-secondary">CourseAvg:</span>
                  <select
                    value={course.courseAvg ?? ''}
                    onChange={(e) => updateDetailedCourse(course.id, { courseAvg: e.target.value || undefined })}
                    className={`px-1.5 py-0.5 rounded border border-border bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-accent ${course.courseAvg ? 'text-text' : 'text-text-secondary'}`}
                  >
                    <option value="">—</option>
                    {gradeScale.map((g) => <option key={g.id} value={g.letter}>{g.letter}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {finalGrade !== null && (
            <div className="text-right">
              <span className="text-lg font-bold text-text">{finalGrade.toFixed(2)}%</span>
              <span className={`ml-2 text-lg font-bold ${
                finalGrade >= 80 ? 'text-success' : finalGrade >= 60 ? 'text-warning' : 'text-danger'
              }`}>
                {letterGrade}
              </span>
            </div>
          )}
          <button onClick={() => moveDetailedCourse(course.id, 'up')} disabled={courseIndex === 0} className={`p-1.5 rounded-lg ${courseIndex === 0 ? 'text-text-secondary/30' : 'text-text-secondary hover:text-accent hover:bg-accent/10'}`} title="Move up">
            <ArrowUp className="w-4 h-4" />
          </button>
          <button onClick={() => moveDetailedCourse(course.id, 'down')} disabled={courseIndex === detailedCourses.length - 1} className={`p-1.5 rounded-lg ${courseIndex === detailedCourses.length - 1 ? 'text-text-secondary/30' : 'text-text-secondary hover:text-accent hover:bg-accent/10'}`} title="Move down">
            <ArrowDown className="w-4 h-4" />
          </button>
          <button onClick={() => { setRenaming(true); setNewName(course.name); setNewCredits(course.creditHours.toString()); }} className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => removeDetailedCourse(course.id)} className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div>
          {/* Weight progress */}
          <div className="px-5 pb-2">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Total weight assigned</span>
              <span className={totalWeight > 100 ? 'text-danger font-medium' : totalWeight === 100 ? 'text-success font-medium' : ''}>
                {totalWeight}% / 100%
              </span>
            </div>
            <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalWeight > 100 ? 'bg-danger' : totalWeight === 100 ? 'bg-success' : 'bg-accent'
                }`}
                style={{ width: `${Math.min(totalWeight, 100)}%` }}
              />
            </div>
          </div>

          {/* Assessments table */}
          {course.assessments.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="bg-surface-tertiary/50 text-xs uppercase text-text-secondary">
                  <th className="px-4 py-2 text-left font-medium">Assessment</th>
                  <th className="px-4 py-2 text-center font-medium">Type</th>
                  <th className="px-4 py-2 text-center font-medium">Weight</th>
                  <th className="px-4 py-2 text-center font-medium">Grade</th>
                  <th className="px-4 py-2 text-center font-medium">Percent</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {course.assessments.map((a, i) => (
                  <AssessmentRow key={a.id} assessment={a} courseId={course.id} index={i} total={course.assessments.length} />
                ))}
              </tbody>
            </table>
          )}

          {/* Breakdown chart */}
          <BreakdownChart assessments={course.assessments} />

          {/* What-if calculator toggle */}
          {course.assessments.length > 0 && (
            <div className="px-5 py-2 border-t border-border">
              <button
                onClick={() => setShowWhatIf(!showWhatIf)}
                className="flex items-center gap-2 text-sm text-accent hover:text-accent-light transition-colors"
              >
                <Calculator className="w-4 h-4" />
                {showWhatIf ? 'Hide' : 'Show'} What-If Calculator
              </button>
            </div>
          )}
          {showWhatIf && <WhatIfCalculator course={course} />}

          {/* Add assessment */}
          <div className="px-5 py-3 border-t border-border">
            {adding ? (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Name</label>
                  <input value={aName} onChange={(e) => setAName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddAssessment()} placeholder="e.g. Midterm Exam" className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" autoFocus />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Type</label>
                  <select value={aType} onChange={(e) => setAType(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                    {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Weight (%)</label>
                  <input type="number" step="0.1" value={aWeight} onChange={(e) => setAWeight(e.target.value)} placeholder="30" className="w-20 px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" min="0" max="100" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Grade (% or a/b)</label>
                  <input value={aGrade} onChange={(e) => setAGrade(e.target.value)} placeholder="90 or 45/50" className="w-24 px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <button onClick={handleAddAssessment} className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Add</button>
                <button onClick={() => setAdding(false)} className="px-4 py-1.5 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-tertiary transition-colors">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-sm text-accent hover:text-accent-light transition-colors">
                <Plus className="w-4 h-4" />
                Add Assessment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Courses() {
  const { detailedCourses, addDetailedCourse } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('0.5');
  const [search, setSearch] = useState('');

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return detailedCourses;
    const q = search.toLowerCase();
    return detailedCourses.filter((c) => c.name.toLowerCase().includes(q));
  }, [detailedCourses, search]);

  const handleAdd = () => {
    if (!name.trim()) return;
    addDetailedCourse(name.trim(), parseFloat(credits) || 0.5);
    setName('');
    setCredits('0.5');
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Courses</h1>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        )}
      </div>

      {/* Search */}
      {detailedCourses.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-surface-secondary text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}

      {adding && (
        <div className="bg-surface-secondary rounded-xl p-5 border border-border flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm text-text-secondary block mb-1">Course Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="e.g. Calculus I" className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent" autoFocus />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Credits</label>
            <input type="number" step="0.5" value={credits} onChange={(e) => setCredits(e.target.value)} className="w-24 px-3 py-2 rounded-lg border border-border bg-surface text-text text-center focus:outline-none focus:ring-2 focus:ring-accent" min="0.5" />
          </div>
          <button onClick={handleAdd} className="px-5 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity">Create</button>
          <button onClick={() => { setAdding(false); setName(''); }} className="px-5 py-2 border border-border text-text-secondary rounded-lg hover:bg-surface-tertiary transition-colors">Cancel</button>
        </div>
      )}

      {filteredCourses.length === 0 && !adding ? (
        <div className="bg-surface-secondary rounded-xl p-12 border border-border text-center">
          <ClipboardList className="w-12 h-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary">
            {search ? 'No courses match your search.' : 'No courses yet. Create a course to track assessments and calculate your final grade.'}
          </p>
        </div>
      ) : (
        filteredCourses.map((c) => <CourseCard key={c.id} course={c} />)
      )}
    </div>
  );
}
