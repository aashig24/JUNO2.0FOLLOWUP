import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Bell, MessageSquare } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Navigation items
  const navItems = [
    { label: "Student Academic Fees Payment", path: "/academic-fees" },
    { label: "Student Hostel Fees Details", path: "/hostel-fees" },
    { label: "Personal", path: "/personal" },
    { label: "Academic Functions", path: "/academic-functions" },
    { label: "Communication", path: "/communication" },
  ];

  // Sidebar items
  const sidebarItems = [
    { label: "Dashboard", path: "/" },
    { label: "Profile", path: "/profile" },
    { label: "Syllabus", path: "/syllabus" },
    { label: "Calendar", path: "/calendar" },
    { label: "Lost & Found", path: "/lost-found" },
    { label: "Timetable", path: "/timetable" },
    { label: "Fees Details", path: "/fees-details" },
    { label: "Leave Details", path: "/leave-details" },
    { label: "Hostel", path: "/hostel" },
    { label: "Contact Faculty", path: "/contact-mentor" },
    { label: "Classroom Allotment", path: "/classroom-allotment" },
    { label: "Library (0 Issued)", path: "/library" },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Top Navigation Bar */}
      <header className="bg-blue-900 text-white">
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center space-x-2">
            {isMobile && (
              <button onClick={toggleSidebar} className="p-1">
                <Menu size={24} />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex items-center">
              <span className="mr-2">{user?.fullName || "Student"}</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} alt={user?.fullName} />
                <AvatarFallback className="bg-blue-700">
                  {user?.fullName?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
            </div>
            <button 
              onClick={handleLogout}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-white text-sm flex items-center space-x-1"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex flex-wrap text-sm border-t border-blue-800">
          {navItems.map((item, index) => (
            <Link key={index} href={item.path}>
              <div className="px-4 py-2 hover:bg-blue-800 border-r border-blue-800 cursor-pointer">
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside 
          className={`bg-gray-200 w-64 flex-shrink-0 pt-4 ${
            isMobile ? (sidebarOpen ? "block absolute z-10 h-full" : "hidden") : "block"
          }`}
        >
          {/* Student Info */}
          <div className="px-4 pb-4 border-b border-gray-300">
            <h2 className="font-bold text-lg uppercase">{user?.fullName || "Student Name"}</h2>
            <p className="text-sm">Roll No: {user?.id || "REDUAN874"}</p>
            <p className="text-sm">Sem: VI</p>
            <p className="text-sm">B.Tech AI</p>
            <p className="text-sm">AI 2</p>
          </div>
          
          {/* Sidebar Navigation */}
          <nav className="mt-2">
            {sidebarItems.map((item, index) => (
              <Link key={index} href={item.path}>
                <div className={`block px-4 py-2 text-sm hover:bg-gray-300 cursor-pointer ${
                  location === item.path ? "bg-blue-800 text-white" : ""
                }`}>
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-500 text-white text-center py-2 text-sm">
        Powered by JUNO Campus
      </footer>
    </div>
  );
};

export default DashboardLayout;
