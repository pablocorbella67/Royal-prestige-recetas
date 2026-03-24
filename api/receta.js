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

Debes devolver únicamente un JSON válido con esta estructura exacta:

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

Condiciones base:
- Ocasión: ${evento || "general"}
- Dieta: ${dieta || "sin restricción"}
- Restricciones: ${restricciones.join(", ") || "ninguna"}
- Ingredientes disponibles: ${ingredientes || "libre"}
- Optimizar para sistema inteligente Redi-Temp: ${rediTemp ? "sí" : "no"}

Reglas generales:
- Responde en español neutro
- Usa de 6 a 10 ingredientes
- Usa de 4 a 7 pasos en "pasos"
- No escribas nada fuera del JSON
- La receta debe ser coherente con la dieta y restricciones
- Si hay ingredientes disponibles, priorízalos
- Evita explicaciones genéricas

Reglas para "badges":
- Incluye 2 a 4 badges cortos
- Si rediTemp = sí, incluye "Redi-Temp"
- Si dairies = false, incluye "Sin lácteos" cuando aplique
- Refleja la dieta cuando corresponda

Reglas críticas para "redi_temp":
- Si rediTemp = "no", devuelve "redi_temp": []
- Si rediTemp = "sí", la receta debe estar pensada para cocinarse en HORNALLA / ESTUFA, no en horno
- PROHIBIDO mencionar horno, hornear, bandeja, 200C, 180C, asado al horno o técnicas similares
- Las instrucciones deben reflejar los beneficios del sistema inteligente y la tapa con válvula
- "redi_temp" debe tener entre 5 y 7 indicaciones concretas
- Debe seguir esta lógica SIEMPRE que la receta tenga proteína o vegetales salteados/cocinados en olla:

Secuencia obligatoria:
1. Precalentar la olla vacía a fuego medio hasta comprobar el efecto mercurio con una gota de agua
2. Colocar la proteína y sellarla sin moverla hasta que se despegue sola
3. Dar vuelta la proteína y sellar el otro lado
4. Bajar el fuego a un cuarto o fuego bajo
5. Agregar los vegetales
6. Tapar con válvula ABIERTA para cocción controlada en estufa
7. Solo mencionar válvula cerrada si realmente la técnica lo necesita; si no aplica, aclara que se trabaja con válvula abierta

Detalles que deben aparecer cuando correspondan:
- tiempo aproximado de sellado por lado
- intensidad del fuego
- momento exacto de tapar
- válvula abierta o cerrada
- tiempo final de cocción

Reglas adicionales:
- No inventes pasos incompatibles con el uso de válvula
- No mezcles horno con Redi-Temp
- No contradigas la lógica de cocción en olla
- Si la receta elegida no encaja bien con Redi-Temp, crea otra receta que sí encaje

Importante:
- "pasos" = receta normal
- "redi_temp" = guía específica y práctica del sistema inteligente
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Eres un chef profesional experto en recetas caseras, cocción en estufa con ollas Royal Prestige y uso práctico del sistema inteligente Redi-Temp. Nunca recomiendas horno cuando se pide Redi-Temp."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4
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
