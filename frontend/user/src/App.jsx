import { useCallback, useEffect, useRef, useState } from "react";
import {
  SakuraAnimation,
  SakuraBackground,
  SakuraBranch,
  SakuraButton,
  SakuraCard,
  SakuraCelebration,
  SakuraControls,
  SakuraIntro,
  useSakuraSettings,
} from "../../shared/sakura";
import CustomerVoiceAssistant from "./CustomerVoiceAssistant";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Fields match backend/customer/router.py → OrderCreate.
const EMPTY_ORDER = {
  celebration_type: "",
  date: "",
  budget: "",
  child_age: "",
  children_count: "1",
  theme: "",
  preferences: "",
  wishes: "",
};

function formatError(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => `${item.loc?.slice(-1)[0] ?? "поле"}: ${item.msg}`).join("; ");
  }
  return data?.error || fallback;
}

function toOrderPayload(form) {
  return {
    celebration_type: form.celebration_type.trim() || "Birthday",
    date: form.date,
    budget: Number(form.budget),
    child_age: form.child_age === "" ? null : Number(form.child_age),
    children_count: Number(form.children_count) || 1,
    theme: form.theme.trim() || null,
    preferences: form.preferences.split(",").map((item) => item.trim()).filter(Boolean),
    wishes: form.wishes.trim(),
  };
}

export default function App() {
  const sakura = useSakuraSettings();
  const [page, setPage] = useState("create");
  const [backendStatus, setBackendStatus] = useState("Проверяем backend...");
  const [order, setOrder] = useState(EMPTY_ORDER);
  const [creating, setCreating] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [voiceCelebrationId, setVoiceCelebrationId] = useState(null);
  const [author, setAuthor] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [plan, setPlan] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef(null);

  async function checkBackend() {
    try {
      const response = await fetch(`${API}/health`);
      const data = await response.json();
      setBackendStatus(data.status === "ok" ? "Backend подключён" : data.message || "Backend ответил");
    } catch {
      setBackendStatus("Не удалось подключиться. Проверьте, запущен ли backend на порту 8000.");
    }
  }

  const loadMyOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API}/customer/orders`);
      if (!response.ok) throw new Error();
      setMyOrders(await response.json());
    } catch {
      /* the list is optional; creation still works */
    }
  }, []);

  function handleOrderChange(event) {
    const { name, value } = event.target;
    setOrder((previous) => ({ ...previous, [name]: value }));
  }

  async function submitOrder(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setCreating(true);
    try {
      const response = await fetch(`${API}/customer/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toOrderPayload(order)),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(formatError(data, "Не удалось создать праздник"));
      setOrder(EMPTY_ORDER);
      setCelebrate(true);
      setMessage(`Праздник №${data.order.id} создан 🌸`);
      await loadMyOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function loadIdeas() {
    try {
      const response = await fetch(`${API}/customer/ideas`);
      const data = await response.json();
      if (!response.ok) throw new Error();
      setIdeas(data.ideas || []);
    } catch {
      setError("Не удалось загрузить идеи с backend.");
    }
  }

  async function submitIdea(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${API}/customer/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, text: ideaText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(formatError(data, "Не удалось добавить идею"));
      setIdeaText("");
      setMessage(data.message);
      await loadIdeas();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadPlan() {
    try {
      const response = await fetch(`${API}/plan`);
      const data = await response.json();
      setPlan(data);
    } catch {
      setMessage("Не удалось получить план с backend.");
    }
  }

  function startCreating() {
    setPage("create");
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: sakura.reducedMotion ? "auto" : "smooth", block: "start" });
      formRef.current?.querySelector("input")?.focus({ preventScroll: true });
    });
  }

  const closeCelebration = useCallback(() => setCelebrate(false), []);

  useEffect(() => { checkBackend(); loadMyOrders(); }, [loadMyOrders]);
  useEffect(() => {
    setError("");
    if (page === "ideas") loadIdeas();
    if (page === "plan") loadPlan();
  }, [page]);

  return (
    <div className="sakura-theme">
      <SakuraBackground />
      <SakuraAnimation enabled={sakura.motion} count={sakura.count} speed={sakura.speed} opacity={sakura.opacity} />
      <SakuraIntro enabled={!sakura.reducedMotion} />
      <SakuraCelebration show={celebrate} onDone={closeCelebration} motion={!sakura.reducedMotion} />

      <main className={`shell sakura-content ${sakura.reducedMotion ? "" : "sakura-enter"}`}>
        <header className="sakura-header">
          <div>
            <p className="eyebrow">ПЛАНИРУЕМ ВМЕСТЕ · 桜</p>
            <h1>🌸 Праздник</h1>
          </div>
          <div className="sakura-header-tools">
            <div className="connection">
              <span className="dot" />
              <span>{backendStatus}</span>
              <SakuraButton variant="ghost" onClick={checkBackend}>Проверить</SakuraButton>
            </div>
            <SakuraControls settings={sakura} />
          </div>
        </header>

        <section className="sakura-hero" aria-labelledby="hero-title">
          <SakuraBranch className="sakura-hero-branch" />
          <p className="sakura-hero-kicker">SAKURA FESTIVAL</p>
          <h2 id="hero-title">Каждый праздник — своя история</h2>
          <p>Давайте создадим праздник, который запомнится.</p>
          <SakuraButton onClick={startCreating}>Создать праздник</SakuraButton>
        </section>

        <nav>
          <button className={page === "create" ? "active" : ""} onClick={() => setPage("create")}>1. Создать праздник</button>
          <button className={page === "ideas" ? "active" : ""} onClick={() => setPage("ideas")}>2. Идеи гостей</button>
          <button className={page === "plan" ? "active" : ""} onClick={() => setPage("plan")}>3. План</button>
          <button className={page === "voice" ? "active" : ""} onClick={() => setPage("voice")}>4. 🎙 Помощник</button>
        </nav>

        {message && <div className="notice sakura-fade-in">{message}</div>}
        {error && <p className="error sakura-fade-in">{error}</p>}

        {page === "create" && (
          <section className="panel sakura-fade-in" ref={formRef}>
            <h2>Расскажите о празднике</h2>
            <p>Обязательны дата и бюджет. Остальное можно оставить пустым.</p>
            <form onSubmit={submitOrder}>
              <label>Что празднуем?<input name="celebration_type" value={order.celebration_type} onChange={handleOrderChange} placeholder="Например, день рождения" /></label>
              <div className="sakura-form-row">
                <label>Дата *<input type="date" name="date" required value={order.date} onChange={handleOrderChange} /></label>
                <label>Бюджет *<input type="number" name="budget" required min="1" step="any" inputMode="decimal" value={order.budget} onChange={handleOrderChange} placeholder="Например, 500" /></label>
              </div>
              <div className="sakura-form-row">
                <label>Возраст именинника<input type="number" name="child_age" min="0" max="120" inputMode="numeric" value={order.child_age} onChange={handleOrderChange} /></label>
                <label>Сколько детей?<input type="number" name="children_count" min="1" inputMode="numeric" value={order.children_count} onChange={handleOrderChange} /></label>
              </div>
              <label>Тема<input name="theme" value={order.theme} onChange={handleOrderChange} placeholder="Например, сакура, пираты, принцессы" /></label>
              <label>Предпочтения (через запятую)<input name="preferences" value={order.preferences} onChange={handleOrderChange} placeholder="квест, аквагрим, торт" /></label>
              <label>Пожелания и атмосфера<textarea name="wishes" value={order.wishes} onChange={handleOrderChange} placeholder="Весёлую, семейную, необычную..." /></label>
              <SakuraButton type="submit" disabled={creating}>{creating ? "Создаём..." : "Создать праздник"}</SakuraButton>
            </form>

            {myOrders.length > 0 && (
              <div className="ideas">
                <h3>Праздники ({myOrders.length})</h3>
                <div className="sakura-card-grid">
                  {myOrders.map((item, index) => (
                    <SakuraCard as="article" key={item.id} index={index}>
                      <strong>#{item.id} · {item.celebration_type}</strong>
                      <p className="muted">{item.date} · бюджет {item.budget}{item.theme ? ` · ${item.theme}` : ""}</p>
                      <span className="sakura-status">{item.status}</span>
                      <SakuraButton
                        variant="ghost"
                        className="voice-open"
                        onClick={() => { setVoiceCelebrationId(item.id); setPage("voice"); }}
                      >
                        🎙 Обсудить с помощником
                      </SakuraButton>
                    </SakuraCard>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {page === "ideas" && (
          <section className="panel sakura-fade-in">
            <h2>Идеи от гостей</h2>
            <p>Каждый участник может добавить своё предложение.</p>
            <form onSubmit={submitIdea}>
              <label>Ваше имя<input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Как вас подписать?" /></label>
              <label>Ваша идея<textarea required value={ideaText} onChange={e => setIdeaText(e.target.value)} placeholder="Например: устроить конкурс костюмов" /></label>
              <SakuraButton type="submit">Отправить идею</SakuraButton>
            </form>
            <div className="ideas">
              <h3>Все предложения ({ideas.length})</h3>
              {ideas.length === 0 ? <p className="muted">Пока идей нет. Будьте первой!</p> : ideas.map((idea, index) => (
                <SakuraCard as="article" className="idea" key={idea.id} index={index}><strong>{idea.author}</strong><p>{idea.text}</p></SakuraCard>
              ))}
            </div>
          </section>
        )}

        {page === "plan" && (
          <section className="panel sakura-fade-in">
            <h2>Общий план праздника</h2>
            <p>Здесь собраны ответы из backend.</p>
            <SakuraButton onClick={loadPlan}>Обновить данные</SakuraButton>
            {plan && <>
              <h3>Параметры праздника</h3>
              <pre>{JSON.stringify(plan.celebration, null, 2)}</pre>
              <h3>Идеи гостей</h3>
              {plan.ideas?.length ? plan.ideas.map(item => <article className="idea" key={item.id}><strong>{item.author}</strong><p>{item.text}</p></article>) : <p className="muted">Идей пока нет.</p>}
              <p className="muted">{plan.note}</p>
            </>}
          </section>
        )}
        {page === "voice" && (
          <CustomerVoiceAssistant
            celebrations={myOrders}
            initialCelebrationId={voiceCelebrationId}
            onDataChanged={loadMyOrders}
          />
        )}

        <footer>Праздник · Sakura Festival · React + FastAPI</footer>
      </main>
    </div>
  );
}
