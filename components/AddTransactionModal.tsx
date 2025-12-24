import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { useAppointmentModal } from "./AdminLayout";

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded?: (transaction: any) => void;
}

export function AddTransactionModal({ 
  open, 
  onOpenChange,
  onTransactionAdded
}: AddTransactionModalProps) {
  const { refreshFinanceData } = useAppointmentModal();
  const [formData, setFormData] = useState({
    date: "",
    description: "",
    amount: 0,
    type: "",
    method: "",
    category: "",
    notes: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("=== ADD TRANSACTION SUBMIT ===");
    setIsLoading(true);
    
    try {
      if (!formData.date || !formData.description || !formData.amount || !formData.type || !formData.method) {
        toast.error("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      const transactionData = {
        ...formData,
        amount: parseFloat(String(formData.amount)),
        createdAt: new Date().toISOString()
      };
      console.log("Submitting transaction data:", transactionData);
      const response = await fetch("http://localhost:3001/api/finance/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      console.log("Add transaction response status:", response.status);
      const result = await response.json();
      console.log("Add transaction response:", result);

      if (result.success) {
        toast.success("Transaction added successfully!");
        if (onTransactionAdded && result.data) {
          onTransactionAdded(result.data);
        }
        refreshFinanceData();
        onOpenChange(false);
        setFormData({
          date: "",
          description: "",
          amount: 0,
          type: "",
          method: "",
          category: "",
          notes: ""
        });
      } else {
        toast.error(result.message || "Failed to add transaction");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Error connecting to server. Make sure the backend is running on port 3001.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description of the transaction"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                  <SelectItem value="debit-card">Debit Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient-payment">Patient Payment</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes about this transaction..."
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="cancel" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="brand" type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
