;(function () {
  var stored = null
  try {
    stored = localStorage.getItem('petrace-theme')
  } catch {
    stored = null
  }
  var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
})()
