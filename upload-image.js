// ============================================================
// FUNCIÓN SERVERLESS: recibe una imagen (en base64) desde el panel
// admin, la guarda en Netlify Blobs y devuelve la URL pública para
// usarla en el sitio.
//
// Protegida con usuario y contraseña — se configuran como
// variables de entorno en Netlify (Project configuration →
// Environment variables):
//   ADMIN_USER      -> el usuario del panel
//   ADMIN_PASSWORD  -> la contraseña del panel
// ============================================================

const { connectLambda, getStore } = require('@netlify/blobs');
const crypto = require('crypto');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    connectLambda(event);

    const data = JSON.parse(event.body);
    const username = (data.username || '').toString();
    const password = (data.password || '').toString();

    if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Usuario o contraseña incorrectos' }) };
    }

    const dataBase64 = (data.dataBase64 || '').toString();
    const contentType = (data.contentType || 'image/jpeg').toString();

    if (!dataBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta la imagen' }) };
    }

    // Límite de seguridad: ~4MB en base64 (~3MB de imagen real)
    if (dataBase64.length > 4 * 1024 * 1024) {
      return { statusCode: 413, body: JSON.stringify({ error: 'La imagen es demasiado pesada. Máximo ~3MB.' }) };
    }

    const key = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const store = getStore('site-images');
    await store.set(key, dataBase64, { metadata: { contentType: contentType } });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, key: key, url: '/.netlify/functions/get-image?key=' + key })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
