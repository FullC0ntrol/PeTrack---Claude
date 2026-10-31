// Kolory zwierząt – identyfikatory zgodne z server/validation.js, wartości z src/index.css.
export const PET_COLORS = [
  { id: 'coral', label: 'Koral', hex: '#FF6B57' },
  { id: 'mandarin', label: 'Mandarynka', hex: '#FF9F1C' },
  { id: 'sun', label: 'Słonecznik', hex: '#FFD23F' },
  { id: 'mint', label: 'Mięta', hex: '#3DDC97' },
  { id: 'teal', label: 'Turkus', hex: '#2EC4B6' },
  { id: 'sky', label: 'Niebo', hex: '#4D9DE0' },
  { id: 'lavender', label: 'Lawenda', hex: '#A78BFA' },
  { id: 'pink', label: 'Róż', hex: '#F472B6' },
]

export const petClass = (color) => `pet-${PET_COLORS.some((c) => c.id === color) ? color : 'coral'}`
export const petHex = (color) => (PET_COLORS.find((c) => c.id === color) ?? PET_COLORS[0]).hex
