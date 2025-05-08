import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const AuthForm = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      console.log("AuthForm: Attempting login with credentials:", { username: data.username });
      await login(data.username, data.password);
      console.log("AuthForm: Login completed without throwing errors");
    } catch (error) {
      console.error("AuthForm: Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center" 
      style={{ backgroundImage: "url('/assets/university-building.png')" }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      
      <div className="bg-zinc-800 p-8 rounded-lg shadow-xl w-full max-w-md z-10 text-center">
        <h1 className="text-2xl font-semibold text-white mb-6">Welcome! Please login to continue.</h1>
        
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <FormField
              control={loginForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Email/Login" 
                      className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-left text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Password" 
                      className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-left text-red-400" />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
            
            <div className="text-right mt-2">
              <Button variant="link" className="p-0 h-auto text-blue-400 text-sm">
                Forgot password?
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AuthForm;
