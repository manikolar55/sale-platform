import { useQuery } from '@tanstack/react-query'
import {
  Package, TrendingUp, ShoppingCart, DollarSign,
  Receipt, BarChart3, AlertTriangle, MapPin, User2, Wallet
} from 'lucide-react'
import { dashboardApi, settingsApi } from '../services/api'
import { formatCurrency, formatShortDate } from '../utils/format'
import StatCard from '../components/ui/StatCard'
import Loader from '../components/ui/Loader'

function pct(current: number, previous: number): { change: string; changeType: 'up' | 'down' } | {} {
  if (!previous) return {}
  const diff = ((current - previous) / previous) * 100
  return {
    change: Math.abs(diff).toFixed(1) + '%',
    changeType: diff >= 0 ? 'up' : 'down',
  }
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then(r => r.data),
  })

  const { data: recentSales } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => dashboardApi.recentSales(8).then(r => r.data),
  })

  const { data: lowStockProducts } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => dashboardApi.lowStock(10).then(r => r.data),
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then(r => r.data),
  })

  const monthlyBudget = (() => {
    const s = settingsData?.find((x: { key: string }) => x.key === 'monthly_budget')
    return s ? parseFloat(s.value) : 0
  })()

  const monthlyExpenses = stats?.total_expenses || 0
  const budgetPct = monthlyBudget > 0 ? Math.min((monthlyExpenses / monthlyBudget) * 100, 100) : 0
  const budgetOver = monthlyBudget > 0 && monthlyExpenses > monthlyBudget

  if (isLoading) return <Loader />

  return (
    <div className="space-y-6">

      {/* ── Low Stock Alert Banner ── */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-orange-800">
                  Low Stock Alert — {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} running low
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.map((p: any) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-orange-200 text-xs font-medium text-orange-800"
                  >
                    <Package className="w-3 h-3" />
                    {p.name}
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">
                      {p.stock} {p.unit}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top row stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={String(stats?.total_products || 0)}
          icon={<Package className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          linkLabel="View all products"
          link="/products"
        />
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats?.today_sales || 0)}
          icon={<ShoppingCart className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-50"
          {...pct(stats?.today_sales || 0, stats?.yesterday_sales || 0)}
          changeLabel="from yesterday"
        />
        <StatCard
          title="Monthly Sales"
          value={formatCurrency(stats?.monthly_sales || 0)}
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
          {...pct(stats?.monthly_sales || 0, stats?.prev_monthly_sales || 0)}
          changeLabel="from last month"
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(stats?.total_profit || 0)}
          icon={<DollarSign className="w-5 h-5 text-orange-600" />}
          iconBg="bg-orange-50"
          {...pct(stats?.total_profit || 0, stats?.prev_total_profit || 0)}
          changeLabel="from last month"
        />
      </div>

      {/* ── Second row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Expenses (This Month)"
          value={formatCurrency(stats?.total_expenses || 0)}
          icon={<Receipt className="w-5 h-5 text-red-600" />}
          iconBg="bg-red-50"
          {...pct(stats?.total_expenses || 0, stats?.prev_total_expenses || 0)}
          changeLabel="from last month"
        />
        <StatCard
          title="Net Profit (This Month)"
          value={formatCurrency(stats?.net_profit || 0)}
          icon={<BarChart3 className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          {...pct(stats?.net_profit || 0, stats?.prev_net_profit || 0)}
          changeLabel="from last month"
        />
      </div>

      {/* ── Monthly Budget Progress ── */}
      {monthlyBudget > 0 && (
        <div className={`card p-5 border ${budgetOver ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${budgetOver ? 'bg-red-100' : 'bg-blue-50'}`}>
                <Wallet className={`w-4 h-4 ${budgetOver ? 'text-red-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Monthly Expense Budget</p>
                <p className="text-xs text-gray-400">
                  {formatCurrency(monthlyExpenses)} spent of {formatCurrency(monthlyBudget)}
                </p>
              </div>
            </div>
            <span className={`text-sm font-bold ${budgetOver ? 'text-red-600' : budgetPct >= 80 ? 'text-orange-500' : 'text-green-600'}`}>
              {budgetPct.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${budgetOver ? 'bg-red-500' : budgetPct >= 80 ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          {budgetOver && (
            <p className="text-xs text-red-600 font-medium mt-2">
              Over budget by {formatCurrency(monthlyExpenses - monthlyBudget)}
            </p>
          )}
          {!budgetOver && monthlyBudget > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {formatCurrency(monthlyBudget - monthlyExpenses)} remaining this month
            </p>
          )}
        </div>
      )}

      {/* ── Recent Sales by Market ── */}
      {recentSales && recentSales.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent Sales</h2>
            <span className="text-xs text-gray-400">{recentSales.length} latest transactions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Invoice</th>
                  <th className="table-th hidden sm:table-cell">Date</th>
                  <th className="table-th">Customer / Market</th>
                  <th className="table-th hidden md:table-cell">Items</th>
                  <th className="table-th">Total</th>
                  <th className="table-th hidden sm:table-cell">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-medium text-blue-600 text-xs">
                      {sale.invoice_number}
                    </td>
                    <td className="table-td text-gray-500 text-xs hidden sm:table-cell">
                      {formatShortDate(sale.sale_date)}
                    </td>
                    <td className="table-td">
                      <div className="space-y-0.5">
                        {sale.market_name ? (
                          <div className="flex items-center gap-1 text-xs font-medium text-gray-800">
                            <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            {sale.market_name}
                          </div>
                        ) : null}
                        {sale.customer_name ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User2 className="w-3 h-3 flex-shrink-0" />
                            {sale.customer_name}
                          </div>
                        ) : null}
                        {!sale.market_name && !sale.customer_name && (
                          <span className="text-xs text-gray-400">Walk-in customer</span>
                        )}
                      </div>
                    </td>
                    <td className="table-td hidden md:table-cell text-gray-500 text-xs">
                      {sale.item_count} item{sale.item_count !== 1 ? 's' : ''}
                    </td>
                    <td className="table-td font-semibold text-sm">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="table-td text-green-600 font-medium text-sm hidden sm:table-cell">
                      {formatCurrency(sale.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Low Stock Detail Table ── */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-orange-100 bg-orange-50/50 rounded-t-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-orange-800">
              Products Needing Restock (stock &lt; 10)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th hidden sm:table-cell">Category</th>
                  <th className="table-th">Current Stock</th>
                  <th className="table-th hidden sm:table-cell">Min Stock</th>
                  <th className="table-th">Sale Price</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lowStockProducts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                      </div>
                    </td>
                    <td className="table-td hidden sm:table-cell text-gray-500 text-sm">
                      {p.category || '-'}
                    </td>
                    <td className="table-td">
                      <span className={`font-bold text-sm ${p.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="table-td hidden sm:table-cell text-gray-500 text-sm">
                      {p.min_stock} {p.unit}
                    </td>
                    <td className="table-td text-sm">PKR {p.sale_price.toLocaleString()}</td>
                    <td className="table-td">
                      {p.stock === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                          Low Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
