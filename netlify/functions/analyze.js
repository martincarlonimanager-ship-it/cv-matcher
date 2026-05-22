exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  try {
    const { cv, job } = JSON.parse(event.body);

    const prompt = `Eres un experto en reclutamiento laboral. Analizá la compatibilidad entre este CV y esta oferta de trabajo.

CV DEL CANDIDATO:
${cv}

OFERTA DE TRABAJO:
${job}

Devolvé ÚNICAMENTE un objeto JSON válido sin ningún texto adicional, sin markdown, sin bloques de código. Solo el JSON puro.

{
  "score": <número entero 0 a 100>,
  "verdict": "<una oración directa resumiendo el match>",
  "dimensions": [
    {"name": "Experiencia relevante", "score": <0-100>, "note": "<observación concreta>"},
    {"name": "Liderazgo y equipos", "score": <0-100>, "note": "<observación concreta>"},
    {"name": "Conocimiento del sector", "score": <0-100>, "note": "<observación concreta>"},
    {"name": "Competencias técnicas", "score": <0-100>, "note": "<observación concreta>"},
    {"name": "Formación y perfil", "score": <0-100>, "note": "<observación concreta>"}
  ],
  "matches": ["keyword presente en CV y pedida en oferta", "...máximo 12"],
  "gaps": ["keyword pedida en oferta pero ausente en CV", "...máximo 8"],
  "recommendation": "<2 a 3 oraciones concretas: si conviene postularse, qué logros destacar, qué reforzar en el CV>"
}

Sé honesto y preciso. Si hay requisitos excluyentes que el candidato no cumple, reflejalo en el score.`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
      })
    });

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Respuesta inválida');
    const result = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };

  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
