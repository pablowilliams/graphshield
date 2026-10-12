import React from "react";
import { createRoot } from "react-dom/client";
import { GraphShieldApp } from "../app/GraphShieldApp";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GraphShieldApp />
  </React.StrictMode>,
);
