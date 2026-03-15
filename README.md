# AI Image Generator CLI

A standalone Node.js command-line tool for generating and editing images using **OpenAI** (DALL-E 3 / gpt-image-1) and **Google Gemini** (Gemini Flash Image / Imagen 4). No npm install required — just Node.js and your API key.

Created by **Krainium**.

---

## Features

- **Dual provider support** — use OpenAI, Gemini, or both side by side
- **Image generation** — create images from text prompts
- **Image editing** — modify existing images with text descriptions
- **Model selection** — choose between DALL-E 3 and gpt-image-1 (OpenAI), or auto-detected Gemini/Imagen models
- **Multiple size options** — DALL-E 3: 1024x1024, 1792x1024, 1024x1792 | gpt-image-1: 1024x1024, 512x512, 256x256 | Gemini: automatic
- **Zero dependencies** — single `.js` file, uses only Node.js built-in modules
- **Works on Windows, macOS, and Linux**
- **Generation history** — JSON log tracks every generation with prompt, timestamp, provider, model, and file path
- **Interactive menu** — simple numbered menu, no commands to memorize
- **Smart model discovery** — automatically finds image-capable models available on your Gemini API key
- **Rate limit handling** — detects 429 responses, parses retry delay, waits and retries automatically

---

## Requirements

- **Node.js 18+** — [Download here](https://nodejs.org)
- At least one API key:
  - **OpenAI API key** — get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - **Gemini API key** — get one at [ai.google.dev](https://ai.google.dev)

### Gemini API Key Note

Gemini image generation requires a **paid API key** with billing enabled. Free tier keys have a quota of 0 for image generation and will return rate limit errors. To enable billing:

1. Go to [ai.google.dev](https://ai.google.dev)
2. Open your project settings
3. Enable billing / upgrade to a paid plan
4. Image generation models (Gemini Flash Image, Imagen 4) will unlock automatically

---

## Quick Start

1. Download `image-gen.js`
2. Run with your API key:

```bash
# OpenAI
OPENAI_API_KEY=sk-your-key-here node image-gen.js

# Gemini
GEMINI_API_KEY=AIza-your-key-here node image-gen.js

# Both providers
OPENAI_API_KEY=sk-abc123 GEMINI_API_KEY=AIza-xyz789 node image-gen.js
```

That's it. The interactive menu walks you through everything.

---

## Usage

### Setting API Keys

**Linux / macOS:**
```bash
# Set for a single run
OPENAI_API_KEY=sk-abc123 node image-gen.js

# Or export for the session
export OPENAI_API_KEY=sk-abc123
export GEMINI_API_KEY=AIza-xyz789
node image-gen.js
```

**Windows (Command Prompt):**
```cmd
set OPENAI_API_KEY=sk-abc123 && node image-gen.js

:: Both providers
set OPENAI_API_KEY=sk-abc123 && set GEMINI_API_KEY=AIza-xyz789 && node image-gen.js
```

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-abc123"; node image-gen.js

# Both providers
$env:OPENAI_API_KEY="sk-abc123"; $env:GEMINI_API_KEY="AIza-xyz789"; node image-gen.js
```

### Interactive Menu

```
  ========================================
   AI Image Generator
   Supports OpenAI (DALL-E 3 / gpt-image-1)
   and Google Gemini image generation
  ========================================

  API keys detected:
    OpenAI:  set (DALL-E 3, gpt-image-1)
    Gemini:  set (gemini-2.0-flash image generation)
    Both providers available - you can choose per generation

  Output folder: /home/user/image_output

  ---- Menu ----
    1) Generate - Create an image from a text prompt
    2) Edit    - Edit an existing image with a text prompt
    3) History - View past generations
    4) Quit
```

---

## Menu Options

### 1) Generate

Create a new image from a text description.

1. **Choose provider** (if both API keys are set) — OpenAI or Gemini
2. **Enter your prompt** — describe the image you want
3. **Choose model** (OpenAI only) — DALL-E 3 or gpt-image-1
4. **Choose size** (OpenAI only) — depends on the model selected
5. Image is generated, saved, and logged to history

**Example:**
```
  Describe the image you want to generate:
  > A golden retriever wearing sunglasses on a beach at sunset

  Provider: OpenAI
  Model: dall-e-3
  Size: 1024x1024
  Prompt: "A golden retriever wearing sunglasses on a beach at sunset"
  Generating...

  Image saved: /home/user/image_output/generated_openai_2026-03-15T16-30-00.png
  Size: 1247.3 KB
```

### 2) Edit

Modify an existing image using a text prompt.

1. **Choose provider** (if both API keys are set)
2. **Enter the path** to the image you want to edit (PNG, JPG, JPEG, or WebP)
3. **Describe your edit** — what changes you want made
4. **Choose model and size** (OpenAI only)
5. Edited image is saved as a new file

**Example:**
```
  Path to the image you want to edit:
  > ./my-photo.png

  Describe how you want to edit this image:
  > Add a rainbow in the background

  Provider: OpenAI
  Model: gpt-image-1
  Size: 1024x1024
  Source: /home/user/my-photo.png
  Prompt: "Add a rainbow in the background"
  Editing...

  Edited image saved: /home/user/image_output/edited_openai_2026-03-15T16-35-00.png
  Size: 982.1 KB
```

### 3) History

Browse all past generations and edits.

```
  === Image History (3 entries) ===

  #1 | 3/15/2026, 4:30:00 PM | Generated | OpenAI (dall-e-3) | 1024x1024
    Prompt: "A golden retriever wearing sunglasses on a beach at sunset"
    File:   /home/user/image_output/generated_openai_2026-03-15T16-30-00.png

  #2 | 3/15/2026, 4:35:00 PM | Edited | OpenAI (gpt-image-1) | 1024x1024
    Prompt: "Add a rainbow in the background"
    File:   /home/user/image_output/edited_openai_2026-03-15T16-35-00.png
    Source: /home/user/my-photo.png

  #3 | 3/15/2026, 4:40:00 PM | Generated | Gemini (gemini-2.0-flash (auto-detect)) | auto
    Prompt: "A cyberpunk cityscape at night"
    File:   /home/user/image_output/generated_gemini_2026-03-15T16-40-00.png
```

### 4) Quit

Exit the program. All generated images and history are already saved.

---

## Output

All images are saved to an `image_output/` folder in the current directory.

### File Structure

```
image_output/
  generated_openai_2026-03-15T16-30-00.png
  generated_gemini_2026-03-15T16-40-00.png
  edited_openai_2026-03-15T16-35-00.png
  history.json
```

### Filenames

Files follow the pattern: `{type}_{provider}_{timestamp}.png`

- `type` — `generated` or `edited`
- `provider` — `openai` or `gemini`
- `timestamp` — ISO format with colons/dots replaced by dashes

### History File

`image_output/history.json` is a JSON array tracking every generation:

```json
[
  {
    "id": 1,
    "type": "generate",
    "provider": "openai",
    "model": "dall-e-3",
    "prompt": "A golden retriever wearing sunglasses on a beach at sunset",
    "size": "1024x1024",
    "filePath": "/home/user/image_output/generated_openai_2026-03-15T16-30-00.png",
    "timestamp": "2026-03-15T16:30:00.000Z"
  },
  {
    "id": 2,
    "type": "edit",
    "provider": "openai",
    "model": "gpt-image-1",
    "prompt": "Add a rainbow in the background",
    "size": "1024x1024",
    "filePath": "/home/user/image_output/edited_openai_2026-03-15T16-35-00.png",
    "timestamp": "2026-03-15T16:35:00.000Z",
    "sourceImage": "/home/user/my-photo.png"
  }
]
```

---

## Supported Models

### OpenAI

| Model | Sizes | Notes |
|-------|-------|-------|
| **dall-e-3** | 1024x1024, 1792x1024, 1024x1792 | Default. High quality, great with detailed prompts |
| **gpt-image-1** | 1024x1024, 512x512, 256x256 | Newer model, supports generation and editing |

### Gemini / Google

The script automatically discovers which image models are available on your API key. Known models include:

| Model | API Method | Notes |
|-------|-----------|-------|
| **gemini-2.5-flash-image** | generateContent | Fast image generation |
| **gemini-3-pro-image-preview** | generateContent | Higher quality |
| **gemini-3.1-flash-image-preview** | generateContent | Latest flash model |
| **imagen-4.0-generate-001** | generateImages / predict | Dedicated image model |
| **imagen-4.0-ultra-generate-001** | generateImages / predict | Highest quality Imagen |
| **imagen-4.0-fast-generate-001** | generateImages / predict | Fastest Imagen |

The script tries multiple API endpoints per model (`generateContent`, `generateImages`, `predict`) to find one that works.

---

## How It Works

### OpenAI Flow

1. Sends a POST request to `https://api.openai.com/v1/images/generations` (or `/edits` for editing)
2. Receives base64-encoded image data in the response
3. Decodes and saves as PNG

### Gemini Flow

The script uses a multi-strategy approach since Gemini has several image generation APIs:

1. **Imagen models** — tries `predict` and `generateImages` endpoints with known model names
2. **Gemini Flash experimental** — tries `generateContent` with `responseModalities: ["IMAGE"]`
3. **Auto-discovery** — calls the ListModels API to find all image-capable models on your key, then tries each one with the correct endpoint
4. **Rate limit retry** — if a model returns HTTP 429, parses the retry delay and waits automatically (up to 3 retries)

### Image Editing

- **OpenAI:** Uses multipart form upload to `/v1/images/edits` with the source image and edit prompt
- **Gemini:** Sends the source image as base64 inline data alongside the edit prompt via `generateContent`, or through Imagen's predict endpoint

---

## Troubleshooting

### "No API keys found"

Set at least one API key as an environment variable before running the script. See the [Setting API Keys](#setting-api-keys) section.

### Gemini: "rate limited" / "quota exceeded" / HTTP 429

Your Gemini API key is on the free tier, which has a quota of 0 for image generation. You need to enable billing on your Google AI project:

1. Go to [ai.google.dev](https://ai.google.dev)
2. Navigate to your project settings
3. Enable billing or upgrade to a paid plan
4. Re-run the script — the same API key will work once billing is enabled

### Gemini: "not available" / HTTP 404 for all models

The image generation models may not be available in your region, or your API key may not have been granted access yet. Try:

- Waiting a few minutes and retrying (new API keys sometimes take time to propagate)
- Checking [ai.google.dev](https://ai.google.dev) for model availability in your region
- Using OpenAI as an alternative (`OPENAI_API_KEY`)

### OpenAI: "billing_hard_limit_reached" or "insufficient_quota"

Your OpenAI account has exhausted its credits. Add funds at [platform.openai.com/account/billing](https://platform.openai.com/account/billing).

### "Unsupported image format"

The edit feature accepts PNG, JPG, JPEG, and WebP files only. Convert your image to one of these formats before editing.

### "Request timed out (120s)"

Image generation can take up to 2 minutes. If it consistently times out:

- Check your internet connection
- Try a simpler prompt
- Try the other provider

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | At least one | Your OpenAI API key (starts with `sk-`) |
| `GEMINI_API_KEY` | At least one | Your Google Gemini API key (starts with `AIza`) |

At least one API key must be set. If both are set, the script lets you choose which provider to use for each generation.

---

## License

MIT
