import { useTheme } from '../hooks/useTheme.js'
import { ThemeContext } from './contexts.js'

export default function ThemeProvider({ children }) {
  const theme = useTheme()
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
