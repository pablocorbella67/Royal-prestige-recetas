export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { evento, dieta, dairies, alergias, ingredientes } = req.body;

  const restricciones = [];
  if (!dairies) restricciones.push("sin lácteos");
  if (alergias && alergias.length) restricciones.push("sin " + alergias.join(", "));

  const ingTexto = ingredientes && ingredientes.trim()
    ? `Usa principalmente estos ingredientes que el usuario tiene en casa: ${ingredientes}.`
    : "Propón una receta completa con ingredientes comunes y accesibles.";

  const prompt = `Eres un chef experto en cocina con ollas Royal Prestige. Genera una receta original y deliciosa con estas condiciones:

- Ocasión: ${evento || "cualquier ocasión"}
- Dieta: ${dieta || "sin restricción"}
- Restricciones: ${restricciones.length ? restricciones.join(", ") : "ninguna"}
- ${ingTexto}

Las ollas Royal Prestige cocinan con vapor sellado (mínima o cero agua), sin grasa, en acero inoxidable quirúrgico 316L, ahorrando energía y conservando hasta 90% de los nutrientes.

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra:
{
  "titulo": "Nombre creativo y apetecible",
  "badges": ["etiqueta1", "etiqueta2"],
  "tiempo": "X minutos",
  "porciones": "X personas",
  "dificultad": "Fácil",
  "descripcion": "Dos oraciones evocadoras",
  "ingredientes": ["cantidad + ingrediente"],
  "pasos": ["Paso detallado..."],
  "tip_royal_prestige": "Cómo la tecnología Royal Prestige mejora esta receta específicamente."
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content.map(b => b.type === "text" ? b.text : "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "Respuesta inválida del modelo" });

    const receta = JSON.parse(match[0]);
    return res.status(200).json(receta);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

