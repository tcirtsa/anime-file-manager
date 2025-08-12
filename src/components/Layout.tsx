import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}