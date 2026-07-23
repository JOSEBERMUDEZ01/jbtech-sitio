// ============================================================
// FUNCIÓN SERVERLESS: envía por correo (Resend) cada mensaje
// que llega desde el formulario de contacto.
//
// La clave de Resend NUNCA va escrita aquí en el código.
// Se configura como variable de entorno en Netlify:
//   Project configuration → Environment variables → RESEND_API_KEY
// ============================================================

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const name = (data.name || '').toString();
    const email = (data.email || '').toString();
    const message = (data.message || '').toString();

    if (!name || !email || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos' }) };
    }

    const response = await fetch('https://api.resend.com/emails', {
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
          '<p><b>Mensaje:</b><br>' + message.replace(/\n/g, '<br>') + '</p>'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 500, body: JSON.stringify({ error: errText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
