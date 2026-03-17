import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '@/store';
import { Sun, Moon, GraduationCap, LayoutDashboard, BookOpen, Scale, Download, Upload, ClipboardList, Undo2, Redo2, Calculator } from 'lucide-react';
import { useRef } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/semesters', icon: BookOpen, label: 'Semesters' },
  { to: '/courses', icon: ClipboardList, label: 'Courses' },
  { to: '/gpa-projector', icon: Calculator, label: 'GPA Projector' },
  { to: '/grade-scale', icon: Scale, label: 'Grade Scale' },
];

export function Layout() {
  const { theme, toggleTheme, exportData, importData, undo, redo, canUndo, canRedo } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradeflow-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const success = importData(text);
      if (!success) alert('Invalid backup file.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const btnClass = "p-2 rounded-lg text-white/80 dark:text-text-secondary hover:bg-white/10 dark:hover:bg-surface-tertiary transition-colors";
  const btnDisabled = "p-2 rounded-lg text-white/30 dark:text-text-secondary/30 cursor-not-allowed";

  return (
    <div className="min-h-screen bg-surface text-text print:bg-white">
      {/* Header */}
      <header className="bg-primary dark:bg-surface-secondary border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-white dark:text-primary" />
            <span className="text-xl font-bold text-white dark:text-primary">GradeFlow</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={undo} className={canUndo() ? btnClass : btnDisabled} disabled={!canUndo()} title="Undo (Ctrl+Z)">
              <Undo2 className="w-5 h-5" />
            </button>
            <button onClick={redo} className={canRedo() ? btnClass : btnDisabled} disabled={!canRedo()} title="Redo (Ctrl+Y)">
              <Redo2 className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-white/20 dark:bg-border mx-1" />
            <button onClick={handleExport} className={btnClass} title="Export Data">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className={btnClass} title="Import Data">
              <Upload className="w-5 h-5" />
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button onClick={toggleTheme} className={btnClass} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-surface-secondary border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary dark:border-accent text-primary dark:text-accent'
                    : 'border-transparent text-text-secondary hover:text-text hover:border-border'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
