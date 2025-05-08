import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CreditCard, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
  id: number;
  userId: number;
  amount: string;
  description: string;
  type: string;
  location: string;
  date: string;
  time: string;
  createdAt: string;
}

interface MessBalance {
  id: number;
  userId: number;
  balance: string;
  mealSwipes: number;
  totalMealSwipes: number;
  diningPoints: number;
  mealPlan: string | null;
  nextBillingDate: string | null;
  updatedAt: string;
}

const AcademicFees = () => {
  // Define the tabs
  const tabs = [
    { id: "payment", label: "Payment" },
    { id: "installment-policy", label: "Installment Policy" },
    { id: "student-misc", label: "Student Misc" },
    { id: "wallet", label: "Wallet" },
  ];

  const [activeTab, setActiveTab] = useState<string>("payment");
  const { user } = useAuth();

  // Payment transaction data
  const [paymentTransactions, setPaymentTransactions] = useState([
    {
      srNo: 1,
      receiptNo: "KIXYY",
      miscHead: "Meal Charges",
      description: "Meal Charges 24-25",
      date: "14 Aug 2024",
      generatedBy: "Raja Rao",
      miscAmount: "₹10,000",
      miscRemainingAmount: "₹0.0",
    },
  ]);

  // Fetch mess balance and transactions
  const { data: messBalance, isLoading: isLoadingBalance } = useQuery<MessBalance>({
    queryKey: ["/api/mess/balance"],
    enabled: !!user,
  });

  const { data: messTransactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/mess/transactions"],
    enabled: !!user && user.accommodation === "dayscholar"
  });

  // Group transactions by day of the week
  const [groupedTransactions, setGroupedTransactions] = useState<Record<string, Transaction[]>>({});
  const [totalSpent, setTotalSpent] = useState<number>(0);
  
  // Days of the week
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    if (messTransactions && Array.isArray(messTransactions)) {
      console.log(`Received ${messTransactions.length} transactions from API`);
      
      // Group transactions by day
      const grouped: Record<string, Transaction[]> = {};
      let spent = 0;
      
      // Initialize days
      days.forEach(day => {
        grouped[day] = [];
      });
      
      try {
        // Debug: Log all transactions
        messTransactions.forEach((t, i) => {
          console.log(`Transaction ${i+1}: ${t.description} on ${t.date} at ${t.time} - Amount: ${t.amount}`);
        });
        
        // Sort transactions by date and time
        const sortedTransactions = [...messTransactions].sort((a, b) => {
          // First compare by date
          const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateComparison !== 0) return dateComparison;
          
          // If same date, compare by time
          return a.time.localeCompare(b.time);
        });
        
        // Group transactions by day and calculate total spent
        sortedTransactions.forEach(transaction => {
          const transactionDate = new Date(transaction.date);
          
          // Convert the day of week (0=Sunday, 1=Monday, etc.) to our days array index
          // Sunday needs special handling because our days array has it at the end
          const dayIndex = transactionDate.getDay() === 0 ? 6 : transactionDate.getDay() - 1;
          const dayName = days[dayIndex]; // Adjust Sunday to be last
          
          console.log(`Grouping: ${transaction.description} on ${transaction.date} (${transactionDate.toDateString()}) to ${dayName}`);
          
          if (!grouped[dayName]) {
            grouped[dayName] = [];
          }
          
          grouped[dayName].push(transaction);
          
          // Add to total spent if it's a negative amount (deduction)
          const amount = parseFloat(transaction.amount);
          if (amount < 0) {
            spent += Math.abs(amount);
          }
        });
        
        // Log the results of the grouping
        days.forEach(day => {
          console.log(`${day} has ${grouped[day].length} transactions`);
        });
      } catch (error) {
        console.error("Error processing transactions:", error);
      }
      
      setGroupedTransactions(grouped);
      setTotalSpent(spent);
      
      // Also update the payment transaction data with the actual remaining balance
      if (messBalance) {
        const remainingBalance = parseFloat(messBalance.balance) - spent;
        const totalDeducted = spent;
        
        setPaymentTransactions(prev => {
          return prev.map(transaction => ({
            ...transaction,
            miscRemainingAmount: formatCurrency(remainingBalance, "INR"),
            totalDeducted: formatCurrency(totalDeducted, "INR"),
          }));
        });
      }
    }
  }, [messTransactions, messBalance]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link href="/">
          <Button variant="outline" className="flex items-center space-x-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-blue-800">STUDENT ACADEMIC FEES PAYMENT</h1>
        <div className="w-32"></div> {/* Empty div for alignment */}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 bg-blue-50 p-0 mb-4">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={`py-2 ${
                activeTab === tab.id 
                  ? "bg-blue-900 text-white" 
                  : "bg-white hover:bg-blue-100"
              }`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Payment Tab Content */}
        <TabsContent value="payment" className="mt-0">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-4 py-2 text-left">SR.NO.</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Receipt No</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Misc. Head</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Generated By</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Misc. Amount</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Misc Remaining Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentTransactions.map((transaction: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{transaction.srNo}</td>
                    <td className="border border-gray-300 px-4 py-2">{transaction.receiptNo}</td>
                    <td className="border border-gray-300 px-4 py-2">{transaction.miscHead}</td>
                    <td className="border border-gray-300 px-4 py-2">{transaction.description}</td>
                    <td className="border border-gray-300 px-4 py-2">{transaction.date}</td>
                    <td className="border border-gray-300 px-4 py-2">{transaction.generatedBy}</td>
                    <td className="border border-gray-300 px-4 py-2">{transaction.miscAmount}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <p>Remaining Balance : {transaction.miscRemainingAmount}</p>
                      <div className="mt-2">
                        <p>Total Amount Paid : ₹10,000</p>
                        <p>Total Amount Deducted : {transaction.totalDeducted || "₹0.0"}</p>
                        <p>Total Refundable Amount : {transaction.miscRemainingAmount}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Wallet Tab Content */}
        <TabsContent value="wallet" className="mt-0">
          {!user ? (
            <div className="flex items-center justify-center py-10 bg-gray-100 rounded-lg">
              <p className="text-gray-500">Please log in to view your mess wallet</p>
            </div>
          ) : user.accommodation === "hosteller" ? (
            // Hosteller view - show "not for hostellers" message
            <div className="bg-blue-50 p-8 rounded-lg shadow-sm border border-blue-100">
              <div className="flex flex-col items-center justify-center text-center">
                <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
                <h3 className="text-xl font-semibold text-blue-900 mb-2">Not Available for Hostellers</h3>
                <p className="text-gray-600 max-w-lg">
                  The meal wallet feature is not available for hostellers as your meals are already included in your hostel package.
                  For any questions regarding hostel meal services, please contact the hostel administration.
                </p>
              </div>
            </div>
          ) : (
            // Dayscholar view - show wallet transactions
            <>
              <div className="bg-blue-600 text-white p-4 mb-4 rounded-md shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    <span className="font-medium">
                      Total Balance: {messBalance ? formatCurrency(parseFloat(messBalance.balance), "INR") : "Loading..."}
                    </span>
                  </div>
                  <div>
                    Remaining: {messBalance ? formatCurrency(parseFloat(messBalance.balance) - totalSpent, "INR") : "Loading..."}
                  </div>
                </div>
              </div>

              {isLoadingTransactions ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : messTransactions && messTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border-collapse shadow-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left w-1/4">DAY</th>
                        <th className="border border-gray-300 px-4 py-2 text-left w-3/4">TRANSACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day: string, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="border border-gray-300 px-4 py-2 align-top font-medium">{day}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            {groupedTransactions[day]?.length > 0 ? (
                              <>
                                {groupedTransactions[day].map((transaction: Transaction, tIndex: number) => {
                                  // Parse amount to determine if it's a charge or deposit
                                  const amount = parseFloat(transaction.amount);
                                  const isDeduction = amount < 0;
                                  
                                  return (
                                    <div key={tIndex} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0">
                                      <div className="flex justify-between">
                                        <span className="font-medium">
                                          {transaction.description} @ {transaction.time}
                                        </span>
                                        <span className={isDeduction ? "text-red-600" : "text-green-600"}>
                                          {formatCurrency(amount, "INR")}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {/* Day total */}
                                <div className="text-blue-600 text-xs mt-2 pt-1 flex justify-end font-medium">
                                  Day total: {formatCurrency(
                                    groupedTransactions[day].reduce((total, t) => total + parseFloat(t.amount), 0),
                                    "INR"
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-gray-400 italic text-sm">No transactions</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-100">
                  <div className="flex flex-col items-center">
                    <CreditCard className="h-10 w-10 text-gray-400 mb-4" />
                    <h3 className="text-gray-700 font-medium mb-2">No Wallet Transactions</h3>
                    <p className="text-gray-500">
                      You don't have any meal wallet transactions for this week.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Other Tabs - Empty for now */}
        <TabsContent value="installment-policy">
          <div className="p-4 bg-gray-100 text-center">
            Installment Policy Content - Coming Soon
          </div>
        </TabsContent>
        
        <TabsContent value="student-misc">
          <div className="p-4 bg-gray-100 text-center">
            Student Misc Content - Coming Soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademicFees;