import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Trash2, Eye, ChevronDown, ShoppingCart, CheckCircle, Info, MapPin, User2 } from 'lucide-react'
import { salesApi, productsApi } from '../services/api'
import type { Product, SaleListItem, CartItem } from '../types'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { TableLoader } from '../components/ui/Loader'
import { formatCurrency, formatShortDate } from '../utils/format'
import toast from 'react-hot-toast'

export default function SalesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [viewingSale, setViewingSale] = useState<any>(null)

  // New Sale form state
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0])
  const [customerName, setCustomerName] = useState('')
  const [marketName, setMarketName] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [salePrice, setSalePrice] = useState(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('Cash')

  // Queries
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', page, search, paymentFilter],
    queryFn: () => salesApi.list({
      page, per_page: 8,
      search: search || undefined,
      payment_method: paymentFilter || undefined,
    }).then(r => r.data),
  })

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.all().then(r => r.data),
  })

  const { data: saleDetail } = useQuery({
    queryKey: ['sale-detail', viewingSale?.id],
    queryFn: () => viewingSale ? salesApi.get(viewingSale.id).then(r => r.data) : null,
    enabled: !!viewingSale,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => salesApi.create(data),
    onSuccess: () => {
      toast.success('Sale completed successfully!')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setCart([])
      setSelectedProductId('')
      setQuantity(1)
      setSalePrice(0)
      setCustomerName('')
      setMarketName('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Sale failed'),
  })

  // Derive the selected product object from the dropdown value
  const selectedProduct: Product | null =
    products?.find((p: Product) => p.id === parseInt(selectedProductId)) ?? null

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedProductId(id)
    if (id) {
      const prod = products?.find((p: Product) => p.id === parseInt(id))
      if (prod) {
        setSalePrice(Number(prod.sale_price))
        setQuantity(1)
      }
    } else {
      setSalePrice(0)
      setQuantity(1)
    }
  }

  const addToCart = () => {
    if (!selectedProduct) { toast.error('Please select a product'); return }
    if (quantity < 1) { toast.error('Quantity must be at least 1'); return }
    if (salePrice <= 0) { toast.error('Sale price must be greater than 0'); return }
    if (quantity > selectedProduct.stock) {
      toast.error(`Only ${selectedProduct.stock} units in stock for ${selectedProduct.name}`)
      return
    }

    setCart(prev => {
      const existing = prev.find(i => i.product.id === selectedProduct.id)
      if (existing) {
        const newQty = existing.quantity + quantity
        if (newQty > selectedProduct.stock) {
          toast.error(`Cannot add more than ${selectedProduct.stock} units`)
          return prev
        }
        return prev.map(i => i.product.id === selectedProduct.id
          ? { ...i, quantity: newQty, sale_price: salePrice }
          : i
        )
      }
      return [...prev, { product: selectedProduct, quantity, sale_price: salePrice }]
    })

    // Reset form
    setSelectedProductId('')
    setQuantity(1)
    setSalePrice(0)
  }

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.sale_price * i.quantity, 0)

  const completeSale = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    createMutation.mutate({
      items: cart.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity,
        sale_price: i.sale_price,
      })),
      customer_name: customerName.trim() || undefined,
      market_name: marketName.trim() || undefined,
      payment_method: paymentMethod,
      discount: 0,
      tax: 0,
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

      {/* ── Left: New Sale Form ── */}
      <div className="lg:col-span-2">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">New Sale</h2>
          </div>

          <div className="space-y-3">

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={saleDate}
                onChange={e => setSaleDate(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            {/* Market + Customer */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                  <MapPin className="w-3 h-3 text-blue-500" /> Market
                </label>
                <input
                  value={marketName}
                  onChange={e => setMarketName(e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g. Saddar Market"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                  <User2 className="w-3 h-3 text-gray-400" /> Customer
                </label>
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g. Ahmed"
                />
              </div>
            </div>

            {/* Product dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
              <div className="relative">
                <select
                  value={selectedProductId}
                  onChange={handleProductChange}
                  className="input-field text-sm appearance-none pr-8"
                >
                  <option value="">Select Product</option>
                  {products?.map((p: Product) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Stock: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {/* Show stock info when a product is selected */}
              {selectedProduct && (
                <p className="text-xs text-gray-400 mt-1">
                  Available stock: <span className="font-medium text-gray-600">{selectedProduct.stock} {selectedProduct.unit}</span>
                  {' · '}Purchase price: <span className="font-medium text-gray-600">PKR {Number(selectedProduct.purchase_price).toLocaleString()}</span>
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field text-sm"
                min="1"
                max={selectedProduct?.stock || undefined}
              />
            </div>

            {/* Sale Price */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sale Price (PKR)</label>
              <input
                type="number"
                value={salePrice}
                onChange={e => setSalePrice(parseFloat(e.target.value) || 0)}
                className="input-field text-sm"
                min="0"
                step="0.01"
              />
            </div>

            {/* Totals row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-500 text-xs block">Total Amount (PKR)</span>
                <span className="font-semibold text-sm">{(salePrice * quantity).toLocaleString()}</span>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-500 text-xs block">Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="text-sm font-medium bg-transparent border-0 outline-none w-full mt-0.5"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Card</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={addToCart}
                disabled={!selectedProductId}
                className="btn-secondary flex-1 text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add to Cart
              </button>
              <button
                type="button"
                onClick={completeSale}
                disabled={cart.length === 0 || createMutation.isPending}
                className="btn-primary flex-1 text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                {createMutation.isPending ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>

            {/* Cart preview */}
            {cart.length > 0 && (
              <div className="border border-gray-100 rounded-lg overflow-hidden mt-1">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                  Cart — {cart.length} item{cart.length !== 1 ? 's' : ''}
                </div>
                {cart.map(item => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-sm"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-gray-800 font-medium text-xs truncate">{item.product.name}</p>
                      <p className="text-gray-400 text-xs">
                        {item.quantity} × PKR {item.sale_price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold text-xs text-gray-800">
                        PKR {(item.quantity * item.sale_price).toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="px-3 py-2.5 bg-blue-50 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-sm font-bold text-blue-700">
                    PKR {cartTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Info note */}
            <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Stock will be automatically deducted after completing sale
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ── Right: Sales History ── */}
      <div className="lg:col-span-3">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Sales History</h2>
          </div>

          {/* Filters */}
          <div className="px-5 py-3 flex flex-col sm:flex-row gap-3 border-b border-gray-50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input-field pl-9 text-sm"
                placeholder="Search sales..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div className="relative">
              <select
                value={paymentFilter}
                onChange={e => { setPaymentFilter(e.target.value); setPage(1) }}
                className="input-field appearance-none pr-8 text-sm w-36"
              >
                <option value="">All Sales</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Invoice #</th>
                  <th className="table-th">Date</th>
                  <th className="table-th hidden md:table-cell">Customer / Market</th>
                  <th className="table-th hidden sm:table-cell">Items</th>
                  <th className="table-th">Total (PKR)</th>
                  <th className="table-th hidden sm:table-cell">Profit (PKR)</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <TableLoader cols={7} />
                ) : salesData?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState title="No sales found" description="Complete your first sale using the form on the left." />
                    </td>
                  </tr>
                ) : (
                  salesData?.items?.map((sale: SaleListItem) => (
                    <tr key={sale.id} className="hover:bg-gray-50/50">
                      <td className="table-td font-medium text-blue-600 text-xs">{sale.invoice_number}</td>
                      <td className="table-td text-gray-500 text-xs">{formatShortDate(sale.sale_date)}</td>
                      <td className="table-td hidden md:table-cell">
                        <div className="space-y-0.5">
                          {sale.market_name && (
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-800">
                              <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              {sale.market_name}
                            </div>
                          )}
                          {sale.customer_name && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User2 className="w-3 h-3 flex-shrink-0" />
                              {sale.customer_name}
                            </div>
                          )}
                          {!sale.market_name && !sale.customer_name && (
                            <span className="text-xs text-gray-400">Walk-in</span>
                          )}
                        </div>
                      </td>
                      <td className="table-td hidden sm:table-cell text-xs text-gray-600">{sale.item_count}</td>
                      <td className="table-td font-semibold text-sm">PKR {Number(sale.total).toLocaleString()}</td>
                      <td className="table-td hidden sm:table-cell text-green-600 font-medium text-sm">
                        PKR {Number(sale.profit).toLocaleString()}
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => setViewingSale(sale)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="View invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
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
      </div>

      {/* ── Sale Detail Modal ── */}
      <Modal
        isOpen={!!viewingSale}
        onClose={() => setViewingSale(null)}
        title={`Invoice: ${viewingSale?.invoice_number}`}
        size="lg"
      >
        {saleDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Date: </span>
                <span className="font-medium">{formatShortDate(saleDetail.sale_date)}</span>
              </div>
              <div>
                <span className="text-gray-500">Payment: </span>
                <span className="font-medium">{saleDetail.payment_method}</span>
              </div>
              {saleDetail.market_name && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-gray-500">Market: </span>
                  <span className="font-medium">{saleDetail.market_name}</span>
                </div>
              )}
              {saleDetail.customer_name && (
                <div className="flex items-center gap-1.5">
                  <User2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500">Customer: </span>
                  <span className="font-medium">{saleDetail.customer_name}</span>
                </div>
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
                      <td className="px-3 py-2 text-right text-gray-600">
                        PKR {Number(item.sale_price).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        PKR {Number(item.total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-100">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-sm">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-700">
                      PKR {Number(saleDetail.total).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-sm text-gray-500">Profit</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-600">
                      PKR {Number(saleDetail.profit).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
