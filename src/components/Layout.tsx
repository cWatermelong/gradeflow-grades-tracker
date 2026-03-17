import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '@/store';
import { useAuth } from '@/lib/auth';
import { Sun, Moon, GraduationCap, LayoutDashboard, BookOpen, Scale, Download, Upload, ClipboardList, Undo2, Redo2, Calculator, LogOut, Cloud } from 'lucide-react';
import { useRef, useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/semesters', icon: BookOpen, label: 'Semesters' },
  { to: '/courses', icon: ClipboardList, label: 'Courses' },
  { to: '/gpa-projector', icon: Calculator, label: 'GPA Projector' },
  { to: '/grade-scale', icon: Scale, label: 'Grade Scale' },
];

export function Layout() {
  const { theme, toggleTheme, exportData, importData, undo, redo, canUndo, canRedo } = useStore();
  const { user, signOut, syncToCloud } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
      <header className="bg-topbar border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-white dark:text-text" />
            <span className="text-xl font-bold text-white dark:text-text">GradeFlow</span>
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
            {user && (
              <div className="relative ml-1">
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30 dark:border-border hover:border-white/60 dark:hover:border-primary transition-colors"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                      {(user.email?.[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-surface-secondary border border-border rounded-lg shadow-lg z-50 py-1">
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-sm font-medium text-text truncate">{user.user_metadata?.full_name ?? user.email}</p>
                        <p className="text-xs text-text-secondary truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { syncToCloud(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-tertiary transition-colors"
                      >
                        <Cloud className="w-4 h-4" /> Sync Now
                      </button>
                      <button
                        onClick={() => { signOut(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface-tertiary transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-nav border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
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
