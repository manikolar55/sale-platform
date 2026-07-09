import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, ChevronDown, Receipt, BarChart2, Target, Wallet } from 'lucide-react'
import { expensesApi } from '../services/api'
import type { Expense, ExpenseCategory } from '../types'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { TableLoader } from '../components/ui/Loader'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import { formatCurrency, formatShortDate } from '../utils/format'
import toast from 'react-hot-toast'

interface ExpenseFormProps {
  initial?: Partial<Expense>
  categories: ExpenseCategory[]
  onSubmit: (data: any) => void
  loading?: boolean
  onClose: () => void
}

function ExpenseForm({ initial, categories, onSubmit, loading, onClose }: ExpenseFormProps) {
  const qc = useQueryClient()
  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const [savingCat, setSavingCat] = useState(false)

  const addCategory = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    try {
      const { expensesApi } = await import('../services/api')
      await expensesApi.createCategory({ name: newCatName.trim() })
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      setNewCatName('')
      setShowNewCat(false)
      toast.success('Category added')
    } catch {
      toast.error('Failed to add category')
    } finally {
      setSavingCat(false)
    }
  }

  const [form, setForm] = useState({
    category_id: initial?.category_id?.toString() || '',
    description: initial?.description || '',
    amount: initial?.amount?.toString() || '',
    quantity: initial?.quantity?.toString() || '',
    unit: initial?.unit || '',
    vendor: initial?.vendor || '',
    payment_method: initial?.payment_method || 'Cash',
    expense_date: initial?.expense_date
      ? new Date(initial.expense_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    notes: initial?.notes || '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) { toast.error('Description required'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Valid amount required'); return }
    onSubmit({
      category_id: form.category_id ? parseInt(form.category_id) : undefined,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      quantity: form.quantity ? parseFloat(form.quantity) : undefined,
      unit: form.unit.trim() || undefined,
      vendor: form.vendor.trim() || undefined,
      payment_method: form.payment_method,
      expense_date: form.expense_date ? new Date(form.expense_date).toISOString() : undefined,
      notes: form.notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <button
            type="button"
            onClick={() => setShowNewCat(v => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showNewCat ? 'Cancel' : '+ Add Category'}
          </button>
        </div>
        {showNewCat ? (
          <div className="flex gap-2">
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              className="input-field flex-1 text-sm"
              placeholder="Category name e.g. Petrol"
              autoFocus
            />
            <button
              type="button"
              onClick={addCategory}
              disabled={savingCat || !newCatName.trim()}
              className="btn-primary text-sm px-3 disabled:opacity-40"
            >
              {savingCat ? '...' : 'Add'}
            </button>
          </div>
        ) : (
          <select value={form.category_id} onChange={set('category_id')} className="input-field">
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
        <input value={form.description} onChange={set('description')} className="input-field" placeholder="e.g. Petrol, Shop Rent - May 2024" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
          <input type="number" value={form.quantity} onChange={set('quantity')} className="input-field" placeholder="e.g. 5" min="0" step="0.01" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
          <input value={form.unit} onChange={set('unit')} className="input-field" placeholder="e.g. liters, kg, pcs" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor / Supplier</label>
        <input value={form.vendor} onChange={set('vendor')} className="input-field" placeholder="e.g. PSO Station, Ali Store" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (PKR) *</label>
          <input type="number" value={form.amount} onChange={set('amount')} className="input-field" placeholder="0.00" min="0" step="0.01" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
          <select value={form.payment_method} onChange={set('payment_method')} className="input-field">
            <option>Cash</option>
            <option>Bank Transfer</option>
            <option>Card</option>
            <option>Cheque</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
        <input type="date" value={form.expense_date} onChange={set('expense_date')} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
        <textarea value={form.notes} onChange={set('notes')} className="input-field" rows={2} placeholder="Additional notes..." />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Expense'}</button>
      </div>
    </form>
  )
}

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ['expenses', page, categoryFilter, dateFrom, dateTo],
    queryFn: () => expensesApi.list({
      page, per_page: 8,
      category_id: categoryFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }).then(r => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expensesApi.categories().then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['expense-stats'],
    queryFn: () => expensesApi.stats().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => expensesApi.create(d),
    onSuccess: () => { toast.success('Expense added'); qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['expense-stats'] }); setShowModal(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => expensesApi.update(id, data),
    onSuccess: () => { toast.success('Expense updated'); qc.invalidateQueries({ queryKey: ['expenses'] }); setEditingExpense(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => { toast.success('Expense deleted'); qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['expense-stats'] }); setDeletingExpense(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const monthlyBudget = 50000
  const budgetUsed = stats?.total_this_month || 0
  const budgetPct = Math.min(Math.round((budgetUsed / monthlyBudget) * 100), 100)
  const remaining = Math.max(monthlyBudget - budgetUsed, 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenses (This Month)"
          value={formatCurrency(budgetUsed)}
          icon={<Receipt className="w-5 h-5 text-red-500" />}
          iconBg="bg-red-50"
          changeLabel="this month"
        />
        <StatCard
          title="Daily Average Expense"
          value={formatCurrency(stats?.daily_average || 0)}
          icon={<BarChart2 className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium mb-1">This Month Budget</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyBudget)}</p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{budgetPct}% of budget used</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
        <StatCard
          title="Remaining Budget"
          value={formatCurrency(remaining)}
          icon={<Wallet className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-50"
          changeLabel={`${100 - budgetPct}% remaining`}
        />
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input-field text-sm w-40"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input-field text-sm w-40"
            />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              className="input-field appearance-none pr-8 text-sm w-44"
            >
              <option value="">All Categories</option>
              {categories?.map((c: ExpenseCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary ml-auto">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Expense List</h3>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">#</th>
                <th className="table-th">Date</th>
                <th className="table-th">Category</th>
                <th className="table-th">Description</th>
                <th className="table-th">Amount (PKR)</th>
                <th className="table-th hidden md:table-cell">Payment Method</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableLoader cols={7} />
              ) : expenseData?.items?.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No expenses found" /></td></tr>
              ) : expenseData?.items?.map((expense: Expense, idx: number) => (
                <tr key={expense.id} className="hover:bg-gray-50/50">
                  <td className="table-td text-gray-500">{(page - 1) * 8 + idx + 1}</td>
                  <td className="table-td text-gray-600 text-xs">{formatShortDate(expense.expense_date)}</td>
                  <td className="table-td">
                    {expense.category ? (
                      <Badge color={expense.category.color}>{expense.category.name}</Badge>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="table-td max-w-xs">
                    <p className="text-gray-700 truncate">{expense.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {expense.quantity && expense.unit && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                          {expense.quantity} {expense.unit}
                        </span>
                      )}
                      {expense.vendor && (
                        <span className="text-xs text-gray-400 truncate">{expense.vendor}</span>
                      )}
                    </div>
                  </td>
                  <td className="table-td font-semibold">{Number(expense.amount).toLocaleString()}</td>
                  <td className="table-td hidden md:table-cell text-gray-600 text-xs">{expense.payment_method}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingExpense(expense)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletingExpense(expense)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expenseData && <div className="px-5 py-4 border-t border-gray-100"><Pagination {...expenseData} onPageChange={setPage} /></div>}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Expense" size="md">
        <ExpenseForm
          categories={categories || []}
          onSubmit={d => createMutation.mutate(d)}
          loading={createMutation.isPending}
          onClose={() => setShowModal(false)}
        />
      </Modal>

      <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title="Edit Expense" size="md">
        {editingExpense && (
          <ExpenseForm
            initial={editingExpense}
            categories={categories || []}
            onSubmit={d => updateMutation.mutate({ id: editingExpense.id, data: d })}
            loading={updateMutation.isPending}
            onClose={() => setEditingExpense(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={() => deletingExpense && deleteMutation.mutate(deletingExpense.id)}
        message={`Delete expense "${deletingExpense?.description}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
