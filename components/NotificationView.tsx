"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Notification } from "../lib/notification-types";
import { Appointment } from "@/hooks/useAppointments";
import { useNotificationLogic } from "../hooks/useNotificationLogic";
import { NotificationItem } from "./NotificationItem";
import { Bell, MoreHorizontal, Check, Trash2, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface NotificationViewProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteAll?: () => void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment["status"], notificationId: string) => void;
  onReschedule?: (appointmentId: string) => void;
  onCancelAppointment?: (appointmentId: string) => void;
  onEditAppointment?: (appointmentId: string) => void; // new optional prop for edit action
  onRestore?: (id: string) => void; // new optional prop for restore action
  portal?: 'admin' | 'doctor' | 'patient';
}

export function NotificationView({ 
  notifications, 
  onMarkAsRead,
  onMarkAsUnread,
  onDelete, 
  onMarkAllAsRead,
  onDeleteAll,
  onUpdateAppointmentStatus,
  onReschedule,
  onCancelAppointment,
  onEditAppointment,
  onRestore,
  portal = 'admin'
}: NotificationViewProps) {
  const [activeTab, setActiveTab] = useState('notifications');

  const handleTabChange = (tabValue: string) => {
    console.log(`[NotificationView] Tab changed to: ${tabValue}`);
    if (tabValue === 'deleted') {
      console.log(`[NotificationView] Viewing deleted notifications - Total deleted: ${notifications.filter(n => n.deleted).length}`);
      console.log('[NotificationView] Deleted notifications:', notifications.filter(n => n.deleted));
    } else {
      console.log(`[NotificationView] Viewing active notifications - Total active: ${notifications.filter(n => !n.deleted).length}`);
    }
    setActiveTab(tabValue);
  };
  const { 
    filter, 
    setFilter, 
    filteredNotifications, 
    newNotifications, 
    earlierNotifications 
  } = useNotificationLogic(notifications.filter(n => !n.deleted));

  // Separate deleted notifications
  const deletedNotifications = notifications.filter(n => n.deleted);
  const deletedNew = deletedNotifications.filter(n => !n.isRead);
  const deletedEarlier = deletedNotifications.filter(n => n.isRead);

  const renderItem = (notification: Notification) => (
    <NotificationItem
      key={notification.id}
      notification={notification}
      onMarkAsRead={onMarkAsRead}
      onMarkAsUnread={onMarkAsUnread}
      onDelete={onDelete}
      onRestore={onRestore}
      onUpdateAppointmentStatus={onUpdateAppointmentStatus}
      onEditAppointment={onEditAppointment}
      onReschedule={onReschedule}
      onCancelAppointment={onCancelAppointment}
      portal={portal}
      variant="full"
    />
  );

  return (
    <div className="max-w-[680px] mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {activeTab === 'notifications' && (
                  <DropdownMenuItem onClick={() => onMarkAllAsRead()}>
                    <Check className="h-4 w-4 mr-2" />
                    <span className="text-sm">Mark all as read</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600" 
                  onClick={() => onDeleteAll?.()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="text-sm">Clear all notifications</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="notifications" 
              className="rounded-md data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm"
              onClick={() => handleTabChange('notifications')}
            >
              Notifications
              {notifications.filter(n => !n.deleted).some(n => !n.isRead) && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                  {notifications.filter(n => !n.deleted && !n.isRead).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="deleted" 
              className="rounded-md data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm"
              onClick={() => handleTabChange('deleted')}
            >
              Deleted
              {deletedNotifications.length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-[10px] font-bold text-white">
                  {deletedNotifications.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab === 'notifications' && (
            <div className="flex gap-2 flex-wrap mt-4">
              <Button 
                variant={filter === 'all' ? 'secondary' : 'ghost'} 
                className={`rounded-full px-4 h-9 font-semibold ${filter === 'all' ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button 
                variant={filter === 'unread' ? 'secondary' : 'ghost'} 
                className={`rounded-full px-4 h-9 font-semibold ${filter === 'unread' ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setFilter('unread')}
              >
                Unread
              </Button>
              {(portal === 'admin' || portal === 'doctor') && (
                <>
                  <Button 
                    variant={filter === 'appointment' ? 'secondary' : 'ghost'} 
                    className={`rounded-full px-4 h-9 font-semibold ${filter === 'appointment' ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setFilter('appointment')}
                  >
                    Appointments
                  </Button>
                  <Button 
                    variant={filter === 'payment' ? 'secondary' : 'ghost'} 
                    className={`rounded-full px-4 h-9 font-semibold ${filter === 'payment' ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setFilter('payment')}
                  >
                    Payments
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <TabsContent value="notifications" className="p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                <Bell className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
              <p className="text-gray-500">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {newNotifications.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-2">
                    <h2 className="font-bold text-gray-900">New</h2>
                    <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 font-medium h-auto p-0" onClick={onMarkAllAsRead}>
                      Mark all as read
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {newNotifications.map(renderItem)}
                  </div>
                </div>
              )}
              
              {earlierNotifications.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-2">
                    <h2 className="font-bold text-gray-900">Earlier</h2>
                  </div>
                  <div className="space-y-1">
                    {earlierNotifications.map(renderItem)}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deleted" className="p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          {deletedNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                <Trash2 className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No deleted notifications</h3>
              <p className="text-gray-500">Your deleted notifications will appear here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {deletedNew.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-2">
                    <h2 className="font-bold text-gray-900">Recently Deleted</h2>
                  </div>
                  <div className="space-y-1">
                    {deletedNew.map(renderItem)}
                  </div>
                </div>
              )}
              
              {deletedEarlier.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-2">
                    <h2 className="font-bold text-gray-900">Older</h2>
                  </div>
                  <div className="space-y-1">
                    {deletedEarlier.map(renderItem)}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
