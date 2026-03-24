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
    const { evento, dieta, dairies, alergias, ingredientes } = req.body;

    const restricciones = [];
    if (!dairies) restricciones.push("sin lácteos");
    if (alergias?.length) restricciones.push(`sin ${alergias.join(", ")}`);

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
  "pasos": []
}

Condiciones:
- Ocasión: ${evento || "general"}
- Dieta: ${dieta || "sin restricción"}
- Restricciones: ${restricciones.join(", ") || "ninguna"}
- Ingredientes disponibles: ${ingredientes || "libre"}

Reglas:
- En español neutro
- 6 a 10 ingredientes
- 4 a 7 pasos
- Texto claro y útil
- Sin texto fuera del JSON
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Eres un chef profesional experto en recetas caseras y presentación estructurada en JSON."
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

    return res.status(200).json(receta);

  } catch (err) {
    console.error("ERROR API:", err);
    return res.status(500).json({
      error: err.message || "Error generando receta"
    });
  }
}
