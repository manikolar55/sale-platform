import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts'
import { ChevronDown, Download } from 'lucide-react'
import { reportsApi } from '../services/api'
import { formatCurrency } from '../utils/format'
import Loader from '../components/ui/Loader'

const TABS = ['Overview', 'Sales Report', 'Purchase Report', 'Stock Report', 'Expense Report', 'Profit & Loss']

function StatMini({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 font-medium">{title}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [period, setPeriod] = useState('daily')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
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

  if (overviewLoading) return <Loader />

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="card">
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
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input-field text-sm w-40"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input-field text-sm w-40"
            />
          </div>
          <button className="btn-secondary ml-auto gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>

        {/* Stats */}
        <div className="p-5">
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            <StatMini
              title="Total Sales"
              value={formatCurrency(overview?.total_sales || 0)}
              sub="selected period"
            />
            <StatMini
              title="Total Purchases"
              value={formatCurrency(overview?.total_purchases || 0)}
              sub="cost of goods sold"
            />
            <StatMini
              title="Gross Profit"
              value={formatCurrency(overview?.gross_profit || 0)}
              sub="sales − purchases"
            />
            <StatMini
              title="Total Expenses"
              value={formatCurrency(overview?.total_expenses || 0)}
              sub="selected period"
            />
            <StatMini
              title="Net Profit"
              value={formatCurrency(overview?.net_profit || 0)}
              sub="gross profit − expenses"
            />
          </div>

          {/* Sales Chart */}
          <div className="card p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Sales Overview</h3>
              <div className="relative">
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {chartLoading ? (
              <Loader />
            ) : chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2} dot={false} name="Sales" />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data available for selected period</div>
            )}
          </div>

          {/* Bottom charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Products */}
            {topProducts && topProducts.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Products by Sales</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topProducts.slice(0, 6)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Bar dataKey="sales" fill="#2563EB" radius={[4, 4, 0, 0]} name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Expenses by Category */}
            {expensesByCategory && expensesByCategory.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Expenses by Category</h3>
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
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
      </div>
    </div>
  )
}
