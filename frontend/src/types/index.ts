export interface User {
  id: number
  username: string
  email: string
  full_name: string
  phone?: string
  is_active: boolean
  avatar?: string
  role?: Role
  created_at: string
}

export interface Role {
  id: number
  name: string
  description?: string
}

export interface Category {
  id: number
  name: string
  description?: string
  icon?: string
  color?: string
  is_active: boolean
  total_products: number
  created_at: string
}

export interface Supplier {
  id: number
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  is_active: boolean
  notes?: string
  created_at: string
}

export interface ProductImage {
  id: number
  url: string
  is_primary: boolean
}

export interface Product {
  id: number
  name: string
  description?: string
  barcode?: string
  category_id?: number
  supplier_id?: number
  purchase_price: number
  sale_price: number
  stock: number
  min_stock: number
  unit: string
  is_active: boolean
  category?: { id: number; name: string }
  supplier?: { id: number; name: string }
  images: ProductImage[]
  created_at: string
}

export interface SaleItem {
  id: number
  product_id: number
  quantity: number
  sale_price: number
  purchase_price: number
  total: number
  profit: number
  product?: { id: number; name: string }
}

export interface Sale {
  id: number
  invoice_number: string
  subtotal: number
  tax: number
  discount: number
  total: number
  profit: number
  payment_method: string
  notes?: string
  sale_date: string
  items: SaleItem[]
}

export interface SaleListItem {
  id: number
  invoice_number: string
  customer_name?: string
  market_name?: string
  total: number
  profit: number
  payment_method: string
  sale_date: string
  item_count: number
}

export interface ExpenseCategory {
  id: number
  name: string
  color?: string
  icon?: string
}

export interface Expense {
  id: number
  category_id?: number
  description: string
  amount: number
  quantity?: number
  unit?: string
  vendor?: string
  payment_method: string
  expense_date: string
  notes?: string
  category?: ExpenseCategory
  created_at: string
}

export interface Setting {
  key: string
  value?: string
  description?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface DashboardStats {
  total_products: number
  low_stock_count: number
  today_sales: number
  yesterday_sales: number
  monthly_sales: number
  prev_monthly_sales: number
  total_profit: number
  prev_total_profit: number
  total_expenses: number
  prev_total_expenses: number
  net_profit: number
  prev_net_profit: number
}

export interface CartItem {
  product: Product
  quantity: number
  sale_price: number
}

export interface AuthUser {
  id: number
  username: string
  email: string
  full_name: string
  role?: Role
}
