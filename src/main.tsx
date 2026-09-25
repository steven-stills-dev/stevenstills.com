import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { applyConfig, loadConfig } from "./lib/design";
import "./styles.css";

// set the design tokens before the first paint, so text doesn't resize when the tray mounts
applyConfig(loadConfig());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
