"use client";

import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  CreditCard,
  Download,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Receipt,
  Filter,
  X,
  CalendarRange
} from "lucide-react";


// Define interfaces for fetched data
export interface RevenueEntry {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ExpenseBreakdownEntry {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  [key: string]: string | number; // Explicitly define index signature for string and number types
}

export interface DetailedExpense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string;
  paymentMethod: string;
  status: string;
  recurring: boolean;
  notes?: string;
}

export interface RecurringExpense {
  category: string;
  description: string;
  amount: number;
  frequency: string;
  nextDue: string;
}

export interface InventoryItem {
  id: string; // Changed from number for consistency
  item: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalValue: number;
  supplier: string;
  lastOrdered: string;
}

export interface PayrollEntry {
  id: string; // Changed from number for consistency
  name: string;
  role: string;
  baseSalary: number;
  bonus: number;
  total: number;
  status: string;
}

export interface RecentTransaction {
  id: string; // Changed from number for consistency
  date: string;
  description: string;
  amount: number;
  type: string;
  method: string;
}

export function FinanceView() {
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: "",
    description: "",
    amount: 0,
    vendor: "",
    date: "",
    paymentMethod: "",
    notes: "",
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [timePeriodFilter, setTimePeriodFilter] = useState("all");
  
  // State for fetched data
  const [revenueData, setRevenueData] = useState<RevenueEntry[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdownEntry[]>([]);
  const [detailedExpenses, setDetailedExpenses] = useState<DetailedExpense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Revenue Data
      const revenueRes = await fetch("http://localhost:3001/api/finance/revenue");
      if (!revenueRes.ok) throw new Error(`HTTP error! status: ${revenueRes.status} for revenue data`);
      const revenueData = (await revenueRes.json()).data || [];
      setRevenueData(revenueData);

      // Fetch Expense Breakdown
      const expenseBreakdownRes = await fetch("http://localhost:3001/api/finance/expense-breakdown");
      if (!expenseBreakdownRes.ok) throw new Error(`HTTP error! status: ${expenseBreakdownRes.status} for expense breakdown`);
      const expenseBreakdownData = (await expenseBreakdownRes.json()).data || [];
      setExpenseBreakdown(expenseBreakdownData);

      // Fetch Detailed Expenses
      const detailedExpensesRes = await fetch("http://localhost:3001/api/finance/detailed-expenses");
      if (!detailedExpensesRes.ok) throw new Error(`HTTP error! status: ${detailedExpensesRes.status} for detailed expenses`);
      const detailedExpensesData = (await detailedExpensesRes.json()).data || [];
      setDetailedExpenses(detailedExpensesData);

      // Fetch Recurring Expenses
      const recurringExpensesRes = await fetch("http://localhost:3001/api/finance/recurring-expenses");
      if (!recurringExpensesRes.ok) throw new Error(`HTTP error! status: ${recurringExpensesRes.status} for recurring expenses`);
      const recurringExpensesData = (await recurringExpensesRes.json()).data || [];
      setRecurringExpenses(recurringExpensesData);

      // Fetch Inventory Data
      const inventoryRes = await fetch("http://localhost:3001/api/inventory"); // Assuming /api/inventory route
      if (!inventoryRes.ok) throw new Error(`HTTP error! status: ${inventoryRes.status} for inventory data`);
      const inventoryData = (await inventoryRes.json()).data || [];
      setInventoryData(inventoryData);

      // Fetch Payroll Data
      const payrollRes = await fetch("http://localhost:3001/api/finance/payroll"); // Assuming /api/finance/payroll route
      if (!payrollRes.ok) throw new Error(`HTTP error! status: ${payrollRes.status} for payroll data`);
      const payrollData = (await payrollRes.json()).data || [];
      setPayrollData(payrollData);

      // Fetch Recent Transactions
      const transactionsRes = await fetch("http://localhost:3001/api/finance/recent-transactions");
      if (!transactionsRes.ok) throw new Error(`HTTP error! status: ${transactionsRes.status} for recent transactions`);
      const transactionsData = (await transactionsRes.json()).data || [];
      setRecentTransactions(transactionsData);

    } catch (err: any) {
      console.error("Error fetching finance data:", err);
      setError("Failed to fetch financial data. Please ensure the backend server is running on port 3001.");
      toast.error("Failed to fetch financial data. Please ensure the backend server is running on port 3001.");
      // Ensure all data arrays are empty on error
      setRevenueData([]);
      setExpenseBreakdown([]);
      setDetailedExpenses([]);
      setRecurringExpenses([]);
      setInventoryData([]);
      setPayrollData([]);
      setRecentTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Empty dependency array means this effect runs once on mount

  // NOTE: Calculate total expenses from detailed expense records
  const totalExpenses = detailedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = detailedExpenses.filter(e => e.status === "pending").length;

  // Handle case where revenueData might be empty after fetching
  const currentMonth = revenueData.length > 0 ? revenueData[revenueData.length - 1] : { month: "N/A", revenue: 0, expenses: 0, profit: 0 };
  const previousMonth = revenueData.length > 1 ? revenueData[revenueData.length - 2] : { month: "N/A", revenue: 0, expenses: 0, profit: 0 };

  const revenueChange = previousMonth.revenue > 0 ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1) : "0.0";
  const profitChange = previousMonth.profit > 0 ? ((currentMonth.profit - previousMonth.profit) / previousMonth.profit * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financial Overview</h1>
          <p className="text-muted-foreground">Track revenue, expenses, and clinic profitability</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="brand" >
            <FileText className="h-4 w-4 mr-2" />
            Generate Invoices
          </Button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonth.revenue.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {Number(revenueChange) > 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span className={Number(revenueChange) > 0 ? "text-green-600" : "text-red-600"}>
                {revenueChange}%
              </span>
              <span>from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonth.expenses.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              <span className="text-green-600">-2.3%</span> from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonth.profit.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-green-600">{profitChange}%</span>
              <span>from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonth.revenue > 0 ? ((currentMonth.profit / currentMonth.revenue) * 100).toFixed(1) : "0.0"}%
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="text-green-600">+1.2%</span> from last month
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" onValueChange={() => fetchData()}>
        <TabsList>
          <TabsTrigger value="overview" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Financial Overview</TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Expense Tracking</TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Inventory & Costs</TabsTrigger>
          <TabsTrigger value="payroll" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Payroll Management</TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Recent Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="inline-block">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                      Loading revenue data...
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
                      <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.8} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="inline-block">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                      Loading expenses breakdown...
                    </div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      {expenseBreakdown.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No expense breakdown data available.</div>
                      ) : (
                        <PieChart>
                          <Pie
                            data={expenseBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="amount"
                          >
                            {expenseBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']} />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4">
                      {expenseBreakdown.length === 0 ? null : ( // Hide legend if no data
                        expenseBreakdown.map((expense) => (
                          <div key={expense.category} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: expense.color }} />
                              <span>{expense.category}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${expense.amount.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">{expense.percentage}%</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NEW: Expense Tracking Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Expense Management</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={timePeriodFilter} onValueChange={setTimePeriodFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="ach">ACH Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Expense</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="expenseCategory">Category</Label>
                          <Select onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                            <SelectTrigger id="expenseCategory">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="supplies">Supplies</SelectItem>
                              <SelectItem value="utilities">Utilities</SelectItem>
                              <SelectItem value="insurance">Insurance</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Input id="description" placeholder="e.g., Dental supplies order" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expenseAmount">Amount ($)</Label>
                          <Input id="expenseAmount" type="number" placeholder="500.00" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendor">Vendor/Supplier</Label>
                          <Input id="vendor" placeholder="e.g., DentMed Supply" value={newExpense.vendor} onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expenseDate">Date</Label>
                          <Input id="expenseDate" type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentMethod">Payment Method</Label>
                          <Select onValueChange={(value) => setNewExpense({ ...newExpense, paymentMethod: value })}>
                            <SelectTrigger id="paymentMethod">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="ach">ACH Transfer</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expenseNotes">Notes (Optional)</Label>
                          <Textarea id="expenseNotes" placeholder="Additional details..." value={newExpense.notes} onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddExpenseDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => {
                          console.log(newExpense);
                          setIsAddExpenseDialogOpen(false);
                        }}>
                          Add Expense
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                    Loading expenses...
                  </div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recurring</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedExpenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No detailed expenses found. Click 'Add Expense' to add one!
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailedExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{expense.date}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{expense.category}</Badge>
                            </TableCell>
                            <TableCell className="font-medium max-w-xs truncate">{expense.description}</TableCell>
                            <TableCell>{expense.vendor}</TableCell>
                            <TableCell className="font-medium">${expense.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{expense.paymentMethod}</TableCell>
                            <TableCell>
                              <Badge className={expense.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {expense.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {expense.recurring && (
                                <Badge variant="outline">Recurring</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">View</Button>
                                {expense.status === 'pending' && (
                                  <Button size="sm">Pay</Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* Recurring Expenses Summary */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium mb-4 flex items-center">
                      <Receipt className="h-4 w-4 mr-2" />
                      Recurring Expenses Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recurringExpenses.length === 0 ? (
                        <div className="col-span-full text-center py-4 text-muted-foreground">
                          No recurring expenses found.
                        </div>
                      ) : (
                        recurringExpenses.map((expense, index) => (
                          <div key={`recurring-${expense.description}-${index}`} className="bg-white p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                              <span className="text-xs text-muted-foreground">{expense.frequency}</span>
                            </div>
                            <div className="font-medium text-sm mb-1">{expense.description}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold">${expense.amount.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground">Due: {expense.nextDue}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="font-medium">Total Monthly Recurring Expenses</span>
                      <span className="text-xl font-bold">
                        ${recurringExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inventory Management</CardTitle>
                <div className="flex space-x-2">
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="anesthetics">Anesthetics</SelectItem>
                      <SelectItem value="materials">Materials</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>Add Item</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                    Loading inventory...
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Last Ordered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No inventory items found. Click 'Add Item' to add one!
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventoryData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell>
                            <Badge variant={item.quantity < 20 ? "destructive" : "secondary"}>
                              {item.quantity} {item.unit}
                            </Badge>
                          </TableCell>
                          <TableCell>${item.costPerUnit}</TableCell>
                          <TableCell className="font-medium">${item.totalValue.toLocaleString()}</TableCell>
                          <TableCell>{item.supplier}</TableCell>
                          <TableCell>{item.lastOrdered}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">Reorder</Button>
                              <Button variant="outline" size="sm">Edit</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Employee Payroll</CardTitle>
                <div className="flex space-x-2">
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="january">January 2024</SelectItem>
                      <SelectItem value="february">February 2024</SelectItem>
                      <SelectItem value="march">March 2024</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>Process Payroll</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                    Loading payroll data...
                  </div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Base Salary</TableHead>
                        <TableHead>Bonus</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No payroll data available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        payrollData.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-medium">{employee.name}</TableCell>
                            <TableCell>{employee.role}</TableCell>
                            <TableCell>${employee.baseSalary ? employee.baseSalary.toLocaleString() : 0}</TableCell> 
                            <TableCell>${employee.bonus ? employee.bonus.toLocaleString() : 0}</TableCell>
                            <TableCell className="font-medium">
                              ${employee.total ? employee.total.toLocaleString() : 0}
                            </TableCell>
                            <TableCell>
                              <Badge className={employee.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {employee.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">View Details</Button>
                                {employee.status === 'pending' && (
                                  <Button size="sm" className="bg-primary hover:bg-primary/90">Pay Now</Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Total Monthly Payroll</h3>
                        <p className="text-sm text-muted-foreground">January 2024</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${payrollData.reduce((sum, emp) => sum + emp.total, 0).toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground">
                          {payrollData.filter(emp => emp.status === 'paid').length} of {payrollData.length} employees paid
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <div className="flex space-x-2">
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="income">Income Only</SelectItem>
                      <SelectItem value="expense">Expenses Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                    Loading transactions...
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent transactions found.
                    </div>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.type === "income"
                                ? "bg-green-100"
                                : "bg-red-100"
                            }`}
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpRight className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.date} • {transaction.method}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-lg font-medium ${
                            transaction.type === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : ""}$
                          {Math.abs(transaction.amount).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}