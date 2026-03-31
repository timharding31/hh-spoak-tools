import fs from "fs";
import path from "path";
import os from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callOpenAI } from "./openai.js";

const CONFIG_DIR = path.join(os.homedir(), ".hh-spoak-tools");
const ENV_FILE = path.join(CONFIG_DIR, ".env");

function readApiKey(): string | null {
  if (!fs.existsSync(ENV_FILE)) return null;
  const contents = fs.readFileSync(ENV_FILE, "utf-8");
  const match = contents.match(/^OPENAI_API_KEY=(.+)$/m);
  return match ? match[1].trim() : null;
}

function writeApiKey(key: string): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(ENV_FILE, `OPENAI_API_KEY=${key}\n`, { mode: 0o600 });
}

export function registerTools(server: McpServer): void {
  // ── ensure_api_key ──────────────────────────────────────────────────────────
  server.registerTool(
    "ensure_api_key",
    {
      description:
        "Check whether an OpenAI API key is saved. If not, prompt the user to enter one via an interactive dialog and save it for future use.",
    },
    async () => {
      const existing = readApiKey();
      if (existing) {
        return {
          content: [{ type: "text", text: JSON.stringify({ configured: true }) }],
        };
      }

      const result = await server.server.elicitInput({
        message:
          "An OpenAI API key is required to generate photorealistic images. " +
          "You can find or create your key at https://platform.openai.com/api-keys",
        requestedSchema: {
          type: "object",
          properties: {
            apiKey: {
              type: "string",
              title: "OpenAI API Key",
              description: "Starts with sk-...",
            },
          },
          required: ["apiKey"],
        },
      });

      if (result.action === "accept" && result.content?.apiKey) {
        writeApiKey(result.content.apiKey as string);
        return {
          content: [{ type: "text", text: JSON.stringify({ configured: true }) }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              configured: false,
              reason: "User did not provide an API key.",
            }),
          },
        ],
      };
    }
  );

  // ── list_images ─────────────────────────────────────────────────────────────
  server.registerTool(
    "list_images",
    {
      description: "List all JPEG and PNG images at the given file path or directory.",
      inputSchema: {
        path: z.string().describe("Absolute path to an image file or directory of images"),
      },
    },
    async ({ path: inputPath }) => {
      const stat = fs.statSync(inputPath);
      let files: string[];

      if (stat.isDirectory()) {
        const entries = fs.readdirSync(inputPath);
        files = entries
          .filter((f) => /\.(jpe?g|png)$/i.test(f))
          .sort()
          .map((f) => path.join(inputPath, f));
      } else {
        if (!/\.(jpe?g|png)$/i.test(inputPath)) {
          throw new Error("File must be a JPEG or PNG image.");
        }
        files = [inputPath];
      }

      const images = files.map((f) => ({
        name: path.basename(f),
        path: f,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({ images }) }],
      };
    }
  );

  // ── read_image ──────────────────────────────────────────────────────────────
  server.registerTool(
    "read_image",
    {
      description:
        "Read an image file and return its contents so you can visually analyze the room.",
      inputSchema: {
        path: z.string().describe("Absolute path to the image file"),
      },
    },
    async ({ path: imagePath }) => {
      const bytes = fs.readFileSync(imagePath);
      const b64 = bytes.toString("base64");
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

      return {
        content: [{ type: "image", data: b64, mimeType }],
      };
    }
  );

  // ── generate_realistic_image ────────────────────────────────────────────────
  server.registerTool(
    "generate_realistic_image",
    {
      description:
        "Send an interior design image to OpenAI gpt-image-1.5 with a room-specific prompt and save the photorealistic result to an output/ subfolder.",
      inputSchema: {
        imagePath: z.string().describe("Absolute path to the source image"),
        roomPrompt: z
          .string()
          .describe(
            "Your detailed room-specific notes: furniture inventory, materials, spatial issues, reorientation candidates, and specific fixes needed"
          ),
      },
    },
    async ({ imagePath, roomPrompt }) => {
      const apiKey = readApiKey();
      if (!apiKey) {
        throw new Error("OpenAI API key not found. Call ensure_api_key first.");
      }

      const outputPath = await callOpenAI(imagePath, roomPrompt, apiKey);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ outputPath }),
          },
        ],
      };
    }
  );
}
