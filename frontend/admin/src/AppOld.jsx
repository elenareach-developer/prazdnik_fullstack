import { useEffect, useState } from "react";

const API = "http://localhost:8000/api";

export default function App() {
  const [page, setPage] = useState("brainstorm");
  const [backendStatus, setBackendStatus] = useState("Проверяем backend...");
  const [event, setEvent] = useState("");
  const [guests, setGuests] = useState("");
  const [place, setPlace] = useState("");
  const [mood, setMood] = useState("");
  const [author, setAuthor] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [plan, setPlan] = useState(null);
  const [message, setMessage] = useState("");

  async function checkBackend() {
    try {
      const response = await fetch(`${API}/health`);
      const data = await response.json();
      setBackendStatus(data.message);
    } catch {
      setBackendStatus("Не удалось подключиться. Проверьте, запущен ли Flask на порту 5000.");
    }
  }

  async function submitBrainstorm(e) {
    e.preventDefault();
    setMessage("");
    try {
      const response = await fetch(`${API}/brainstorm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, guests, place, mood })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ошибка запроса");
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadIdeas() {
    try {
      const response = await fetch(`${API}/ideas`);
      const data = await response.json();
      setIdeas(data.ideas);
    } catch {
      setMessage("Не удалось загрузить идеи с backend.");
    }
  }

  async function submitIdea(e) {
    e.preventDefault();
    setMessage("");
    try {
      const response = await fetch(`${API}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, text: ideaText })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ошибка запроса");
      setIdeaText("");
      setMessage(data.message);
      await loadIdeas();
    } catch (error) {
      setMessage(error.message);
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

  useEffect(() => { checkBackend(); }, []);
  useEffect(() => {
    if (page === "ideas") loadIdeas();
    if (page === "plan") loadPlan();
  }, [page]);

  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">ПЛАНИРУЕМ ВМЕСТЕ</p>
          <h1>🎉 Праздник</h1>
          <p className="subtitle">От первой идеи до общего плана</p>
        </div>
        <div className="connection">
          <span className="dot" />
          <span>{backendStatus}</span>
          <button className="small" onClick={checkBackend}>Проверить backend</button>
        </div>
      </header>

      <nav>
        <button className={page === "brainstorm" ? "active" : ""} onClick={() => setPage("brainstorm")}>1. Брейншторм</button>
        <button className={page === "ideas" ? "active" : ""} onClick={() => setPage("ideas")}>2. Идеи гостей</button>
        <button className={page === "plan" ? "active" : ""} onClick={() => setPage("plan")}>3. План</button>
      </nav>

      {message && <div className="notice">{message}</div>}

      {page === "brainstorm" && (
        <section className="panel">
          <h2>Сначала определимся с праздником</h2>
          <p>Заполните то, что уже известно. Остальное можно оставить пустым.</p>
          <form onSubmit={submitBrainstorm}>
            <label>Что празднуем?<input value={event} onChange={e => setEvent(e.target.value)} placeholder="Например, день рождения" /></label>
            <label>Сколько будет гостей?<input value={guests} onChange={e => setGuests(e.target.value)} placeholder="Например, 20 человек" /></label>
            <label>Где будет праздник?<input value={place} onChange={e => setPlace(e.target.value)} placeholder="Дома, в ресторане, на природе..." /></label>
            <label>Какую атмосферу хотим?<textarea value={mood} onChange={e => setMood(e.target.value)} placeholder="Весёлую, семейную, необычную..." /></label>
            <button className="primary">Отправить ответы на backend</button>
          </form>
        </section>
      )}

      {page === "ideas" && (
        <section className="panel">
          <h2>Идеи от гостей</h2>
          <p>Каждый участник может добавить своё предложение.</p>
          <form onSubmit={submitIdea}>
            <label>Ваше имя<input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Как вас подписать?" /></label>
            <label>Ваша идея<textarea required value={ideaText} onChange={e => setIdeaText(e.target.value)} placeholder="Например: устроить конкурс костюмов" /></label>
            <button className="primary">Отправить идею</button>
          </form>
          <div className="ideas">
            <h3>Все предложения ({ideas.length})</h3>
            {ideas.length === 0 ? <p className="muted">Пока идей нет. Будьте первой!</p> : ideas.map(idea => (
              <article className="idea" key={idea.id}><strong>{idea.author}</strong><p>{idea.text}</p></article>
            ))}
          </div>
        </section>
      )}

      {page === "plan" && (
        <section className="panel">
          <h2>Общий план праздника</h2>
          <p>Здесь собраны ответы из Flask backend.</p>
          <button className="primary" onClick={loadPlan}>Обновить данные</button>
          {plan && <>
            <h3>Параметры праздника</h3>
            <pre>{JSON.stringify(plan.celebration, null, 2)}</pre>
            <h3>Идеи гостей</h3>
            {plan.ideas.length === 0 ? <p className="muted">Идей пока нет.</p> : plan.ideas.map(item => <article className="idea" key={item.id}><strong>{item.author}</strong><p>{item.text}</p></article>)}
            <p className="muted">{plan.note}</p>
          </>}
        </section>
      )}
      <footer>Первый прототип · React + Flask · Пока без ИИ и базы данных</footer>
    </main>
  );
}
