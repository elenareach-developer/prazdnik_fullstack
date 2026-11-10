import { useState } from "react";
import ClientPortrait from "./ClientPortrait";
import Orders from "./Orders";

function App() {
  const [page, setPage] = useState("orders");

  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">ПАНЕЛЬ АДМИНИСТРАТОРА</p>
          <h1>🎉 Праздник</h1>
        </div>
      </header>

      <nav>
        <button className={page === "orders" ? "active" : ""} onClick={() => setPage("orders")}>Заказы + AI</button>
        <button className={page === "manual" ? "active" : ""} onClick={() => setPage("manual")}>Ручной анализ</button>
      </nav>

      {page === "orders" && <Orders />}
      {page === "manual" && <ClientPortrait />}
    </main>
  );
}

export default App;
