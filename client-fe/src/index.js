import React from "react";
import ReactDOM from "react-dom";
import Apps from "./App";
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // <React.StrictMode>
  <Apps />,
  // </React.StrictMode>
);
reportWebVitals();
