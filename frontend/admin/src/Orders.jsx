import { useEffect, useState } from "react";
import { adminApi } from "./api";

const EMPTY_CONTEXT = { client_role: "", location: "", concerns: "", success_criteria: "" };

export default function Orders() {
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [context, setContext] = useState(EMPTY_CONTEXT);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [dash, list] = await Promise.all([adminApi.dashboard(), adminApi.orders()]);
      setDashboard(dash);
      setOrders(list);
      if (list.length && !list.some((o) => o.id === selectedId)) setSelectedId(list[0].id);
    } catch (e) {
      setError(`Не удалось загрузить заказы: ${e.message}`);
    }
  }

  useEffect(() => { load(); }, []);

  const selected = orders.find((o) => o.id === selectedId);

  function handleContext(event) {
    const { name, value } = event.target;
    setContext((prev) => ({ ...prev, [name]: value }));
  }

  async function runAI(kind) {
    setLoading(kind);
    setError("");
    try {
      const call = kind === "portrait" ? adminApi.analyzeOrder : adminApi.orderConcepts;
      const result = await call(selectedId, context);
      setOrders((prev) => prev.map((o) => o.id !== selectedId ? o : {
        ...o,
        ...(kind === "portrait" ? { ai_portrait: result.client_portrait } : { ai_concepts: result.concepts }),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Заказы</h2>
        <button className="small" onClick={load}>Обновить</button>
      </div>

      {dashboard && (
        <div className="stats">
          <div><strong>{dashboard.orders_count}</strong><span>всего заказов</span></div>
          <div><strong>{dashboard.new_orders}</strong><span>новых</span></div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="orders-layout">
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.id}>
              <button className={o.id === selectedId ? "active" : ""} onClick={() => setSelectedId(o.id)}>
                #{o.id} · {o.celebration_type} · {o.date}
                <small>{o.customer || "Заказчик"} · {o.status}</small>
              </button>
            </li>
          ))}
          {orders.length === 0 && <li className="muted">Заказов пока нет.</li>}
        </ul>

        {selected && (
          <div className="order-detail">
            <h3>Заказ #{selected.id}</h3>
            <dl>
              <dt>Событие</dt><dd>{selected.celebration_type}</dd>
              <dt>Дата</dt><dd>{selected.date}</dd>
              <dt>Бюджет</dt><dd>{selected.budget}</dd>
              {selected.child_age != null && <><dt>Возраст</dt><dd>{selected.child_age}</dd></>}
              {selected.children_count && <><dt>Детей</dt><dd>{selected.children_count}</dd></>}
              {selected.theme && <><dt>Тема</dt><dd>{selected.theme}</dd></>}
              {selected.preferences?.length > 0 && <><dt>Предпочтения</dt><dd>{selected.preferences.join(", ")}</dd></>}
              {selected.wishes && <><dt>Пожелания</dt><dd>{selected.wishes}</dd></>}
            </dl>

            <details>
              <summary>Дополнительно для AI (необязательно, не сохраняется в заказ)</summary>
              <div className="grid-form">
                <label>Кто заказчик?<input name="client_role" value={context.client_role} onChange={handleContext} /></label>
                <label>Место проведения<input name="location" value={context.location} onChange={handleContext} /></label>
                <label>Опасения<textarea name="concerns" value={context.concerns} onChange={handleContext} /></label>
                <label>Критерии успеха<textarea name="success_criteria" value={context.success_criteria} onChange={handleContext} /></label>
              </div>
            </details>

            <div className="actions">
              <button className="primary" disabled={!!loading} onClick={() => runAI("portrait")}>
                {loading === "portrait" ? "AI анализирует..." : "Эмоциональный портрет"}
              </button>
              <button className="primary" disabled={!!loading} onClick={() => runAI("concepts")}>
                {loading === "concepts" ? "AI придумывает..." : "3 концепции праздника"}
              </button>
            </div>

            {selected.ai_portrait && (
              <article className="portrait-result">
                <h4>Портрет заказчика</h4>
                <div className="portrait-text">{selected.ai_portrait.text}</div>
              </article>
            )}
            {selected.ai_concepts && (
              <article className="portrait-result">
                <h4>Концепции праздника</h4>
                <div className="portrait-text">{selected.ai_concepts.text}</div>
              </article>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
