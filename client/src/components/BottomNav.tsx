import { Home, PlusSquare, User, Shield, Medal } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around z-10">
      <Link href="/">
        <div
          className={`flex flex-col items-center ${
            location === "/" ? "text-primary" : "text-gray-400"
          } cursor-pointer`}
        >
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">홈</span>
        </div>
      </Link>

      <Link href="/upload">
        <div
          className={`flex flex-col items-center ${
            location === "/upload" ? "text-primary" : "text-gray-400"
          } cursor-pointer`}
        >
          <PlusSquare className="h-6 w-6" />
          <span className="text-xs mt-1">업로드</span>
        </div>
      </Link>
      <Link href="/leaderboard">
        <div
          className={`flex flex-col items-center ${
            location === "/leaderboard" ? "text-primary" : "text-gray-400"
          } cursor-pointer`}
        >
          <Medal className="h-6 w-6" />
          <span className="text-xs mt-1">리더보드</span>
        </div>
      </Link>
      {(isAdmin && (
        <Link href="/admin">
          <div
            className={`flex flex-col items-center ${
              location === "/admin" ? "text-primary" : "text-gray-400"
            } cursor-pointer`}
          >
            <Shield className="h-6 w-6" />
            <span className="text-xs mt-1">Admin</span>
          </div>
        </Link>
      )) ||
        (!isAdmin && ``)}

      <Link href="/profile">
        <div
          className={`flex flex-col items-center ${
            location === "/profile" ? "text-primary" : "text-gray-400"
          } cursor-pointer`}
        >
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">프로필</span>
        </div>
      </Link>
    </div>
  );
}
