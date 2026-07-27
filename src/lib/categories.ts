import { supabase } from '@/lib/supabase';

export interface CategoryItem {
  id?: string;
  name: string;
  created_at?: string;
}

export const DEFAULT_CATEGORIES: string[] = [
  'Office',
  'Hardware',
  'Utilities',
  'Salaries',
  'Investment',
];

export async function fetchCategories(): Promise<CategoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_CATEGORIES.map((name) => ({ name }));
    }

    return data as CategoryItem[];
  } catch (err) {
    console.warn('Failed to fetch categories, using default list:', err);
    return DEFAULT_CATEGORIES.map((name) => ({ name }));
  }
}

export async function addCategory(name: string): Promise<CategoryItem> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Category name cannot be empty.');
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: trimmed }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to add category.');
  }

  return data as CategoryItem;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Failed to delete category.');
  }
}
