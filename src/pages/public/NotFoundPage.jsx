import { SearchArt } from '../../components/illustrations/Scenes.jsx'
import PublicShell from '../../components/layout/PublicShell.jsx'
import Button from '../../components/ui/Button.jsx'

export default function NotFoundPage() {
  return (
    <PublicShell>
      <div className="flex animate-rise flex-col items-center pt-10 text-center">
        <SearchArt className="w-64" />
        <h1 className="mt-4 text-3xl font-bold">Tu nikogo nie ma</h1>
        <p className="mt-2 text-muted">Ta strona się zgubiła. Na szczęście Ty wiesz, jak wrócić.</p>
        <Button to="/" className="mt-6" icon="home">
          Strona główna
        </Button>
      </div>
    </PublicShell>
  )
}
