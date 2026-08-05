// ============================================================
// FUNCIÓN SERVERLESS: contenido editable del sitio.
//
// GET  -> devuelve el contenido actual (público, sin contraseña,
//         porque el sitio necesita leerlo para mostrarse).
// POST -> guarda contenido nuevo (protegido con usuario y
//         contraseña, ver ADMIN_USER / ADMIN_PASSWORD en
//         Netlify → Environment variables).
//
// Todo se guarda en Netlify Blobs, store "site-content", bajo
// una sola clave ("main") como un JSON.
// ============================================================

const { connectLambda, getStore } = require('@netlify/blobs');

// Contenido de fábrica: si nunca se ha guardado nada todavía,
// el sitio usa esto (son los textos y proyectos originales).
const DEFAULT_CONTENT = {
  hero: {
    eyebrow: 'Ingeniería de software · Riohacha, La Guajira',
    title: 'Soy <span class="accent">Jose Bermúdez</span>, desarrollador Full Stack.',
    tagline: 'Creamos soluciones digitales a medida para empresas y emprendimientos.',
    sub: 'Diseño, documento y construyo productos digitales completos: desde el análisis de requerimientos hasta el soporte en producción.'
  },
  about: {
    title: 'Full Stack, con la ingeniería como norte.',
    p1: 'Especializado en <strong>Python, Django, JavaScript, PostgreSQL y PWAs</strong>, trabajo bajo la marca <strong>JB Tech</strong> construyendo soluciones completas para negocios reales — desde el análisis inicial hasta el soporte en producción, siguiendo siempre metodologías reales de ingeniería de software.'
  },
  contact: {
    tagline: 'Cuéntame qué necesitas construir. Respondo directo, sin intermediarios ni plantillas de venta.',
    whatsapp: 'WhatsApp: +57 302 352 8086',
    location: 'Riohacha, La Guajira, Colombia',
    availability: 'Disponible para proyectos freelance y remotos'
  },
  projects: [
    {
      name: 'Maxi Gomitas',
      tag: 'PWA · E-COMMERCE',
      description: 'Plataforma PWA de venta de snacks artesanales, con catálogo, pedidos y seguimiento integrado.',
      link: 'https://maxigomitas-web.vercel.app/',
      image: null
    },
    {
      name: 'Bogotá Bling',
      tag: 'WEB · MARCA',
      description: 'Sitio web de marca con enfoque visual y comercial, optimizado para presentación de producto.',
      link: 'https://bogotabling.vercel.app/',
      image: null
    }
  ]
};

exports.handler = async function (event) {
  try {
    connectLambda(event);
    const store = getStore('site-content');

    if (event.httpMethod === 'GET') {
      const content = await store.get('main', { type: 'json' });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(content || DEFAULT_CONTENT)
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const username = (data.username || '').toString();
      const password = (data.password || '').toString();

      if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Usuario o contraseña incorrectos' }) };
      }

      if (!data.content) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Falta el contenido a guardar' }) };
      }

      await store.set('main', JSON.stringify(data.content));
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
