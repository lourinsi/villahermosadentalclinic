import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
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
  ArrowDownRight
} from "lucide-react";

const revenueData = [
  { month: "Jan", revenue: 42000, expenses: 28000, profit: 14000 },
  { month: "Feb", revenue: 38000, expenses: 26000, profit: 12000 },
  { month: "Mar", revenue: 45000, expenses: 29000, profit: 16000 },
  { month: "Apr", revenue: 41000, expenses: 27000, profit: 14000 },
  { month: "May", revenue: 48000, expenses: 31000, profit: 17000 },
  { month: "Jun", revenue: 52000, expenses: 33000, profit: 19000 }
];

const expenseBreakdown = [
  { category: "Salaries", amount: 18000, percentage: 55, color: "#3b82f6" },
  { category: "Equipment", amount: 5000, percentage: 15, color: "#10b981" },
  { category: "Supplies", amount: 4000, percentage: 12, color: "#f59e0b" },
  { category: "Utilities", amount: 2500, percentage: 8, color: "#8b5cf6" },
  { category: "Insurance", amount: 2000, percentage: 6, color: "#ef4444" },
  { category: "Other", amount: 1500, percentage: 4, color: "#6b7280" }
];

const inventoryData = [
  { item: "Dental Anesthetic (Lidocaine)", quantity: 45, unit: "vials", costPerUnit: 12.50, totalValue: 562.50, supplier: "DentMed Supply", lastOrdered: "2024-01-15" },
  { item: "Composite Filling Material", quantity: 12, unit: "tubes", costPerUnit: 85.00, totalValue: 1020.00, supplier: "3M Dental", lastOrdered: "2024-01-10" },
  { item: "Disposable Gloves (Nitrile)", quantity: 8, unit: "boxes", costPerUnit: 24.99, totalValue: 199.92, supplier: "MedStock", lastOrdered: "2024-01-18" },
  { item: "Dental Impression Material", quantity: 20, unit: "cartridges", costPerUnit: 35.00, totalValue: 700.00, supplier: "Dentsply", lastOrdered: "2024-01-12" },
  { item: "X-Ray Film", quantity: 15, unit: "packs", costPerUnit: 45.00, totalValue: 675.00, supplier: "Kodak Dental", lastOrdered: "2024-01-08" }
];

const payrollData = [
  { name: "Dr. Sarah Johnson", role: "Lead Dentist", baseSalary: 12000, bonus: 2000, total: 14000, status: "paid" },
  { name: "Dr. Michael Chen", role: "Associate Dentist", baseSalary: 9000, bonus: 1500, total: 10500, status: "paid" },
  { name: "Dr. Emily Rodriguez", role: "Pediatric Dentist", baseSalary: 8500, bonus: 1200, total: 9700, status: "paid" },
  { name: "Jessica Williams", role: "Dental Hygienist", baseSalary: 4500, bonus: 300, total: 4800, status: "paid" },
  { name: "Mark Thompson", role: "Dental Assistant", baseSalary: 3200, bonus: 200, total: 3400, status: "pending" },
  { name: "Lisa Martinez", role: "Office Manager", baseSalary: 4000, bonus: 400, total: 4400, status: "paid" }
];

const recentTransactions = [
  { date: "2024-01-22", description: "Patient Payment - John Smith", amount: 350, type: "income", method: "Credit Card" },
  { date: "2024-01-22", description: "Dental Supplies - 3M Order", amount: -1250, type: "expense", method: "ACH Transfer" },
  { date: "2024-01-21", description: "Insurance Payment - Blue Cross", amount: 2400, type: "income", method: "Direct Deposit" },
  { date: "2024-01-21", description: "Equipment Maintenance", amount: -450, type: "expense", method: "Check" },
  { date: "2024-01-20", description: "Patient Payment - Sarah Davis", amount: 180, type: "income", method: "Cash" }
];

export function FinanceView() {
  const currentMonth = revenueData[revenueData.length - 1];
  const previousMonth = revenueData[revenueData.length - 2];
  const revenueChange = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1);
  const profitChange = ((currentMonth.profit - previousMonth.profit) / previousMonth.profit * 100).toFixed(1);

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
          <Button className="bg-primary hover:bg-primary/90">
            <FileText className="h-4 w-4 mr-2" />
            Generate Invoice
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
              {((currentMonth.profit / currentMonth.revenue) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="text-green-600">+1.2%</span> from last month
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Financial Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory & Costs</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Management</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {expenseBreakdown.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: expense.color }} />
                        <span>{expense.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${expense.amount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{expense.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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
                  {inventoryData.map((item, index) => (
                    <TableRow key={index}>
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
                  ))}
                </TableBody>
              </Table>
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
                  {payrollData.map((employee, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>${employee.baseSalary.toLocaleString()}</TableCell>
                      <TableCell>${employee.bonus.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">${employee.total.toLocaleString()}</TableCell>
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
                  ))}
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
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date Range
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'income' ? (
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
                    <div className={`text-lg font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}