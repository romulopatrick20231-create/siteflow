// src/elevenlabs.js
// Módulo OPCIONAL — gera áudio MP3 via ElevenLabs API

import fs from "fs";
import path from "path";

const BASE_URL = "https://api.elevenlabs.io/v1";

/**
 * Gera um arquivo de áudio a partir do script e salva em /output/<slug>/audio.mp3
 * Retorna null se a API key não estiver configurada (modo desativado silencioso).
 */
export async function generateAudio(slug, scriptAudio) {
  const apiKey  = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)

  if (!apiKey) {
    console.log("   ⏭️  ElevenLabs não configurado — áudio pulado");
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: scriptAudio,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs erro ${response.status}: ${err}`);
    }

    const buffer   = await response.arrayBuffer();
    const outDir   = path.join("./output", slug);
    const filePath = path.join(outDir, "audio.mp3");

    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;

  } catch (err) {
    console.warn(`   ⚠️  Erro ao gerar áudio: ${err.message}`);
    return null;
  }
}
