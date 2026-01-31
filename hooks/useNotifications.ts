import { useState, useEffect, useCallback } from "react";
import { Notification } from "@/lib/notification-types";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.patientId || user?.staffId || user?.username;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:3001/api/notifications?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      
      const data = await response.json();
      if (data.success) {
        console.log(`[useNotifications] Successfully fetched ${data.data.length} notifications for userId: ${userId}`);
        if (userId === 'admin') {
          console.log("[useNotifications] Admin notifications detail:", data.data);
        }
        setNotifications(data.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) throw new Error("Failed to mark notification as read");
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to update notification");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete notification");
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`http://localhost:3001/api/notifications/mark-all-read?userId=${userId}`, {
        method: "PUT",
      });

      if (!response.ok) throw new Error("Failed to mark all as read");
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to update notifications");
    }
  };

  return {
    notifications,
    isLoading,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
  };
};
