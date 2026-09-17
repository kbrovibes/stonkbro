/**
 * Text-to-speech via the free Microsoft Edge Read Aloud endpoint (msedge-tts,
 * no API key). Output is deliberately low-bitrate mono MP3 to keep files ~1MB.
 *
 * Root cause of "midday"/"close" briefings almost always having no audio:
 * `msedge-tts` interpolates the input text directly into an SSML/XML
 * template with zero escaping (see `_SSMLTemplate` in the package). A
 * transcript that says "S&P 500" — routine market-recap phrasing — sends a
 * bare `&`, which breaks the XML server-side and the connection closes
 * before completing ("Stream closed before the synthesis completed (no
 * turn.end received)"). `premarket` transcripts happened to phrase it as
 * "S and P" and so never hit this; `midday`/`close` regularly wrote "S&P".
 * Escaping `&`, `<`, `>` before it ever reaches the library is the actual
 * fix for that failure mode.
 *
 * Chunking is a second, independent hardening: the transcript is split into
 * small (~450 char) sentence-aligned pieces, each synthesized on its own
 * connection with its own retry, and the resulting MP3 buffers
 * concatenated. That's what makes the 90s single-call timeout (the other
 * observed failure) unlikely to recur, and keeps one bad chunk from failing
 * the whole briefing.
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { BRIEFING_AUDIO_KBPS, BRIEFING_RATE, BRIEFING_VOICE } from "./types";

const CHUNK_TIMEOUT_MS = 30_000;
const CHUNK_TARGET_CHARS = 450;
const CHUNK_RETRIES = 3;

/** msedge-tts embeds this raw in an XML/SSML template with no escaping of its own. */
function escapeForSsml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
    const { audioStream } = tts.toStream(escapeForSsml(text), { rate: BRIEFING_RATE });

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
