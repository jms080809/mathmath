import { User } from "@/lib/types";

interface AvatarPlaceholderProps {
  user: User | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarPlaceholder({ user, size = "md", className = "" }: AvatarPlaceholderProps) {
  const initials = user?.username ? user.username.charAt(0).toUpperCase() : "?";
  
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-24 w-24 text-2xl"
  };
  
  const sizeClass = sizeClasses[size];
  
  if (user?.profilePicture) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden ${className}`}>
        <img 
          src={user.profilePicture} 
          alt={`${user.username}'s profile`} 
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  
  return (
    <div className={`${sizeClass} rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
      <span className="font-semibold text-gray-500">{initials}</span>
    </div>
  );
}
