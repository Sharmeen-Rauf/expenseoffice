'use client';

import React, { useState, useEffect } from 'react';
import { 
  fetchCategories, 
  addCategory, 
  deleteCategory, 
  CategoryItem 
} from '@/lib/categories';
import { 
  Tags, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  FolderPlus 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChange?: () => void;
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  onCategoriesChange,
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCategoriesList = async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategoriesList();
    }
  }, [isOpen]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setSubmitting(true);
    try {
      await addCategory(newCategory.trim());
      toast.success(`Category "${newCategory.trim()}" added successfully.`);
      setNewCategory('');
      await loadCategoriesList();
      if (onCategoriesChange) onCategoriesChange();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Failed to create category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!cat.id) {
      toast.error('Default system categories cannot be removed.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
      return;
    }

    try {
      await deleteCategory(cat.id);
      toast.success(`Category "${cat.name}" deleted successfully.`);
      await loadCategoriesList();
      if (onCategoriesChange) onCategoriesChange();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Failed to delete category.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-[95vw] sm:max-w-[480px] bg-white border border-slate-200 shadow-xl rounded-lg p-5">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Manage Ledger Categories
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Add custom categories for transactions and financial reporting.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="space-y-3 pt-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Marketing, Travel, Software, Taxes"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="border-slate-200 focus-visible:ring-slate-900"
              disabled={submitting}
            />
            <Button
              type="submit"
              disabled={submitting || !newCategory.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 font-medium text-xs flex gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Category
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Categories List */}
        <div className="space-y-3 pt-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Active Categories</span>
            <Badge variant="outline" className="text-[10px] bg-slate-50">
              {categories.length} Total
            </Badge>
          </h4>

          {loading ? (
            <div className="flex h-28 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id || cat.name}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-md text-sm hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                  </div>

                  {cat.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(cat)}
                      className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-slate-500 font-normal">
                      Default
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
