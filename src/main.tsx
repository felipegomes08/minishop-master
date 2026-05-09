import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Cleanup any previously registered service workers (PWA was removed).
// Force a single hard reload if the page is currently being controlled by a SW,
// so the user immediately sees the fresh build instead of cached HTML/assets.
if ("serviceWorker" in navigator) {
  const wasControlled = !!navigator.serviceWorker.controller;

  Promise.all([
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {}),
    caches?.keys?.().then((names) => Promise.all(names.map((n) => caches.delete(n)))).catch(() => {}),
  ]).then(() => {
    if (wasControlled && !sessionStorage.getItem("__sw_cleanup_reloaded")) {
      sessionStorage.setItem("__sw_cleanup_reloaded", "1");
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
