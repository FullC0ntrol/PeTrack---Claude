/*
  Zmniejsza zdjęcie w przeglądarce przed wysłaniem: dłuższy bok maks. 1000 px, JPEG ~0,85.
  Zdjęcie z telefonu (często 4–8 MB) zajmuje potem ok. 150 KB, a obrót z EXIF jest zachowany
  (createImageBitmap z imageOrientation: 'from-image').
*/
export async function resizeImage(file, maxSide = 1000) {
  if (!file.type.startsWith('image/')) throw new Error('Wybierz plik ze zdjęciem.')
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Nie udało się odczytać zdjęcia. Spróbuj innego pliku (JPG lub PNG).')
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Nie udało się przygotować zdjęcia.')
  return blob
}
