import { Home, PlusSquare, User } from "lucide-react";
import { Link, useLocation } from "wouter";

export function BottomNav() {
  const [location] = useLocation();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around z-10">
      <Link href="/">
        <div className={`flex flex-col items-center ${location === "/" ? "text-primary" : "text-gray-400"} cursor-pointer`}>
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">Home</span>
        </div>
      </Link>
      
      <Link href="/upload">
        <div className={`flex flex-col items-center ${location === "/upload" ? "text-primary" : "text-gray-400"} cursor-pointer`}>
          <PlusSquare className="h-6 w-6" />
          <span className="text-xs mt-1">Upload</span>
        </div>
      </Link>
      
      <Link href="/profile">
        <div className={`flex flex-col items-center ${location === "/profile" ? "text-primary" : "text-gray-400"} cursor-pointer`}>
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </div>
      </Link>
    </div>
  );
}
