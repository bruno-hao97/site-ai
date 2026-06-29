import { config } from '../config.js';

const CHAT_BASE = 'https://api.gommo.net/api/v2';

function uuid(): string {
  return crypto.randomUUID();
}

async function upstreamChat(systemPrompt: string, userText: string, timeoutMs = 90_000): Promise<string> {
  const token = config.gommo.accessToken?.trim();
  if (!token) throw new Error('Server chưa cấu hình GOMMO_ACCESS_TOKEN.');

  const domain = config.gommo.domain;
  const sessionId = uuid();
  const userMessageId = uuid();
  const assistantMessageId = uuid();
  const sendText = `${systemPrompt}\n\n${userText}`;

  const form = new URLSearchParams();
  form.set('action', 'stream');
  form.set('access_token', token);
  form.set('domain', domain);
  form.set('server', 'cursorai');
  form.set('model', 'composer-2.5-fast');
  form.set('mode', 'composer-2.5-fast');
  form.set('body_type', 'chat_completions');
  form.set('agent_id', 'd234b19ae119f741696eafa913d246cc');
  form.set('session_id', sessionId);
  form.set('project_id', config.gommo.projectId);
  form.set('user_message_id', userMessageId);
  form.set('assistant_message_id', assistantMessageId);
  form.set(
    'messages',
    JSON.stringify([{ role: 'user', text: sendText, attachments: [] }]),
  );
  form.set('device_id', 'site-ai-composer');
  form.set('device_name', 'SiteAI');

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(`${CHAT_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: ac.signal,
    });

    if (!res.ok) throw new Error(`Gommo chat HTTP ${res.status}`);

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const j = (await res.json()) as { message?: string };
      throw new Error(j.message || 'Gommo từ chối yêu cầu.');
    }

    if (!res.body) throw new Error('Gommo không trả luồng dữ liệu.');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let reply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string | null } }[];
          };
          const content = json.choices?.[0]?.delta?.content;
          if (content) reply += content;
        } catch {
          /* skip */
        }
      }
    }

    return reply.trim();
  } finally {
    clearTimeout(timer);
  }
}

function stripReply(text: string): string {
  return text
    .trim()
    .replace(/^```[\s\S]*?\n|```$/g, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

const ENHANCE_SYSTEM =
  'You are an expert prompt engineer for AI image and video generation.\n' +
  'Given a user brief (any language), output ONLY one enhanced English prompt.\n' +
  'Include subject, environment, lighting, camera/motion (for video), style, and quality cues.\n' +
  'No markdown, no quotes, no explanation — prompt text only.';

const NORMALIZE_SYSTEM =
  'You normalize prompts for AI media generation.\n' +
  'Fix grammar, remove redundant words, keep the original meaning and language.\n' +
  'Output ONLY the normalized prompt — no markdown, no quotes, no explanation.';

const SHOTS_SYSTEM =
  'You write multi-shot video storyboards.\n' +
  'Given a brief, output ONLY a JSON array of 2–6 objects: [{"prompt":"scene description in English"}, ...].\n' +
  'Each prompt is one cinematic shot, 1–3 sentences. No markdown, no extra text.';

function mediaLabel(jobType: string): string {
  if (jobType === 'video') return 'video';
  if (jobType === 'music') return 'music';
  if (jobType === 'tts') return 'text-to-speech';
  return 'image';
}

export async function enhancePromptUpstream(text: string, jobType: string): Promise<string> {
  const reply = await upstreamChat(
    ENHANCE_SYSTEM,
    `Enhance this ${mediaLabel(jobType)} generation brief into a production-ready prompt:\n\n${text.trim()}`,
  );
  return stripReply(reply);
}

export async function normalizePromptUpstream(text: string, jobType: string): Promise<string> {
  const reply = await upstreamChat(
    NORMALIZE_SYSTEM,
    `Normalize this ${mediaLabel(jobType)} generation prompt:\n\n${text.trim()}`,
    60_000,
  );
  return stripReply(reply);
}

export async function generateShotsUpstream(text: string, jobType: string): Promise<string> {
  const reply = await upstreamChat(
    SHOTS_SYSTEM,
    `Create a ${mediaLabel(jobType)} storyboard from this brief:\n\n${text.trim()}`,
    120_000,
  );
  return stripReply(reply);
}
