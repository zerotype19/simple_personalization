import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { boot } from "@si/sdk";
import App from "./App";
import "./index.css";
import { workerUrl } from "./workerUrl";

async function main() {
  await boot({
    configUrl: workerUrl("/config?demo=velocity"),
    collectUrl: workerUrl("/collect"),
    forceInspector: true,
    siteVerticalOverride: "auto_retail",
  });

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void main();
