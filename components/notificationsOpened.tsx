"use client";

import React, { useState } from "react";
import { Bell, MoreHorizontal, Check, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Notification } from "../lib/notification-types";
import Link from "next/link";
import { useNotificationLogic } from "../hooks/useNotificationLogic";
import { NotificationItem } from "./NotificationItem";

interface NotificationsOpenedProps {
  notifications: Notification[];
  unreadCount: number;
  portal: 'admin' | 'doctor' | 'patient';
  onUpdateAppointmentStatus?: (appointmentId: string, status: string, notificationId: string) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteAll?: () => void;
  onRefresh?: () => void;
  onReschedule?: (appointmentId: string) => void;
  onCancelAppointment?: (appointmentId: string) => void;
  onEditAppointment?: (appointmentId: string) => void;
}

export function NotificationsOpened({ 
  notifications, 
  unreadCount, 
  portal,
  onUpdateAppointmentStatus,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  onRestore,
  onMarkAllAsRead,
  onDeleteAll,
  onRefresh,
  onReschedule,
  onCancelAppointment,
  onEditAppointment
}: NotificationsOpenedProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { 
    filter, 
    setFilter, 
    newNotifications, 
    earlierNotifications 
  } = useNotificationLogic(notifications);

  // For compact view, we only show top 10
  const recentNew = newNotifications.slice(0, 10);
  const recentEarlier = earlierNotifications.slice(0, 10 - recentNew.length);

  const renderItem = (n: Notification) => (
    <NotificationItem
      key={n.id}
      notification={n}
      onMarkAsRead={onMarkAsRead}
      onMarkAsUnread={onMarkAsUnread}
      onDelete={onDelete}
      onRestore={onRestore}
      onUpdateAppointmentStatus={onUpdateAppointmentStatus}
      onEditAppointment={onEditAppointment}
      onReschedule={onReschedule}
      onCancelAppointment={onCancelAppointment}
      portal={portal}
      variant="compact"
    />
  );

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full bg-gray-100 hover:bg-gray-200" onClick={() => {
          setIsPopoverOpen(!isPopoverOpen);
          if (onRefresh) onRefresh();
        }}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[360px] p-0 shadow-xl rounded-xl border-gray-200" 
        align="end"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <h4 className="text-xl font-bold">Notifications</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMarkAllAsRead?.()}>
                <Check className="h-4 w-4 mr-2" />
                <span>Mark all as read</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteAll?.()} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                <span>Clear all notifications</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex px-4 gap-2 mb-2 flex-wrap">
          <Button 
            variant={filter === 'all' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={`rounded-full font-semibold h-8 ${filter === 'all' ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'unread' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={`rounded-full font-semibold h-8 ${filter === 'unread' ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </Button>
          {(portal === 'admin' || portal === 'doctor') && (
            <>
              <Button 
                variant={filter === 'appointment' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={`rounded-full font-semibold h-8 ${filter === 'appointment' ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setFilter('appointment')}
              >
                Appointments
              </Button>
              <Button 
                variant={filter === 'payment' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={`rounded-full font-semibold h-8 ${filter === 'payment' ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setFilter('payment')}
              >
                Payments
              </Button>
            </>
          )}
        </div>

        <div className="max-h-[450px] overflow-y-auto p-2 scrollbar-hide">
          {recentNew.length === 0 && recentEarlier.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No notifications to show
            </div>
          ) : (
            <div className="space-y-4">
              {recentNew.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2">
                    <span className="font-bold text-sm">New</span>
                    <Link href={`/${portal}/notifications`} className="text-violet-600 text-xs font-medium hover:underline">See all</Link>
                  </div>
                  {recentNew.map(renderItem)}
                </div>
              )}
              
              {recentEarlier.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2">
                    <span className="font-bold text-sm">Earlier</span>
                  </div>
                  {recentEarlier.map(renderItem)}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-2 border-t">
          <Link href={`/${portal}/notifications`} className="block">
            <Button variant="ghost" size="sm" className="w-full text-violet-600 hover:text-violet-700 hover:bg-violet-50 font-semibold rounded-lg">
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
