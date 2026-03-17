import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Semesters } from '@/pages/Semesters';
import { GradeScale } from '@/pages/GradeScale';
import { Courses } from '@/pages/Courses';
import { GPAProjector } from '@/pages/GPAProjector';
import { useStore } from '@/store';

function App() {
  const theme = useStore((s) => s.theme);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Global keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/semesters" element={<Semesters />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/gpa-projector" element={<GPAProjector />} />
          <Route path="/grade-scale" element={<GradeScale />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
