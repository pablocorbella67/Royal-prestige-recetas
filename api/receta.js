import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { evento, dieta, dairies, rediTemp, alergias, ingredientes } = req.body;

    const restricciones = [];

    if (!dairies) {
      restricciones.push("sin lácteos");
    }

    if (alergias?.length) {
      restricciones.push(`sin ${alergias.join(", ")}`);
    }

    const prompt = `
Eres un chef experto en cocina con ollas Royal Prestige.

Devuelve únicamente un JSON válido con esta estructura exacta:

{
  "titulo": "",
  "tiempo": "",
  "porciones": "",
  "dificultad": "",
  "descripcion": "",
  "tip_royal_prestige": "",
  "badges": [],
  "ingredientes": [],
  "pasos": [],
  "redi_temp": []
}

Condiciones:
- Ocasión: ${evento || "general"}
- Dieta: ${dieta || "sin restricción"}
- Restricciones: ${restricciones.join(", ") || "ninguna"}
- Ingredientes disponibles: ${ingredientes || "libre"}
- Optimizar para sistema inteligente Redi-Temp: ${rediTemp ? "sí" : "no"}

Reglas generales:
- Responde en español neutro
- Máximo 6 a 10 ingredientes
- 4 a 7 pasos de preparación
- Usa ingredientes y técnica coherentes con la dieta y restricciones
- Si hay ingredientes disponibles, intenta basarte principalmente en ellos
- El texto debe ser claro, útil y elegante
- No escribas nada fuera del JSON

Reglas para "badges":
- Incluye 2 a 4 badges cortos
- Si rediTemp = sí, incluye "Redi-Temp"
- Si dairies = false, incluye "Sin lácteos" cuando aplique
- Si hay una dieta específica, refléjala cuando aplique

Reglas para "redi_temp":
- Si rediTemp = "sí", llena "redi_temp" con 4 a 6 indicaciones concretas y prácticas
- Deben explicar, según la receta:
  - cómo sellar
  - cuántos minutos cocinar
  - intensidad de fuego: alto, medio o bajo
  - cuándo tapar
  - cuándo usar válvula abierta
  - cuándo usar válvula cerrada
- Las instrucciones deben sonar prácticas, claras y seguras
- Si la receta no requiere alguno de esos elementos, adapta la explicación de forma lógica
- Si rediTemp = "no", devuelve "redi_temp": []

Importante:
- "pasos" es la receta normal
- "redi_temp" es una guía adicional específica del sistema inteligente
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Eres un chef profesional experto en recetas caseras, uso de ollas Royal Prestige y presentación estructurada en JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9
    });

    const text = response.choices[0].message.content;
    const receta = JSON.parse(text);

    if (!Array.isArray(receta.redi_temp)) {
      receta.redi_temp = [];
    }

    if (!Array.isArray(receta.badges)) {
      receta.badges = [];
    }

    return res.status(200).json(receta);

  } catch (err) {
    console.error("ERROR API:", err);
    return res.status(500).json({
      error: err.message || "Error generando receta"
    });
  }
}
