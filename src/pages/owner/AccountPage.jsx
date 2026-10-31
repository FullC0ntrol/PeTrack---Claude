import { useState } from 'react'
import { useNavigate } from 'react-router'
import { authApi } from '../../api/endpoints.js'
import SubHeader from '../../components/layout/SubHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import { ChoiceCards } from '../../components/ui/Controls.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import { useAuth, useThemeMode, useToast } from '../../context/contexts.js'
import { LAST_PET_KEY, local } from '../../lib/storage.js'

export default function AccountPage() {
  const { user, setUser, logout } = useAuth()
  const { mode, setMode } = useThemeMode()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const back = local.get(LAST_PET_KEY) ? `/app/p/${local.get(LAST_PET_KEY)}` : '/app'

  const save = async (event) => {
    event.preventDefault()
    setErrors({})
    setSaving(true)
    try {
      const result = await authApi.updateMe({ name, phone })
      setUser(result.user)
      toast.show('Zapisano')
    } catch (err) {
      setErrors({ [err.field ?? 'name']: err.message })
    } finally {
      setSaving(false)
    }
  }

  const signOut = async (everywhere) => {
    await logout({ everywhere }).catch(() => {})
    local.remove(LAST_PET_KEY)
    navigate('/', { replace: true })
  }

  return (
    <div>
      <SubHeader back={back} title="Konto" subtitle={user?.email} />

      <form onSubmit={save} className="card animate-rise space-y-4" noValidate>
        <h2 className="text-lg font-bold">Twoje dane</h2>
        <TextField label="Imię" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextField
          label="Telefon"
          optional
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          hint="Podpowiemy go przy dodawaniu zwierząt i zgłaszaniu zaginięcia."
        />
        <Button type="submit" loading={saving} icon="check">
          Zapisz
        </Button>
      </form>

      <section className="card mt-4 animate-rise" style={{ animationDelay: '80ms' }}>
        <ChoiceCards
          legend="Wygląd"
          name="theme"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'light', label: 'Jasny', icon: 'sun' },
            { value: 'dark', label: 'Ciemny', icon: 'moon' },
            { value: 'system', label: 'Jak system', icon: 'system' },
          ]}
        />
      </section>

      <section className="card mt-4 animate-rise space-y-2" style={{ animationDelay: '140ms' }}>
        <Button variant="secondary" full icon="logout" onClick={() => signOut(false)}>
          Wyloguj
        </Button>
        <Button variant="danger-soft" full icon="ban" onClick={() => signOut(true)}>
          Wyloguj ze wszystkich urządzeń
        </Button>
      </section>
    </div>
  )
}
