import { useAuth } from "@/context/AuthContext";
import { Link } from "wouter";
import LostFoundNotification from "@/components/notifications/LostFoundNotification";
import FacultyNotifications from "@/components/dashboard/FacultyNotifications";

const Dashboard = () => {
  const { user } = useAuth();
  
  // Check if user is faculty
  const isFaculty = user?.role === "faculty";
  
  // Info panels for dashboard
  const infoPanels = [
    { title: "Announcements", id: "announcements" },
    { title: "Attendance", id: "attendance" },
    { title: "Assignment", id: "assignment" },
    { title: "Test", id: "test" },
    { title: "Placement", id: "placement" }
  ];

  return (
    <div>
      {/* Lost & Found Notification */}
      <LostFoundNotification />
      
      {/* Faculty Mentor Booking Notifications */}
      {isFaculty && (
        <div className="mb-6">
          <FacultyNotifications />
        </div>
      )}
      
      {/* Info Panels */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {infoPanels.map((panel) => (
          <div 
            key={panel.id} 
            className="bg-gray-200 p-4 min-h-[150px] flex items-center justify-center"
          >
            <h3 className="text-gray-700 font-medium text-center">{panel.title}</h3>
          </div>
        ))}
      </div>
      
      {/* Today's Schedule */}
      <div className="mb-6">
        <div className="bg-gray-200 p-4">
          <h3 className="text-gray-700 font-medium text-center mb-2">Today's Schedule</h3>
          <p className="text-gray-500 text-center italic text-sm">(No Schedule for Today)</p>
        </div>
      </div>
      
      {/* Additional Info Box */}
      <div className="bg-gray-200 p-4 min-h-[100px]">
        {/* Empty content box as shown in wireframe */}
      </div>
    </div>
  );
};

export default Dashboard;
