
import { useState } from "react";

const API_URL = "http://localhost:8000/api/client-portrait";

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
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    setError("");
    setPortrait("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Не удалось создать портрет"
        );
      }

      setPortrait(data.client_portrait);

    } catch (error) {
      setError(error.message);

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="client-portrait">

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

        <button type="submit" disabled={loading}>
          {loading
            ? "AI анализирует..."
            : "Создать эмоциональный портрет"}
        </button>

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
