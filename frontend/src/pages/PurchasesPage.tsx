import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Trash2, Eye, ChevronDown, PackagePlus, CheckCircle, Info, Truck } from 'lucide-react'
import { purchasesApi, productsApi, suppliersApi } from '../services/api'
import type { Product, Supplier } from '../types'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { TableLoader } from '../components/ui/Loader'
import { formatCurrency, formatShortDate } from '../utils/format'
import toast from 'react-hot-toast'

interface CartItem {
  product: Product
  quantity: number
  purchase_price: number
}

export default function PurchasesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [viewingPurchase, setViewingPurchase] = useState<any>(null)

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [purchasePrice, setPurchasePrice] = useState(0)
  const [notes, setNotes] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ['purchases', page, search],
    queryFn: () => purchasesApi.list({ page, per_page: 8, search: search || undefined }).then(r => r.data),
  })

  const { data: products } = useQuery({
    queryKey: ['products-all-restock'],
    queryFn: () => productsApi.all({ include_zero_stock: true }).then(r => r.data),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.all().then(r => r.data),
  })

  const { data: purchaseDetail } = useQuery({
    queryKey: ['purchase-detail', viewingPurchase?.id],
    queryFn: () => viewingPurchase ? purchasesApi.get(viewingPurchase.id).then(r => r.data) : null,
    enabled: !!viewingPurchase,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => purchasesApi.create(data),
    onSuccess: () => {
      toast.success('Stock restocked successfully!')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
      qc.invalidateQueries({ queryKey: ['products-all-restock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setCart([])
      setSelectedProductId('')
      setQuantity(1)
      setPurchasePrice(0)
      setSelectedSupplierId('')
      setNotes('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Restock failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchasesApi.delete(id),
    onSuccess: () => {
      toast.success('Purchase deleted, stock reversed')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-all-restock'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Delete failed'),
  })

  const selectedProduct: Product | null =
    products?.find((p: Product) => p.id === parseInt(selectedProductId)) ?? null

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedProductId(id)
    if (id) {
      const prod = products?.find((p: Product) => p.id === parseInt(id))
      if (prod) {
        setPurchasePrice(Number(prod.purchase_price))
        setQuantity(1)
      }
    } else {
      setPurchasePrice(0)
      setQuantity(1)
    }
  }

  const addToCart = () => {
    if (!selectedProduct) { toast.error('Please select a product'); return }
    if (quantity < 1) { toast.error('Quantity must be at least 1'); return }
    if (purchasePrice <= 0) { toast.error('Purchase price must be greater than 0'); return }

    setCart(prev => {
      const existing = prev.find(i => i.product.id === selectedProduct.id)
      if (existing) {
        return prev.map(i => i.product.id === selectedProduct.id
          ? { ...i, quantity: i.quantity + quantity, purchase_price: purchasePrice }
          : i
        )
      }
      return [...prev, { product: selectedProduct, quantity, purchase_price: purchasePrice }]
    })

    setSelectedProductId('')
    setQuantity(1)
    setPurchasePrice(0)
  }

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.purchase_price * i.quantity, 0)

  const completeRestock = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    createMutation.mutate({
      items: cart.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity,
        purchase_price: i.purchase_price,
      })),
      supplier_id: selectedSupplierId ? parseInt(selectedSupplierId) : undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

      {/* ── Left: Restock Form ── */}
      <div className="lg:col-span-2">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PackagePlus className="w-5 h-5 text-green-600" />
            <h2 className="text-base font-semibold text-gray-900">Restock Products</h2>
          </div>

          <div className="space-y-3">

            {/* Supplier */}
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                <Truck className="w-3 h-3 text-gray-400" /> Supplier (optional)
              </label>
              <div className="relative">
                <select
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="input-field text-sm appearance-none pr-8"
                >
                  <option value="">Select Supplier</option>
                  {suppliers?.map((s: Supplier) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Product */}
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
              {selectedProduct && (
                <p className="text-xs text-gray-400 mt-1">
                  Current stock: <span className="font-medium text-gray-600">{selectedProduct.stock} {selectedProduct.unit}</span>
                  {' · '}Last cost: <span className="font-medium text-gray-600">PKR {Number(selectedProduct.purchase_price).toLocaleString()}</span>
                </p>
              )}
            </div>

            {/* Quantity + Purchase Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input-field text-sm"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost Price (PKR)</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="input-field text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Line total preview */}
            {selectedProduct && (
              <div className="bg-green-50 rounded-lg px-3 py-2">
                <span className="text-green-700 text-xs">Total Cost: </span>
                <span className="font-semibold text-sm text-green-800">
                  PKR {(purchasePrice * quantity).toLocaleString()}
                </span>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input-field text-sm"
                placeholder="e.g. Received from PSO station"
              />
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
                Add to List
              </button>
              <button
                type="button"
                onClick={completeRestock}
                disabled={cart.length === 0 || createMutation.isPending}
                className="btn-primary flex-1 text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                {createMutation.isPending ? 'Saving...' : 'Complete Restock'}
              </button>
            </div>

            {/* Cart preview */}
            {cart.length > 0 && (
              <div className="border border-gray-100 rounded-lg overflow-hidden mt-1">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                  Items — {cart.length} product{cart.length !== 1 ? 's' : ''}
                </div>
                {cart.map(item => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-sm"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-gray-800 font-medium text-xs truncate">{item.product.name}</p>
                      <p className="text-gray-400 text-xs">
                        {item.quantity} × PKR {item.purchase_price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold text-xs text-gray-800">
                        PKR {(item.quantity * item.purchase_price).toLocaleString()}
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
                <div className="px-3 py-2.5 bg-green-50 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total Cost</span>
                  <span className="text-sm font-bold text-green-700">
                    PKR {cartTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 bg-green-50 rounded-lg p-3">
              <Info className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">
                Stock will be added immediately. Cost price will be updated for each product.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ── Right: Purchase History ── */}
      <div className="lg:col-span-3">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Restock History</h2>
          </div>

          <div className="px-5 py-3 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input-field pl-9 text-sm"
                placeholder="Search by PO number..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">PO #</th>
                  <th className="table-th">Date</th>
                  <th className="table-th hidden md:table-cell">Supplier</th>
                  <th className="table-th hidden sm:table-cell">Items</th>
                  <th className="table-th">Total Cost</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <TableLoader cols={6} />
                ) : purchasesData?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        title="No purchases yet"
                        description="Use the form on the left to record new stock arrivals."
                      />
                    </td>
                  </tr>
                ) : (
                  purchasesData?.items?.map((purchase: any) => (
                    <tr key={purchase.id} className="hover:bg-gray-50/50">
                      <td className="table-td font-medium text-green-600 text-xs">{purchase.invoice_number}</td>
                      <td className="table-td text-gray-500 text-xs">{formatShortDate(purchase.purchase_date)}</td>
                      <td className="table-td hidden md:table-cell text-xs text-gray-600">
                        {purchase.supplier?.name || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="table-td hidden sm:table-cell text-xs text-gray-600">{purchase.item_count}</td>
                      <td className="table-td font-semibold text-sm text-gray-800">
                        PKR {Number(purchase.total_cost).toLocaleString()}
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingPurchase(purchase)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this purchase? Stock will be reversed.')) {
                                deleteMutation.mutate(purchase.id)
                              }
                            }}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                            title="Delete purchase"
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

          {purchasesData && (
            <div className="px-5 py-4 border-t border-gray-100">
              <Pagination {...purchasesData} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>

      {/* ── Purchase Detail Modal ── */}
      <Modal
        isOpen={!!viewingPurchase}
        onClose={() => setViewingPurchase(null)}
        title={`Purchase Order: ${viewingPurchase?.invoice_number}`}
        size="lg"
      >
        {purchaseDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Date: </span>
                <span className="font-medium">{formatShortDate(purchaseDetail.purchase_date)}</span>
              </div>
              {purchaseDetail.supplier && (
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500">Supplier: </span>
                  <span className="font-medium">{purchaseDetail.supplier.name}</span>
                </div>
              )}
              {purchaseDetail.notes && (
                <div className="col-span-2">
                  <span className="text-gray-500">Notes: </span>
                  <span className="font-medium">{purchaseDetail.notes}</span>
                </div>
              )}
            </div>

            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Product</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Qty Added</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Cost/Unit</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {purchaseDetail.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-800">{item.product?.name}</td>
                      <td className="px-3 py-2 text-right text-gray-600">+{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        PKR {Number(item.purchase_price).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        PKR {Number(item.total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-100">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-sm">Total Cost</td>
                    <td className="px-3 py-2 text-right font-bold text-green-700">
                      PKR {Number(purchaseDetail.total_cost).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}
      </Modal>
    </div>
  )
}
