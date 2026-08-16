/**
 * Text-to-speech via the free Microsoft Edge Read Aloud endpoint (msedge-tts,
 * no API key). Output is deliberately low-bitrate mono MP3 to keep files ~1MB.
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { BRIEFING_AUDIO_KBPS, BRIEFING_RATE, BRIEFING_VOICE } from "./types";

const TTS_TIMEOUT_MS = 90_000;

export async function synthesizeBriefing(text: string): Promise<{ buffer: Buffer; durationS: number }> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(BRIEFING_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate: BRIEFING_RATE });

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        audioStream.destroy();
        reject(new Error(`TTS timed out after ${TTS_TIMEOUT_MS / 1000}s`));
      }, TTS_TIMEOUT_MS);
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      audioStream.on("error", (e: Error) => {
        clearTimeout(timer);
        reject(e);
      });
    });

    if (buffer.length < 1024) {
      throw new Error(`TTS returned suspiciously small audio (${buffer.length} bytes)`);
    }
    return { buffer, durationS: (buffer.length * 8) / (BRIEFING_AUDIO_KBPS * 1000) };
  } finally {
    try {
      tts.close();
    } catch {
      // socket may already be closed
    }
  }
}
