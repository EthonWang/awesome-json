import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { TooltipProvider } from "./components/ui/tooltip.jsx";
import "./i18n/init.js";
import "./styles.css";

createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <HashRouter>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </HashRouter>
  </React.StrictMode>,
);
