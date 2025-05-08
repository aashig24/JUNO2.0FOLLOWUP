import { Bell, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

interface MobileNavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const MobileNavbar = ({ sidebarOpen, setSidebarOpen }: MobileNavbarProps) => {
  const { user } = useAuth();

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between p-4 bg-primary text-white">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 mr-2 bg-white rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary">UV</span>
            </div>
            <h1 className="text-lg font-bold">UniViz</h1>
          </div>
        </div>
        <div className="flex items-center">
          <button className="p-1 rounded-full hover:bg-primary-600" aria-label="Notifications">
            <Bell className="w-6 h-6" />
          </button>
          <Avatar className="w-8 h-8 ml-3">
            <AvatarImage src={user?.avatar} alt={user?.fullName || "User"} />
            <AvatarFallback className="bg-secondary text-white">
              {user?.fullName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
};

export default MobileNavbar;
