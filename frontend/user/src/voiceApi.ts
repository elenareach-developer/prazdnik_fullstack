// Typed client for backend/voice/router.py (prefix /api/voice).
export type VoiceIntent =
  | "answer"
  | "ask_question"
  | "add_idea"
  | "update_celebration"
  | "get_celebration_info"
  | "suggest_activity";

export interface PendingAction {
  id: string;
  type: "add_idea" | "update_celebration";
  data: Record<string, unknown>;
  summary: string;
}

export interface TranscribeResponse {
  transcript: string;
  language: string | null;
}

export interface ChatResponse {
  conversation_id: string;
  transcript: string;
  reply: string;
  intent: VoiceIntent;
  action: PendingAction | null;
  requires_confirmation: boolean;
}

export interface ConfirmResponse {
  conversation_id: string;
  reply: string;
  applied: boolean;
  action: PendingAction;
}

export class VoiceApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "VoiceApiError";
  }
}

const API_BASE: string = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function readDetail(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item: { msg?: string }) => item.msg ?? "ошибка").join("; ");
  }
  if (status === 404) return "Праздник не найден.";
  if (status === 403) return "Нет доступа к этому празднику.";
  return `Ошибка сервера (${status}).`;
}

async function request<T>(path: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/voice${path}`, { ...init, signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new VoiceApiError("Сервер недоступен. Проверьте, запущен ли backend.", 0);
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new VoiceApiError(readDetail(data, response.status), response.status);
  return data as T;
}

export function transcribeAudio(audio: Blob, signal?: AbortSignal): Promise<TranscribeResponse> {
  const extension = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "m4a" : "webm";
  const form = new FormData();
  form.append("audio", audio, `voice.${extension}`);
  return request<TranscribeResponse>("/transcribe", { method: "POST", body: form }, signal);
}

export function sendChat(
  body: { celebration_id: number; message: string; conversation_id?: string },
  signal?: AbortSignal,
): Promise<ChatResponse> {
  return request<ChatResponse>(
    "/chat",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    signal,
  );
}

export function confirmAction(
  body: { celebration_id: number; conversation_id: string; action_id: string; confirm: boolean },
  signal?: AbortSignal,
): Promise<ConfirmResponse> {
  return request<ConfirmResponse>(
    "/actions/confirm",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    signal,
  );
}
