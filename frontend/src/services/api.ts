import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken })
          localStorage.setItem('access_token', res.data.access_token)
          localStorage.setItem('refresh_token', res.data.refresh_token)
          error.config.headers.Authorization = `Bearer ${res.data.access_token}`
          return api.request(error.config)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/change-password', { current_password, new_password }),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
}

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  recentSales: (limit = 8) => api.get(`/dashboard/recent-sales?limit=${limit}`),
  lowStock: (threshold = 10) => api.get(`/dashboard/low-stock?threshold=${threshold}`),
}

// Categories
export const categoriesApi = {
  list: (params?: Record<string, unknown>) => api.get('/categories', { params }),
  all: () => api.get('/categories/all'),
  get: (id: number) => api.get(`/categories/${id}`),
  create: (data: unknown) => api.post('/categories', data),
  update: (id: number, data: unknown) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}

// Suppliers
export const suppliersApi = {
  list: (params?: Record<string, unknown>) => api.get('/suppliers', { params }),
  all: () => api.get('/suppliers/all'),
  stats: () => api.get('/suppliers/stats'),
  get: (id: number) => api.get(`/suppliers/${id}`),
  create: (data: unknown) => api.post('/suppliers', data),
  update: (id: number, data: unknown) => api.put(`/suppliers/${id}`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
}

// Products
export const productsApi = {
  list: (params?: Record<string, unknown>) => api.get('/products', { params }),
  all: (params?: Record<string, unknown>) => api.get('/products/all', { params }),
  stats: () => api.get('/products/stats'),
  get: (id: number) => api.get(`/products/${id}`),
  create: (data: unknown) => api.post('/products', data),
  update: (id: number, data: unknown) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  uploadImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/products/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Sales
export const salesApi = {
  list: (params?: Record<string, unknown>) => api.get('/sales', { params }),
  stats: () => api.get('/sales/stats'),
  get: (id: number) => api.get(`/sales/${id}`),
  create: (data: unknown) => api.post('/sales', data),
  delete: (id: number) => api.delete(`/sales/${id}`),
}

// Expenses
export const expensesApi = {
  list: (params?: Record<string, unknown>) => api.get('/expenses', { params }),
  stats: () => api.get('/expenses/stats'),
  categories: () => api.get('/expenses/categories'),
  createCategory: (data: unknown) => api.post('/expenses/categories', data),
  get: (id: number) => api.get(`/expenses/${id}`),
  create: (data: unknown) => api.post('/expenses', data),
  update: (id: number, data: unknown) => api.put(`/expenses/${id}`, data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
}

// Reports
export const reportsApi = {
  overview: (params?: Record<string, unknown>) => api.get('/reports/overview', { params }),
  salesChart: (params?: Record<string, unknown>) => api.get('/reports/sales-chart', { params }),
  topProducts: (params?: Record<string, unknown>) => api.get('/reports/products/top', { params }),
  expensesByCategory: (params?: Record<string, unknown>) => api.get('/reports/expenses/by-category', { params }),
}

// Settings
export const settingsApi = {
  getAll: () => api.get('/settings'),
  get: (key: string) => api.get(`/settings/${key}`),
  bulkUpdate: (settings: Record<string, unknown>) => api.put('/settings/bulk', { settings }),
  systemInfo: () => api.get('/settings/system/info'),
}

// Backup
export const backupApi = {
  export: () => api.get('/backup/export', { responseType: 'blob' }),
  import: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/backup/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// Customers
export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  all: () => api.get('/customers/all'),
  get: (id: number) => api.get(`/customers/${id}`),
  create: (data: unknown) => api.post('/customers', data),
  update: (id: number, data: unknown) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  addPayment: (id: number, data: unknown) => api.post(`/customers/${id}/payments`, data),
}

// Purchases (Restock)
export const purchasesApi = {
  list: (params?: Record<string, unknown>) => api.get('/purchases', { params }),
  get: (id: number) => api.get(`/purchases/${id}`),
  create: (data: unknown) => api.post('/purchases', data),
  delete: (id: number) => api.delete(`/purchases/${id}`),
}

// Users
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  roles: () => api.get('/users/roles'),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
}
