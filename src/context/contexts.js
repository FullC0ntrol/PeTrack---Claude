import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)
export const PetsContext = createContext(null)
export const ToastContext = createContext(null)
export const ThemeContext = createContext(null)

export const useAuth = () => useContext(AuthContext)
export const usePets = () => useContext(PetsContext)
export const useToast = () => useContext(ToastContext)
export const useThemeMode = () => useContext(ThemeContext)
