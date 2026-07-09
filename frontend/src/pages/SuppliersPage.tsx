import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, Truck, ChevronDown, Users, ShoppingCart, DollarSign } from 'lucide-react'
import { suppliersApi } from '../services/api'
import type { Supplier } from '../types'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { TableLoader } from '../components/ui/Loader'
import { StatusBadge } from '../components/ui/Badge'
import StatCard from '../components/ui/StatCard'
import { formatCurrency } from '../utils/format'
import toast from 'react-hot-toast'

interface SupplierFormProps {
  initial?: Partial<Supplier>
  onSubmit: (data: any) => void
  loading?: boolean
  onClose: () => void
}

function SupplierForm({ initial, onSubmit, loading, onClose }: SupplierFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    contact_person: initial?.contact_person || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    address: initial?.address || '',
    city: initial?.city || '',
    notes: initial?.notes || '',
    is_active: initial?.is_active !== false,
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Supplier name required'); return }
    onSubmit({ ...form, name: form.name.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplier Name *</label>
          <input value={form.name} onChange={set('name')} className="input-field" placeholder="e.g. Coca Cola Pak" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person</label>
          <input value={form.contact_person} onChange={set('contact_person')} className="input-field" placeholder="Full name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input value={form.phone} onChange={set('phone')} className="input-field" placeholder="0300-0000000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input type="email" value={form.email} onChange={set('email')} className="input-field" placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
          <input value={form.city} onChange={set('city')} className="input-field" placeholder="Lahore" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
          <textarea value={form.address} onChange={set('address')} className="input-field" rows={2} placeholder="Full address" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} className="input-field" rows={2} placeholder="Additional notes" />
        </div>
        {initial && (
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={set('is_active')} className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active Supplier</label>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Supplier'}</button>
      </div>
    </form>
  )
}

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search, statusFilter],
    queryFn: () => suppliersApi.list({
      page, per_page: 8,
      search: search || undefined,
      is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['supplier-stats'],
    queryFn: () => suppliersApi.stats().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => suppliersApi.create(d),
    onSuccess: () => { toast.success('Supplier created'); qc.invalidateQueries({ queryKey: ['suppliers'] }); setShowModal(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => suppliersApi.update(id, data),
    onSuccess: () => { toast.success('Supplier updated'); qc.invalidateQueries({ queryKey: ['suppliers'] }); setEditingSupplier(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => suppliersApi.delete(id),
    onSuccess: () => { toast.success('Supplier deleted'); qc.invalidateQueries({ queryKey: ['suppliers'] }); setDeletingSupplier(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Suppliers" value={String(stats?.total || 0)} icon={<Users className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" linkLabel="View all suppliers" />
        <StatCard title="Active Suppliers" value={String(stats?.active || 0)} icon={<Truck className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" changeLabel={`${stats?.total ? Math.round(stats.active / stats.total * 100) : 0}% of total suppliers`} />
        <StatCard title="Total Purchases (This Month)" value={formatCurrency(0)} icon={<ShoppingCart className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" linkLabel="View purchases →" />
        <StatCard title="Total Payables" value={formatCurrency(0)} icon={<DollarSign className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" linkLabel="View payables →" />
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-9 w-56"
              placeholder="Search suppliers..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="input-field appearance-none pr-8 w-36"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary ml-auto">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">ID</th>
                <th className="table-th">Supplier Name</th>
                <th className="table-th hidden md:table-cell">Contact Person</th>
                <th className="table-th hidden md:table-cell">Phone</th>
                <th className="table-th hidden lg:table-cell">Email</th>
                <th className="table-th hidden lg:table-cell">City</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableLoader cols={8} />
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No suppliers found" /></td></tr>
              ) : data?.items?.map((s: Supplier) => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="table-td text-gray-500">{s.id}</td>
                  <td className="table-td font-medium text-gray-900">{s.name}</td>
                  <td className="table-td hidden md:table-cell text-gray-600">{s.contact_person || '-'}</td>
                  <td className="table-td hidden md:table-cell text-gray-600">{s.phone || '-'}</td>
                  <td className="table-td hidden lg:table-cell text-gray-600 text-xs">{s.email || '-'}</td>
                  <td className="table-td hidden lg:table-cell text-gray-600">{s.city || '-'}</td>
                  <td className="table-td"><StatusBadge active={s.is_active} /></td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingSupplier(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletingSupplier(s)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && <div className="px-5 py-4 border-t border-gray-100"><Pagination {...data} onPageChange={setPage} /></div>}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Supplier" size="lg">
        <SupplierForm onSubmit={d => createMutation.mutate(d)} loading={createMutation.isPending} onClose={() => setShowModal(false)} />
      </Modal>

      <Modal isOpen={!!editingSupplier} onClose={() => setEditingSupplier(null)} title="Edit Supplier" size="lg">
        {editingSupplier && (
          <SupplierForm
            initial={editingSupplier}
            onSubmit={d => updateMutation.mutate({ id: editingSupplier.id, data: d })}
            loading={updateMutation.isPending}
            onClose={() => setEditingSupplier(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={() => deletingSupplier && deleteMutation.mutate(deletingSupplier.id)}
        message={`Delete "${deletingSupplier?.name}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
