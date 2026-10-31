import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'

// Strony publiczne (start, logowanie, karta weterynarza): logo, przełącznik motywu, wąska kolumna.
export default function PublicShell({ children, wide = false, className = '' }) {
  return (
    <div className={`min-h-dvh ${className}`}>
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 pt-[env(safe-area-inset-top)] print:hidden">
        <Logo />
        <ThemeToggle />
      </header>
      <main className={`mx-auto w-full px-4 pt-2 pb-16 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>{children}</main>
    </div>
  )
}
