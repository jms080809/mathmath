import { Home, PlusSquare, User } from "lucide-react";
import { Link, useLocation } from "wouter";

export function BottomNav() {
  const [location] = useLocation();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around z-10">
      <Link href="/">
        <a className={`flex flex-col items-center ${location === "/" ? "text-primary" : "text-gray-400"}`}>
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">Home</span>
        </a>
      </Link>
      
      <Link href="/upload">
        <a className={`flex flex-col items-center ${location === "/upload" ? "text-primary" : "text-gray-400"}`}>
          <PlusSquare className="h-6 w-6" />
          <span className="text-xs mt-1">Upload</span>
        </a>
      </Link>
      
      <Link href="/profile">
        <a className={`flex flex-col items-center ${location === "/profile" ? "text-primary" : "text-gray-400"}`}>
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </a>
      </Link>
    </div>
  );
}
