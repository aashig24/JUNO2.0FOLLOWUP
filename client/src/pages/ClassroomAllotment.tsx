import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Loader2, School } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Time slots from 8:30am to 6:30pm in 1-hour increments
const TIME_SLOTS = [
  "08:30-09:30",
  "09:30-10:30",
  "10:30-11:30",
  "11:30-12:30",
  "12:30-13:30",
  "13:30-14:30",
  "14:30-15:30",
  "15:30-16:30",
  "16:30-17:30",
  "17:30-18:30",
  "Night Permission", // Special slot for after 6:30pm
];

// Classroom booking schema
const classroomBookingSchema = z.object({
  date: z.date({
    required_error: "Please select a date",
  }),
  timeSlot: z.string({
    required_error: "Please select a time slot",
  }),
  classroom: z.string({
    required_error: "Please select a classroom",
  }),
  purpose: z.string().min(10, {
    message: "Purpose must be at least 10 characters",
  }),
  alternativeName: z.string().optional(),
  alternativeId: z.string().optional(),
});

type ClassroomBookingFormValues = z.infer<typeof classroomBookingSchema>;

interface ClassroomBooking {
  id: number;
  userId: number;
  classroom: string;
  date: string;
  timeSlot: string;
  purpose: string;
  status: string;
  createdAt: string;
  alternativeName: string | null;
  alternativeId: string | null;
}

export default function ClassroomAllotment() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  
  const form = useForm<ClassroomBookingFormValues>({
    resolver: zodResolver(classroomBookingSchema),
    defaultValues: {
      date: new Date(),
      timeSlot: "",
      classroom: "",
      purpose: "",
      alternativeName: "",
      alternativeId: "",
    },
  });

  const dateValue = form.watch("date");
  const timeSlotValue = form.watch("timeSlot");

  // Query for available classrooms based on date and time slot
  // Generate list of all possible classrooms
  const getAllClassrooms = () => ([
    ...[...Array(18)].map((_, i) => `ECR ${i + 1}`),
    ...[...Array(7)].map((_, i) => `ELT ${i + 1}`)
  ]);

  // Fetch available classrooms from the API
  const {
    data: availableClassrooms = [],
    isLoading: isLoadingClassrooms,
  } = useQuery({
    queryKey: ["/api/classrooms/available", dateValue ? format(dateValue, "yyyy-MM-dd") : "", timeSlotValue],
    queryFn: async () => {
      if (!dateValue || !timeSlotValue) return [];
      
      const formattedDate = format(dateValue, "yyyy-MM-dd");
      console.log(`Fetching classrooms for date: ${formattedDate}, timeSlot: ${timeSlotValue}`);
      const response = await apiRequest("GET", 
        `/api/classrooms/available?date=${formattedDate}&timeSlot=${timeSlotValue}`);
      const result = await response.json();
      console.log("Available classrooms:", result);
      return result;
    },
    enabled: !!dateValue && !!timeSlotValue,
  });

  // Query for user's bookings
  const {
    data: userBookings = [],
    isLoading: isLoadingBookings,
  } = useQuery({
    queryKey: ["/api/classrooms/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/classrooms/bookings");
      return await response.json();
    },
  });

  // Classroom booking mutation
  const bookingMutation = useMutation<ClassroomBooking, Error, ClassroomBookingFormValues>({
    mutationFn: async (data: ClassroomBookingFormValues) => {
      const bookingData = {
        classroom: data.classroom,
        date: format(data.date, "yyyy-MM-dd"),
        timeSlot: data.timeSlot,
        purpose: data.purpose,
        alternativeName: data.alternativeName || null,
        alternativeId: data.alternativeId || null
      };
      
      const response = await apiRequest("POST", "/api/classrooms/book", bookingData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to book classroom");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Reset form
      form.reset({
        date: new Date(),
        timeSlot: "",
        classroom: "",
        purpose: "",
        alternativeName: "",
        alternativeId: ""
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms/bookings"] });
      
      toast({
        title: "Booking submitted",
        description: "Your classroom booking request has been submitted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Booking failed",
        description: error.message || "An error occurred while submitting your booking.",
        variant: "destructive",
      });
    }
  });

  // Update form values when date or time slot changes
  useEffect(() => {
    if (selectedDate) {
      form.setValue("date", selectedDate);
    }
    
    if (selectedTimeSlot) {
      form.setValue("timeSlot", selectedTimeSlot);
    }
  }, [selectedDate, selectedTimeSlot, form]);

  // Handle form submission
  const onSubmit = async (data: ClassroomBookingFormValues) => {
    await bookingMutation.mutateAsync(data);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="w-full p-4 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classroom Allotment</h1>
          <p className="text-muted-foreground">Book classrooms for events, meetings or study sessions.</p>
        </div>
        <School className="w-10 h-10 text-primary" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        {/* Booking form */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Book a Classroom</CardTitle>
            <CardDescription>
              Select date, time and room for your booking request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date picker */}
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
                                  "pl-3 text-left font-normal",
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
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Time slot selection */}
                  <FormField
                    control={form.control}
                    name="timeSlot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Slot</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedTimeSlot(value);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time slot" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_SLOTS.map((slot) => (
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

                {/* Available classrooms */}
                <FormField
                  control={form.control}
                  name="classroom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classroom</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoadingClassrooms || !timeSlotValue}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a classroom" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingClassrooms ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="ml-2">Loading classrooms...</span>
                            </div>
                          ) : availableClassrooms.length > 0 ? (
                            availableClassrooms.map((classroom: string) => (
                              <SelectItem key={classroom} value={classroom}>
                                {classroom}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              No classrooms available for selected time
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only available classrooms are shown for the selected time slot
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Purpose field */}
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose of Booking</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your purpose for booking the classroom"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Clearly state the reason for booking (e.g., club meeting, group study, event)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alternative person details */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Alternative Contact (Optional)</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    If booking for someone else, provide their details
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="alternativeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternative Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Full Name"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="alternativeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternative College ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="College ID"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      bookingMutation.isPending ||
                      isLoadingClassrooms ||
                      !form.formState.isValid
                    }
                  >
                    {bookingMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Booking Request
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Your bookings */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Your Bookings</CardTitle>
            <CardDescription>
              View and manage your classroom booking requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBookings ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading your bookings...</span>
              </div>
            ) : userBookings.length > 0 ? (
              <Table>
                <TableCaption>List of your recent classroom bookings</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classroom</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userBookings.map((booking: ClassroomBooking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.classroom}</TableCell>
                      <TableCell>{new Date(booking.date).toLocaleDateString()}</TableCell>
                      <TableCell>{booking.timeSlot}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">
                  You don't have any classroom bookings yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


    </div>
  );
}