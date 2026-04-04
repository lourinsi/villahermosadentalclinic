"use client";

import React from "react";
import { Button } from "./ui/button";
import { Notification } from "../lib/notification-types";
import { Appointment } from "@/hooks/useAppointments";
import { useNotificationLogic } from "../hooks/useNotificationLogic";
import { NotificationItem } from "./NotificationItem";
import { Bell, MoreHorizontal, Check, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  portal = 'admin'
}: NotificationViewProps) {
  const { 
    filter, 
    setFilter, 
    filteredNotifications, 
    newNotifications, 
    earlierNotifications 
  } = useNotificationLogic(notifications);

  const renderItem = (notification: Notification) => (
    <NotificationItem
      key={notification.id}
      notification={notification}
      onMarkAsRead={onMarkAsRead}
      onMarkAsUnread={onMarkAsUnread}
      onDelete={onDelete}
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
              <DropdownMenuItem onClick={() => onMarkAllAsRead()}>
                <Check className="h-4 w-4 mr-2" />
                <span className="text-sm">Mark all as read</span>
              </DropdownMenuItem>
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
        
        <div className="flex gap-2 flex-wrap">
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
      </div>

      <div className="p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
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
      </div>
    </div>
  );
}
