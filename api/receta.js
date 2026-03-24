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
      temperature: 0.7
    });

    const text = response.choices[0].message.content;
    const receta = JSON.parse(text);

    return res.status(200).json(receta);

  } catch (err) {
    console.error("ERROR API:", err);

    return res.status(200).json({
      titulo: "Pollo cremoso con vegetales",
      tiempo: "35 min",
      porciones: "4",
      dificultad: "Fácil",
      descripcion: "Una receta casera, cálida y práctica para resolver la comida con lo que tienes en casa.",
      tip_royal_prestige: "Cocina tapado a fuego medio para conservar mejor la humedad y el sabor.",
      badges: ["Casera", "Rápida"],
      ingredientes: [
        "2 pechugas de pollo",
        "2 zanahorias",
        "2 papas",
        "1/2 cebolla",
        "1 taza de leche o crema",
        "1 cucharada de manteca o aceite",
        "Sal al gusto",
        "Pimienta al gusto"
      ],
      pasos: [
        "Corta el pollo y los vegetales en trozos medianos.",
        "Calienta la olla y dora el pollo con la manteca o aceite.",
        "Agrega la cebolla y cocina por 2 minutos.",
        "Incorpora la zanahoria y la papa, mezcla bien.",
        "Añade la leche o crema, sal y pimienta.",
        "Tapa y cocina a fuego medio-bajo hasta que todo esté suave.",
        "Sirve caliente."
      ]
    });
  }
}
