#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/image-gen.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_https = __toESM(require("node:https"), 1);
var import_node_readline = __toESM(require("node:readline"), 1);
var OPENAI_API_KEY = process.env["OPENAI_API_KEY"] || "";
var GEMINI_API_KEY = process.env["GEMINI_API_KEY"] || "";
var OUTPUT_DIR = import_node_path.default.resolve("image_output");
var HISTORY_FILE = import_node_path.default.join(OUTPUT_DIR, "history.json");
function ensureOutputDir() {
  if (!import_node_fs.default.existsSync(OUTPUT_DIR)) {
    import_node_fs.default.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}
function loadHistory() {
  if (!import_node_fs.default.existsSync(HISTORY_FILE)) return [];
  try {
    const raw = import_node_fs.default.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function saveHistory(history) {
  ensureOutputDir();
  import_node_fs.default.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}
function generateFilename(prefix, provider) {
  const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${prefix}_${provider}_${ts}.png`;
}
function createRl() {
  return import_node_readline.default.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}
function httpsRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method,
      headers
    };
    const req = import_node_https.default.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const data = Buffer.concat(chunks).toString("utf-8");
        resolve({ status: res.statusCode || 0, data });
      });
    });
    req.on("error", reject);
    req.setTimeout(12e4, () => {
      req.destroy(new Error("Request timed out (120s)"));
    });
    if (body) {
      req.write(body);
    }
    req.end();
  });
}
function httpsMultipartRequest(url, headers, fields, file) {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Date.now().toString(36) + Math.random().toString(36).slice(2);
    const parts = [];
    for (const field of fields) {
      parts.push(Buffer.from(
        `--${boundary}\r
Content-Disposition: form-data; name="${field.name}"\r
\r
${field.value}\r
`
      ));
    }
    parts.push(Buffer.from(
      `--${boundary}\r
Content-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r
Content-Type: ${file.contentType}\r
\r
`
    ));
    parts.push(file.data);
    parts.push(Buffer.from(`\r
--${boundary}--\r
`));
    const body = Buffer.concat(parts);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(body.length)
      }
    };
    const req = import_node_https.default.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const data = Buffer.concat(chunks).toString("utf-8");
        resolve({ status: res.statusCode || 0, data });
      });
    });
    req.on("error", reject);
    req.setTimeout(12e4, () => {
      req.destroy(new Error("Request timed out (120s)"));
    });
    req.write(body);
    req.end();
  });
}
async function openaiGenerate(prompt, size, model) {
  const payload = JSON.stringify({
    model,
    prompt,
    n: 1,
    size,
    response_format: "b64_json"
  });
  const resp = await httpsRequest(
    "https://api.openai.com/v1/images/generations",
    "POST",
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Length": String(Buffer.byteLength(payload))
    },
    payload
  );
  if (resp.status !== 200) {
    let msg = `OpenAI API error (HTTP ${resp.status})`;
    try {
      const parsed2 = JSON.parse(resp.data);
      if (parsed2.error?.message) msg += `: ${parsed2.error.message}`;
    } catch {
    }
    throw new Error(msg);
  }
  const parsed = JSON.parse(resp.data);
  const b64 = parsed.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data in OpenAI response");
  return Buffer.from(b64, "base64");
}
async function openaiEdit(imagePath, prompt, size, model) {
  const imageData = import_node_fs.default.readFileSync(imagePath);
  const ext = import_node_path.default.extname(imagePath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const filename = import_node_path.default.basename(imagePath);
  const fields = [
    { name: "model", value: model },
    { name: "prompt", value: prompt },
    { name: "n", value: "1" },
    { name: "size", value: size },
    { name: "response_format", value: "b64_json" }
  ];
  const resp = await httpsMultipartRequest(
    "https://api.openai.com/v1/images/edits",
    { Authorization: `Bearer ${OPENAI_API_KEY}` },
    fields,
    { name: "image", filename, contentType, data: imageData }
  );
  if (resp.status !== 200) {
    let msg = `OpenAI API error (HTTP ${resp.status})`;
    try {
      const parsed2 = JSON.parse(resp.data);
      if (parsed2.error?.message) msg += `: ${parsed2.error.message}`;
    } catch {
    }
    throw new Error(msg);
  }
  const parsed = JSON.parse(resp.data);
  const b64 = parsed.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data in OpenAI response");
  return Buffer.from(b64, "base64");
}
async function geminiGenerateImagen(prompt) {
  const IMAGEN_MODELS = [
    "imagen-3.0-generate-002",
    "imagen-3.0-generate-001"
  ];
  for (const model of IMAGEN_MODELS) {
    const payload = JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 }
    });
    const predictUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_API_KEY}`;
    const predictResp = await httpsRequest(predictUrl, "POST", {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload))
    }, payload);
    if (predictResp.status === 200) {
      const parsed = JSON.parse(predictResp.data);
      const b64 = parsed.predictions?.[0]?.bytesBase64Encoded;
      if (b64) return Buffer.from(b64, "base64");
    }
    if (predictResp.status !== 404 && predictResp.status !== 400) {
      console.log(`    ${model} (predict): HTTP ${predictResp.status}`);
      try {
        const p = JSON.parse(predictResp.data);
        if (p.error?.message) console.log(`      ${p.error.message}`);
      } catch {
      }
    }
    const genPayload = JSON.stringify({
      prompt,
      config: { numberOfImages: 1 }
    });
    const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImages?key=${GEMINI_API_KEY}`;
    const genResp = await httpsRequest(genUrl, "POST", {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(genPayload))
    }, genPayload);
    if (genResp.status === 200) {
      const parsed = JSON.parse(genResp.data);
      const img = parsed.generatedImages?.[0]?.image?.imageBytes || parsed.generatedImages?.[0]?.image?.bytesBase64Encoded;
      if (img) return Buffer.from(img, "base64");
    }
    if (genResp.status !== 404 && genResp.status !== 400) {
      console.log(`    ${model} (generateImages): HTTP ${genResp.status}`);
      try {
        const p = JSON.parse(genResp.data);
        if (p.error?.message) console.log(`      ${p.error.message}`);
      } catch {
      }
    }
  }
  return null;
}
async function geminiGenerateFlash(prompt) {
  const FLASH_MODELS = [
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-exp"
  ];
  for (const model of FLASH_MODELS) {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"]
      }
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const resp = await httpsRequest(url, "POST", {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload))
    }, payload);
    if (resp.status === 404) {
      console.log(`    ${model}: not available`);
      continue;
    }
    if (resp.status !== 200) {
      console.log(`    ${model}: HTTP ${resp.status}`);
      try {
        const p = JSON.parse(resp.data);
        if (p.error?.message) console.log(`      ${p.error.message}`);
      } catch {
      }
      continue;
    }
    const parsed = JSON.parse(resp.data);
    const parts = parsed.candidates?.[0]?.content?.parts;
    if (!parts) {
      console.log(`    ${model}: no image in response`);
      continue;
    }
    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
    console.log(`    ${model}: response had no image data`);
  }
  return null;
}
async function listGeminiModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}&pageSize=100`;
  const resp = await httpsRequest(url, "GET", {}, void 0);
  if (resp.status !== 200) return [];
  try {
    const parsed = JSON.parse(resp.data);
    const models = [];
    for (const m of parsed.models || []) {
      models.push(m.name?.replace("models/", "") || "");
    }
    return models;
  } catch {
    return [];
  }
}
function extractRetryDelay(responseData) {
  const match = responseData.match(/retry in ([\d.]+)s/i);
  if (match) return Math.ceil(parseFloat(match[1]));
  return null;
}
async function geminiGenerateViaGenerateContent(prompt, model) {
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
    generationConfig: {
      responseModalities: ["IMAGE"]
    }
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await httpsRequest(url, "POST", {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload))
    }, payload);
    if (resp.status === 429) {
      const retryIn = extractRetryDelay(resp.data) || 20;
      console.log(`    ${model}: rate limited, waiting ${retryIn}s...`);
      await new Promise((r) => setTimeout(r, retryIn * 1e3));
      continue;
    }
    if (resp.status !== 200) {
      console.log(`    ${model} (generateContent): HTTP ${resp.status}`);
      try {
        const p = JSON.parse(resp.data);
        if (p.error?.message) console.log(`      ${p.error.message}`);
      } catch {
      }
      return null;
    }
    const parsed = JSON.parse(resp.data);
    const parts = parsed.candidates?.[0]?.content?.parts;
    if (!parts) return null;
    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
    return null;
  }
  console.log(`    ${model}: still rate limited after retries`);
  return null;
}
async function geminiGenerateViaGenerateImages(prompt, model) {
  const payload = JSON.stringify({
    prompt,
    config: { numberOfImages: 1 }
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImages?key=${GEMINI_API_KEY}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await httpsRequest(url, "POST", {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload))
    }, payload);
    if (resp.status === 429) {
      const retryIn = extractRetryDelay(resp.data) || 20;
      console.log(`    ${model}: rate limited, waiting ${retryIn}s...`);
      await new Promise((r) => setTimeout(r, retryIn * 1e3));
      continue;
    }
    if (resp.status === 404 || resp.status === 400) {
      console.log(`    ${model} (generateImages): HTTP ${resp.status}`);
      try {
        const p = JSON.parse(resp.data);
        if (p.error?.message) console.log(`      ${p.error.message}`);
      } catch {
      }
      return null;
    }
    if (resp.status !== 200) {
      console.log(`    ${model} (generateImages): HTTP ${resp.status}`);
      try {
        const p = JSON.parse(resp.data);
        if (p.error?.message) console.log(`      ${p.error.message}`);
      } catch {
      }
      return null;
    }
    const parsed = JSON.parse(resp.data);
    const img = parsed.generatedImages?.[0]?.image?.imageBytes || parsed.generatedImages?.[0]?.image?.bytesBase64Encoded;
    if (img) return Buffer.from(img, "base64");
    return null;
  }
  console.log(`    ${model}: still rate limited after retries`);
  return null;
}
async function geminiGenerate(prompt) {
  console.log("  Trying Imagen models...");
  const imagenResult = await geminiGenerateImagen(prompt);
  if (imagenResult) return imagenResult;
  console.log("  Trying Gemini Flash experimental models...");
  const flashResult = await geminiGenerateFlash(prompt);
  if (flashResult) return flashResult;
  console.log("  Discovering available image models on your API key...");
  const allModels = await listGeminiModels();
  const geminiImageModels = allModels.filter(
    (m) => m.includes("image") && !m.includes("imagen")
  );
  const imagenModels = allModels.filter((m) => m.includes("imagen"));
  if (geminiImageModels.length > 0) {
    console.log(`  Found Gemini image model(s): ${geminiImageModels.join(", ")}`);
    for (const model of geminiImageModels) {
      console.log(`  Trying ${model} (generateContent)...`);
      const result = await geminiGenerateViaGenerateContent(prompt, model);
      if (result) return result;
    }
  }
  if (imagenModels.length > 0) {
    console.log(`  Found Imagen model(s): ${imagenModels.join(", ")}`);
    for (const model of imagenModels) {
      console.log(`  Trying ${model} (generateImages)...`);
      const result = await geminiGenerateViaGenerateImages(prompt, model);
      if (result) return result;
      console.log(`  Trying ${model} (predict)...`);
      const predictPayload = JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 }
      });
      const predictUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_API_KEY}`;
      const predictResp = await httpsRequest(predictUrl, "POST", {
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(predictPayload))
      }, predictPayload);
      if (predictResp.status === 200) {
        const parsed = JSON.parse(predictResp.data);
        const b64 = parsed.predictions?.[0]?.bytesBase64Encoded;
        if (b64) return Buffer.from(b64, "base64");
      } else if (predictResp.status !== 404) {
        console.log(`    ${model} (predict): HTTP ${predictResp.status}`);
        try {
          const p = JSON.parse(predictResp.data);
          if (p.error?.message) console.log(`      ${p.error.message}`);
        } catch {
        }
      }
    }
  }
  if (geminiImageModels.length === 0 && imagenModels.length === 0) {
    const availableNames = allModels.length > 0 ? `
  Available models on your key: ${allModels.slice(0, 15).join(", ")}${allModels.length > 15 ? ` ... and ${allModels.length - 15} more` : ""}` : "\n  Could not list available models.";
    throw new Error(
      "No image generation models found on your API key." + availableNames + "\n  Check https://ai.google.dev/ that your API key has image generation access enabled."
    );
  }
  throw new Error(
    "All image models were tried but none succeeded. The most likely cause is:\n  - Free tier quota exhausted (limit: 0 for image generation)\n  - You need to enable billing on your Google AI project at https://ai.google.dev/\n  - Or switch to a paid API key with image generation quota"
  );
}
async function geminiEditImagen(imagePath, prompt) {
  const imageData = import_node_fs.default.readFileSync(imagePath);
  const b64Image = imageData.toString("base64");
  const IMAGEN_MODELS = [
    "imagen-3.0-capability-001",
    "imagen-3.0-generate-002"
  ];
  for (const model of IMAGEN_MODELS) {
    const payload = JSON.stringify({
      instances: [{
        prompt,
        image: { bytesBase64Encoded: b64Image }
      }],
      parameters: { sampleCount: 1 }
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_API_KEY}`;
    const resp = await httpsRequest(url, "POST", {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload))
    }, payload);
    if (resp.status === 404 || resp.status === 400) continue;
    if (resp.status === 200) {
      const parsed = JSON.parse(resp.data);
      const b64 = parsed.predictions?.[0]?.bytesBase64Encoded;
      if (b64) return Buffer.from(b64, "base64");
    }
  }
  return null;
}
async function geminiEditFlash(imagePath, prompt) {
  const imageData = import_node_fs.default.readFileSync(imagePath);
  const b64Image = imageData.toString("base64");
  const ext = import_node_path.default.extname(imagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const FLASH_MODELS = [
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-exp"
  ];
  const payload = JSON.stringify({
    contents: [{
      parts: [
        { inlineData: { mimeType, data: b64Image } },
        { text: prompt }
      ]
    }],
    generationConfig: {
      responseModalities: ["IMAGE"]
    }
  });
  for (const model of FLASH_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const resp = await httpsRequest(url, "POST", {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload))
    }, payload);
    if (resp.status === 404) continue;
    if (resp.status !== 200) continue;
    const parsed = JSON.parse(resp.data);
    const parts = parsed.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }
  return null;
}
async function geminiEdit(imagePath, prompt) {
  console.log("  Trying Imagen edit models...");
  const imagenResult = await geminiEditImagen(imagePath, prompt);
  if (imagenResult) return imagenResult;
  console.log("  Trying Gemini Flash edit models...");
  const flashResult = await geminiEditFlash(imagePath, prompt);
  if (flashResult) return flashResult;
  throw new Error(
    "Gemini image edit failed. None of the available models could edit the image. Make sure your Gemini API key has access to image generation models."
  );
}
async function chooseProvider(rl) {
  const hasOpenai = OPENAI_API_KEY.length > 0;
  const hasGemini = GEMINI_API_KEY.length > 0;
  if (hasOpenai && hasGemini) {
    console.log("");
    console.log("  Choose provider:");
    console.log("    1) OpenAI (DALL-E 3 / gpt-image-1)");
    console.log("    2) Gemini (gemini-2.0-flash image generation)");
    const choice = await ask(rl, "  Provider [1]: ");
    if (choice === "2") return "gemini";
    return "openai";
  }
  if (hasOpenai) return "openai";
  return "gemini";
}
async function chooseOpenaiModel(rl) {
  console.log("");
  console.log("  OpenAI model:");
  console.log("    1) dall-e-3 (default)");
  console.log("    2) gpt-image-1");
  const choice = await ask(rl, "  Model [1]: ");
  if (choice === "2") return "gpt-image-1";
  return "dall-e-3";
}
async function chooseSize(rl, provider, model) {
  if (provider === "gemini") {
    return "auto";
  }
  console.log("");
  console.log("  Image size:");
  if (model === "dall-e-3") {
    console.log("    1) 1024x1024 (default)");
    console.log("    2) 1792x1024 (landscape)");
    console.log("    3) 1024x1792 (portrait)");
    const choice2 = await ask(rl, "  Choose size [1]: ");
    if (choice2 === "2") return "1792x1024";
    if (choice2 === "3") return "1024x1792";
    return "1024x1024";
  }
  console.log("    1) 1024x1024 (default)");
  console.log("    2) 512x512");
  console.log("    3) 256x256");
  const choice = await ask(rl, "  Choose size [1]: ");
  if (choice === "2") return "512x512";
  if (choice === "3") return "256x256";
  return "1024x1024";
}
async function handleGenerate(rl) {
  const provider = await chooseProvider(rl);
  const prompt = await ask(rl, "\n  Describe the image you want to generate:\n  > ");
  if (!prompt) {
    console.log("  No prompt entered. Returning to menu.");
    return;
  }
  let model = "";
  if (provider === "openai") {
    model = await chooseOpenaiModel(rl);
  } else {
    model = "gemini-2.0-flash (auto-detect)";
  }
  const size = await chooseSize(rl, provider, model);
  const filename = generateFilename("generated", provider);
  const filePath = import_node_path.default.join(OUTPUT_DIR, filename);
  console.log("");
  console.log(`  Provider: ${provider === "openai" ? "OpenAI" : "Gemini"}`);
  if (provider === "openai") console.log(`  Model: ${model}`);
  if (size !== "auto") console.log(`  Size: ${size}`);
  console.log(`  Prompt: "${prompt}"`);
  console.log("  Generating...");
  console.log("");
  try {
    let buffer;
    if (provider === "openai") {
      buffer = await openaiGenerate(prompt, size, model);
    } else {
      buffer = await geminiGenerate(prompt);
    }
    ensureOutputDir();
    import_node_fs.default.writeFileSync(filePath, buffer);
    const history = loadHistory();
    const entry = {
      id: history.length + 1,
      type: "generate",
      provider,
      model,
      prompt,
      size,
      filePath,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    history.push(entry);
    saveHistory(history);
    console.log(`  Image saved: ${filePath}`);
    console.log(`  Size: ${(buffer.length / 1024).toFixed(1)} KB`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  Error generating image: ${message}`);
  }
}
async function handleEdit(rl) {
  const provider = await chooseProvider(rl);
  const imagePath = await ask(rl, "\n  Path to the image you want to edit:\n  > ");
  if (!imagePath) {
    console.log("  No path entered. Returning to menu.");
    return;
  }
  const resolved = import_node_path.default.resolve(imagePath);
  if (!import_node_fs.default.existsSync(resolved)) {
    console.log(`  Error: File not found: ${resolved}`);
    return;
  }
  const ext = import_node_path.default.extname(resolved).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    console.log("  Error: Unsupported image format. Use PNG, JPG, JPEG, or WebP.");
    return;
  }
  const prompt = await ask(rl, "\n  Describe how you want to edit this image:\n  > ");
  if (!prompt) {
    console.log("  No prompt entered. Returning to menu.");
    return;
  }
  let model = "";
  if (provider === "openai") {
    model = await chooseOpenaiModel(rl);
  } else {
    model = "gemini-2.0-flash (auto-detect)";
  }
  const size = await chooseSize(rl, provider, model);
  const filename = generateFilename("edited", provider);
  const filePath = import_node_path.default.join(OUTPUT_DIR, filename);
  console.log("");
  console.log(`  Provider: ${provider === "openai" ? "OpenAI" : "Gemini"}`);
  if (provider === "openai") console.log(`  Model: ${model}`);
  if (size !== "auto") console.log(`  Size: ${size}`);
  console.log(`  Source: ${resolved}`);
  console.log(`  Prompt: "${prompt}"`);
  console.log("  Editing...");
  console.log("");
  try {
    let buffer;
    if (provider === "openai") {
      buffer = await openaiEdit(resolved, prompt, size, model);
    } else {
      buffer = await geminiEdit(resolved, prompt);
    }
    ensureOutputDir();
    import_node_fs.default.writeFileSync(filePath, buffer);
    const history = loadHistory();
    const entry = {
      id: history.length + 1,
      type: "edit",
      provider,
      model,
      prompt,
      size,
      filePath,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      sourceImage: resolved
    };
    history.push(entry);
    saveHistory(history);
    console.log(`  Edited image saved: ${filePath}`);
    console.log(`  Size: ${(buffer.length / 1024).toFixed(1)} KB`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  Error editing image: ${message}`);
  }
}
function handleHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    console.log("\n  No image history found.");
    return;
  }
  console.log(`
  === Image History (${history.length} entries) ===
`);
  for (const entry of history) {
    const date = new Date(entry.timestamp);
    const dateStr = date.toLocaleString();
    const typeLabel = entry.type === "generate" ? "Generated" : "Edited";
    const providerLabel = entry.provider === "openai" ? "OpenAI" : "Gemini";
    console.log(`  #${entry.id} | ${dateStr} | ${typeLabel} | ${providerLabel} (${entry.model}) | ${entry.size}`);
    console.log(`    Prompt: "${entry.prompt}"`);
    console.log(`    File:   ${entry.filePath}`);
    if (entry.sourceImage) {
      console.log(`    Source: ${entry.sourceImage}`);
    }
    console.log("");
  }
}
async function main() {
  const hasOpenai = OPENAI_API_KEY.length > 0;
  const hasGemini = GEMINI_API_KEY.length > 0;
  console.log("");
  console.log("  ========================================");
  console.log("   AI Image Generator");
  console.log("   Supports OpenAI (DALL-E 3 / gpt-image-1)");
  console.log("   and Google Gemini image generation");
  console.log("  ========================================");
  console.log("");
  if (!hasOpenai && !hasGemini) {
    console.log("  Error: No API keys found. Set at least one:");
    console.log("");
    console.log("    OPENAI_API_KEY=sk-...   (for DALL-E 3 / gpt-image-1)");
    console.log("    GEMINI_API_KEY=AI...    (for Gemini image generation)");
    console.log("");
    console.log("  Examples:");
    console.log("    Linux/macOS:");
    console.log("      OPENAI_API_KEY=sk-abc123 node image-gen.js");
    console.log("      GEMINI_API_KEY=AIza... node image-gen.js");
    console.log("      OPENAI_API_KEY=sk-abc123 GEMINI_API_KEY=AIza... node image-gen.js");
    console.log("");
    console.log("    Windows (Command Prompt):");
    console.log("      set OPENAI_API_KEY=sk-abc123 && node image-gen.js");
    console.log("      set GEMINI_API_KEY=AIza... && node image-gen.js");
    console.log("");
    console.log("    Windows (PowerShell):");
    console.log('      $env:OPENAI_API_KEY="sk-abc123"; node image-gen.js');
    console.log('      $env:GEMINI_API_KEY="AIza..."; node image-gen.js');
    process.exit(1);
  }
  console.log("  API keys detected:");
  if (hasOpenai) console.log("    OpenAI:  set (DALL-E 3, gpt-image-1)");
  if (hasGemini) console.log("    Gemini:  set (gemini-2.0-flash image generation)");
  if (hasOpenai && hasGemini) console.log("    Both providers available - you can choose per generation");
  console.log("");
  console.log(`  Output folder: ${OUTPUT_DIR}`);
  ensureOutputDir();
  const rl = createRl();
  let running = true;
  while (running) {
    console.log("");
    console.log("  ---- Menu ----");
    console.log("    1) Generate - Create an image from a text prompt");
    console.log("    2) Edit    - Edit an existing image with a text prompt");
    console.log("    3) History - View past generations");
    console.log("    4) Quit");
    console.log("");
    const choice = await ask(rl, "  Choose an option [1-4]: ");
    switch (choice) {
      case "1":
        await handleGenerate(rl);
        break;
      case "2":
        await handleEdit(rl);
        break;
      case "3":
        handleHistory();
        break;
      case "4":
      case "q":
      case "quit":
      case "exit":
        running = false;
        console.log("\n  Goodbye!\n");
        break;
      default:
        console.log("  Invalid choice. Please enter 1, 2, 3, or 4.");
        break;
    }
  }
  rl.close();
}
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
