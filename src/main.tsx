import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";

// 等待 DOM 完全加载后再渲染应用
function initApp() {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// 确保在 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
