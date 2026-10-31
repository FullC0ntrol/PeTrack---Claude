import nodemailer from 'nodemailer'
import { config } from '../config.js'

const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function layout(title, inner) {
  return `<!doctype html><html lang="pl"><body style="margin:0;background:#F5F5F3;font-family:Arial,sans-serif;color:#18171C">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <div style="background:#fff;border-radius:24px;padding:28px">
      <p style="margin:0 0 16px;font-weight:bold;color:#B8361F">● PeTrace</p>
      <h1 style="margin:0 0 12px;font-size:22px">${escapeHtml(title)}</h1>
      ${inner}
    </div>
  </div></body></html>`
}

async function send({ to, subject, text, html }) {
  if (!transport) return false
  await transport.sendMail({ from: config.smtp.from, to, subject, text, html })
  return true
}

/*
  Logowanie: link i kod w jednym mailu. Kod rozwiązuje problem PWA na telefonie – link z maila
  otwiera się w zwykłej przeglądarce, a nie w zainstalowanej aplikacji, więc wygodniej przepisać
  6 cyfr na ekranie, który już jest otwarty.
  Bez SMTP (dev, lokalny Docker) link i kod lądują w konsoli serwera.
*/
export async function sendLoginEmail(email, link, code) {
  const sent = await send({
    to: email,
    subject: `${code} – Twój kod do PeTrace`,
    text: `Twój kod logowania: ${code}\n\nAlbo kliknij link: ${link}\n\nKod i link są ważne 15 minut. Jeśli to nie Ty – zignoruj tę wiadomość.`,
    html: layout(
      'Zaloguj się do PeTrace',
      `<p style="margin:0 0 8px">Wpisz ten kod na otwartej stronie logowania:</p>
       <p style="font-size:36px;letter-spacing:8px;font-weight:bold;margin:0 0 20px">${code}</p>
       <p style="margin:0 0 20px">…albo po prostu kliknij:</p>
       <a href="${escapeHtml(link)}" style="display:inline-block;background:#FF5A3D;color:#1A0D09;padding:14px 22px;border-radius:999px;font-weight:bold;text-decoration:none">Zaloguj się</a>
       <p style="margin:24px 0 0;color:#67646A;font-size:13px">Kod i link są ważne 15 minut. Jeśli to nie Ty – zignoruj tę wiadomość.</p>`,
    ),
  })
  if (!sent || !config.isProduction) {
    console.log(
      `\n┌─ Logowanie: ${email}\n│  Kod:  ${code}\n│  Link: ${link}\n└─ (${sent ? 'wysłano też mailem' : 'brak SMTP – tylko w konsoli'})\n`,
    )
  }
}

export async function sendFinderMessageEmail(ownerEmail, petName, body, appLink) {
  const sent = await send({
    to: ownerEmail,
    subject: `Wiadomość od znalazcy: ${petName}`,
    text: `Ktoś napisał w sprawie: ${petName}\n\n„${body}”\n\nZobacz w aplikacji: ${appLink}`,
    html: layout(
      `Wiadomość w sprawie: ${petName}`,
      `<blockquote style="margin:0 0 20px;padding:14px 16px;background:#FFF1EE;border-radius:16px">${escapeHtml(body)}</blockquote>
       <a href="${escapeHtml(appLink)}" style="display:inline-block;background:#FF5A3D;color:#1A0D09;padding:14px 22px;border-radius:999px;font-weight:bold;text-decoration:none">Otwórz w aplikacji</a>`,
    ),
  })
  if (!sent && !config.isProduction) console.log(`[mail] (bez SMTP) wiadomość od znalazcy dla ${ownerEmail}: ${petName}`)
}
