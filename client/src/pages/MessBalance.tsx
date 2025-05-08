import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BanknoteIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  MapPin,
  Filter,
} from "lucide-react";
import type { MessBalance as MessBalanceType, MessTransaction } from "@shared/schema";

interface MealPlan {
  name: string;
  details: string;
  price: string;
}

const mealPlans: MealPlan[] = [
  {
    name: "Premium 19",
    details: "19 meals per week + $200 dining points",
    price: "$2,400",
  },
  {
    name: "Standard 14",
    details: "14 meals per week + $150 dining points",
    price: "$1,950",
  },
  {
    name: "Basic 10",
    details: "10 meals per week + $100 dining points",
    price: "$1,600",
  },
  {
    name: "Commuter 5",
    details: "5 meals per week + $50 dining points",
    price: "$900",
  },
];

const MessBalance = () => {
  const { user } = useAuth();
  const [transactionFilter, setTransactionFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("30");

  // Fetch mess balance
  const { data: balance, isLoading: isLoadingBalance } = useQuery<MessBalanceType>({
    queryKey: ["/api/mess/balance"],
    enabled: !!user,
  });

  // Fetch transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<MessTransaction[]>({
    queryKey: ["/api/mess/transactions"],
    enabled: !!user,
  });

  // Filter transactions
  const filteredTransactions = transactions
    ? transactions.filter((transaction: MessTransaction) => {
        const matchesType = transactionFilter === "all" || transaction.type === transactionFilter;
        
        // Filter by time
        const transactionDate = new Date(transaction.createdAt || new Date());
        const today = new Date();
        const daysAgo = Math.floor((today.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const matchesTime = timeFilter === "all" || daysAgo <= parseInt(timeFilter);
        
        return matchesType && matchesTime;
      })
    : [];

  // Get transaction type badge
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "meal_swipe":
        return <Badge className="bg-primary">Meal Swipe</Badge>;
      case "dining_points":
        return <Badge className="bg-secondary">Dining Points</Badge>;
      case "cash":
        return <Badge variant="outline">Cash</Badge>;
      case "deposit":
        return <Badge className="bg-success">Deposit</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Get transaction amount class
  const getAmountClass = (amount: string) => {
    const amountNum = parseFloat(amount);
    return amountNum >= 0 ? "text-success-600 font-medium" : "text-destructive font-medium";
  };

  return (
    <div>
      <p className="text-neutral-500 mb-6">Track your meal plan and transaction history</p>

      {/* Balance Overview */}
      <Card className="shadow mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">Current Balance</h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            {isLoadingBalance ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg bg-neutral-50">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-9 w-20 mb-1" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </>
            ) : balance ? (
              <>
                <div className="p-4 text-center bg-primary-50 rounded-lg">
                  <span className="text-sm font-medium text-primary-600">Available Balance</span>
                  <div className="mt-2 text-3xl font-bold text-primary-700">${balance.balance}</div>
                  <p className="mt-1 text-xs text-primary-600">Last updated: Today</p>
                </div>
                
                <div className="p-4 text-center rounded-lg bg-neutral-50">
                  <span className="text-sm font-medium text-neutral-600">Meal Swipes</span>
                  <div className="mt-2 text-3xl font-bold text-neutral-700">
                    {balance.mealSwipes} / {balance.totalMealSwipes}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {balance.totalMealSwipes - balance.mealSwipes} meals remaining this week
                  </p>
                </div>
                
                <div className="p-4 text-center bg-secondary-50 rounded-lg">
                  <span className="text-sm font-medium text-secondary-600">Dining Points</span>
                  <div className="mt-2 text-3xl font-bold text-secondary-700">{balance.diningPoints}</div>
                  <p className="mt-1 text-xs text-secondary-600">Expires: {balance.nextBillingDate}</p>
                </div>
              </>
            ) : (
              <div className="col-span-3 text-center py-8">
                <p className="text-neutral-500">No balance information available.</p>
              </div>
            )}
          </div>
          
          {!isLoadingBalance && balance && (
            <div>
              <div className="grid gap-4 mt-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-neutral-600">Monthly Usage</h3>
                  <div className="h-48 p-4 bg-neutral-50 rounded-lg">
                    <div className="flex flex-col justify-between h-full">
                      <div className="relative h-32">
                        <div className="absolute bottom-0 left-0 w-full h-px bg-neutral-200"></div>
                        <div className="absolute h-full w-full">
                          <svg viewBox="0 0 100 32" className="w-full h-full" preserveAspectRatio="none">
                            <path d="M0,30 L10,28 L20,25 L30,20 L40,22 L50,18 L60,15 L70,10 L80,12 L90,8 L100,5" stroke="hsl(var(--primary))" strokeWidth="2" fill="none"></path>
                            <path d="M0,30 L10,28 L20,25 L30,20 L40,22 L50,18 L60,15 L70,10 L80,12 L90,8 L100,5 L100,32 L0,32 Z" fill="hsl(var(--primary))" fillOpacity="0.1"></path>
                          </svg>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="mb-2 text-sm font-medium text-neutral-600">Spending by Category</h3>
                  <div className="h-48 p-4 bg-neutral-50 rounded-lg">
                    <div className="flex justify-center items-center h-full">
                      <div className="relative w-28 h-28">
                        <svg viewBox="0 0 36 36" className="w-full h-full">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--border))" strokeWidth="1"></circle>
                          <path d="M18 2.085 A 15.915 15.915 0 1 1 2.085 18" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeDasharray="25 100"></path>
                          <path d="M18 2.085 A 15.915 15.915 0 0 1 33.915 18" stroke="hsl(var(--secondary))" strokeWidth="4" fill="none" strokeDasharray="20 100" strokeDashoffset="-25"></path>
                          <path d="M18 2.085 A 15.915 15.915 0 0 1 18 33.915" stroke="hsl(var(--warning))" strokeWidth="4" fill="none" strokeDasharray="40 100" strokeDashoffset="-45"></path>
                          <path d="M18 2.085 A 15.915 15.915 0 0 0 18 33.915" stroke="hsl(var(--success))" strokeWidth="4" fill="none" strokeDasharray="15 100" strokeDashoffset="-85"></path>
                        </svg>
                      </div>
                      <div className="ml-4 text-xs">
                        <div className="flex items-center mb-1">
                          <span className="inline-block w-3 h-3 mr-1 bg-primary rounded-full"></span>
                          <span>Dining Hall (25%)</span>
                        </div>
                        <div className="flex items-center mb-1">
                          <span className="inline-block w-3 h-3 mr-1 bg-secondary rounded-full"></span>
                          <span>Cafe (20%)</span>
                        </div>
                        <div className="flex items-center mb-1">
                          <span className="inline-block w-3 h-3 mr-1 bg-warning rounded-full"></span>
                          <span>Food Court (40%)</span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 mr-1 bg-success rounded-full"></span>
                          <span>Vending (15%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center mt-6 sm:flex-row sm:justify-between">
                <div className="mb-4 sm:mb-0">
                  <div className="text-sm text-neutral-600">Current Meal Plan: <span className="font-medium">{balance.mealPlan || 'None'}</span></div>
                  <div className="text-xs text-neutral-500">Next billing cycle: {balance.nextBillingDate || 'N/A'}</div>
                </div>
                
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                  <Button variant="outline" className="text-primary border-primary">
                    Add Balance
                  </Button>
                  <Button>
                    Manage Meal Plan
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Meal Plan Options */}
      <Card className="shadow mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">Meal Plan Options</h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {mealPlans.map((plan, index) => (
              <div 
                key={index}
                className={`p-4 border rounded-lg hover:shadow-sm transition-shadow ${
                  balance?.mealPlan === plan.name ? 'border-primary bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-neutral-800">{plan.name}</h3>
                  {balance?.mealPlan === plan.name && (
                    <Badge variant="outline" className="border-primary text-primary">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-neutral-600 mb-3">{plan.details}</p>
                <div className="text-lg font-semibold">{plan.price}</div>
                <p className="text-xs text-neutral-500 mt-1">per semester</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Transaction History */}
      <Card className="shadow">
        <CardContent className="p-6">
          <div className="flex flex-col items-start justify-between mb-4 sm:flex-row sm:items-center">
            <h2 className="mb-2 text-lg font-semibold text-neutral-800 sm:mb-0">Transaction History</h2>
            <div className="flex items-center space-x-2">
              <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="meal_swipe">Meal Swipes</SelectItem>
                  <SelectItem value="dining_points">Dining Points</SelectItem>
                  <SelectItem value="cash">Cash Payments</SelectItem>
                  <SelectItem value="deposit">Added Funds</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 3 Months</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoadingTransactions ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 border-b">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed border-neutral-300 bg-neutral-50">
              <BanknoteIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-800 mb-2">No Transactions Found</h3>
              <p className="text-neutral-500 max-w-md mx-auto">
                {transactionFilter !== "all" || timeFilter !== "all" ? (
                  <>
                    No transactions match your current filters. Try changing your filters to see more results.
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setTransactionFilter("all");
                          setTimeFilter("all");
                        }}
                        className="inline-flex items-center"
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  </>
                ) : (
                  "You don't have any transactions yet. Transactions will appear here once you start using your meal plan."
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full border-collapse">
                <thead>
                  <tr className="text-left bg-neutral-50 border-y">
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-600">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-600">Time</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-600">Description</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-600">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-600">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-600 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction: MessTransaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-800">{transaction.date}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800">{transaction.time}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800">{transaction.description}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800">{transaction.location}</td>
                      <td className="px-4 py-3">
                        {getTransactionBadge(transaction.type)}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getAmountClass(transaction.amount)}`}>
                        {transaction.type === "meal_swipe" ? (
                          "-1 Swipe"
                        ) : transaction.type === "dining_points" ? (
                          `${transaction.amount} Points`
                        ) : (
                          `$${Math.abs(parseFloat(transaction.amount)).toFixed(2)}`
                        )}
                        {parseFloat(transaction.amount) > 0 ? (
                          <ArrowUpRight className="inline-block ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="inline-block ml-1 h-3 w-3" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {!isLoadingTransactions && filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-neutral-600">
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{filteredTransactions.length}</span> of{" "}
                <span className="font-medium">{filteredTransactions.length}</span> transactions
              </div>
              <div className="flex items-center">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="ml-2" disabled>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessBalance;
