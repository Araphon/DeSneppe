import nodemailer from 'nodemailer'
import { getInstellingen } from './instellingen'

let transport: nodemailer.Transporter | null = null
function getTransport() {
  if (!process.env.SMTP_HOST) return null
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  }
  return transport
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

export async function stuurMail(aan: string, onderwerp: string, titel: string, alineas: string[], knop?: { tekst: string; url: string }, opties: { afmeldUrl?: string; afmeldTekst?: string } = {}) {
  const t = getTransport()
  const inst = await getInstellingen()
  const site = process.env.SITE_URL || ''
  const html = `<!doctype html><html><body style="margin:0;background:#FBF7F1;font-family:Arial,Helvetica,sans-serif;color:#141414">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#141414;padding:20px 28px"><img src="${site}/logo-wit.png" alt="De Sneppe" height="56" style="display:block"></td></tr>
  <tr><td style="padding:28px">
    <h1 style="font-size:22px;margin:0 0 16px">${esc(titel)}</h1>
    ${alineas.map(a => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${a}</p>`).join('')}
    ${knop ? `<p style="margin:24px 0 8px"><a href="${knop.url}" style="background:#F2B124;color:#141414;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">${esc(knop.tekst)}</a></p>` : ''}
  </td></tr>
  <tr><td style="padding:16px 28px;background:#F2EADF;font-size:12px;color:#555">
    ${esc(inst.bedrijf.handelsnaam)} · ${esc(inst.bedrijf.adres)}, ${esc(inst.bedrijf.postcode)} ${esc(inst.bedrijf.gemeente)} · ${esc(inst.bedrijf.telefoon)}
    ${opties.afmeldUrl ? `<br><a href="${opties.afmeldUrl}" style="color:#555">${esc(opties.afmeldTekst || 'Afmelden')}</a> · <a href="${site}/account#meldingen" style="color:#555">Meldingsvoorkeuren</a>` : ''}
  </td></tr></table></td></tr></table></body></html>`
  if (!t) {
    console.log(`[mail] (geen SMTP) → ${aan}: ${onderwerp}`)
    return false
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || `"${inst.bedrijf.naam}" <${inst.bedrijf.email}>`,
      replyTo: inst.bedrijf.email,
      to: aan,
      subject: onderwerp,
      html,
      ...(opties.afmeldUrl ? { headers: { 'List-Unsubscribe': `<${opties.afmeldUrl}&oneclick=1>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
    })
    return true
  } catch (e) {
    console.error('[mail] fout', e)
    return false
  }
}
