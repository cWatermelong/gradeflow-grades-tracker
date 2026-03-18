import { useState, useMemo } from 'react';
import { useStore, parseGradeInput, calculateWhatIf } from '@/store';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, ClipboardList, GripVertical, Calculator, AlertTriangle, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Assessment, DetailedCourse } from '@/types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ASSESSMENT_TYPES = ['Assignment', 'Quiz', 'Exam', 'Test', 'Midterm', 'Final', 'Project', 'Lab', 'Participation', 'Other'];

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

function SortableAssessmentRow({
  assessment,
  courseId,
}: {
  assessment: Assessment;
  courseId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: assessment.id });
  const { updateAssessment, removeAssessment } = useStore();
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (editing) {
    return (
      <tr ref={setNodeRef} style={style} className="border-b border-border">
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
    <tr ref={setNodeRef} style={style} className={`border-b border-border hover:bg-surface-tertiary/50 transition-colors ${isLow ? 'bg-danger/5' : ''}`}>
      <td className="px-4 py-2 text-sm text-text">
        <div className="flex items-center gap-1.5">
          <button
            {...attributes}
            {...listeners}
            className="text-text-secondary/40 hover:text-text-secondary cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
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

function SortableCourseCard({ course }: { course: DetailedCourse }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CourseCard course={course} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function CourseCard({ course, dragHandleProps }: { course: DetailedCourse; dragHandleProps?: Record<string, unknown> }) {
  const { removeDetailedCourse, updateDetailedCourse, addAssessment, getDetailedCourseGrade, getDetailedCourseLetter, gradeScale, reorderAssessments } = useStore();
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Grade notification
  const isFailing = finalGrade !== null && finalGrade < 50;
  const isLow = finalGrade !== null && finalGrade >= 50 && finalGrade < 60;

  const handleAssessmentDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = course.assessments.findIndex((a) => a.id === active.id);
    const newIndex = course.assessments.findIndex((a) => a.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderAssessments(course.id, oldIndex, newIndex);
    }
  };

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
          <button
            {...dragHandleProps}
            className="text-text-secondary/50 hover:text-text-secondary cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAssessmentDragEnd}>
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
                  <SortableContext items={course.assessments.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                    {course.assessments.map((a) => (
                      <SortableAssessmentRow key={a.id} assessment={a} courseId={course.id} />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
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
  const { detailedCourses, addDetailedCourse, reorderDetailedCourses } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('0.5');
  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = detailedCourses.findIndex((c) => c.id === active.id);
    const newIndex = detailedCourses.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderDetailedCourses(oldIndex, newIndex);
    }
  };

  const isSearching = search.trim().length > 0;

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
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-success" />
          </div>
          {search ? (
            <>
              <p className="font-medium text-text mb-1">No results found</p>
              <p className="text-sm text-text-secondary">No courses match "{search}". Try a different search term.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-text mb-1">No courses yet</p>
              <p className="text-sm text-text-secondary mb-5">Create a course to track individual assessments and calculate your final grade.</p>
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Add Course
              </button>
            </>
          )}
        </div>
      ) : isSearching ? (
        filteredCourses.map((c) => <CourseCard key={c.id} course={c} />)
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={detailedCourses.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {detailedCourses.map((c) => (
              <SortableCourseCard key={c.id} course={c} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
