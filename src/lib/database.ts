import { supabase } from './supabase';
import type { GradeScaleEntry, Semester, DetailedCourse } from '@/types';

export interface UserData {
  gradeScale: GradeScaleEntry[];
  semesters: Semester[];
  detailedCourses: DetailedCourse[];
}

export async function loadUserData(userId: string): Promise<UserData | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data.data as UserData;
}

export async function saveUserData(userId: string, userData: UserData): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, data: userData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  return !error;
}
