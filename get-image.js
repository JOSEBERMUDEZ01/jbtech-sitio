// ============================================================
// FUNCIÓN SERVERLESS: sirve una imagen subida desde el panel admin.
//
// Las imágenes se guardan en Netlify Blobs (store "site-images")
// como texto base64. Esta función las busca por su "key" y las
// devuelve como imagen real, con el Content-Type correcto.
// ============================================================

const { connectLambda, getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  try {
    connectLambda(event);

    const key = event.queryStringParameters && event.queryStringParameters.key;
    if (!key) {
      return { statusCode: 400, body: 'Falta el parámetro key' };
    }

    const store = getStore('site-images');
    const result = await store.getWithMetadata(key, { type: 'text' });

    if (!result) {
      return { statusCode: 404, body: 'Imagen no encontrada' };
    }

    const contentType = (result.metadata && result.metadata.contentType) || 'image/jpeg';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: result.data,
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, body: 'Error: ' + err.message };
  }
};
