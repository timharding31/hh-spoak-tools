import fs from "fs";
import path from "path";

export const BASE_PROMPT = `\
You are retouching an interior design composite image into a photorealistic photograph.
This is a RETOUCHING task, not a redesign. Follow these rules exactly.

WHAT YOU MAY DO:
- Add realistic contact shadows and ambient occlusion beneath every furniture piece \
so nothing looks cut-and-pasted or floating.
- Apply consistent directional lighting from light sources already visible in the image \
(windows, ceiling fixtures). Do not invent new light sources.
- Render believable material textures — fabric weave, wood grain, stone veining, metal \
reflections — on objects that currently look flat or plastic.
- Blend composited edges where furniture meets floor or wall so pieces feel physically present.
- Reorient individual furniture pieces (rotate, angle) when the current forward-facing \
placement doesn't make spatial sense for the room arrangement — for example, angling a \
chair toward a sofa grouping it belongs to, or turning a sofa so its back isn't facing \
the focal point of the room. Only reorient when it clearly improves the spatial logic. \
When you do, render the reoriented piece fully (show the correct side/back/angle with \
accurate materials and proportions).

WHAT YOU MUST NOT DO:
- Do not add any object, furniture piece, plant, accessory, mirror, lamp, artwork, or \
architectural element that is not already visible in the input image.
- Do not remove any existing object.
- Do not change wall colors, floor materials, or room architecture.
- Do not change the camera angle, framing, or perspective.
- Do not reorient pieces that already make sense where they are.

The output should look like the input image was shot by a professional architectural \
photographer — same room, same furniture, same art, physically believable, spatially coherent.`;

const EDITS_URL = "https://api.openai.com/v1/images/edits";

export async function callOpenAI(
  imagePath: string,
  roomPrompt: string,
  apiKey: string
): Promise<string> {
  const imageBytes = fs.readFileSync(imagePath);
  const b64Image = imageBytes.toString("base64");

  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

  const prompt = `${BASE_PROMPT}\nROOM-SPECIFIC NOTES:\n${roomPrompt}`;

  const payload = {
    model: "gpt-image-1.5",
    images: [{ image_url: `data:${mimeType};base64,${b64Image}` }],
    prompt,
    input_fidelity: "high",
    quality: "high",
    output_format: "jpeg",
    moderation: "low",
    n: 1,
    size: "auto",
  };

  const resp = await fetch(EDITS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await resp.json()) as { data: Array<{ b64_json: string }> };
  const b64Out = data.data[0].b64_json;

  const outputDir = path.join(path.dirname(imagePath), "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const stem = path.basename(imagePath, path.extname(imagePath));
  const outputPath = path.join(outputDir, `${stem}.jpg`);
  fs.writeFileSync(outputPath, Buffer.from(b64Out, "base64"));

  return outputPath;
}
