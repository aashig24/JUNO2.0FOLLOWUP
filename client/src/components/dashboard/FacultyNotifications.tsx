import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Student {
  id: number;
  fullName: string;
  email: string;
}

interface Booking {
  id: number;
  userId: number;
  mentorId: number;
  date: string;
  time: string;
  purpose: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  student?: Student;
}

export default function FacultyNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: bookings, isLoading, error } = useQuery<Booking[]>({
    queryKey: ["/api/faculty/pending-bookings"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateBookingMutation = useMutation({
    mutationFn: async (data: { id: number; status: string; rejectionReason?: string }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/bookings/${data.id}`,
        { status: data.status, rejectionReason: data.rejectionReason || null }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faculty/pending-bookings"] });
      toast({
        title: "Success",
        description: "Booking status updated successfully",
      });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedBooking(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update booking: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (booking: Booking) => {
    updateBookingMutation.mutate({ id: booking.id, status: "approved" });
  };

  const handleReject = () => {
    if (!selectedBooking) return;
    
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    
    updateBookingMutation.mutate({
      id: selectedBooking.id,
      status: "rejected",
      rejectionReason: rejectionReason
    });
  };

  const openRejectDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setRejectDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Meeting Requests</CardTitle>
          <CardDescription>Pending meeting requests from students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Meeting Requests</CardTitle>
          <CardDescription>Pending meeting requests from students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-red-500">
            Error loading meeting requests. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Meeting Requests</CardTitle>
          <CardDescription>Pending meeting requests from students</CardDescription>
        </CardHeader>
        <CardContent>
          {bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings
                .filter(booking => booking.status === "pending")
                .map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{booking.student?.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{booking.student?.email}</p>
                    </div>
                    <Badge variant={
                      booking.status === "approved" ? "outline" : 
                      booking.status === "rejected" ? "destructive" : 
                      "secondary"
                    }>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm">{format(new Date(booking.date), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm">{booking.time}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium">Purpose</p>
                    <p className="text-sm">{booking.purpose}</p>
                  </div>
                  
                  <div className="flex space-x-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => openRejectDialog(booking)}
                      disabled={updateBookingMutation.isPending}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-500 border-green-200 hover:bg-green-50"
                      onClick={() => handleApprove(booking)}
                      disabled={updateBookingMutation.isPending}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No pending meeting requests.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Meeting Request</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm mb-2">Please provide a reason for rejecting this meeting request:</p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection"
              className="resize-none"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={updateBookingMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={updateBookingMutation.isPending || !rejectionReason.trim()}
              variant="destructive"
            >
              {updateBookingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Meeting"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}