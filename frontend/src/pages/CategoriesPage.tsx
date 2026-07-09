import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, Package, Tag } from 'lucide-react'
import { categoriesApi } from '../services/api'
import type { Category } from '../types'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { TableLoader } from '../components/ui/Loader'
import toast from 'react-hot-toast'

const ICONS = ['Package', 'Tag', 'ShoppingBag', 'Home', 'Heart', 'Star', 'Coffee', 'Droplets', 'Wind', 'Cookie', 'Zap', 'Gift']
const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#EF4444', '#06B6D4', '#84CC16']

function CategoryIcon({ icon, color }: { icon?: string; color?: string }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color || '#3B82F6'}20` }}
    >
      <Tag className="w-4 h-4" style={{ color: color || '#3B82F6' }} />
    </div>
  )
}

interface CategoryFormProps {
  initial?: Partial<Category>
  onSubmit: (data: any) => void
  loading?: boolean
  onClose: () => void
}

function CategoryForm({ initial, onSubmit, loading, onClose }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [color, setColor] = useState(initial?.color || '#3B82F6')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Category name is required'); return }
    onSubmit({ name: name.trim(), description: description.trim(), color })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. Cold Drinks" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-field" rows={3} placeholder="Short description..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c} type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Category'}</button>
      </div>
    </form>
  )
}

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [deletingCat, setDeletingCat] = useState<Category | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['categories', page, search],
    queryFn: () => categoriesApi.list({ page, per_page: 10, search: search || undefined }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => categoriesApi.create(data),
    onSuccess: () => { toast.success('Category created'); qc.invalidateQueries({ queryKey: ['categories'] }); setShowModal(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => categoriesApi.update(id, data),
    onSuccess: () => { toast.success('Category updated'); qc.invalidateQueries({ queryKey: ['categories'] }); setEditingCat(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['categories'] }); setDeletingCat(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to delete'),
  })

  return (
    <div className="space-y-5">
      <div className="card">
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Search categories..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary ml-auto">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">ID</th>
                <th className="table-th">Category Name</th>
                <th className="table-th hidden md:table-cell">Description</th>
                <th className="table-th">Total Products</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableLoader cols={5} />
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={5}><EmptyState title="No categories found" /></td></tr>
              ) : data?.items?.map((cat: Category) => (
                <tr key={cat.id} className="hover:bg-gray-50/50">
                  <td className="table-td text-gray-500">{cat.id}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon icon={cat.icon} color={cat.color} />
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </div>
                  </td>
                  <td className="table-td hidden md:table-cell text-gray-500 max-w-xs truncate">{cat.description}</td>
                  <td className="table-td">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                      {cat.total_products}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingCat(cat)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCat(cat)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && (
          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination {...data} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Category">
        <CategoryForm
          onSubmit={data => createMutation.mutate(data)}
          loading={createMutation.isPending}
          onClose={() => setShowModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingCat} onClose={() => setEditingCat(null)} title="Edit Category">
        {editingCat && (
          <CategoryForm
            initial={editingCat}
            onSubmit={data => updateMutation.mutate({ id: editingCat.id, data })}
            loading={updateMutation.isPending}
            onClose={() => setEditingCat(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        onConfirm={() => deletingCat && deleteMutation.mutate(deletingCat.id)}
        message={`Are you sure you want to delete "${deletingCat?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
