import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompt(server: McpServer): void {
  server.registerPrompt(
    "retouch",
    {
      title: "Retouch Interior Design Images",
      description:
        "Transform one or more interior design composite images into photorealistic photographs using OpenAI gpt-image-1.5.",
      argsSchema: {
        path: z
          .string()
          .describe("Absolute path to an image file or directory of images"),
      },
    },
    ({ path }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are helping retouch interior design composite images to look photorealistic. The target path is: ${path}

Please follow these steps in order:

**Step 1 — API key**
Call \`ensure_api_key\`. If it returns \`configured: false\`, stop and let the user know they need to provide an OpenAI API key.

**Step 2 — Discover images**
Call \`list_images\` with the path above to get the list of images to process.

**Step 3 — Analyze and generate each image**
For each image in the list, do the following in sequence:

a) Call \`read_image\` with its path. After receiving the image, write a detailed room-specific prompt covering:
   - **Furniture & decor inventory**: every item you can see — sofas, chairs, tables, lighting, rugs, artwork, architectural features
   - **Material observations**: what looks flat or plastic and needs realistic rendering (fabric weave, wood grain, stone veining, metal reflections, glass)
   - **Spatial problems**: any piece that appears to float, lacks a shadow, or has an inconsistent composited edge
   - **Reorientation candidates**: only flag a piece if it's clearly facing the wrong direction for the room layout (e.g., a chair aimed at the camera rather than a conversation group). If placement makes sense, say "No reorientation needed."
   - **Specific fixes**: be concrete — which shadows, which textures, which blending improvements are needed

b) Immediately call \`generate_realistic_image\` with the image path and your room-specific prompt.

c) Wait for the result, note the output path, then move to the next image.

**Step 4 — Report**
Once all images are processed, list the output file paths and note any that failed with their error messages.`,
          },
        },
      ],
    })
  );
}
