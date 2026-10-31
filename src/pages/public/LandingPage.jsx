import { useState } from 'react'
import { useNavigate } from 'react-router'
import { authApi } from '../../api/endpoints.js'
import { ScanArt } from '../../components/illustrations/Scenes.jsx'
import PublicShell from '../../components/layout/PublicShell.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useAuth } from '../../context/contexts.js'

const STEPS = [
  { icon: 'tag', title: 'Tag na obroży', text: 'Zawieszka z NFC i kodem QR. Bez baterii, bez abonamentu.', color: 'pet-mandarin' },
  { icon: 'nfc', title: 'Znalazca skanuje', text: 'Telefonem, bez instalowania czegokolwiek. Widzi, kim jest Twój pupil.', color: 'pet-sky' },
  { icon: 'pin', title: 'Ty wiesz, gdzie', text: 'Dostajesz wiadomość i miejsce na mapie. Twój numer zostaje prywatny.', color: 'pet-mint' },
]

export default function LandingPage() {
  const { user, demoLogin, setUser } = useAuth()
  const navigate = useNavigate()
  const [demoLoading, setDemoLoading] = useState(false)

  const enterDemo = async () => {
    setDemoLoading(true)
    try {
      const { user: demoUser } = await authApi.demo('/app')
      setUser(demoUser)
      navigate('/app')
    } catch {
      navigate('/zaloguj')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <PublicShell wide>
      <section className="grid items-center gap-6 pt-4 md:grid-cols-2 md:gap-10 md:pt-12">
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-text">
            <Icon name="sparkle" size={16} /> Tag NFC/QR na obroży
          </p>
          <h1 className="mt-4 text-5xl leading-[1.05] font-extrabold sm:text-6xl">
            Zgubił się?
            <br />
            <span className="relative inline-block">
              Wróci.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 9c40-6 120-8 194-2" stroke="#FF5A3D" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Znalazca skanuje tag telefonem i jednym kciukiem przechodzi krótką ścieżkę: kto to jest, czy jest bezpieczny, gdzie go znalazł. Ty
            dostajesz wiadomość z miejscem na mapie.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Button to="/app" size="lg" iconRight="forward">
                Przejdź do swoich zwierząt
              </Button>
            ) : (
              <>
                <Button to="/zaloguj" size="lg" iconRight="forward">
                  Zaczynamy
                </Button>
                {demoLogin && (
                  <Button variant="secondary" size="lg" onClick={enterDemo} loading={demoLoading}>
                    Zobacz demo
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <ScanArt className="mx-auto w-full max-w-md animate-pop" />
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3" aria-label="Jak to działa">
        {STEPS.map((step, i) => (
          <article
            key={step.title}
            className={`${step.color} card animate-rise`}
            style={{ animationDelay: `${150 + i * 90}ms` }}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-pet text-on-pet">
              <Icon name={step.icon} size={24} />
            </span>
            <h2 className="mt-4 text-lg font-bold">
              <span className="text-pet-text">{i + 1}.</span> {step.title}
            </h2>
            <p className="mt-1 text-muted">{step.text}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 card flex flex-col items-start gap-4 bg-ink text-bg sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-on-accent">
          <Icon name="shield" size={24} />
        </span>
        <p className="flex-1">
          <strong className="font-display">Prywatnie z założenia.</strong> Znalazca pisze do Ciebie przez aplikację. Numer telefonu pokazujemy
          tylko w trybie zaginięcia i tylko wtedy, gdy na to pozwolisz.
        </p>
      </section>
    </PublicShell>
  )
}
