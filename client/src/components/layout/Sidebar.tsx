import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "wouter";
import UserProfile from "./UserProfile";
import {
  HomeIcon,
  BarChart3Icon,
  SearchIcon,
  Users2Icon,
  BanknoteIcon,
  Loader2Icon,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

interface NavItem {
  title: string;
  path: string;
  icon: JSX.Element;
}

const Sidebar = ({ isOpen, closeSidebar }: SidebarProps) => {
  const [location] = useLocation();
  const { isLoading } = useAuth();

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: <HomeIcon className="w-5 h-5 mr-3" />,
    },
    {
      title: "Lost & Found",
      path: "/lost-found",
      icon: <SearchIcon className="w-5 h-5 mr-3" />,
    },
    {
      title: "Contact Mentor",
      path: "/contact-mentor",
      icon: <Users2Icon className="w-5 h-5 mr-3" />,
    },
    {
      title: "Mess Balance",
      path: "/mess-balance",
      icon: <BanknoteIcon className="w-5 h-5 mr-3" />,
    },
  ];

  // Common styles for nav items
  const getNavItemClasses = (path: string) => {
    const isActive = 
      path === location || 
      (path === "/dashboard" && location === "/");
    
    return `flex items-center px-4 py-3 rounded-md ${
      isActive
        ? "bg-sidebar-primary text-white"
        : "text-sidebar-foreground hover:bg-sidebar-primary"
    }`;
  };

  if (isLoading) {
    return (
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 overflow-y-auto bg-sidebar lg:block">
        <div className="flex items-center justify-center h-full">
          <Loader2Icon className="w-10 h-10 text-white animate-spin" />
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 overflow-y-auto bg-sidebar lg:block">
        <div className="p-4">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 mr-3 bg-white rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-primary">UV</span>
            </div>
            <h1 className="text-xl font-bold text-white">UniViz</h1>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={getNavItemClasses(item.path)}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>

        <UserProfile className="absolute bottom-0 w-full p-4 border-t border-sidebar-border" />
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${isOpen ? "" : "hidden"}`}
        onClick={closeSidebar}
      >
        <div className="fixed inset-0 bg-black bg-opacity-50"></div>
        <div className="relative flex flex-col w-4/5 max-w-xs min-h-screen py-4 overflow-y-auto bg-sidebar" onClick={(e) => e.stopPropagation()}>
          <div className="px-4 mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 mr-3 bg-white rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-primary">UV</span>
              </div>
              <h1 className="text-xl font-bold text-white">UniViz</h1>
            </div>
          </div>

          <nav className="px-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={getNavItemClasses(item.path)}
                onClick={closeSidebar}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          <UserProfile className="mt-auto px-4 border-t border-sidebar-border pt-4" />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
