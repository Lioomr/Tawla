'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { useAdminToast } from '@/components/admin/AdminToast';
import SearchInput from '@/components/admin/SearchInput';
import ShimmerSkeleton from '@/components/admin/ShimmerSkeleton';
import {
  ApiError,
  getAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory,
  getAdminMenuItems, createAdminMenuItem, updateAdminMenuItem, deleteAdminMenuItem,
  AdminCategory, AdminMenuItem, AdminMenuItemPayload,
} from '@/lib/api';
import { Loader2, Plus, Pencil, Trash2, X, Check, Package, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Confirmation Dialog ───
function ConfirmDialog({ title, message, onConfirm, onCancel, isPending }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; isPending?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200">
        <h3 className="text-lg font-black tracking-tight mb-2 text-stone-900">{title}</h3>
        <p className="text-stone-500 font-medium text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isPending}
            className="flex-1 py-2.5 font-bold tracking-tight text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 py-2.5 font-bold tracking-tight text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors flex items-center justify-center text-sm">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminMenuPage() {
  const { accessToken } = useStaffStore();
  const queryClient = useQueryClient();
  const { showToast } = useAdminToast();
  const token = accessToken || '';

  // ─── Category State ───
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<{ id: number; name: string } | null>(null);
  const [deletingCat, setDeletingCat] = useState<AdminCategory | null>(null);
  const [catError, setCatError] = useState('');

  // ─── Menu Item State ───
  const [itemModal, setItemModal] = useState<'create' | 'edit' | null>(null);
  const [editItem, setEditItem] = useState<AdminMenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdminMenuItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', category_id: 0, description: '', price: '', is_available: true });
  const [itemError, setItemError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  // ─── Queries ───
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => getAdminCategories(token),
    enabled: !!token,
  });

  const { data: itemData, isLoading: itemLoading } = useQuery({
    queryKey: ['admin', 'menu-items'],
    queryFn: () => getAdminMenuItems(token),
    enabled: !!token,
  });

  // ─── Category Mutations ───
  const createCatMut = useMutation({
    mutationFn: (name: string) => createAdminCategory(token, name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }); setNewCatName(''); setCatError(''); showToast('Category created'); },
    onError: (e: unknown) => setCatError(e instanceof ApiError ? e.message : 'Failed to create category'),
  });

  const updateCatMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateAdminCategory(token, id, name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }); setEditingCat(null); setCatError(''); showToast('Category updated'); },
    onError: (e: unknown) => setCatError(e instanceof ApiError ? e.message : 'Failed to update category'),
  });

  const deleteCatMut = useMutation({
    mutationFn: (id: number) => deleteAdminCategory(token, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }); setDeletingCat(null); setCatError(''); showToast('Category deleted'); },
    onError: (e: unknown) => setCatError(e instanceof ApiError ? e.message : 'Failed to delete category'),
  });

  // ─── Menu Item Mutations ───
  const createItemMut = useMutation({
    mutationFn: (p: AdminMenuItemPayload) => createAdminMenuItem(token, p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin'] }); setItemModal(null); resetItemForm(); setItemError(''); showToast('Menu item created'); },
    onError: (e: unknown) => setItemError(e instanceof ApiError ? e.message : 'Failed to create item'),
  });

  const updateItemMut = useMutation({
    mutationFn: (p: AdminMenuItemPayload) => updateAdminMenuItem(token, p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin'] }); setItemModal(null); setEditItem(null); resetItemForm(); setItemError(''); showToast('Menu item updated'); },
    onError: (e: unknown) => setItemError(e instanceof ApiError ? e.message : 'Failed to update item'),
  });

  const deleteItemMut = useMutation({
    mutationFn: (id: number) => deleteAdminMenuItem(token, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin'] }); setDeletingItem(null); setItemError(''); showToast('Menu item deleted'); },
    onError: (e: unknown) => setItemError(e instanceof ApiError ? e.message : 'Failed to delete item'),
  });

  const resetItemForm = () => setItemForm({ name: '', category_id: 0, description: '', price: '', is_available: true });

  const openCreateItem = () => {
    resetItemForm();
    if (catData?.categories.length) setItemForm(f => ({ ...f, category_id: catData.categories[0].id }));
    setItemError('');
    setItemModal('create');
  };

  const openEditItem = (item: AdminMenuItem) => {
    setEditItem(item);
    setItemForm({ name: item.name, category_id: item.category_id, description: item.description, price: item.price, is_available: item.is_available });
    setItemError('');
    setItemModal('edit');
  };

  const handleItemSubmit = () => {
    if (!itemForm.name.trim() || !itemForm.category_id || !itemForm.price) return;
    const payload: AdminMenuItemPayload = {
      category_id: itemForm.category_id,
      name: itemForm.name.trim(),
      description: itemForm.description.trim(),
      price: parseFloat(itemForm.price),
      is_available: itemForm.is_available,
    };
    if (itemModal === 'edit' && editItem) {
      updateItemMut.mutate({ ...payload, menu_item_id: editItem.id });
    } else {
      createItemMut.mutate(payload);
    }
  };

  const categories = catData?.categories || [];
  const items = itemData?.items || [];

  // ─── Filtered Items ───
  const filteredItems = useMemo(() => {
    let result = items;
    if (activeCategory) {
      result = result.filter(i => i.category_id === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return result;
  }, [items, activeCategory, searchQuery]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Menu Management</h1>
          <p className="text-stone-500 font-medium mt-1 text-sm">Manage categories and menu items</p>
        </div>
        <button onClick={openCreateItem} disabled={categories.length === 0}
          className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold tracking-tight hover:bg-stone-800 disabled:opacity-40 flex items-center gap-2 transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── Categories Panel ─── */}
        <div className="lg:col-span-4">
          <section className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden sticky top-24">
            <div className="px-5 py-4 border-b border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-4 h-4 text-stone-400" />
                <h2 className="text-sm font-bold tracking-tight text-stone-900">Categories</h2>
              </div>
              {/* Add Category inline */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newCatName.trim()) createCatMut.mutate(newCatName.trim()); }}
                  className="flex-1 bg-stone-100/80 border border-stone-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-stone-300 focus:border-transparent outline-none"
                />
                <button
                  onClick={() => newCatName.trim() && createCatMut.mutate(newCatName.trim())}
                  disabled={createCatMut.isPending || !newCatName.trim()}
                  className="px-3 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 disabled:opacity-50 flex items-center transition-colors"
                >
                  {createCatMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {catError && (
              <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-2.5 rounded-lg">
                {catError}
              </div>
            )}

            {catLoading ? (
              <div className="px-5 py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
                {/* All categories filter */}
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`w-full px-5 py-3 text-left text-sm font-bold tracking-tight transition-colors ${
                    activeCategory === null ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  All Categories
                  <span className="text-xs font-bold text-stone-400 ml-2">{items.length}</span>
                </button>

                {categories.map((cat) => (
                  <div key={cat.id} className={`px-5 py-3 flex items-center justify-between group transition-colors ${
                    activeCategory === cat.id ? 'bg-stone-100' : 'hover:bg-stone-50'
                  }`}>
                    {editingCat?.id === cat.id ? (
                      <div className="flex-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingCat.name}
                          onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter' && editingCat.name.trim()) updateCatMut.mutate({ id: cat.id, name: editingCat.name.trim() }); if (e.key === 'Escape') setEditingCat(null); }}
                          autoFocus
                          className="flex-1 bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-400"
                        />
                        <button onClick={() => editingCat.name.trim() && updateCatMut.mutate({ id: cat.id, name: editingCat.name.trim() })}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingCat(null)}
                          className="p-1 text-stone-400 hover:bg-stone-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                          className="flex items-center gap-2 text-sm font-bold tracking-tight text-stone-800 truncate flex-1 text-left"
                        >
                          {cat.name}
                          <span className="text-[10px] font-bold text-stone-400 bg-stone-200/60 px-1.5 py-0.5 rounded">{cat.item_count}</span>
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingCat({ id: cat.id, name: cat.name })}
                            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeletingCat(cat)}
                            className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ─── Menu Items Panel ─── */}
        <div className="lg:col-span-8">
          <section className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-stone-400" />
                <h2 className="text-sm font-bold tracking-tight text-stone-900">
                  Menu Items
                  {activeCategory && categories.find(c => c.id === activeCategory) && (
                    <span className="text-stone-400 font-medium ml-1.5">
                      in {categories.find(c => c.id === activeCategory)!.name}
                    </span>
                  )}
                </h2>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredItems.length}</span>
              </div>
              <SearchInput
                placeholder="Search items..."
                onSearch={setSearchQuery}
                className="w-full sm:w-56"
              />
            </div>

            {itemLoading ? (
              <ShimmerSkeleton variant="table" rows={5} columns={4} />
            ) : filteredItems.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Package className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-400 font-medium text-sm">
                  {searchQuery ? 'No items match your search' : 'No menu items yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-left">
                      <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Name</th>
                      <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase hidden sm:table-cell">Category</th>
                      <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Price</th>
                      <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Status</th>
                      <th className="px-5 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredItems.map((item) => (
                      <motion.tr
                        key={item.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-stone-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-bold tracking-tight text-stone-800 block">{item.name}</span>
                          {item.description && <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{item.description}</p>}
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-xs font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">{item.category_name}</span>
                        </td>
                        <td className="px-5 py-3.5 font-bold tracking-tight text-stone-800">${item.price}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-tight ${
                            item.is_available ? 'text-emerald-600' : 'text-red-500'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_available ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditItem(item)}
                              className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeletingItem(item)}
                              className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ─── Category Delete Confirm ─── */}
      <AnimatePresence>
        {deletingCat && (
          <ConfirmDialog
            title="Delete Category"
            message={`Are you sure you want to delete "${deletingCat.name}"? ${deletingCat.item_count > 0 ? 'This category has items and cannot be deleted.' : ''}`}
            onConfirm={() => deleteCatMut.mutate(deletingCat.id)}
            onCancel={() => setDeletingCat(null)}
            isPending={deleteCatMut.isPending}
          />
        )}
      </AnimatePresence>

      {/* ─── Item Delete Confirm ─── */}
      <AnimatePresence>
        {deletingItem && (
          <ConfirmDialog
            title="Delete Menu Item"
            message={`Are you sure you want to delete "${deletingItem.name}"?`}
            onConfirm={() => deleteItemMut.mutate(deletingItem.id)}
            onCancel={() => setDeletingItem(null)}
            isPending={deleteItemMut.isPending}
          />
        )}
      </AnimatePresence>

      {/* ─── Item Create/Edit Modal ─── */}
      <AnimatePresence>
        {itemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-stone-200">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-black tracking-tight text-stone-900">
                  {itemModal === 'create' ? 'Add Menu Item' : 'Edit Menu Item'}
                </h3>
                <button onClick={() => { setItemModal(null); setEditItem(null); resetItemForm(); }}
                  className="p-1 text-stone-400 hover:text-stone-700 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {itemError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold p-3 rounded-xl mb-4">{itemError}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Name</label>
                  <input type="text" value={itemForm.name} onChange={(e) => setItemForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Category</label>
                  <select value={itemForm.category_id} onChange={(e) => setItemForm(f => ({ ...f, category_id: parseInt(e.target.value) }))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Price</label>
                  <input type="number" step="0.01" min="0" value={itemForm.price} onChange={(e) => setItemForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Description</label>
                  <textarea value={itemForm.description} onChange={(e) => setItemForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300 resize-none" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={itemForm.is_available} onChange={(e) => setItemForm(f => ({ ...f, is_available: e.target.checked }))}
                    className="w-5 h-5 rounded-md border-stone-300 text-stone-900 focus:ring-stone-400" />
                  <span className="text-sm font-bold tracking-tight text-stone-700">Available for ordering</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setItemModal(null); setEditItem(null); resetItemForm(); }}
                  className="flex-1 py-2.5 font-bold tracking-tight text-stone-500 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors text-sm">Cancel</button>
                <button onClick={handleItemSubmit} disabled={createItemMut.isPending || updateItemMut.isPending}
                  className="flex-1 py-2.5 font-bold tracking-tight text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center text-sm">
                  {(createItemMut.isPending || updateItemMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : (itemModal === 'create' ? 'Create' : 'Save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
