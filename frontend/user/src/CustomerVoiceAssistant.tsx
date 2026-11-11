import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  confirmAction,
  PendingAction,
  sendChat,
  transcribeAudio,
  VoiceApiError,
} from "./voiceApi";
import "./voice-assistant.css";

export type VoiceStatus = "idle" | "recording" | "processing" | "thinking" | "speaking" | "error";

export interface CelebrationOption {
  id: number;
  celebration_type: string;
  date: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  action?: PendingAction;
  actionState?: "pending" | "applied" | "cancelled";
}

interface Dialog {
  conversationId?: string;
  messages: ChatMessage[];
}

interface Props {
  celebrations: CelebrationOption[];
  initialCelebrationId?: number | null;
  /** Called after a confirmed action changed the celebration (to refresh lists). */
  onDataChanged?: () => void;
}

const MIN_AUDIO_BYTES = 1000;
const MIN_RECORDING_MS = 600;
const MAX_RECORDING_MS = 60_000;
const AUTO_SPEAK_KEY = "voice-auto-speak";
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

const STATUS_TEXT: Record<VoiceStatus, string> = {
  idle: "Нажмите на микрофон и расскажите, что хотите",
  recording: "Слушаю… Нажмите «Стоп», когда закончите",
  processing: "Распознаю речь…",
  thinking: "Помощник думает…",
  speaking: "Помощник отвечает…",
  error: "Что-то пошло не так",
};

let messageCounter = 0;
const newId = () => `m${Date.now().toString(36)}${(messageCounter++).toString(36)}`;

function readAutoSpeak(): boolean {
  try {
    return window.localStorage.getItem(AUTO_SPEAK_KEY) !== "off";
  } catch {
    return true;
  }
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function microphoneErrorMessage(error: unknown): string {
  const name = (error as DOMException)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Нет доступа к микрофону. Разрешите его в настройках браузера и попробуйте снова.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Микрофон не найден. Подключите микрофон или напишите сообщение текстом.";
  }
  if (name === "NotReadableError") return "Микрофон занят другим приложением.";
  return "Не удалось включить микрофон.";
}

export function detectSpeechLang(text: string): string {
  return /[а-яё]/i.test(text) ? "ru-RU" : "en-US";
}

export default function CustomerVoiceAssistant({ celebrations, initialCelebrationId, onDataChanged }: Props) {
  const [celebrationId, setCelebrationId] = useState<number | null>(
    initialCelebrationId ?? celebrations[celebrations.length - 1]?.id ?? null,
  );
  const [dialogs, setDialogs] = useState<Record<number, Dialog>>({});
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [errorText, setErrorText] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(readAutoSpeak);
  const [seconds, setSeconds] = useState(0);

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const recordingSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  const autoStopRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const celebrationRef = useRef(celebrationId);
  celebrationRef.current = celebrationId;
  const dialogsRef = useRef(dialogs);
  dialogsRef.current = dialogs;

  // ---------- celebration selection ----------
  useEffect(() => {
    if (initialCelebrationId != null) setCelebrationId(initialCelebrationId);
  }, [initialCelebrationId]);

  useEffect(() => {
    if (celebrationId == null && celebrations.length) setCelebrationId(celebrations[celebrations.length - 1].id);
  }, [celebrations, celebrationId]);

  // ---------- speech synthesis ----------
  useEffect(() => {
    if (!speechSupported) return undefined;
    const loadVoices = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", loadVoices);
  }, [speechSupported]);

  const stopSpeaking = useCallback(() => {
    if (!speechSupported) return;
    utteranceRef.current = null;
    window.speechSynthesis.cancel();
    setStatus((current) => (current === "speaking" ? "idle" : current));
  }, [speechSupported]);

  /** Speak once, from an event handler — never from render, so re-renders cannot replay it. */
  const speak = useCallback((text: string, force = false) => {
    if (!speechSupported || (!autoSpeak && !force)) {
      setStatus("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = detectSpeechLang(text);
    const voice = voicesRef.current.find((item) => item.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2)));
    if (voice) utterance.voice = voice;
    const finish = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setStatus("idle");
      }
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    utteranceRef.current = utterance;
    setStatus("speaking");
    window.speechSynthesis.speak(utterance);
  }, [autoSpeak, speechSupported]);

  function toggleAutoSpeak() {
    const next = !autoSpeak;
    setAutoSpeak(next);
    try { window.localStorage.setItem(AUTO_SPEAK_KEY, next ? "on" : "off"); } catch { /* ignore */ }
    if (!next) stopSpeaking();
  }

  // ---------- dialog helpers ----------
  const pushMessage = useCallback((id: number, message: ChatMessage, conversationId?: string) => {
    setDialogs((previous) => {
      const dialog = previous[id] ?? { messages: [] };
      return {
        ...previous,
        [id]: { conversationId: conversationId ?? dialog.conversationId, messages: [...dialog.messages, message] },
      };
    });
  }, []);

  const fail = useCallback((error: unknown) => {
    if ((error as Error)?.name === "AbortError") return;
    setErrorText(error instanceof VoiceApiError || error instanceof Error ? error.message : "Неизвестная ошибка");
    setStatus("error");
  }, []);

  const newRequest = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  };

  // ---------- conversation ----------
  const askAssistant = useCallback(async (text: string) => {
    const id = celebrationRef.current;
    if (id == null) return;
    const controller = newRequest();
    pushMessage(id, { id: newId(), role: "user", text });
    setStatus("thinking");
    try {
      const response = await sendChat(
        { celebration_id: id, message: text, conversation_id: dialogsRef.current[id]?.conversationId },
        controller.signal,
      );
      pushMessage(
        id,
        {
          id: newId(),
          role: "assistant",
          text: response.reply,
          action: response.action ?? undefined,
          actionState: response.action ? "pending" : undefined,
        },
        response.conversation_id,
      );
      if (celebrationRef.current === id) speak(response.reply);
    } catch (error) {
      fail(error);
    }
  }, [fail, pushMessage, speak]);

  const handleRecording = useCallback(async (audio: Blob, durationMs: number) => {
    if (audio.size < MIN_AUDIO_BYTES || durationMs < MIN_RECORDING_MS) {
      fail(new Error("Запись получилась пустой или слишком короткой. Попробуйте ещё раз."));
      return;
    }
    const controller = newRequest();
    setStatus("processing");
    try {
      const { transcript } = await transcribeAudio(audio, controller.signal);
      setLastTranscript(transcript);
      await askAssistant(transcript);
    } catch (error) {
      fail(error);
    }
  }, [askAssistant, fail]);

  // ---------- recording ----------
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    window.clearTimeout(autoStopRef.current);
  }, []);

  async function startRecording() {
    setErrorText("");
    if (!recordingSupported) {
      fail(new Error("Этот браузер не поддерживает запись звука. Напишите сообщение текстом."));
      return;
    }
    stopSpeaking();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      fail(new Error(microphoneErrorMessage(error)));
      return;
    }
    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunksRef.current = [];
    discardRef.current = false;
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      releaseStream();
      recorderRef.current = null;
      if (discardRef.current) return;
      const audio = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
      chunksRef.current = [];
      void handleRecording(audio, Date.now() - startedAtRef.current);
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setSeconds(0);
    recorder.start();
    setStatus("recording");
    autoStopRef.current = window.setTimeout(() => stopRecording(), MAX_RECORDING_MS);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  useEffect(() => {
    if (status !== "recording") return undefined;
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [status]);

  // Release microphone, speech and requests when leaving the page.
  useEffect(() => () => {
    discardRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    abortRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function changeCelebration(id: number) {
    discardRef.current = true;
    stopRecording();
    releaseStream();
    abortRef.current?.abort();
    stopSpeaking();
    setStatus("idle");
    setErrorText("");
    setLastTranscript("");
    setCelebrationId(id);
  }

  // ---------- actions ----------
  async function answerAction(message: ChatMessage, confirm: boolean) {
    const id = celebrationRef.current;
    const conversationId = id != null ? dialogsRef.current[id]?.conversationId : undefined;
    if (id == null || !conversationId || !message.action) return;
    const controller = newRequest();
    setStatus("thinking");
    try {
      const result = await confirmAction(
        { celebration_id: id, conversation_id: conversationId, action_id: message.action.id, confirm },
        controller.signal,
      );
      setDialogs((previous) => {
        const dialog = previous[id];
        if (!dialog) return previous;
        const messages = dialog.messages.map((item) =>
          item.id === message.id ? { ...item, actionState: confirm ? "applied" as const : "cancelled" as const } : item);
        return { ...previous, [id]: { ...dialog, messages: [...messages, { id: newId(), role: "assistant", text: result.reply }] } };
      });
      if (result.applied) onDataChanged?.();
      speak(result.reply);
    } catch (error) {
      fail(error);
    }
  }

  function submitTyped(event: FormEvent) {
    event.preventDefault();
    const text = typed.trim();
    if (!text || busy) return;
    setTyped("");
    setErrorText("");
    setLastTranscript("");
    void askAssistant(text);
  }

  // ---------- render ----------
  const busy = status === "processing" || status === "thinking" || status === "recording";
  const dialog = celebrationId != null ? dialogs[celebrationId] : undefined;
  const messages = dialog?.messages ?? [];
  const lastReply = [...messages].reverse().find((item) => item.role === "assistant");

  if (!celebrations.length) {
    return (
      <section className="voice-assistant panel">
        <h2>🎙 Голосовой помощник</h2>
        <p className="voice-muted">Сначала создайте праздник — потом его можно будет обсудить с помощником голосом.</p>
      </section>
    );
  }

  return (
    <section className="voice-assistant panel" aria-labelledby="voice-title">
      <div className="voice-head">
        <h2 id="voice-title">🎙 Голосовой помощник</h2>
        <label className="voice-select">
          Праздник
          <select value={celebrationId ?? ""} onChange={(event) => changeCelebration(Number(event.target.value))}>
            {celebrations.map((item) => (
              <option key={item.id} value={item.id}>#{item.id} · {item.celebration_type} · {item.date}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={`voice-stage voice-stage--${status}`}>
        {status === "recording" ? (
          <button type="button" className="voice-mic voice-mic--stop" onClick={stopRecording} aria-label="Остановить запись">
            <span className="voice-stop-icon" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="voice-mic"
            onClick={startRecording}
            disabled={status === "processing" || status === "thinking"}
            aria-label="Начать запись голоса"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
              <path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" fill="none" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <div className="voice-status" role="status" aria-live="polite">
          <span className={`voice-indicator voice-indicator--${status}`} aria-hidden="true">
            <i /><i /><i />
          </span>
          <span data-testid="voice-status" data-status={status}>
            {status === "error" ? errorText : STATUS_TEXT[status]}
            {status === "recording" && ` · ${seconds} с`}
          </span>
        </div>

        <div className="voice-controls">
          {status === "speaking" && (
            <button type="button" className="voice-chip" onClick={stopSpeaking}>⏹ Остановить озвучивание</button>
          )}
          {status === "error" && (
            <button type="button" className="voice-chip" onClick={() => { setStatus("idle"); setErrorText(""); }}>Понятно</button>
          )}
          <label className="voice-chip voice-toggle">
            <input type="checkbox" checked={autoSpeak} onChange={toggleAutoSpeak} disabled={!speechSupported} />
            Озвучивать ответы
          </label>
        </div>
        {!speechSupported && (
          <p className="voice-muted">Браузер не умеет озвучивать текст — ответы будут только на экране.</p>
        )}
      </div>

      {(lastTranscript || lastReply) && (
        <div className="voice-now">
          {lastTranscript && (
            <p><span className="voice-label">Вы сказали</span><span data-testid="voice-transcript">{lastTranscript}</span></p>
          )}
          {lastReply && (
            <p className="voice-fade"><span className="voice-label">Помощник</span><span data-testid="voice-reply">{lastReply.text}</span></p>
          )}
        </div>
      )}

      <ol className="voice-history" aria-label="История диалога">
        {messages.map((message) => (
          <li key={message.id} className={`voice-msg voice-msg--${message.role} voice-fade`}>
            <p>{message.text}</p>
            {message.role === "assistant" && speechSupported && (
              <button type="button" className="voice-link" onClick={() => speak(message.text, true)}>🔊 Прослушать</button>
            )}
            {message.action && (
              <div className={`voice-action voice-action--${message.actionState}`}>
                <span>{message.action.summary}</span>
                {message.actionState === "pending" ? (
                  <span className="voice-action-buttons">
                    <button type="button" className="voice-chip voice-chip--yes" disabled={busy} onClick={() => answerAction(message, true)}>Подтвердить</button>
                    <button type="button" className="voice-chip" disabled={busy} onClick={() => answerAction(message, false)}>Отмена</button>
                  </span>
                ) : (
                  <em>{message.actionState === "applied" ? "✓ выполнено" : "отменено"}</em>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>

      <form className="voice-text" onSubmit={submitTyped}>
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Или напишите сообщение…"
          maxLength={2000}
          aria-label="Сообщение помощнику"
        />
        <button type="submit" className="voice-chip voice-chip--yes" disabled={!typed.trim() || busy}>Отправить</button>
      </form>
    </section>
  );
}
