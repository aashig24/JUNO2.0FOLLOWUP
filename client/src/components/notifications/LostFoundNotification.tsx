import { useState, useEffect } from "react";
import { X, Bell, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const LostFoundNotification = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch lost and found items
  const { data: itemsData = [], isLoading } = useQuery({
    queryKey: ["/api/lostfound/all"],
  });

  // Only show the most recent 5 items
  const recentItems = Array.isArray(itemsData) 
    ? itemsData.slice(0, 5) 
    : [];

  // Auto-close notification after 7 seconds if opened automatically
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && recentItems.length > 0) {
      timer = setTimeout(() => {
        setIsOpen(false);
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [isOpen, recentItems.length]);

  if (recentItems.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="fixed right-4 top-16 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center"
        >
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {recentItems.length}
          </span>
        </button>
      ) : (
        <Card className="w-80 shadow-lg border-t-4 border-t-blue-600 animate-in slide-in-from-right-5 duration-300">
          <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
            <h3 className="font-medium text-gray-700 flex items-center">
              <Bell size={16} className="mr-2 text-blue-600" />
              Lost & Found Notifications
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
          <CardContent className="p-0 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading notifications...
              </div>
            ) : (
              <div>
                {recentItems.map((item: any) => (
                  <div key={item.id} className="p-3 border-b hover:bg-gray-50">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 bg-gray-100 p-1 rounded">
                        <Search size={16} className="text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            item.type === 'lost' 
                              ? 'bg-red-500 text-white' 
                              : 'bg-green-500 text-white'
                          }`}>
                            {item.type === 'lost' ? 'Lost' : 'Found'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Location: {item.location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-3 text-center">
                  <Link href="/lost-found">
                    <Button variant="link" size="sm" className="text-blue-600">
                      View all lost & found items
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LostFoundNotification;