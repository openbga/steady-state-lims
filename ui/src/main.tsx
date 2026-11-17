import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { applyAppearance, lastAppearance } from "@/lib/appearance";
import "@/styles/global.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("The page has no #root element");
}
// Until someone signs in, the app shows the appearance last used on this computer (#4789);
// ui/public/appearance.js already painted it, and this sets the window's title bar too.
applyAppearance(lastAppearance());
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
