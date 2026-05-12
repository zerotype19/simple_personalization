import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { boot } from "@si/sdk";
import App from "./App";
import "./index.css";

async function main() {
  await boot({
    configUrl: "/config",
    collectUrl: "/collect",
    forceInspector: true,
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
