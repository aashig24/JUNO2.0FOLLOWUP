import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface UserProfileProps {
  className?: string;
}

const UserProfile = ({ className }: UserProfileProps) => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center">
        <Avatar className="w-10 h-10 mr-3">
          <AvatarImage src={user.avatar} alt={user.fullName} />
          <AvatarFallback className="bg-secondary text-white">
            {user.fullName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-white">{user.fullName}</p>
          <p className="text-xs text-primary-200">{user.email}</p>
        </div>
      </div>
      <Button
        onClick={handleLogout}
        className="flex items-center justify-center w-full px-4 py-2 mt-4 text-white bg-sidebar-primary hover:bg-sidebar-accent"
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Logging out...
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </>
        )}
      </Button>
    </div>
  );
};

export default UserProfile;
