import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { ChevronDown, Download } from 'lucide-react'
import { reportsApi, salesApi, expensesApi, productsApi } from '../services/api'
import { formatCurrency, formatShortDate } from '../utils/format'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'

const TABS = ['Overview', 'Sales Report', 'Stock Report', 'Expense Report', 'Profit & Loss']

function StatMini({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 font-medium">{title}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [period, setPeriod] = useState('daily')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['report-overview', dateFrom, dateTo],
    queryFn: () => reportsApi.overview({ date_from: dateFrom, date_to: dateTo }).then(r => r.data),
  })

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['sales-chart', period, dateFrom, dateTo],
    queryFn: () => reportsApi.salesChart({ period, date_from: dateFrom, date_to: dateTo }).then(r => r.data),
  })

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', dateFrom, dateTo],
    queryFn: () => reportsApi.topProducts({ date_from: dateFrom, date_to: dateTo }).then(r => r.data),
  })

  const { data: expensesByCategory } = useQuery({
    queryKey: ['expenses-by-category', dateFrom, dateTo],
    queryFn: () => reportsApi.expensesByCategory({ date_from: dateFrom, date_to: dateTo }).then(r => r.data),
  })

  const { data: salesData } = useQuery({
    queryKey: ['report-sales', dateFrom, dateTo],
    queryFn: () => salesApi.list({ date_from: dateFrom, date_to: dateTo, per_page: 100 }).then(r => r.data),
    enabled: activeTab === 'Sales Report',
  })

  const { data: expensesData } = useQuery({
    queryKey: ['report-expenses', dateFrom, dateTo],
    queryFn: () => expensesApi.list({ date_from: dateFrom, date_to: dateTo, per_page: 100 }).then(r => r.data),
    enabled: activeTab === 'Expense Report',
  })

  const { data: stockData } = useQuery({
    queryKey: ['report-stock'],
    queryFn: () => productsApi.list({ per_page: 100 }).then(r => r.data),
    enabled: activeTab === 'Stock Report',
  })

  const handleExport = () => {
    if (activeTab === 'Sales Report' && salesData?.items) {
      downloadCSV('sales-report.csv', [
        ['Invoice', 'Date', 'Market', 'Customer', 'Items', 'Total (PKR)', 'Profit (PKR)', 'Payment'],
        ...salesData.items.map((s: any) => [
          s.invoice_number, formatShortDate(s.sale_date),
          s.market_name || '', s.customer_name || '',
          s.item_count, s.total, s.profit, s.payment_method,
        ]),
      ])
    } else if (activeTab === 'Expense Report' && expensesData?.items) {
      downloadCSV('expense-report.csv', [
        ['Date', 'Category', 'Description', 'Quantity', 'Unit', 'Vendor', 'Amount (PKR)', 'Payment'],
        ...expensesData.items.map((e: any) => [
          formatShortDate(e.expense_date), e.category?.name || '',
          e.description, e.quantity || '', e.unit || '', e.vendor || '',
          e.amount, e.payment_method,
        ]),
      ])
    } else if (activeTab === 'Stock Report' && stockData?.items) {
      downloadCSV('stock-report.csv', [
        ['Product', 'Category', 'Stock', 'Unit', 'Min Stock', 'Purchase Price', 'Sale Price', 'Status'],
        ...stockData.items.map((p: any) => [
          p.name, p.category?.name || '', p.stock, p.unit, p.min_stock,
          p.purchase_price, p.sale_price,
          p.stock === 0 ? 'Out of Stock' : p.stock < p.min_stock ? 'Low Stock' : 'In Stock',
        ]),
      ])
    } else if (activeTab === 'Overview' || activeTab === 'Profit & Loss') {
      downloadCSV('profit-loss-report.csv', [
        ['Metric', 'Amount (PKR)'],
        ['Total Sales', overview?.total_sales || 0],
        ['Total Purchases (Cost)', overview?.total_purchases || 0],
        ['Gross Profit', overview?.gross_profit || 0],
        ['Total Expenses', overview?.total_expenses || 0],
        ['Net Profit', overview?.net_profit || 0],
      ])
    }
  }

  if (overviewLoading) return <Loader />

  return (
    <div className="space-y-5">
      <div className="card">
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-gray-100 px-5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3.5 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm w-40" />
            <span className="text-gray-400">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm w-40" />
          </div>
          <button onClick={handleExport} className="btn-secondary ml-auto gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="p-5">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'Overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                <StatMini title="Total Sales" value={formatCurrency(overview?.total_sales || 0)} sub="selected period" />
                <StatMini title="Total Purchases" value={formatCurrency(overview?.total_purchases || 0)} sub="cost of goods sold" />
                <StatMini title="Gross Profit" value={formatCurrency(overview?.gross_profit || 0)} sub="sales − purchases" />
                <StatMini title="Total Expenses" value={formatCurrency(overview?.total_expenses || 0)} sub="selected period" />
                <StatMini title="Net Profit" value={formatCurrency(overview?.net_profit || 0)} sub="gross profit − expenses" />
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Sales Overview</h3>
                  <div className="relative">
                    <select value={period} onChange={e => setPeriod(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                {chartLoading ? <Loader /> : chartData && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), '']} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2} dot={false} name="Sales" />
                      <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} name="Profit" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data for selected period</div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {topProducts && topProducts.length > 0 && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Products by Sales</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={topProducts.slice(0, 6)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                        <Bar dataKey="sales" fill="#2563EB" radius={[4, 4, 0, 0]} name="Sales" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {expensesByCategory && expensesByCategory.length > 0 && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Expenses by Category</h3>
                    <div className="flex items-center">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie data={expensesByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                            {expensesByCategory.map((entry: any, index: number) => (
                              <Cell key={index} fill={entry.color || '#6B7280'} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2 text-xs">
                        {expensesByCategory.map((item: any) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-600 flex-1">{item.name}</span>
                            <span className="font-semibold">PKR {item.total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SALES REPORT TAB ── */}
          {activeTab === 'Sales Report' && (
            <div className="overflow-x-auto">
              {!salesData?.items?.length ? <EmptyState title="No sales in this period" /> : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">Invoice</th>
                      <th className="table-th">Date</th>
                      <th className="table-th">Market / Customer</th>
                      <th className="table-th">Items</th>
                      <th className="table-th">Total (PKR)</th>
                      <th className="table-th">Profit (PKR)</th>
                      <th className="table-th">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {salesData.items.map((s: any) => (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="table-td text-blue-600 font-medium text-xs">{s.invoice_number}</td>
                        <td className="table-td text-gray-500 text-xs">{formatShortDate(s.sale_date)}</td>
                        <td className="table-td text-xs text-gray-700">
                          {s.market_name || s.customer_name || <span className="text-gray-400">Walk-in</span>}
                        </td>
                        <td className="table-td text-xs text-gray-600">{s.item_count}</td>
                        <td className="table-td font-semibold">{Number(s.total).toLocaleString()}</td>
                        <td className="table-td text-green-600 font-medium">{Number(s.profit).toLocaleString()}</td>
                        <td className="table-td text-xs text-gray-500">{s.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="table-td font-semibold text-gray-700">Total</td>
                      <td className="table-td font-bold text-blue-700">
                        {salesData.items.reduce((s: number, r: any) => s + Number(r.total), 0).toLocaleString()}
                      </td>
                      <td className="table-td font-bold text-green-600">
                        {salesData.items.reduce((s: number, r: any) => s + Number(r.profit), 0).toLocaleString()}
                      </td>
                      <td className="table-td" />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* ── STOCK REPORT TAB ── */}
          {activeTab === 'Stock Report' && (
            <div className="overflow-x-auto">
              {!stockData?.items?.length ? <EmptyState title="No products found" /> : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">Product</th>
                      <th className="table-th">Category</th>
                      <th className="table-th">Stock</th>
                      <th className="table-th">Min Stock</th>
                      <th className="table-th">Purchase Price</th>
                      <th className="table-th">Sale Price</th>
                      <th className="table-th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stockData.items.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="table-td font-medium text-gray-900">{p.name}</td>
                        <td className="table-td text-gray-500 text-sm">{p.category?.name || '-'}</td>
                        <td className="table-td font-semibold">{p.stock} {p.unit}</td>
                        <td className="table-td text-gray-500">{p.min_stock} {p.unit}</td>
                        <td className="table-td text-gray-700">PKR {Number(p.purchase_price).toLocaleString()}</td>
                        <td className="table-td text-gray-700">PKR {Number(p.sale_price).toLocaleString()}</td>
                        <td className="table-td">
                          {p.stock === 0
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Out of Stock</span>
                            : p.stock < p.min_stock
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Low Stock</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">In Stock</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── EXPENSE REPORT TAB ── */}
          {activeTab === 'Expense Report' && (
            <div className="overflow-x-auto">
              {!expensesData?.items?.length ? <EmptyState title="No expenses in this period" /> : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Category</th>
                      <th className="table-th">Description</th>
                      <th className="table-th">Qty / Unit</th>
                      <th className="table-th">Vendor</th>
                      <th className="table-th">Amount (PKR)</th>
                      <th className="table-th">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expensesData.items.map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-50/50">
                        <td className="table-td text-gray-500 text-xs">{formatShortDate(e.expense_date)}</td>
                        <td className="table-td text-xs text-gray-600">{e.category?.name || '-'}</td>
                        <td className="table-td font-medium text-gray-900">{e.description}</td>
                        <td className="table-td text-xs text-gray-500">
                          {e.quantity ? `${e.quantity} ${e.unit || ''}` : '-'}
                        </td>
                        <td className="table-td text-xs text-gray-500">{e.vendor || '-'}</td>
                        <td className="table-td font-semibold">{Number(e.amount).toLocaleString()}</td>
                        <td className="table-td text-xs text-gray-500">{e.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={5} className="table-td font-semibold text-gray-700">Total</td>
                      <td className="table-td font-bold text-red-600">
                        {expensesData.items.reduce((s: number, e: any) => s + Number(e.amount), 0).toLocaleString()}
                      </td>
                      <td className="table-td" />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* ── PROFIT & LOSS TAB ── */}
          {activeTab === 'Profit & Loss' && (
            <div className="max-w-lg mx-auto">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 uppercase tracking-wide">Revenue</div>
                <div className="flex justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-gray-700">Total Sales</span>
                  <span className="font-semibold">{formatCurrency(overview?.total_sales || 0)}</span>
                </div>

                <div className="bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-800 uppercase tracking-wide">Cost of Goods Sold</div>
                <div className="flex justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-gray-700">Total Purchases (Cost)</span>
                  <span className="font-semibold text-red-600">− {formatCurrency(overview?.total_purchases || 0)}</span>
                </div>

                <div className="flex justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <span className="font-semibold text-gray-900">Gross Profit</span>
                  <span className="font-bold text-green-700">{formatCurrency(overview?.gross_profit || 0)}</span>
                </div>

                <div className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 uppercase tracking-wide">Operating Expenses</div>
                <div className="flex justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-gray-700">Total Expenses</span>
                  <span className="font-semibold text-red-600">− {formatCurrency(overview?.total_expenses || 0)}</span>
                </div>

                <div className={`flex justify-between px-4 py-4 ${(overview?.net_profit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="text-lg font-bold text-gray-900">Net Profit</span>
                  <span className={`text-lg font-bold ${(overview?.net_profit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatCurrency(overview?.net_profit || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
