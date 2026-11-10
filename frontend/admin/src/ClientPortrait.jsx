import { useState } from "react";
import { adminApi } from "./api";

export default function ClientPortrait() {

  const [form, setForm] = useState({
    client_role: "Мама",
    event: "День рождения",
    celebrant_age: "7 лет",
    theme: "Принцессы",
    guests: "Дети и родители",
    location: "",
    budget: "",
    wishes: "",
    concerns: "",
    success_criteria: ""
  });

  const [portrait, setPortrait] = useState("");
  const [concepts, setConcepts] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function generatePortrait(event) {
    event.preventDefault();
    await run("portrait");
  }

  async function run(kind) {
    setLoading(kind);
    setError("");

    try {
      if (kind === "portrait") {
        setPortrait("");
        const data = await adminApi.portraitFromForm(form);
        setPortrait(data.client_portrait.text);
      } else {
        setConcepts("");
        const data = await adminApi.conceptsFromForm(form);
        setConcepts(data.concepts.text);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="client-portrait panel">

      <h2>Эмоциональный портрет заказчика</h2>

      <p>
        Расскажите о празднике.
        AI поможет понять эмоциональные потребности клиента.
      </p>

      <form onSubmit={generatePortrait}>

        <label>
          Кто заказчик?

          <input
            name="client_role"
            value={form.client_role}
            onChange={handleChange}
          />
        </label>

        <label>
          Какое событие?

          <input
            name="event"
            value={form.event}
            onChange={handleChange}
          />
        </label>

        <label>
          Возраст виновника торжества

          <input
            name="celebrant_age"
            value={form.celebrant_age}
            onChange={handleChange}
          />
        </label>

        <label>
          Тема праздника

          <input
            name="theme"
            value={form.theme}
            onChange={handleChange}
          />
        </label>

        <label>
          Кто приглашен?

          <input
            name="guests"
            value={form.guests}
            onChange={handleChange}
          />
        </label>

        <label>
          Место проведения

          <input
            name="location"
            value={form.location}
            onChange={handleChange}
          />
        </label>

        <label>
          Бюджет

          <input
            name="budget"
            value={form.budget}
            onChange={handleChange}
          />
        </label>

        <label>
          Что особенно важно заказчику?

          <textarea
            name="wishes"
            value={form.wishes}
            onChange={handleChange}
          />
        </label>

        <label>
          Чего заказчик опасается?

          <textarea
            name="concerns"
            value={form.concerns}
            onChange={handleChange}
          />
        </label>

        <label>
          Как заказчик поймет, что праздник удался?

          <textarea
            name="success_criteria"
            value={form.success_criteria}
            onChange={handleChange}
          />
        </label>

        <div className="actions">
          <button className="primary" type="submit" disabled={!!loading}>
            {loading === "portrait"
              ? "AI анализирует..."
              : "Создать эмоциональный портрет"}
          </button>

          <button className="primary" type="button" disabled={!!loading} onClick={() => run("concepts")}>
            {loading === "concepts"
              ? "AI придумывает..."
              : "3 концепции праздника"}
          </button>
        </div>

      </form>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {portrait && (
        <section className="portrait-result">

          <h3>Портрет заказчика</h3>

          <div className="portrait-text">
            {portrait}
          </div>

        </section>
      )}

    </div>
  );
}
