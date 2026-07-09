import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Plus, Eye, Pencil, Trash2, Search,
  DollarSign, TrendingUp, CreditCard, CheckCircle,
} from 'lucide-react'
import { customersApi } from '../services/api'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { TableLoader } from '../components/ui/Loader'
import StatCard from '../components/ui/StatCard'
import { formatCurrency, formatShortDate } from '../utils/format'
import toast from 'react-hot-toast'

interface CustomerItem {
  id: number
  name: string
  phone: string | null
  city: string | null
  credit_limit: number
  total_credit: number
  total_paid: number
  balance: number
  is_active: boolean
  created_at: string
}

interface CustomerDetail extends CustomerItem {
  address: string | null
  notes: string | null
  recent_sales: Array<{
    id: number
    invoice_number: string
    total: number
    is_credit: boolean
    sale_date: string
  }>
  recent_payments: Array<{
    id: number
    amount: number
    payment_method: string
    notes: string | null
    payment_date: string
  }>
}

interface CustomerFormProps {
  initial?: Partial<CustomerItem & { address: string | null; notes: string | null }>
  onSubmit: (data: unknown) => void
  loading?: boolean
  onClose: () => void
}

function CustomerForm({ initial, onSubmit, loading, onClose }: CustomerFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    phone: initial?.phone || '',
    city: initial?.city || '',
    address: (initial as any)?.address || '',
    credit_limit: initial?.credit_limit?.toString() || '0',
    notes: (initial as any)?.notes || '',
  })

  const set = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      credit_limit: parseFloat(form.credit_limit) || 0,
      notes: form.notes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
        <input value={form.name} onChange={set('name')} className="input-field" placeholder="Customer full name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input value={form.phone} onChange={set('phone')} className="input-field" placeholder="e.g. 0300-1234567" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
          <input value={form.city} onChange={set('city')} className="input-field" placeholder="e.g. Lahore" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
        <input value={form.address} onChange={set('address')} className="input-field" placeholder="Street address" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Credit Limit (PKR)</label>
        <input
          type="number"
          value={form.credit_limit}
          onChange={set('credit_limit')}
          className="input-field"
          min="0"
          step="0.01"
          placeholder="0"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
        <textarea value={form.notes} onChange={set('notes')} className="input-field" rows={2} placeholder="Any notes about this customer..." />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : initial ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  )
}

interface PaymentFormProps {
  onSubmit: (data: unknown) => void
  loading?: boolean
  onClose: () => void
}

function PaymentForm({ onSubmit, loading, onClose }: PaymentFormProps) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) { toast.error('Valid amount required'); return }
    onSubmit({ amount: parseFloat(amount), payment_method: method, notes: notes.trim() || null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4 border-t border-gray-100 pt-4">
      <p className="text-sm font-semibold text-gray-700">Record Payment</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount (PKR) *</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input-field text-sm"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="input-field text-sm">
            <option>Cash</option>
            <option>Bank Transfer</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} className="input-field text-sm" placeholder="Optional notes" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm">
          {loading ? 'Saving...' : 'Record Payment'}
        </button>
      </div>
    </form>
  )
}

export default function CustomersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerItem | null>(null)
  const [viewingCustomerId, setViewingCustomerId] = useState<number | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customersApi.list({ page, per_page: 10, search: search || undefined }).then(r => r.data),
  })

  const { data: customerDetail } = useQuery<CustomerDetail>({
    queryKey: ['customer-detail', viewingCustomerId],
    queryFn: () => customersApi.get(viewingCustomerId!).then(r => r.data as CustomerDetail),
    enabled: !!viewingCustomerId,
  })

  const createMutation = useMutation({
    mutationFn: (d: unknown) => customersApi.create(d),
    onSuccess: () => {
      toast.success('Customer added')
      qc.invalidateQueries({ queryKey: ['customers'] })
      setShowModal(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => customersApi.update(id, data),
    onSuccess: () => {
      toast.success('Customer updated')
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-detail', editingCustomer?.id] })
      setEditingCustomer(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => {
      toast.success('Customer deleted')
      qc.invalidateQueries({ queryKey: ['customers'] })
      setDeletingCustomer(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => customersApi.addPayment(id, data),
    onSuccess: () => {
      toast.success('Payment recorded')
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-detail', viewingCustomerId] })
      setShowPaymentForm(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const items: CustomerItem[] = customerData?.items || []

  // Compute aggregate stats from current page (best effort without a dedicated stats endpoint)
  const totalOutstanding = items.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0)
  const totalCollected = items.reduce((s, c) => s + c.total_paid, 0)
  const totalCreditSales = items.reduce((s, c) => s + c.total_credit, 0)

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={String(customerData?.total || 0)}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(totalOutstanding)}
          icon={<CreditCard className="w-5 h-5 text-red-500" />}
          iconBg="bg-red-50"
          changeLabel="unpaid credit"
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(totalCollected)}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Total Credit Sales"
          value={formatCurrency(totalCreditSales)}
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
        />
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-9 text-sm"
              placeholder="Search customers..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary ml-auto">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">#</th>
                <th className="table-th">Name</th>
                <th className="table-th hidden sm:table-cell">Phone</th>
                <th className="table-th hidden md:table-cell">City</th>
                <th className="table-th">Credit Sales</th>
                <th className="table-th hidden sm:table-cell">Paid</th>
                <th className="table-th">Balance</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableLoader cols={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No customers found"
                      description="Add your first customer using the button above."
                    />
                  </td>
                </tr>
              ) : (
                items.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="table-td text-gray-400 text-xs">{(page - 1) * 10 + idx + 1}</td>
                    <td className="table-td">
                      <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                    </td>
                    <td className="table-td hidden sm:table-cell text-gray-500 text-xs">{c.phone || '-'}</td>
                    <td className="table-td hidden md:table-cell text-gray-500 text-xs">{c.city || '-'}</td>
                    <td className="table-td text-sm font-medium text-gray-700">{formatCurrency(c.total_credit)}</td>
                    <td className="table-td hidden sm:table-cell text-sm text-green-600 font-medium">{formatCurrency(c.total_paid)}</td>
                    <td className="table-td">
                      <span className={`text-sm font-semibold ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(c.balance))}
                        {c.balance > 0 && <span className="ml-1 text-xs font-normal text-red-400">due</span>}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setViewingCustomerId(c.id); setShowPaymentForm(false) }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCustomer(c)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCustomer(c)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {customerData && (
          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination {...customerData} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Customer" size="md">
        <CustomerForm
          onSubmit={d => createMutation.mutate(d)}
          loading={createMutation.isPending}
          onClose={() => setShowModal(false)}
        />
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={!!editingCustomer} onClose={() => setEditingCustomer(null)} title="Edit Customer" size="md">
        {editingCustomer && (
          <CustomerForm
            initial={editingCustomer}
            onSubmit={d => updateMutation.mutate({ id: editingCustomer.id, data: d })}
            loading={updateMutation.isPending}
            onClose={() => setEditingCustomer(null)}
          />
        )}
      </Modal>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={!!viewingCustomerId}
        onClose={() => { setViewingCustomerId(null); setShowPaymentForm(false) }}
        title={customerDetail ? customerDetail.name : 'Customer Details'}
        size="lg"
      >
        {customerDetail ? (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {customerDetail.phone && <span>{customerDetail.phone}</span>}
              {customerDetail.city && <span>{customerDetail.city}</span>}
              {customerDetail.address && <span className="text-gray-400">{customerDetail.address}</span>}
            </div>

            {/* Balance summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Credit Sales</p>
                <p className="font-bold text-gray-800 text-sm">{formatCurrency(customerDetail.total_credit)}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Paid</p>
                <p className="font-bold text-green-700 text-sm">{formatCurrency(customerDetail.total_paid)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${customerDetail.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-xs text-gray-500 mb-1">Outstanding</p>
                <p className={`font-bold text-sm ${customerDetail.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(customerDetail.balance))}
                </p>
              </div>
            </div>

            {/* Record Payment button / form */}
            {!showPaymentForm ? (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="btn-primary w-full text-sm"
              >
                <DollarSign className="w-4 h-4" /> Record Payment
              </button>
            ) : (
              <PaymentForm
                onSubmit={d => paymentMutation.mutate({ id: customerDetail.id, data: d })}
                loading={paymentMutation.isPending}
                onClose={() => setShowPaymentForm(false)}
              />
            )}

            {/* Recent Sales */}
            {customerDetail.recent_sales.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Recent Sales</p>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Invoice</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Date</th>
                        <th className="px-3 py-2 text-right text-gray-500 font-medium">Total</th>
                        <th className="px-3 py-2 text-center text-gray-500 font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customerDetail.recent_sales.map(s => (
                        <tr key={s.id}>
                          <td className="px-3 py-2 font-medium text-blue-600">{s.invoice_number}</td>
                          <td className="px-3 py-2 text-gray-500">{formatShortDate(s.sale_date)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(s.total)}</td>
                          <td className="px-3 py-2 text-center">
                            {s.is_credit ? (
                              <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Credit</span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Cash</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Payments */}
            {customerDetail.recent_payments.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Recent Payments</p>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Date</th>
                        <th className="px-3 py-2 text-right text-gray-500 font-medium">Amount</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Method</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customerDetail.recent_payments.map(p => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-gray-500">{formatShortDate(p.payment_date)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                          <td className="px-3 py-2 text-gray-600">{p.payment_method}</td>
                          <td className="px-3 py-2 text-gray-400">{p.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {customerDetail.recent_sales.length === 0 && customerDetail.recent_payments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No transactions yet for this customer.</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
        message={`Delete customer "${deletingCustomer?.name}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
