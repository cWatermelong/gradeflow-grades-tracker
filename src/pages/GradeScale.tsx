import { useState } from 'react';
import { useStore } from '@/store';
import { Plus, Trash2, RotateCcw, Edit2, Check, X } from 'lucide-react';

function GradeRow({ entry }: { entry: { id: string; meaning: string; letter: string; minPercent: number; maxPercent: number; gradePoint: number } }) {
  const { updateGradeScaleEntry, removeGradeScaleEntry } = useStore();
  const [editing, setEditing] = useState(false);
  const [meaning, setMeaning] = useState(entry.meaning);
  const [letter, setLetter] = useState(entry.letter);
  const [min, setMin] = useState(entry.minPercent.toString());
  const [max, setMax] = useState(entry.maxPercent.toString());
  const [gp, setGp] = useState(entry.gradePoint.toString());

  const save = () => {
    updateGradeScaleEntry(entry.id, {
      meaning: meaning.trim() || entry.meaning,
      letter: letter.trim() || entry.letter,
      minPercent: parseInt(min) ?? entry.minPercent,
      maxPercent: parseInt(max) ?? entry.maxPercent,
      gradePoint: parseFloat(gp) ?? entry.gradePoint,
    });
    setEditing(false);
  };

  const cancel = () => {
    setMeaning(entry.meaning);
    setLetter(entry.letter);
    setMin(entry.minPercent.toString());
    setMax(entry.maxPercent.toString());
    setGp(entry.gradePoint.toString());
    setEditing(false);
  };

  const inputClass = "px-2 py-1 rounded border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  if (editing) {
    return (
      <tr className="border-b border-border">
        <td className="px-4 py-2"><input value={meaning} onChange={(e) => setMeaning(e.target.value)} className={`${inputClass} w-full`} /></td>
        <td className="px-4 py-2"><input value={letter} onChange={(e) => setLetter(e.target.value)} className={`${inputClass} w-16 text-center`} /></td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-1">
            <input type="number" value={min} onChange={(e) => setMin(e.target.value)} className={`${inputClass} w-16 text-center`} min="0" max="100" />
            <span className="text-text-secondary">–</span>
            <input type="number" value={max} onChange={(e) => setMax(e.target.value)} className={`${inputClass} w-16 text-center`} min="0" max="100" />
            <span className="text-text-secondary text-sm">%</span>
          </div>
        </td>
        <td className="px-4 py-2"><input type="number" step="0.1" value={gp} onChange={(e) => setGp(e.target.value)} className={`${inputClass} w-16 text-center`} min="0" max="4" /></td>
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
    <tr className="border-b border-border hover:bg-surface-tertiary/50 transition-colors">
      <td className="px-4 py-2 text-sm font-medium text-text">{entry.meaning}</td>
      <td className="px-4 py-2 text-sm text-text text-center font-mono">{entry.letter}</td>
      <td className="px-4 py-2 text-sm text-text text-center">{entry.minPercent} – {entry.maxPercent}%</td>
      <td className="px-4 py-2 text-sm text-text text-center font-mono">{entry.gradePoint.toFixed(1)}</td>
      <td className="px-4 py-2">
        <div className="flex gap-1 justify-end">
          <button onClick={() => setEditing(true)} className="p-1 text-text-secondary hover:text-accent hover:bg-accent/10 rounded" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => removeGradeScaleEntry(entry.id)} className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function GradeScale() {
  const { gradeScale, addGradeScaleEntry, resetGradeScale } = useStore();
  const [adding, setAdding] = useState(false);
  const [meaning, setMeaning] = useState('');
  const [letter, setLetter] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [gp, setGp] = useState('');

  const handleAdd = () => {
    if (!letter.trim()) return;
    addGradeScaleEntry({
      meaning: meaning.trim() || 'Custom',
      letter: letter.trim(),
      minPercent: parseInt(min) || 0,
      maxPercent: parseInt(max) || 100,
      gradePoint: parseFloat(gp) || 0,
    });
    setMeaning('');
    setLetter('');
    setMin('');
    setMax('');
    setGp('');
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Grade Scale</h1>
        <div className="flex gap-2">
          <button
            onClick={resetGradeScale}
            className="flex items-center gap-2 px-3 py-2 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-tertiary transition-colors"
            title="Reset to default"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      <div className="bg-surface-secondary rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-tertiary/50 text-xs uppercase text-text-secondary">
              <th className="px-4 py-3 text-left font-medium">Grade Meaning</th>
              <th className="px-4 py-3 text-center font-medium">Letter Grade</th>
              <th className="px-4 py-3 text-center font-medium">Percentage Range</th>
              <th className="px-4 py-3 text-center font-medium">Grade Points</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {gradeScale.map((entry) => (
              <GradeRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>

        {adding && (
          <div className="px-5 py-4 border-t border-border bg-surface-tertiary/30">
            <p className="text-sm font-medium text-text mb-3">New Grade Entry</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Meaning</label>
                <input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="e.g. Excellent" className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Letter</label>
                <input value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="e.g. A+" className="w-16 px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Min %</label>
                <input type="number" value={min} onChange={(e) => setMin(e.target.value)} placeholder="90" className="w-16 px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Max %</label>
                <input type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder="100" className="w-16 px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Points</label>
                <input type="number" step="0.1" value={gp} onChange={(e) => setGp(e.target.value)} placeholder="4.0" className="w-16 px-3 py-1.5 rounded-lg border border-border bg-surface text-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <button onClick={handleAdd} className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">Add</button>
              <button onClick={() => setAdding(false)} className="px-4 py-1.5 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-tertiary">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-text-secondary">
        This scale is used to calculate your GPA. Edit any entry to match your institution's grading system.
      </p>
    </div>
  );
}
