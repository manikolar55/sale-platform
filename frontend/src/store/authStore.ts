import type { AuthUser } from '../types'

let _user: AuthUser | null = null
let _listeners: Array<() => void> = []

const stored = localStorage.getItem('access_token')
if (!stored) _user = null

export const authStore = {
  getUser: () => _user,
  setUser: (user: AuthUser | null) => {
    _user = user
    _listeners.forEach(fn => fn())
  },
  subscribe: (fn: () => void) => {
    _listeners.push(fn)
    return () => { _listeners = _listeners.filter(l => l !== fn) }
  },
  login: (accessToken: string, refreshToken: string, user: AuthUser) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    _user = user
    _listeners.forEach(fn => fn())
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    _user = null
    _listeners.forEach(fn => fn())
  },
  isAuthenticated: () => !!localStorage.getItem('access_token'),
}
