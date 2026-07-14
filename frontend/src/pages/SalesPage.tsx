import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Trash2, Eye, Printer, CheckCircle } from 'lucide-react'
import { salesApi, productsApi, customersApi } from '../services/api'
import type { Product } from '../types'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { TableLoader } from '../components/ui/Loader'
import { formatCurrency } from '../utils/format'
import toast from 'react-hot-toast'

interface SaleRow {
  key: number
  product_id: string
  quantity: number | ''
  unit_price: number
  total: number
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function SalesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [viewingSale, setViewingSale] = useState<any>(null)

  // New Sale form state
  const [rows, setRows] = useState<SaleRow[]>([{ key: Date.now(), product_id: '', quantity: 1, unit_price: 0, total: 0 }])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0])
  const [amountPaid, setAmountPaid] = useState<number | ''>('')

  // Queries
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', page, search],
    queryFn: () => salesApi.list({ page, per_page: 8, search: search || undefined }).then(r => r.data),
  })

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.all({ include_zero_stock: true }).then(r => r.data),
  })

  const { data: allCustomers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.all().then(r => r.data),
  })

  const { data: saleDetail, isError: saleDetailError } = useQuery({
    queryKey: ['sale-detail', viewingSale?.id],
    queryFn: () => viewingSale ? salesApi.get(viewingSale.id).then(r => r.data) : null,
    enabled: !!viewingSale,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => salesApi.create(data),
    onSuccess: () => {
      toast.success('Sale completed!')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setRows([{ key: Date.now(), product_id: '', quantity: 1, unit_price: 0, total: 0 }])
      setSelectedCustomerId('')
      setAmountPaid('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Sale failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => salesApi.delete(id),
    onSuccess: () => {
      toast.success('Sale deleted')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  // Row management
  const addRow = () => setRows(prev => [...prev, { key: Date.now(), product_id: '', quantity: 1, unit_price: 0, total: 0 }])

  const removeRow = (key: number) => {
    if (rows.length === 1) return
    setRows(prev => prev.filter(r => r.key !== key))
  }

  const updateRow = (key: number, field: string, value: any) => {
    setRows(prev => prev.map(r => {
      if (r.key !== key) return r
      const updated = { ...r, [field]: value }
      if (field === 'product_id') {
        const prod = products?.find((p: Product) => p.id === parseInt(value))
        if (prod) {
          updated.unit_price = Number(prod.sale_price)
          updated.total = updated.unit_price * (typeof updated.quantity === 'number' ? updated.quantity : 0)
        } else {
          updated.unit_price = 0
          updated.total = 0
        }
      }
      if (field === 'quantity' || field === 'unit_price') {
        const qty = typeof updated.quantity === 'number' ? updated.quantity : 0
        updated.total = updated.unit_price * qty
      }
      return updated
    }))
  }

  // Derived totals
  const totalBill = rows.reduce((sum, r) => sum + r.total, 0)
  const totalItems = rows.reduce((sum, r) => sum + (typeof r.quantity === 'number' ? r.quantity : 0), 0)
  const paid = typeof amountPaid === 'number' ? amountPaid : 0
  const remaining = totalBill - paid

  const completeSale = () => {
    const validRows = rows.filter(r => r.product_id && typeof r.quantity === 'number' && r.quantity > 0)
    if (validRows.length === 0) { toast.error('Add at least one product with quantity'); return }
    const customer = allCustomers?.find((c: any) => c.id === parseInt(selectedCustomerId))
    createMutation.mutate({
      items: validRows.map(r => ({
        product_id: parseInt(r.product_id),
        quantity: r.quantity as number,
        sale_price: r.unit_price,
      })),
      customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : undefined,
      customer_name: customer?.name || undefined,
      amount_paid: paid,
      payment_method: paid >= totalBill ? 'Cash' : 'Credit',
      is_credit: paid < totalBill,
      discount: 0,
      tax: 0,
    })
  }

  const printInvoice = async (sale: any) => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF('p', 'mm', 'a5')
      const W = 148

      doc.setFontSize(18); doc.setFont('helvetica', 'bold')
      doc.text('Gohar Butt', W / 2, 16, { align: 'center' })
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
      doc.text('Main Market, Gujranwala  |  0334-6407243', W / 2, 22, { align: 'center' })
      doc.setTextColor(0); doc.setDrawColor(200); doc.line(10, 26, W - 10, 26)
      doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text('INVOICE', W / 2, 33, { align: 'center' })

      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
      let y = 41
      doc.text(`Invoice #: ${sale.invoice_number}`, 10, y)
      doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`, W - 10, y, { align: 'right' })
      y += 6
      if (sale.customer_name) doc.text(`Customer: ${sale.customer_name}`, 10, y)

      const rows2 = (sale.items || []).map((item: any) => [
        item.product?.name || '',
        String(item.quantity),
        `PKR ${Number(item.sale_price).toLocaleString()}`,
        `PKR ${Number(item.total).toLocaleString()}`,
      ])

      autoTable(doc, {
        startY: y + 5,
        head: [['Product', 'Qty', 'Unit Price', 'Total']],
        body: rows2,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [7, 28, 60], textColor: 255 },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        margin: { left: 10, right: 10 },
      })

      const finalY = (doc as any).lastAutoTable.finalY + 5
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text(`Total Bill:  PKR ${Number(sale.total).toLocaleString()}`, W - 10, finalY, { align: 'right' })

      const amtPaid = Number(sale.amount_paid || 0)
      const bal = Number(sale.total) - amtPaid
      if (amtPaid > 0 || bal !== 0) {
        let fy = finalY + 6
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
        doc.text(`Amount Paid:  PKR ${amtPaid.toLocaleString()}`, W - 10, fy, { align: 'right' })
        fy += 5
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(bal > 0 ? 180 : 0, 30, 30)
        doc.text(`Balance:  PKR ${bal.toLocaleString()}`, W - 10, fy, { align: 'right' })
        doc.setTextColor(0)
      }

      doc.save(`${sale.invoice_number}.pdf`)
    } catch {
      toast.error('Could not generate PDF')
    }
  }

  return (
    <div className="space-y-5">

      {/* ── New Sale ── */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">New Sale</h2>

        {/* Header row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Walk-in Customer</option>
              {allCustomers?.map((c: { id: number; name: string; phone: string | null }) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice No</label>
            <input readOnly value="Auto-generated" className="input-field text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
          </div>
        </div>

        {/* Items table + Summary */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* Items table */}
          <div className="flex-1 min-w-0">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 w-8">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">Product</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 w-24">Quantity</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 w-32">Unit Price (PKR)</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 w-28">Total (PKR)</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, idx) => (
                    <tr key={row.key}>
                      <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <select
                          value={row.product_id}
                          onChange={e => updateRow(row.key, 'product_id', e.target.value)}
                          className="input-field text-sm py-1.5"
                        >
                          <option value="">Select Product</option>
                          {products?.map((p: Product) => (
                            <option key={p.id} value={p.id} disabled={p.stock === 0}>
                              {p.stock === 0 ? `[Out of Stock] ${p.name}` : p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={e => {
                            const v = e.target.value
                            updateRow(row.key, 'quantity', v === '' ? '' : Math.max(1, parseInt(v) || 1))
                          }}
                          className="input-field text-sm py-1.5 w-full"
                          min="1"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.unit_price || ''}
                          onChange={e => updateRow(row.key, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="input-field text-sm py-1.5 w-full"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm font-medium text-gray-800">
                          {row.total > 0 ? row.total.toLocaleString() : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeRow(row.key)}
                          disabled={rows.length === 1}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          {/* Summary panel */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-100">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-600">Total Items</span>
                  <span className="text-sm font-semibold text-gray-800">{totalItems}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-600">Total Bill (PKR)</span>
                  <span className="text-base font-bold text-blue-600">{totalBill.toLocaleString()}</span>
                </div>
                <div className="px-4 py-3">
                  <label className="block text-sm text-gray-600 mb-1.5">Amount Paid (PKR)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="input-field text-sm"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-600">Remaining Balance (PKR)</span>
                  <span className={`text-base font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {remaining.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-2 bg-gray-50">
                <button
                  onClick={completeSale}
                  disabled={createMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {createMutation.isPending ? 'Processing...' : 'Complete Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sales History ── */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Sales History</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-9 text-sm w-56"
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Invoice No</th>
                <th className="table-th">Date</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Total Bill (PKR)</th>
                <th className="table-th">Paid (PKR)</th>
                <th className="table-th">Balance (PKR)</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableLoader cols={7} />
              ) : salesData?.items?.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No sales found" description="Complete your first sale using the form above." />
                  </td>
                </tr>
              ) : (
                salesData?.items?.map((sale: any) => {
                  const balance = Number(sale.total) - Number(sale.amount_paid || 0)
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/50">
                      <td className="table-td font-medium text-blue-600 text-xs">{sale.invoice_number}</td>
                      <td className="table-td text-gray-500 text-xs">{formatDateTime(sale.sale_date)}</td>
                      <td className="table-td text-sm text-gray-700">
                        {sale.customer_name || <span className="text-gray-400">Walk-in</span>}
                      </td>
                      <td className="table-td font-semibold text-sm">
                        {Number(sale.total).toLocaleString()}
                      </td>
                      <td className="table-td text-sm text-gray-700">
                        {Number(sale.amount_paid || 0).toLocaleString()}
                      </td>
                      <td className="table-td">
                        <span className={`text-sm font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingSale(sale)}
                            className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 rounded px-2 py-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={async () => {
                              const res = await salesApi.get(sale.id)
                              printInvoice(res.data)
                            }}
                            className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 rounded px-2 py-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {salesData && (
          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination {...salesData} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* ── Sale Detail Modal ── */}
      <Modal isOpen={!!viewingSale} onClose={() => setViewingSale(null)} title={`Invoice: ${viewingSale?.invoice_number}`} size="lg">
        {saleDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Date: </span><span className="font-medium">{formatDateTime(saleDetail.sale_date)}</span></div>
              <div><span className="text-gray-500">Payment: </span><span className="font-medium">{saleDetail.payment_method}</span></div>
              {saleDetail.customer_name && (
                <div><span className="text-gray-500">Customer: </span><span className="font-medium">{saleDetail.customer_name}</span></div>
              )}
            </div>

            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Product</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Qty</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Price</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {saleDetail.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-800">{item.product?.name}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600">PKR {Number(item.sale_price).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">PKR {Number(item.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-100">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold">Total Bill</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-700">PKR {Number(saleDetail.total).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-sm text-gray-500">Amount Paid</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">PKR {Number(saleDetail.amount_paid || 0).toLocaleString()}</td>
                  </tr>
                  {(() => {
                    const bal = Number(saleDetail.total) - Number(saleDetail.amount_paid || 0)
                    return (
                      <tr className="bg-red-50">
                        <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-red-700">Balance</td>
                        <td className={`px-3 py-2 text-right font-bold ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          PKR {bal.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })()}
                </tfoot>
              </table>
            </div>

            <div className="flex gap-2">
              <button onClick={() => printInvoice(saleDetail)} className="btn-primary flex-1 text-sm">
                <Printer className="w-4 h-4" /> Print / Download Invoice
              </button>
              <button
                onClick={() => { if (confirm('Delete this sale and restore stock?')) deleteMutation.mutate(viewingSale.id); setViewingSale(null) }}
                className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : saleDetailError ? (
          <div className="flex items-center justify-center py-8 text-sm text-red-500">
            Failed to load invoice. Please try again.
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
      </Modal>
    </div>
  )
}
