// ============================================================
// FUNCIÓN SERVERLESS: procesa cada mensaje del formulario.
//
// Hace 4 cosas, en este orden:
//   1. Verifica el token de reCAPTCHA contra los servidores de Google
//      (esto es lo que de verdad bloquea bots; nadie puede falsificar
//      esta verificación desde el navegador).
//   2. Revisa que esa misma IP no haya escrito ya 3 veces en 24 horas
//      (usando Netlify Blobs, el almacenamiento propio de Netlify).
//   3. Envía el correo por Resend.
//   4. Envía el aviso silencioso por WhatsApp (CallMeBot), sin abrir
//      ninguna ventana ni pestaña en el navegador del visitante.
//
// Claves que NUNCA van escritas aquí en el código, se configuran
// como variables de entorno en Netlify
// (Project configuration → Environment variables):
//   RESEND_API_KEY        -> tu clave de Resend
//   RECAPTCHA_SECRET_KEY  -> la "Secret Key" que te dio Google reCAPTCHA
// ============================================================

const { connectLambda, getStore } = require('@netlify/blobs');

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas

const CALLMEBOT_PHONE = '573023528086';
const CALLMEBOT_APIKEY = '1335636';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    connectLambda(event);

    const data = JSON.parse(event.body);
    const name = (data.name || '').toString().trim();
    const email = (data.email || '').toString().trim();
    const phone = (data.phone || '').toString().trim();
    const message = (data.message || '').toString().trim();
    const captchaToken = (data.captchaToken || '').toString().trim();

    if (!name || !email || !phone || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos' }) };
    }

    // ---------------------------------------------------------
    // 1. Verificación real de reCAPTCHA contra Google
    // ---------------------------------------------------------
    if (!captchaToken) {
      return { statusCode: 403, body: JSON.stringify({ error: 'captcha', message: 'Falta la verificación.' }) };
    }

    const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'secret=' + process.env.RECAPTCHA_SECRET_KEY + '&response=' + encodeURIComponent(captchaToken)
    });
    const verifyResult = await verifyResponse.json();

    if (!verifyResult.success) {
      return { statusCode: 403, body: JSON.stringify({ error: 'captcha', message: 'La verificación no pasó.' }) };
    }

    // ---------------------------------------------------------
    // 2. Límite de 3 mensajes por IP cada 24 horas
    // ---------------------------------------------------------
    const ip =
      event.headers['x-nf-client-connection-ip'] ||
      event.headers['client-ip'] ||
      (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      'unknown';

    const store = getStore('contact-rate-limit');
    const key = 'ip-' + ip;
    const now = Date.now();

    let record = await store.get(key, { type: 'json' });
    if (!record || (now - record.firstAttempt) > WINDOW_MS) {
      record = { count: 0, firstAttempt: now };
    }

    if (record.count >= MAX_ATTEMPTS) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'limit',
          message: 'Ya alcanzaste el límite de 3 mensajes por hoy. Si es urgente, escríbeme directo por WhatsApp con el botón flotante.'
        })
      };
    }

    record.count += 1;
    await store.set(key, JSON.stringify(record));

    // ---------------------------------------------------------
    // 3. Correo por Resend
    // ---------------------------------------------------------
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'JB Tech <onboarding@resend.dev>',
        to: ['josebp354@gmail.com'],
        reply_to: email,
        subject: 'Nuevo contacto desde el portafolio: ' + name,
        html:
          '<h2>Nuevo mensaje desde el portafolio de JB Tech</h2>' +
          '<p><b>Nombre:</b> ' + name + '</p>' +
          '<p><b>Correo:</b> ' + email + '</p>' +
          '<p><b>Teléfono:</b> ' + phone + '</p>' +
          '<p><b>Mensaje:</b><br>' + message.replace(/\n/g, '<br>') + '</p>'
      })
    });

    // ---------------------------------------------------------
    // 4. Aviso silencioso por WhatsApp (CallMeBot)
    //    Best-effort: si falla, no bloquea el resto del flujo.
    // ---------------------------------------------------------
    if (CALLMEBOT_APIKEY && CALLMEBOT_APIKEY !== 'PENDIENTE_NUEVO_APIKEY') {
      const waText =
        'Nuevo contacto desde el portafolio:%0A' +
        'Nombre: ' + name + '%0A' +
        'Correo: ' + email + '%0A' +
        'Teléfono: ' + phone + '%0A' +
        'Mensaje: ' + message;

      fetch(
        'https://api.callmebot.com/whatsapp.php?phone=' + CALLMEBOT_PHONE +
        '&text=' + encodeURIComponent(waText).replace(/%250A/g, '%0A') +
        '&apikey=' + CALLMEBOT_APIKEY
      ).catch(function () {});
    }

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      return { statusCode: 500, body: JSON.stringify({ error: errText }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, remaining: MAX_ATTEMPTS - record.count })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
