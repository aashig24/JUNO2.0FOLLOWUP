import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Calendar,
  MapPin,
  PlusIcon,
  Upload,
  X,
  ImageIcon,
  Clock,
  Phone,
  ArrowLeft,
} from "lucide-react";

// Category options
const categoryOptions = [
  "Electronics",
  "Books & Notes",
  "Clothing",
  "Accessories",
  "ID Cards",
  "Keys",
  "Others",
];

// Location options based on item type
const lostItemLocations = [
  "Ecole",
  "Library",
  "IT Blocks",
  "Sports Complex",
  "Classroom",
  "Cafeteria",
  "Other",
];

const foundItemLocations = [
  "Ecole",
  "Library",
  "IT Blocks",
  "Dorm Mess",
  "Main Mess",
  "Classroom",
  "Sports Complex",
  "Other",
];

// Submission location options
const submissionLocations = [
  "Ecole",
  "Library",
];

// Form schema
const formSchema = z.object({
  type: z.enum(["lost", "found"], {
    required_error: "Please select item type",
  }),
  name: z.string().min(3, {
    message: "Item name must be at least 3 characters",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters",
  }),
  category: z.string({
    required_error: "Please select a category",
  }),
  location: z.string({
    required_error: "Please provide the location",
  }),
  submissionLocation: z.string().optional(),
  otherLocation: z.string().optional(),
  date: z.string({
    required_error: "Please select the date",
  }),
  contactInfo: z.string().min(5, {
    message: "Contact information is required",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const LostFound = () => {
  const [activeTab, setActiveTab] = useState<string>("lost");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showOtherLocationInput, setShowOtherLocationInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "lost",
      name: "",
      description: "",
      category: "",
      location: "",
      submissionLocation: "Ecole",
      otherLocation: "",
      date: new Date().toISOString().split("T")[0],
      contactInfo: user?.email || "",
    },
  });

  // Watch for type changes to update location options
  const itemType = form.watch("type");
  const locationField = form.watch("location");

  // Update the otherLocation visibility when location changes
  useEffect(() => {
    setShowOtherLocationInput(locationField === "Other");
  }, [locationField]);

  // Data fetching
  const { data: itemsData, isLoading: isLoadingItems } = useQuery({
    queryKey: [`/api/lostfound/${activeTab}`],
  });

  // Filter items based on search and filters
  const filteredItems = Array.isArray(itemsData)
    ? itemsData.filter((item: any) => {
        const matchesSearch = searchQuery
          ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
          : true;
        
        const matchesCategory = (selectedCategory && selectedCategory !== "all-categories") 
          ? item.category === selectedCategory 
          : true;
        
        const matchesLocation = (selectedLocation && selectedLocation !== "all-locations") 
          ? item.location === selectedLocation 
          : true;
        
        return matchesSearch && matchesCategory && matchesLocation;
      })
    : [];

  // Item report mutation
  const reportMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/lostfound", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit form");
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your item has been reported successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lostfound/lost"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lostfound/found"] });
      setActiveTab(form.getValues("type"));
      form.reset();
      setImagePreview(null);
      setShowOtherLocationInput(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to report item: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle image selection
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size exceeds 5MB limit",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    const formData = new FormData();
    
    // Add location detail if "Other" is selected
    if (data.location === "Other" && data.otherLocation) {
      formData.append("otherLocation", data.otherLocation);
    }
    
    // Add all other form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        formData.append(key, value.toString());
      }
    });

    // Add image if available
    if (fileInputRef.current?.files?.[0]) {
      formData.append("image", fileInputRef.current.files[0]);
    }

    reportMutation.mutate(formData);
  };

  // Render item cards function
  const renderItemCards = (items: any[]) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium text-neutral-800 mb-2">
            No {activeTab === "lost" ? "lost" : "found"} items found
          </h3>
          <p className="text-neutral-500">Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item: any) => (
          <Card key={item.id} className="shadow hover:shadow-md transition-shadow">
            <div className="relative h-48 overflow-hidden bg-neutral-100">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-neutral-400">
                  <ImageIcon className="h-16 w-16" />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-1 text-xs font-medium text-white ${
                  item.type === 'lost' ? 'bg-destructive' : 'bg-success'
                } rounded-full`}>
                  {item.type === 'lost' ? 'Lost' : 'Found'}
                </span>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="mb-1 text-base font-medium text-neutral-800">{item.name}</h3>
              <div className="mb-2 space-y-1">
                <div className="flex items-center text-sm text-neutral-600">
                  <MapPin className="w-4 h-4 mr-1 text-neutral-400" />
                  {item.location}{item.otherLocation ? `: ${item.otherLocation}` : ""}
                </div>
                <div className="flex items-center text-sm text-neutral-600">
                  <Calendar className="w-4 h-4 mr-1 text-neutral-400" />
                  {item.date}
                </div>
              </div>
              <p className="mb-3 text-sm text-neutral-600 line-clamp-2">{item.description}</p>
              <Button className="w-full">View Details</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link href="/">
          <Button variant="outline" className="flex items-center space-x-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </div>
      
      <p className="text-neutral-500 mb-6">Report and search for lost items across campus</p>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="lost">Lost Items</TabsTrigger>
          <TabsTrigger value="found">Found Items</TabsTrigger>
          <TabsTrigger value="report">Report Item</TabsTrigger>
        </TabsList>

        {/* Lost Items Tab */}
        <TabsContent value="lost" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
              <Input
                placeholder="Search for lost items..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-locations">All Locations</SelectItem>
                  {lostItemLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Items Grid */}
          {isLoadingItems ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="shadow overflow-hidden">
                  <div className="h-48">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            renderItemCards(filteredItems)
          )}
        </TabsContent>
        
        {/* Found Items Tab */}
        <TabsContent value="found" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
              <Input
                placeholder="Search for found items..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-locations">All Locations</SelectItem>
                  {foundItemLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Items Grid */}
          {isLoadingItems ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="shadow overflow-hidden">
                  <div className="h-48">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            renderItemCards(filteredItems)
          )}
        </TabsContent>
        
        {/* Report Item Tab */}
        <TabsContent value="report" className="max-w-2xl mx-auto">
          <Card className="shadow">
            <CardContent className="p-6">
              <h2 className="mb-6 text-xl font-semibold text-neutral-800">Report an Item</h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="lost">Lost Item</SelectItem>
                              <SelectItem value="found">Found Item</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryOptions.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
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
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Blue Water Bottle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please provide detailed description of the item..."
                            className="resize-none min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {itemType === "lost" ? "Where was it lost?" : "Where was it found?"}
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setShowOtherLocationInput(value === "Other");
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(itemType === "lost" ? lostItemLocations : foundItemLocations).map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="submissionLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Where to submit/collect</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {submissionLocations.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Show "Other Location" input field if needed */}
                  {showOtherLocationInput && (
                    <FormField
                      control={form.control}
                      name="otherLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Please specify location</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter specific location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Information</FormLabel>
                          <FormControl>
                            <Input placeholder="Email or phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="image-upload"
                        className="text-sm font-medium text-neutral-800"
                      >
                        Upload Image <span className="text-neutral-400">(optional)</span>
                      </label>
                      {imagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-2 text-xs"
                          onClick={removeImage}
                        >
                          <X className="h-3 w-3 mr-1" />
                          <span>Remove</span>
                        </Button>
                      )}
                    </div>
                    {imagePreview ? (
                      <div className="relative h-48 overflow-hidden rounded-md border border-neutral-200">
                        <img
                          src={imagePreview}
                          alt="Image preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center h-48 px-6 border-2 border-dashed rounded-md border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                        <div className="text-center">
                          <p className="text-sm text-neutral-600">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            JPG, PNG or JPEG (max 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      id="image-upload"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={reportMutation.isPending}
                  >
                    {reportMutation.isPending ? "Submitting..." : "Submit Report"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LostFound;