import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// UI Components
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  CalendarIcon,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Calendar as CalendarIconSolid,
  X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// All available time slots
const ALL_TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
];

// Form validation schema
const bookingSchema = z.object({
  mentorId: z.string().min(1, { message: "Please select a mentor" }),
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string().min(1, { message: "Please select a time slot" }),
  purpose: z.string().min(5, { message: "Please provide a brief purpose for the meeting" }),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

// Types
interface Mentor {
  id: number;
  name: string;
  department: string;
  specialization: string;
  email: string;
  office: string;
  avatar?: string;
  availability: Record<string, string[]>;
}

interface Booking {
  id: number;
  mentorId: number;
  date: string;
  time: string;
  purpose: string;
  status: string;
  rejectionReason?: string | null;
}

interface Course {
  id: number;
  courseCode: string;
  name: string;
  department: string;
  credits: number;
  description: string | null;
  semester: string;
  facultyId: number;
  schedule: string;
  room: string;
}

const ContactMentor = () => {
  // Workflow steps: 1. Course -> 2. Mentor -> 3. Booking
  const [currentStep, setCurrentStep] = useState<"courses" | "mentors" | "booking">("courses");
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>("book");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(ALL_TIME_SLOTS);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form setup
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      mentorId: "",
      purpose: "",
    },
  });

  // Data fetching
  const { data: mentors, isLoading: isLoadingMentors } = useQuery<Mentor[]>({
    queryKey: ["/api/mentors"],
  });

  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: activeTab === "my-bookings"
  });
  
  // Log bookings when they're loaded and refresh when tab changes
  useEffect(() => {
    if (activeTab === "my-bookings") {
      // Force a refetch when tab is changed to my-bookings
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    }
  }, [activeTab, queryClient]);
  
  // Log loaded bookings
  useEffect(() => {
    if (bookings) {
      console.log("My bookings loaded:", bookings);
      console.log(`User ${user?.id} (${user?.username}) has ${(bookings as Booking[]).length} bookings`);
    }
    if (bookingsError) {
      console.error("Error loading bookings:", bookingsError);
    }
  }, [bookings, bookingsError, user]);
  
  const { data: enrolledCourses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ["/api/enrollments/courses"],
    enabled: !!user,
  });
  
  // Fetch booked slots for selected mentor and date
  const { data: bookedSlots, isLoading: isLoadingBookedSlots } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/booked-slots", selectedMentor, selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""],
    enabled: !!selectedMentor && !!selectedDate && currentStep === "booking",
    queryFn: async () => {
      const formattedDate = format(selectedDate!, "yyyy-MM-dd");
      const response = await fetch(`/api/bookings/booked-slots?mentorId=${selectedMentor}&date=${formattedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booked slots');
      }
      return response.json();
    }
  });

  // Handle mentor selection
  const handleMentorSelect = (mentorId: string) => {
    setSelectedMentor(mentorId);
    form.setValue("mentorId", mentorId);
  };

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentorId: parseInt(data.mentorId),
          date: format(data.date, "yyyy-MM-dd"),
          time: data.time,
          purpose: data.purpose,
          status: "pending",
        }),
      });
      
      if (!response.ok) {
        // Parse the error message from the server
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit booking");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your booking has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/booked-slots"] });
      setActiveTab("my-bookings");
      form.reset();
      setSelectedMentor("");
      setSelectedDate(undefined);
      setCurrentStep("courses");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      
      // Refresh booked slots data to ensure UI is up-to-date
      queryClient.invalidateQueries({ 
        queryKey: ["/api/bookings/booked-slots", selectedMentor, selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""]
      });
    },
  });

  // Update available time slots when booked slots change
  useEffect(() => {
    if (bookedSlots && selectedDate) {
      // Filter out already booked time slots
      const bookedTimes = bookedSlots.map(booking => booking.time);
      const availableTimes = ALL_TIME_SLOTS.filter(slot => !bookedTimes.includes(slot));
      setAvailableTimeSlots(availableTimes);
      
      // If current selection is now invalid, clear it
      if (form.getValues("time") && bookedTimes.includes(form.getValues("time"))) {
        form.setValue("time", "");
      }
    } else {
      // Reset to all slots when no date or mentor is selected
      setAvailableTimeSlots(ALL_TIME_SLOTS);
    }
  }, [bookedSlots, selectedDate, form]);

  // Form submission
  const onSubmit = (data: BookingFormValues) => {
    bookingMutation.mutate(data);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-blue-600">Contact Faculty</h1>
      </div>
      
      <p className="text-neutral-500 mb-6">Book appointments with faculty mentors for guidance and support</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="book">Book Appointment</TabsTrigger>
          <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="book">
          {/* Step 1: Course Selection */}
          {currentStep === "courses" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-neutral-800">Select a Course</h2>
                <div className="text-sm text-neutral-500">
                  Step 1 of 3: Course Selection
                </div>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  {isLoadingCourses ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex p-3 border rounded-lg items-center">
                          <div className="w-24">
                            <Skeleton className="h-5 w-20" />
                          </div>
                          <div className="flex-1">
                            <Skeleton className="h-6 w-3/4 mb-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !enrolledCourses || enrolledCourses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-neutral-500">You are not enrolled in any courses yet.</p>
                    </div>
                  ) : (
                    <div className="relative overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                          <tr>
                            <th scope="col" className="px-6 py-3 w-36">
                              Code
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 w-36 text-right">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrolledCourses.map(course => (
                            <tr key={course.id} className="bg-white border-b hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-900">
                                {course.courseCode}
                              </td>
                              <td className="px-6 py-4">
                                {course.name}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCourse(course.id);
                                    setCurrentStep("mentors");
                                  }}
                                >
                                  Select
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 2: Mentor Selection */}
          {currentStep === "mentors" && selectedCourse && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentStep("courses");
                      setSelectedCourse(null);
                    }}
                    className="mr-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <h2 className="text-xl font-semibold text-neutral-800">Select Faculty Mentor</h2>
                </div>
                <div className="text-sm text-neutral-500">
                  Step 2 of 3: Mentor Selection
                </div>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  {isLoadingMentors ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <div className="flex-1">
                            <Skeleton className="h-5 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2 mb-1" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !mentors || mentors.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-neutral-500">No mentors available at the moment.</p>
                    </div>
                  ) : (
                    <div className="relative overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                          <tr>
                            <th scope="col" className="px-6 py-3 w-16">
                              SL No.
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Mentor Name
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Post
                            </th>
                            <th scope="col" className="px-6 py-3 w-32 text-right">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {mentors
                            .filter(mentor => {
                              const selectedCourseObj = enrolledCourses?.find(c => c.id === selectedCourse);
                              return selectedCourseObj ? mentor.id === selectedCourseObj.facultyId : true;
                            })
                            .map((mentor, index) => (
                              <tr key={mentor.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  {index + 1}.
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">
                                  {mentor.name}
                                </td>
                                <td className="px-6 py-4">
                                  {mentor.department}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      handleMentorSelect(mentor.id.toString());
                                      setCurrentStep("booking");
                                    }}
                                  >
                                    Book
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 3: Booking Form */}
          {currentStep === "booking" && selectedMentor && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentStep("mentors");
                    }}
                    className="mr-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <h2 className="text-xl font-semibold text-neutral-800">Book Appointment</h2>
                </div>
                <div className="text-sm text-neutral-500">
                  Step 3 of 3: Schedule Appointment
                </div>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="mentorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Selected Mentor</FormLabel>
                            <FormControl>
                              <div className="p-3 border rounded-md bg-neutral-50">
                                {mentors?.find((m) => m.id === parseInt(selectedMentor))?.name}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(date) => {
                                      field.onChange(date);
                                      setSelectedDate(date);
                                    }}
                                    disabled={(date) => 
                                      date < new Date() || 
                                      date > new Date(new Date().setMonth(new Date().getMonth() + 2))
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time Slot</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={!selectedDate}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a time slot" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableTimeSlots.map((slot) => (
                                    <SelectItem key={slot} value={slot}>
                                      {slot}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="purpose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Purpose of Meeting</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Briefly describe what you would like to discuss with the mentor"
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={bookingMutation.isPending}
                      >
                        {bookingMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Book Appointment"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="my-bookings">
          <Card className="shadow">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-neutral-800 mb-4">My Bookings</h2>
              
              {isLoadingBookings ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <div className="grid md:grid-cols-3 gap-2 mb-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : !bookings || (bookings as Booking[]).length === 0 ? (
                <div className="text-center py-12 border rounded-lg border-dashed border-neutral-300 bg-neutral-50">
                  <Bookmark className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">No Bookings Yet</h3>
                  <p className="text-neutral-500 mb-4 max-w-md mx-auto">
                    You don't have any mentor appointments scheduled. Book a meeting with a faculty mentor for guidance and support.
                  </p>
                  <Button onClick={() => setActiveTab("book")}>
                    Book Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(bookings as Booking[]).map((booking: Booking) => {
                    const mentor = mentors?.find((m) => m.id === booking.mentorId);
                    return (
                      <div key={booking.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-neutral-800">
                            Meeting with {mentor?.name || "Faculty Mentor"}
                          </h3>
                          <Badge className={
                            booking.status === "approved" ? "bg-green-500" :
                            booking.status === "rejected" ? "bg-red-500" :
                            "bg-yellow-500"
                          }>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        
                        {/* Show rejection reason if status is rejected */}
                        {booking.status === "rejected" && booking.rejectionReason && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm">
                            <div className="font-medium">Rejection Reason:</div>
                            <div>{booking.rejectionReason}</div>
                          </div>
                        )}
                        
                        <div className="grid md:grid-cols-3 gap-2 text-sm text-neutral-600 mb-2">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2 text-neutral-400" />
                            {booking.date}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-neutral-400" />
                            {booking.time}
                          </div>
                          {mentor && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-neutral-400" />
                              {mentor.office}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-neutral-500 border-t pt-2 mt-2">
                          <span className="font-medium text-neutral-600">Purpose:</span> {booking.purpose}
                        </p>
                        
                        {/* Rejection reason is already shown above */}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContactMentor;