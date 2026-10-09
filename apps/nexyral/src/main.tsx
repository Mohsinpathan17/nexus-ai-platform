import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "./app/ThemeProvider";
import AuthProvider from "./app/AuthProvider";
import App from "./app/App";
import "./styles/global.css";
import "./styles/fonts.css";
import "./styles/story.css";
import "./styles/workspace.css";
import "./styles/core.css";
import "./styles/typography.css";
import "./styles/cloud-studio.css";
import "./styles/account.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <App />
          </AuthProvider>
        </MotionConfig>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
