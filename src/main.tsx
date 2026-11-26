import React from "react";
import ReactDOM from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import {registerSW} from "virtual:pwa-register";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import App from "./App";
import ReleaseDownloadEnhancer from "./components/ReleaseDownloadEnhancer";
import "@uichat-mira/folio/styles.css";
import "./claude.theme.css";
import "./tailwind.css";
import "./styles.css";
import "./release-download.css";
import "./home.css";
import "./mobile-landing.css";
import "./about-landing.css";
import "./blog-list.css";
import "./markdown.css";
import "./blog-detail.css";
import "./claude-visual.css";


// Keep the deployment root aligned with BrowserRouter's basename. GitHub Pages
// mounts the app at /uichat-mira-docs/; stripping that final slash makes the
// basename fail to match and React renders an empty shell.
const buildBase = import.meta.env.BASE_URL;
const normalizedBuildBase = buildBase === "/" ? "/" : buildBase.replace(/\/+$/, "");

if (normalizedBuildBase !== "/" && window.location.pathname === normalizedBuildBase) {
  window.history.replaceState(
    null,
    "",
    `${normalizedBuildBase}/${window.location.search}${window.location.hash}`,
  );
}


const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event("mira:pwa-update-available"));
  },
});

window.addEventListener("mira:pwa-update-confirmed", () => {
  void updateSW();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={buildBase}>
      <App />
      <ReleaseDownloadEnhancer />
    </BrowserRouter>
  </React.StrictMode>,
);
