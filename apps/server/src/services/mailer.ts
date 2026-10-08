/**
 * Sends the 6-digit codes through the Hostinger mailbox (SMTP).
 * Without SMTP credentials the server runs in demo mode: the code is returned to the app
 * and shown on screen, so the school demo works before the mailbox exists.
 */
import nodemailer, { type Transporter } from 'nodemailer';

import { config, features } from '../config.js';

let transport: Transporter | null = null;

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transport;
}

/** Returns the code when it could NOT be e-mailed (demo mode), otherwise null. */
export async function sendCode(to: string, code: string, name?: string | null, kind: 'verify' | 'reset' | 'email_change' = 'verify'): Promise<string | null> {
  if (!features.email) {
    // Demo mode (no SMTP): the code is written to the server log so the site owner can read it in hPanel → Runtime logs.
    console.log(`[auth] demo-kod (${kind}) för ${to}: ${code}`);
    return code;
  }
  const intro = kind === 'reset' ? 'Din kod för att välja ett nytt lösenord är:' : kind === 'email_change' ? 'Din kod för att bekräfta din nya e-postadress är:' : 'Din verifieringskod är:';
  const outro = kind === 'reset' ? 'Koden gäller i 15 minuter. Har du inte begärt ett nytt lösenord kan du ignorera mejlet.' : 'Koden gäller i 15 minuter. Har du inte skapat ett konto kan du ignorera mejlet.';
  const html = `
  <div style="font-family:Montserrat,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#121C33">
    <h2 style="color:#04776B;margin:0 0 12px">Dermora</h2>
    <p>Hej${name ? ` ${name}` : ''}!</p>
    <p>${intro}</p>
    <p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#DFF2F0;padding:16px;text-align:center;border-radius:12px">${code}</p>
    <p style="color:#6B7280;font-size:13px">${outro}</p>
    <p style="color:#6B7280;font-size:12px">Dermora ger vägledning, inte medicinsk diagnos.</p>
  </div>`;
  try {
    await getTransport().sendMail({
      from: `Dermora <${config.smtp.from}>`,
      to,
      subject: `${code} är din Dermora-kod`,
      text: `Din verifieringskod är ${code}. Den gäller i 15 minuter.`,
      html,
    });
    return null;
  } catch (e) {
    console.error('[mail] could not send code:', (e as Error).message);
    return code; // do not lock the user out if the mailbox is misconfigured
  }
}
