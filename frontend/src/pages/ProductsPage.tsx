import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, ChevronDown, Package } from 'lucide-react'
import { productsApi, categoriesApi, suppliersApi } from '../services/api'
import type { Product, Category, Supplier } from '../types'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { TableLoader } from '../components/ui/Loader'
import { formatCurrency } from '../utils/format'
import toast from 'react-hot-toast'

interface ProductFormProps {
  initial?: Partial<Product>
  categories: Category[]
  suppliers: Supplier[]
  onSubmit: (data: any) => void
  loading?: boolean
  onClose: () => void
}

function ProductForm({ initial, categories, suppliers, onSubmit, loading, onClose }: ProductFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    barcode: initial?.barcode || '',
    category_id: initial?.category_id?.toString() || '',
    supplier_id: initial?.supplier_id?.toString() || '',
    purchase_price: initial?.purchase_price?.toString() || '',
    sale_price: initial?.sale_price?.toString() || '',
    stock: initial?.stock?.toString() || '0',
    min_stock: initial?.min_stock?.toString() || '5',
    unit: initial?.unit || 'pcs',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Product name required'); return }
    if (!form.purchase_price || !form.sale_price) { toast.error('Prices required'); return }
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      category_id: form.category_id ? parseInt(form.category_id) : undefined,
      supplier_id: form.supplier_id ? parseInt(form.supplier_id) : undefined,
      purchase_price: parseFloat(form.purchase_price),
      sale_price: parseFloat(form.sale_price),
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      unit: form.unit,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
          <input value={form.name} onChange={set('name')} className="input-field" placeholder="e.g. Gold Leaf (20s)" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
          <select value={form.category_id} onChange={set('category_id')} className="input-field">
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplier</label>
          <select value={form.supplier_id} onChange={set('supplier_id')} className="input-field">
            <option value="">Select Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Price (PKR) *</label>
          <input type="number" value={form.purchase_price} onChange={set('purchase_price')} className="input-field" placeholder="0.00" min="0" step="0.01" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sale Price (PKR) *</label>
          <input type="number" value={form.sale_price} onChange={set('sale_price')} className="input-field" placeholder="0.00" min="0" step="0.01" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock</label>
          <input type="number" value={form.stock} onChange={set('stock')} className="input-field" placeholder="0" min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Stock</label>
          <input type="number" value={form.min_stock} onChange={set('min_stock')} className="input-field" placeholder="5" min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
          <select value={form.unit} onChange={set('unit')} className="input-field">
            <option value="pcs">pcs</option>
            <option value="pkt">pkt</option>
            <option value="btl">btl</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="ltr">ltr</option>
            <option value="box">box</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Barcode</label>
          <input value={form.barcode} onChange={set('barcode')} className="input-field" placeholder="Optional" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea value={form.description} onChange={set('description')} className="input-field" rows={2} placeholder="Optional" />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Product'}</button>
      </div>
    </form>
  )
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryFilter],
    queryFn: () => productsApi.list({
      page, per_page: 10,
      search: search || undefined,
      category_id: categoryFilter || undefined,
    }).then(r => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoriesApi.all().then(r => r.data),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.all().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => productsApi.create(data),
    onSuccess: () => { toast.success('Product created'); qc.invalidateQueries({ queryKey: ['products'] }); setShowModal(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => productsApi.update(id, data),
    onSuccess: () => { toast.success('Product updated'); qc.invalidateQueries({ queryKey: ['products'] }); setEditingProduct(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries({ queryKey: ['products'] }); setDeletingProduct(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-5">
      <div className="card">
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-9 w-60"
              placeholder="Search products..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              className="input-field pr-8 appearance-none w-44"
            >
              <option value="">All Categories</option>
              {categories?.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary ml-auto">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">ID</th>
                <th className="table-th">Product Name</th>
                <th className="table-th hidden md:table-cell">Category</th>
                <th className="table-th hidden lg:table-cell">Supplier</th>
                <th className="table-th">Purchase Price</th>
                <th className="table-th">Sale Price</th>
                <th className="table-th">Stock</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableLoader cols={8} />
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No products found" /></td></tr>
              ) : data?.items?.map((product: Product) => (
                <tr key={product.id} className="hover:bg-gray-50/50">
                  <td className="table-td text-gray-500">{product.id}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {product.images?.[0]
                          ? <img src={product.images[0].url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          : <Package className="w-4 h-4 text-gray-400" />
                        }
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{product.name}</span>
                    </div>
                  </td>
                  <td className="table-td hidden md:table-cell text-gray-600">{product.category?.name || '-'}</td>
                  <td className="table-td hidden lg:table-cell text-gray-600">{product.supplier?.name || '-'}</td>
                  <td className="table-td">PKR {Number(product.purchase_price).toLocaleString()}</td>
                  <td className="table-td font-medium">PKR {Number(product.sale_price).toLocaleString()}</td>
                  <td className="table-td">
                    <span className={`font-semibold ${product.stock <= product.min_stock ? 'text-red-600' : 'text-gray-700'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingProduct(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletingProduct(product)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination {...data} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Product" size="xl">
        <ProductForm
          categories={categories || []}
          suppliers={suppliers || []}
          onSubmit={data => createMutation.mutate(data)}
          loading={createMutation.isPending}
          onClose={() => setShowModal(false)}
        />
      </Modal>

      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title="Edit Product" size="xl">
        {editingProduct && (
          <ProductForm
            initial={editingProduct}
            categories={categories || []}
            suppliers={suppliers || []}
            onSubmit={data => updateMutation.mutate({ id: editingProduct.id, data })}
            loading={updateMutation.isPending}
            onClose={() => setEditingProduct(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
        message={`Delete "${deletingProduct?.name}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
