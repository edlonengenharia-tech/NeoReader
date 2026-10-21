import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { hydrate } from "./utils/storage";

// Hidrata settings/positions/library do disco (desktop) ou localStorage (web)
// ANTES do primeiro render — corrige a "biblioteca fantasma" (padrão ACBR:
// favorites/history/settings persistidos pelo main process).
void hydrate().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
