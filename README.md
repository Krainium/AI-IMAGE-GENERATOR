# AI Image Generator CLI

Standalone Node.js CLI tool for generating and editing images using OpenAI (DALL-E 3 / gpt-image-1) and Google Gemini (Gemini Flash Image / Imagen 4). No npm install required — just Node.js and your API key.

---

## Features

- Dual provider support — use OpenAI, Gemini, or both side by side
- Image generation — create images from text prompts
- Image editing — modify existing images with text descriptions
- Model selection — DALL-E 3 and gpt-image-1 (OpenAI), or auto-detected Gemini/Imagen models
- Multiple size options — DALL-E 3: 1024x1024, 1792x1024, 1024x1792 | gpt-image-1: 1024x1024, 512x512, 256x256 | Gemini: automatic
- Generation history — JSON log tracks every generation with prompt, timestamp, provider, model, and file path
- Smart model discovery — automatically finds image-capable models available on your Gemini API key
- Rate limit handling — detects 429 responses, parses retry delay, waits and retries automatically
- Zero dependencies — single `.js` file, uses only Node.js built-in modules
- Windows, macOS, Linux

---

## Requirements

- Node.js 18+
- At least one API key:
  - OpenAI — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Gemini — [ai.google.dev](https://ai.google.dev)

**Gemini note:** Image generation requires a paid API key with billing enabled. Free tier keys have a quota of 0 for image generation. Enable billing at [ai.google.dev](https://ai.google.dev) — image models unlock automatically.

---

## Quick Start

```bash
# OpenAI only
OPENAI_API_KEY=sk-your-key-here node image-gen.js

# Gemini only
GEMINI_API_KEY=AIza-your-key-here node image-gen.js

# Both providers
OPENAI_API_KEY=sk-abc123 GEMINI_API_KEY=AIza-xyz789 node image-gen.js
```

---

## Setting API Keys

**Linux / macOS:**
```bash
export OPENAI_API_KEY=sk-abc123
export GEMINI_API_KEY=AIza-xyz789
node image-gen.js
```

**Windows (Command Prompt):**
```cmd
set OPENAI_API_KEY=sk-abc123 && set GEMINI_API_KEY=AIza-xyz789 && node image-gen.js
```

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-abc123"; $env:GEMINI_API_KEY="AIza-xyz789"; node image-gen.js
```

---

## Menu

```
  ---- Menu ----
    1) Generate - Create an image from a text prompt
    2) Edit     - Edit an existing image with a text prompt
    3) History  - View past generations
    4) Quit
```

### 1) Generate

Choose provider, enter a prompt, select model and size (OpenAI only). Image is generated, saved, and logged.

```
  > A golden retriever wearing sunglasses on a beach at sunset

  Provider: OpenAI | Model: dall-e-3 | Size: 1024x1024
  Generating...

  Saved: image_output/generated_openai_2026-03-15T16-30-00.png (1247.3 KB)
```

### 2) Edit

Point to an existing image, describe your changes. Edited image saves as a new file.

```
  Image path: ./my-photo.png
  Edit prompt: Add a rainbow in the background

  Provider: OpenAI | Model: gpt-image-1 | Size: 1024x1024
  Editing...

  Saved: image_output/edited_openai_2026-03-15T16-35-00.png (982.1 KB)
```

Accepts PNG, JPG, JPEG, and WebP.

### 3) History

Lists all past generations and edits with prompt, provider, model, size, and file path.

---

## Output

All images save to `image_output/` in the current directory:

```
image_output/
  generated_openai_2026-03-15T16-30-00.png
  generated_gemini_2026-03-15T16-40-00.png
  edited_openai_2026-03-15T16-35-00.png
  history.json
```

Filenames follow the pattern: `{type}_{provider}_{timestamp}.png`

`history.json` stores a full log of every generation — prompt, provider, model, size, file path, and timestamp.

---

## Supported Models

### OpenAI

| Model | Sizes | Notes |
|-------|-------|-------|
| dall-e-3 | 1024x1024, 1792x1024, 1024x1792 | Default, high quality |
| gpt-image-1 | 1024x1024, 512x512, 256x256 | Supports generation and editing |

### Gemini / Google

Auto-discovers which image models are available on your API key:

| Model | Notes |
|-------|-------|
| gemini-2.5-flash-image | Fast generation |
| gemini-3-pro-image-preview | Higher quality |
| imagen-4.0-generate-001 | Dedicated image model |
| imagen-4.0-ultra-generate-001 | Highest quality |
| imagen-4.0-fast-generate-001 | Fastest Imagen |

---

## How It Works

**OpenAI** — POSTs to `/v1/images/generations` or `/v1/images/edits`, receives base64-encoded image data, decodes and saves as PNG.

**Gemini** — uses a multi-strategy approach:
1. Tries Imagen models via `predict` and `generateImages` endpoints
2. Tries Gemini Flash via `generateContent` with `responseModalities: ["IMAGE"]`
3. Calls ListModels API to auto-discover all image-capable models on your key
4. On HTTP 429, parses retry delay and waits automatically (up to 3 retries)

**Image editing** — OpenAI uses multipart form upload to `/v1/images/edits`. Gemini sends the source image as base64 inline data via `generateContent` or Imagen's predict endpoint.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (starts with `sk-`) |
| `GEMINI_API_KEY` | Google Gemini API key (starts with `AIza`) |

At least one must be set. If both are set, the script lets you choose the provider per generation.

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No API keys found | Keys not set as env vars | Set `OPENAI_API_KEY` or `GEMINI_API_KEY` before running |
| Gemini rate limited / 429 | Free tier — quota is 0 for image gen | Enable billing at ai.google.dev |
| Gemini 404 for all models | Region restriction or key not propagated | Wait a few minutes and retry, or use OpenAI |
| OpenAI insufficient quota | Account credits exhausted | Add funds at platform.openai.com/account/billing |
| Unsupported image format | File is not PNG, JPG, JPEG, or WebP | Convert the image before editing |
| Request timed out (120s) | Slow generation or connection issue | Check connection, try a simpler prompt, or switch provider |

---

## License

MIT
