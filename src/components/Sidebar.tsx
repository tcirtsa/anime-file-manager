import React from "react";
import { Link, useLocation } from "react-router-dom";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, active }) => {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-secondary/50 text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="w-64 h-screen bg-background border-r border-border flex flex-col">
      {/* 应用标题 */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold">动漫文件管理器</h1>
        <p className="text-xs text-muted-foreground">v0.1.0</p>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-2 space-y-1">
        <NavItem
          to="/import"
          active={currentPath === "/import" || currentPath === "/"}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 22h16a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M2 15h10v5h-8a2 2 0 0 1-2-2z" />
              <path d="m9 15-2-2-2 2" />
            </svg>
          }
          label="文件导入"
        />
        <NavItem
          to="/settings"
          active={currentPath === "/settings"}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
          label="设置"
        />
        <NavItem
          to="/logs"
          active={currentPath === "/logs"}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
              <path d="m12 12 4 10 1.7-4.3L22 16Z" />
            </svg>
          }
          label="日志"
        />
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        <p>© 2025 动漫文件管理器</p>
      </div>
    </div>
  );
}