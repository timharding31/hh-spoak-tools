# hh-spoak-tools

An MCP (Model Context Protocol) server that retouches interior design composite images into photorealistic photographs using OpenAI's `gpt-image-1.5` model.

## What it does

Given a staging composite (furniture cutouts placed into a room scene), this server drives an AI agent to:

1. Analyze each image to identify furniture, materials, spatial issues, and reorientation candidates
2. Submit the image to OpenAI with a detailed room-specific prompt
3. Save the photorealistic result to an `output/` subfolder alongside the source images

The retouching is non-destructive — same room, same furniture, same art — rendered to look like a professional architectural photograph.

## Requirements

- Node.js 18 or later
- An [OpenAI API key](https://platform.openai.com/api-keys) with access to `gpt-image-1.5`

## Installation

### Option A — Run directly with npx (recommended)

No install step needed. Add the server to your MCP client config and it runs on demand:

```json
{
  "mcpServers": {
    "hh-spoak-tools": {
      "command": "npx",
      "args": ["-y", "github:timharding31/hh-spoak-tools"]
    }
  }
}
```

### Option B — Install globally

```bash
npm install -g github:timharding31/hh-spoak-tools
```

Then configure your MCP client:

```json
{
  "mcpServers": {
    "hh-spoak-tools": {
      "command": "hh-spoak-tools"
    }
  }
}
```

### Option C — Build from source

```bash
git clone https://github.com/timharding31/hh-spoak-tools.git
cd hh-spoak-tools
npm install
npm run build
```

Configure your MCP client to point at the built entry point:

```json
{
  "mcpServers": {
    "hh-spoak-tools": {
      "command": "node",
      "args": ["/absolute/path/to/hh-spoak-tools/dist/index.js"]
    }
  }
}
```

## Configuring Claude Code

Add the server to `~/.claude/claude_desktop_config.json` (or the equivalent settings file for your MCP client). Example using npx:

```json
{
  "mcpServers": {
    "hh-spoak-tools": {
      "command": "npx",
      "args": ["-y", "github:timharding31/hh-spoak-tools"]
    }
  }
}
```

Restart Claude Code after saving.

## API key setup

On first use, the `ensure_api_key` tool will prompt you to enter your OpenAI API key via an interactive dialog. The key is saved to `~/.hh-spoak-tools/.env` (mode `0600`) and reused automatically on subsequent runs. You are never asked more than once per machine.

To reset or update the key, delete the file:

```bash
rm ~/.hh-spoak-tools/.env
```

## Usage

### Via the `retouch` prompt

The easiest way to process images is through the built-in `retouch` prompt. In your MCP client, invoke it with the path to a single image or a directory of JPEG/PNG images:

```
/retouch path=/absolute/path/to/images
```

The agent will:
1. Check for an API key (prompting if needed)
2. Discover all `.jpg`/`.jpeg`/`.png` files at the path
3. Analyze and retouch each image in sequence
4. Report the output paths when done

Output images are saved as `output/<original-name>.jpg` in the same directory as each source file.

### Via individual tools

| Tool | Description |
|------|-------------|
| `ensure_api_key` | Check whether an API key is saved; prompt the user if not |
| `list_images` | List all JPEG/PNG files at a given path or directory |
| `read_image` | Read an image and return it for visual analysis |
| `generate_realistic_image` | Send an image + room prompt to OpenAI and save the result |

## Development

```bash
npm install
npm run dev          # run from source with tsx
npm run build        # compile to dist/
```
