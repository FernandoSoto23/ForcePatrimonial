import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import { GeocercasProvider } from "./context/GeocercasContext";
import { GeocercasLinealesProvider } from "./context/GeocercasLinealesContext";
import { UnitsProvider } from "./context/UnitsContext";


import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <UnitsProvider>
    <GeocercasProvider>
      <GeocercasLinealesProvider>

        <BrowserRouter>
          <ToastContainer position="bottom-right" />
          <App />
        </BrowserRouter>
      </GeocercasLinealesProvider>
    </GeocercasProvider>
  </UnitsProvider>
);
