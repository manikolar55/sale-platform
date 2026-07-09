import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, usersApi, backupApi } from '../services/api'
import { Save, Database, RefreshCw, Plus, Pencil, Trash2, Shield, Download, Upload } from 'lucide-react'
import { TableLoader } from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { StatusBadge } from '../components/ui/Badge'
import type { User } from '../types'
import toast from 'react-hot-toast'

const TABS = ['General', 'Store Settings', 'User Management', 'Backup & Restore', 'Notifications', 'System']

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}

function GeneralTab({ settings }: { settings: Record<string, string> }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    store_name: settings.store_name || '',
    store_address: settings.store_address || '',
    store_phone: settings.store_phone || '',
    store_email: settings.store_email || '',
    currency: settings.currency || 'PKR - Pakistani Rupee',
    time_format: settings.time_format || '12 Hour (AM/PM)',
    date_format: settings.date_format || '24 May, 2024',
    language: settings.language || 'English',
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => settingsApi.bulkUpdate(data),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Failed to save settings'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">General Settings</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Store Name</label>
            <input value={form.store_name} onChange={set('store_name')} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Store Address</label>
            <textarea value={form.store_address} onChange={set('store_address')} className="input-field" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Phone Number</label>
              <input value={form.store_phone} onChange={set('store_phone')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Email Address</label>
              <input type="email" value={form.store_email} onChange={set('store_email')} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Currency</label>
              <select value={form.currency} onChange={set('currency')} className="input-field">
                <option>PKR - Pakistani Rupee</option>
                <option>USD - US Dollar</option>
                <option>EUR - Euro</option>
                <option>GBP - British Pound</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Time Format</label>
              <select value={form.time_format} onChange={set('time_format')} className="input-field">
                <option>12 Hour (AM/PM)</option>
                <option>24 Hour</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Date Format</label>
              <select value={form.date_format} onChange={set('date_format')} className="input-field">
                <option>24 May, 2024</option>
                <option>2024-05-24</option>
                <option>05/24/2024</option>
                <option>24/05/2024</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Language</label>
              <select value={form.language} onChange={set('language')} className="input-field">
                <option>English</option>
                <option>Urdu</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Store Settings</h3>
          <StoreSideSettings settings={settings} />
        </div>
      </div>

      <div>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          <Save className="w-4 h-4" />
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function StoreSideSettings({ settings }: { settings: Record<string, string> }) {
  const qc = useQueryClient()
  const [lowStockAlert, setLowStockAlert] = useState(settings.low_stock_alert !== 'false')
  const [autoDeductStock, setAutoDeductStock] = useState(settings.auto_deduct_stock !== 'false')
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoice_prefix || 'INV')
  const [defaultTax, setDefaultTax] = useState(settings.default_tax || '0')

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => settingsApi.bulkUpdate(data),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['settings'] }) },
  })

  const handleSave = () => {
    mutation.mutate({
      low_stock_alert: String(lowStockAlert),
      auto_deduct_stock: String(autoDeductStock),
      invoice_prefix: invoicePrefix,
      default_tax: defaultTax,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Shield className="w-4 h-4 text-yellow-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">Low Stock Alert</div>
            <div className="text-xs text-gray-500">Get notified when product stock is low</div>
          </div>
        </div>
        <Toggle checked={lowStockAlert} onChange={setLowStockAlert} />
      </div>

      <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">Auto Deduct Stock</div>
            <div className="text-xs text-gray-500">Automatically deduct stock on sale</div>
          </div>
        </div>
        <Toggle checked={autoDeductStock} onChange={setAutoDeductStock} />
      </div>

      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Invoice Prefix</label>
          <div className="flex items-center gap-2">
            <input
              value={invoicePrefix}
              onChange={e => setInvoicePrefix(e.target.value)}
              className="input-field flex-1"
              placeholder="INV"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Used for invoice numbers</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Default Sale Tax (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={defaultTax}
              onChange={e => setDefaultTax(e.target.value)}
              className="input-field flex-1"
              placeholder="0"
              min="0"
              max="100"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
      </div>

      {/* Backup & Restore inline */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <Database className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">Backup Data</div>
              <div className="text-xs text-gray-500">Create a backup of your all data</div>
            </div>
          </div>
          <button className="btn-secondary text-xs py-1.5 px-3">Create Backup</button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">Restore Data</div>
              <div className="text-xs text-gray-500">Restore your data from backup file</div>
            </div>
          </div>
          <button className="btn-secondary text-xs py-1.5 px-3">Restore</button>
        </div>
      </div>

      <button onClick={handleSave} disabled={mutation.isPending} className="btn-primary w-full">
        <Save className="w-4 h-4" />
        {mutation.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}

function UserManagementTab() {
  const qc = useQueryClient()
  const [page] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [newUserForm, setNewUserForm] = useState({ username: '', email: '', full_name: '', password: '', role_id: 1 })

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.list({ page, per_page: 10 }).then(r => r.data),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.roles().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => usersApi.create(d),
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['users'] }); setDeletingUser(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(newUserForm)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Username</th>
              <th className="table-th hidden md:table-cell">Email</th>
              <th className="table-th">Role</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? <TableLoader cols={6} /> : usersData?.items?.map((u: User) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="table-td font-medium">{u.full_name}</td>
                <td className="table-td text-gray-600">@{u.username}</td>
                <td className="table-td hidden md:table-cell text-gray-500 text-xs">{u.email}</td>
                <td className="table-td">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{u.role?.name}</span>
                </td>
                <td className="table-td"><StatusBadge active={u.is_active} /></td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button onClick={() => setDeletingUser(u)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add User">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input value={newUserForm.full_name} onChange={e => setNewUserForm(f => ({ ...f, full_name: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input value={newUserForm.username} onChange={e => setNewUserForm(f => ({ ...f, username: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={newUserForm.email} onChange={e => setNewUserForm(f => ({ ...f, email: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input type="password" value={newUserForm.password} onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select value={newUserForm.role_id} onChange={e => setNewUserForm(f => ({ ...f, role_id: parseInt(e.target.value) }))} className="input-field">
              {roles?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">{createMutation.isPending ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
        message={`Delete user "${deletingUser?.full_name}"?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

function SystemTab() {
  const { data: info } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => settingsApi.systemInfo().then(r => r.data),
  })

  const items = [
    { label: 'Software Version', value: info?.software_version || 'v1.0.0', icon: '🖥️' },
    { label: 'Today\'s Date', value: info?.last_updated || '—', icon: '📅' },
    { label: 'Database Size', value: info?.database_size || '—', icon: '🗄️' },
    { label: 'License Status', value: info?.license_status || 'Active', icon: '✅' },
    { label: 'Total Products', value: info?.total_products ?? '—', icon: '📦' },
    { label: 'Total Sales', value: info?.total_sales ?? '—', icon: '🧾' },
    { label: 'Total Expenses', value: info?.total_expenses ?? '—', icon: '💸' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
          <div className="text-2xl mb-2">{item.icon}</div>
          <div className="text-xs text-gray-500">{item.label}</div>
          <div className="text-sm font-semibold text-gray-800 mt-0.5">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

function BackupTab() {
  const [restoring, setRestoring] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleExport = async () => {
    setDownloading(true)
    try {
      const res = await backupApi.export()
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded successfully')
    } catch {
      toast.error('Failed to create backup')
    } finally {
      setDownloading(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    try {
      await backupApi.import(file)
      toast.success('Data restored successfully — refresh the page')
    } catch {
      toast.error('Failed to restore backup')
    } finally {
      setRestoring(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      {/* Backup */}
      <div className="p-5 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Download className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-gray-800">Download Backup</div>
            <div className="text-sm text-gray-500 mt-0.5">
              Exports all products, sales, expenses & settings as a JSON file
            </div>
          </div>
        </div>
        <button onClick={handleExport} disabled={downloading} className="btn-primary whitespace-nowrap">
          {downloading ? 'Downloading...' : 'Download Backup'}
        </button>
      </div>

      {/* Restore */}
      <div className="p-5 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Upload className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <div className="font-medium text-gray-800">Restore from Backup</div>
            <div className="text-sm text-gray-500 mt-0.5">
              Upload a backup JSON file to restore your data
            </div>
          </div>
        </div>
        <label className={`btn-secondary whitespace-nowrap cursor-pointer ${restoring ? 'opacity-50 pointer-events-none' : ''}`}>
          {restoring ? 'Restoring...' : 'Choose File'}
          <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={restoring} />
        </label>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <strong>Tip:</strong> Download a backup before making big changes. If something goes wrong,
        just restore from the backup file to get all your data back instantly.
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('General')

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then(r => r.data),
  })

  const settings: Record<string, string> = {}
  if (settingsData) {
    settingsData.forEach((s: { key: string; value: string }) => {
      settings[s.key] = s.value
    })
  }

  return (
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

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'General' && <GeneralTab settings={settings} />}
            {activeTab === 'Store Settings' && <GeneralTab settings={settings} />}
            {activeTab === 'User Management' && <UserManagementTab />}
            {activeTab === 'Backup & Restore' && (
              <BackupTab />
            )}
            {activeTab === 'Notifications' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Configure notification preferences here.</p>
                <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">Email Notifications</div>
                    <div className="text-xs text-gray-500">Receive email alerts for important events</div>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>
                <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">Low Stock Alerts</div>
                    <div className="text-xs text-gray-500">Get notified when stock falls below minimum</div>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>
              </div>
            )}
            {activeTab === 'System' && <SystemTab />}
          </>
        )}
      </div>

      {/* About System (always visible at bottom) */}
      {activeTab === 'General' && (
        <div className="border-t border-gray-100 px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">About System</h3>
          <SystemTab />
        </div>
      )}
    </div>
  )
}
