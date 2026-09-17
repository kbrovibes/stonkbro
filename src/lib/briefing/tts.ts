/**
 * Text-to-speech via the free Microsoft Edge Read Aloud endpoint (msedge-tts,
 * no API key). Output is deliberately low-bitrate mono MP3 to keep files ~1MB.
 *
 * The free endpoint is unreliable on a single long call — "midday" and
 * "close" transcripts (2.2–3.2k chars, no shorter than "premarket" ones that
 * succeed) were failing on essentially every run, either timing out or
 * having the stream close before turn.end. There's no documented length
 * limit to target directly, so instead of guessing at one, the transcript is
 * chunked into small (~450 char) sentence-aligned pieces, each synthesized
 * independently with its own retry, and the resulting MP3 buffers
 * concatenated — small enough that whatever intermittent limit or flakiness
 * the endpoint has, a chunk rarely hits it, and a failed chunk gets one
 * fresh-connection retry rather than failing the whole briefing.
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { BRIEFING_AUDIO_KBPS, BRIEFING_RATE, BRIEFING_VOICE } from "./types";

const CHUNK_TIMEOUT_MS = 30_000;
const CHUNK_TARGET_CHARS = 450;
const CHUNK_RETRIES = 2;

/** Splits on sentence boundaries, then greedily packs sentences into chunks
 *  no longer than the target — never splitting a sentence mid-way. */
function chunkTranscript(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) ?? [text];

  const chunks: string[] = [];
  let current = "";
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (current && current.length + s.length + 1 > CHUNK_TARGET_CHARS) {
      chunks.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function synthesizeChunk(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(BRIEFING_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate: BRIEFING_RATE });

    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        audioStream.destroy();
        reject(new Error(`TTS chunk timed out after ${CHUNK_TIMEOUT_MS / 1000}s`));
      }, CHUNK_TIMEOUT_MS);
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
  } finally {
    try {
      tts.close();
    } catch {
      // socket may already be closed
    }
  }
}

async function synthesizeChunkWithRetry(text: string): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= CHUNK_RETRIES; attempt++) {
    try {
      const buf = await synthesizeChunk(text);
      if (buf.length < 256) throw new Error(`TTS chunk returned suspiciously small audio (${buf.length} bytes)`);
      return buf;
    } catch (e) {
      lastErr = e;
      if (attempt < CHUNK_RETRIES) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function synthesizeBriefing(text: string): Promise<{ buffer: Buffer; durationS: number }> {
  const chunks = chunkTranscript(text);
  const buffers: Buffer[] = [];
  // Sequential, not parallel — the free endpoint is the same shared resource
  // whose flakiness this is working around; hammering it concurrently would
  // make things worse, not faster.
  for (const chunk of chunks) {
    buffers.push(await synthesizeChunkWithRetry(chunk));
  }
  const buffer = Buffer.concat(buffers);
  if (buffer.length < 1024) {
    throw new Error(`TTS returned suspiciously small audio (${buffer.length} bytes)`);
  }
  return { buffer, durationS: (buffer.length * 8) / (BRIEFING_AUDIO_KBPS * 1000) };
}
