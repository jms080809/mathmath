import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  hideBottomNav?: boolean;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

export function Layout({ 
  children, 
  title = "MathSolve",
  hideBottomNav = false,
  leftAction,
  rightAction
}: LayoutProps) {
  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white relative">
      {/* Top Navigation */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        {leftAction || <div className="w-8"></div>}
        <h1 className="text-xl font-semibold">{title}</h1>
        {rightAction || <div className="w-8"></div>}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-16">
        {children}
      </div>
      
      {/* Bottom Navigation */}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
