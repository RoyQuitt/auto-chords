import React from "react";
import ReactDOM from "react-dom/client";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import App from "./App";
import "./styles/app.css";

const theme = createTheme({
  primaryColor: "green",
  defaultRadius: "md",
  fontFamily: "Space Grotesk, Segoe UI, sans-serif"
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
