import { useState } from "react";
import ClientPortrait from "./ClientPortrait";
import Orders from "./Orders";
import {
  SakuraAnimation,
  SakuraBackground,
  SakuraBranch,
  SakuraControls,
  SakuraIntro,
  useSakuraSettings,
} from "../../shared/sakura";

function App() {
  const [page, setPage] = useState("orders");
  const sakura = useSakuraSettings();

  return (
    <div className="sakura-theme">
      <SakuraBackground />
      <SakuraAnimation enabled={sakura.motion} count={sakura.count} speed={sakura.speed} opacity={sakura.opacity} />
      <SakuraIntro enabled={!sakura.reducedMotion} />

      <main className={`shell sakura-content ${sakura.reducedMotion ? "" : "sakura-enter"}`}>
        <header className="sakura-header">
          <SakuraBranch className="sakura-header-branch" />
          <div>
            <p className="eyebrow">ПАНЕЛЬ АДМИНИСТРАТОРА · SAKURA FESTIVAL</p>
            <h1>🌸 Праздник</h1>
          </div>
          <div className="sakura-header-tools">
            <SakuraControls settings={sakura} />
          </div>
        </header>

        <nav>
          <button className={page === "orders" ? "active" : ""} onClick={() => setPage("orders")}>Заказы + AI</button>
          <button className={page === "manual" ? "active" : ""} onClick={() => setPage("manual")}>Ручной анализ</button>
        </nav>

        {page === "orders" && <Orders />}
        {page === "manual" && <ClientPortrait />}
      </main>
    </div>
  );
}

export default App;
