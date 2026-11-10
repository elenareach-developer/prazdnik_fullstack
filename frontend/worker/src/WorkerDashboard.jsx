
import { useEffect, useState } from "react";
import "./WorkerDashboard.css";

const API = "http://localhost:8000/api/worker/tasks";

export default function WorkerDashboard() {

  const [tasks, setTasks] = useState([]);
  const [worker, setWorker] = useState("Анна");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTasks() {

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        `${API}?worker=${encodeURIComponent(worker)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Ошибка загрузки");
      }

      setTasks(data.tasks);

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }
  }

  async function updateTask(taskId, status) {

    try {

      const response = await fetch(
        `${API}/${taskId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            status
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Ошибка обновления");
      }

      await loadTasks();

    } catch (err) {

      setError(err.message);

    }
  }

  async function updateComment(taskId, comment) {

    try {

      const response = await fetch(
        `${API}/${taskId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            comment
          })
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось сохранить комментарий");
      }

    } catch (err) {

      setError(err.message);

    }
  }

  useEffect(() => {
    loadTasks();
  }, [worker]);

  const completed = tasks.filter(
    task => task.status === "completed"
  ).length;

  const pending = tasks.length - completed;

  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  const filteredTasks = tasks.filter(task => {

    if (filter === "completed") {
      return task.status === "completed";
    }

    if (filter === "pending") {
      return task.status === "pending";
    }

    return true;
  });

  return (

    <div className="worker-dashboard">

      <header className="worker-header">

        <div>
          <p className="worker-eyebrow">
            КАБИНЕТ СОТРУДНИКА
          </p>

          <h1>Мои задания</h1>

          <p>
            Подготовка праздника начинается здесь.
          </p>
        </div>

        <div className="worker-avatar">
          {worker.charAt(0)}
        </div>

      </header>

      <section className="worker-summary">

        <div className="worker-stat">
          <span>Всего заданий</span>
          <strong>{tasks.length}</strong>
        </div>

        <div className="worker-stat">
          <span>Выполнено</span>
          <strong>{completed}</strong>
        </div>

        <div className="worker-stat">
          <span>Осталось</span>
          <strong>{pending}</strong>
        </div>

      </section>

      <section className="worker-progress">

        <div className="progress-heading">
          <span>Готовность</span>
          <strong>{progress}%</strong>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

      </section>

      <div className="worker-controls">

        <label>
          Сотрудник

          <input
            value={worker}
            onChange={e => setWorker(e.target.value)}
          />
        </label>

        <label>
          Фильтр

          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">Все задания</option>
            <option value="pending">Не выполнено</option>
            <option value="completed">Выполнено</option>
          </select>
        </label>

      </div>

      {error && (
        <div className="worker-error">
          {error}
        </div>
      )}

      {loading && <p>Загружаем задания...</p>}

      {!loading && filteredTasks.length === 0 && (
        <div className="worker-empty">
          Заданий в этой категории пока нет.
        </div>
      )}

      <div className="worker-task-list">

        {filteredTasks.map(task => (

          <article
            className={`worker-task ${
              task.status === "completed"
                ? "task-completed"
                : ""
            }`}
            key={task.id}
          >

            <div className="task-top">

              <div>

                <span
                  className={`task-status ${
                    task.status === "completed"
                      ? "status-completed"
                      : "status-pending"
                  }`}
                >
                  {task.status === "completed"
                    ? "✓ Выполнено"
                    : "○ Не выполнено"}
                </span>

                <h3>{task.title}</h3>

              </div>

              <span
                className={`task-priority priority-${task.priority}`}
              >
                {task.priority === "high"
                  ? "Важно"
                  : task.priority === "medium"
                    ? "Средний"
                    : "Низкий"}
              </span>

            </div>

            <p>{task.description}</p>

            <div className="task-meta">

              <span>
                🎉 {task.event}
              </span>

              {task.deadline && (
                <span>
                  📅 {task.deadline.replace("T", " ")}
                </span>
              )}

            </div>

            <label className="task-comment">

              Комментарий

              <textarea
                defaultValue={task.comment}
                placeholder="Например: реквизит готов"
                onBlur={e =>
                  updateComment(task.id, e.target.value)
                }
              />

            </label>

            <button
              className={
                task.status === "completed"
                  ? "task-button secondary"
                  : "task-button primary"
              }
              onClick={() =>
                updateTask(
                  task.id,
                  task.status === "completed"
                    ? "pending"
                    : "completed"
                )
              }
            >
              {task.status === "completed"
                ? "Вернуть в работу"
                : "Отметить выполненным"}
            </button>

          </article>

        ))}

      </div>

    </div>
  );
}
