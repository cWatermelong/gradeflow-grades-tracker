import { useState } from 'react';
import { useStore } from '@/store';
import { TrendingUp, BookOpen, Award, BarChart3, Target, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function StatCard({ icon: Icon, label, value, sublabel, color }: {
  icon: typeof TrendingUp; label: string; value: string; sublabel?: string; color: string;
}) {
  return (
    <div className="bg-surface-secondary rounded-xl p-5 border border-border">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      {sublabel && <p className="text-xs text-text-secondary mt-1">{sublabel}</p>}
    </div>
  );
}

function TargetGPACalculator() {
  const { calculateRequiredGPA, getCompletedGPA, semesters } = useStore();
  const [targetGPA, setTargetGPA] = useState('3.5');
  const [plannedCredits, setPlannedCredits] = useState('15');

  const completedGPA = getCompletedGPA();
  const completedCredits = semesters
    .filter((s) => s.status === 'completed')
    .flatMap((s) => s.courses)
    .reduce((sum, c) => sum + c.creditHours, 0);

  const requiredGPA = calculateRequiredGPA(
    parseFloat(targetGPA) || 0,
    parseFloat(plannedCredits) || 0
  );

  const isAchievable = requiredGPA !== null && requiredGPA <= 4.0;
  const isAlreadyMet = requiredGPA !== null && requiredGPA <= 0;

  return (
    <div className="bg-surface-secondary rounded-xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold text-text">Target GPA Calculator</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm text-text-secondary block mb-1">Target Cumulative GPA</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="4.0"
            value={targetGPA}
            onChange={(e) => setTargetGPA(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Planned Credits (remaining)</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={plannedCredits}
            onChange={(e) => setPlannedCredits(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-surface-tertiary/50">
        <div className="text-sm text-text-secondary mb-1">
          Based on {completedCredits} completed credits at {completedGPA.toFixed(2)} GPA:
        </div>
        {requiredGPA !== null ? (
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${
              isAlreadyMet ? 'text-success' : isAchievable ? 'text-accent' : 'text-danger'
            }`}>
              {isAlreadyMet ? 'Already met!' : `${requiredGPA.toFixed(2)} GPA needed`}
            </span>
            {!isAlreadyMet && (
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                isAchievable
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}>
                {isAchievable ? 'Achievable' : 'Not possible (> 4.0)'}
              </span>
            )}
          </div>
        ) : (
          <span className="text-text-secondary">Enter values above to calculate.</span>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { semesters, getSemesterGPA, getCumulativeGPA, getCompletedGPA } = useStore();

  const cumulativeGPA = getCumulativeGPA();
  const completedGPA = getCompletedGPA();
  const totalCourses = semesters.reduce((sum, s) => sum + s.courses.length, 0);
  const totalCredits = semesters.flatMap((s) => s.courses).reduce((sum, c) => sum + c.creditHours, 0);
  const completedSemesters = semesters.filter((s) => s.status === 'completed').length;
  const inProgressSemesters = semesters.filter((s) => s.status === 'in-progress').length;

  const chartData = semesters
    .filter((s) => s.courses.length > 0)
    .map((s) => ({
      name: s.name,
      gpa: parseFloat(getSemesterGPA(s.id).toFixed(2)),
      status: s.status,
    }));

  const getBarColor = (gpa: number) => {
    if (gpa >= 3.5) return '#10b981';
    if (gpa >= 2.5) return '#2563eb';
    if (gpa >= 1.5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Cumulative GPA"
          value={cumulativeGPA > 0 ? cumulativeGPA.toFixed(2) : '—'}
          sublabel={completedGPA > 0 ? `Completed: ${completedGPA.toFixed(2)}` : undefined}
          color="bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary"
        />
        <StatCard
          icon={BookOpen}
          label="Semesters"
          value={semesters.length.toString()}
          sublabel={`${completedSemesters} completed, ${inProgressSemesters} in progress`}
          color="bg-accent/10 text-accent"
        />
        <StatCard
          icon={Award}
          label="Total Courses"
          value={totalCourses.toString()}
          color="bg-success/10 text-success"
        />
        <StatCard
          icon={BarChart3}
          label="Total Credits"
          value={totalCredits.toString()}
          color="bg-warning/10 text-warning"
        />
      </div>

      {/* GPA Chart */}
      {chartData.length > 0 ? (
        <div className="bg-surface-secondary rounded-xl p-5 border border-border">
          <h2 className="text-lg font-semibold text-text mb-4">GPA by Semester</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
              <YAxis domain={[0, 4]} stroke="var(--color-text-secondary)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)',
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(2)}`,
                  'GPA'
                ]}
              />
              <Bar dataKey="gpa" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={getBarColor(entry.gpa)}
                    opacity={entry.status === 'in-progress' ? 0.6 : 1}
                    strokeDasharray={entry.status === 'in-progress' ? '4 2' : undefined}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-success" /> Completed
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-warning" /> In Progress (dimmed)
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-secondary rounded-xl p-12 border border-border text-center">
          <BarChart3 className="w-12 h-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary">Add semesters and courses to see your GPA trend chart.</p>
        </div>
      )}

      {/* Target GPA Calculator */}
      <TargetGPACalculator />

      {/* Semester Summary */}
      {semesters.length > 0 && (
        <div className="bg-surface-secondary rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">Semester Summary</h2>
          </div>
          <div className="divide-y divide-border">
            {semesters.map((s) => {
              const gpa = getSemesterGPA(s.id);
              return (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-text">{s.name}</p>
                      <p className="text-sm text-text-secondary">
                        {s.courses.length} course{s.courses.length !== 1 ? 's' : ''} &middot;{' '}
                        {s.courses.reduce((sum, c) => sum + c.creditHours, 0)} credits
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'completed'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {s.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${
                    gpa >= 3.5 ? 'text-success'
                      : gpa >= 2.5 ? 'text-accent'
                        : gpa >= 1.5 ? 'text-warning'
                          : gpa > 0 ? 'text-danger'
                            : 'text-text-secondary'
                  }`}>
                    {s.courses.length > 0 ? gpa.toFixed(2) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
