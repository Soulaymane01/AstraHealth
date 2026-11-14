import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";

import { App } from "@/app/App";
import "@/features/pwa/usePwaInstall";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.setTimeout(() => {
  document.getElementById("boot-splash")?.remove();
}, 500);
