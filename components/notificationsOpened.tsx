"use client";

import React, { useState } from "react";
import { Bell, MoreHorizontal, Calendar, CreditCard, MessageSquare, Info, Check, X, Trash2, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Notification, NotificationType } from "../lib/notification-types";
import { format, isAfter, subHours } from "date-fns";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NotificationsOpenedProps {
  notifications: Notification[];
  unreadCount: number;
  portal: 'admin' | 'doctor' | 'patient';
  onUpdateAppointmentStatus?: (appointmentId: string, status: string, notificationId: string) => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationsOpened({ 
  notifications, 
  unreadCount, 
  portal,
  onUpdateAppointmentStatus,
  onMarkAsRead,
  onDelete
}: NotificationsOpenedProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'appointment' | 'payment'>('all');
  
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'appointment') return n.type === 'appointment';
    if (filter === 'payment') return n.type === 'payment';
    return true;
  });

  const recentNotifications = filteredNotifications.slice(0, 10);
  const now = new Date();
  const twentyFourHoursAgo = subHours(now, 24);

  const newNotifications = recentNotifications.filter(n => 
    isAfter(new Date(n.createdAt), twentyFourHoursAgo)
  );
  
  const earlierNotifications = recentNotifications.filter(n => 
    !isAfter(new Date(n.createdAt), twentyFourHoursAgo)
  );

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-3 w-3 text-white" />;
      case 'payment': return <CreditCard className="h-3 w-3 text-white" />;
      case 'message': return <MessageSquare className="h-3 w-3 text-white" />;
      case 'system': return <Info className="h-3 w-3 text-white" />;
      default: return <Bell className="h-3 w-3 text-white" />;
    }
  };

  const getIconBg = (type: NotificationType) => {
    switch (type) {
      case 'appointment': return 'bg-violet-600';
      case 'payment': return 'bg-emerald-600';
      case 'message': return 'bg-fuchsia-600';
      case 'system': return 'bg-slate-600';
      default: return 'bg-slate-600';
    }
  };

  const renderNotificationItem = (n: Notification) => {
    const isActionTaken = ['confirmed', 'cancelled', 'completed', 'scheduled'].includes(n.metadata?.currentStatus || '');
    
    return (
      <div key={n.id} className={`group relative p-2 flex gap-3 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer ${!n.isRead ? 'bg-violet-50/40' : ''}`}>
        <div className="relative flex-shrink-0">
          <Avatar className="h-12 w-12 border border-gray-100">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${n.metadata?.patientName || n.title}`} />
            <AvatarFallback>{n.title.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border-2 border-white ${getIconBg(n.type)}`}>
            {getIcon(n.type)}
          </div>
        </div>
        <div className="flex-1 min-w-0 py-0.5 pr-6">
          <p className={`text-xs leading-snug line-clamp-3 ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {n.message}
          </p>
          <p className={`text-[10px] mt-1 ${!n.isRead ? 'text-violet-600 font-medium' : 'text-gray-400'}`}>
            {format(new Date(n.createdAt), 'p')}
          </p>

          {n.type === 'appointment' && 
           n.metadata?.appointmentId && 
           n.metadata?.isRequest && 
           onUpdateAppointmentStatus && (
              <div className="mt-2 flex gap-1.5">
                <Button 
                  size="sm" 
                  disabled={isActionTaken}
                  className={`h-7 flex-1 text-[10px] font-semibold rounded-md ${
                    n.metadata?.currentStatus === 'confirmed' || n.metadata?.currentStatus === 'scheduled'
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-200"
                      : "bg-violet-600 hover:bg-violet-700 text-white disabled:bg-violet-200"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateAppointmentStatus(n.metadata!.appointmentId!, 'confirmed', n.id);
                  }}
                >
                  {n.metadata?.currentStatus === 'confirmed' || n.metadata?.currentStatus === 'scheduled' ? 'Accepted' : 'Accept'}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  disabled={isActionTaken}
                  className="h-7 flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 text-[10px] font-semibold rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateAppointmentStatus(n.metadata!.appointmentId!, 'cancelled', n.id);
                  }}
                >
                  {n.metadata?.currentStatus === 'cancelled' ? 'Declined' : 'Decline'}
                </Button>
              </div>
          )}
        </div>

        <div className="absolute right-1 top-2 flex flex-col items-center gap-2">
          {!n.isRead && (
            <div className="w-2 h-2 rounded-full bg-violet-600"></div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {!n.isRead && onMarkAsRead && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(n.id);
                }}>
                  <Check className="h-3.5 w-3.5 mr-2" />
                  <span className="text-xs">Mark as read</span>
                </DropdownMenuItem>
              )}

              {/* Reversal & Action options in menu */}
              {n.type === 'appointment' && n.metadata?.appointmentId && onUpdateAppointmentStatus && (
                <>
                  {['cancelled', 'pending', 'tentative', 'To Pay'].includes(n.metadata.currentStatus || '') && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onUpdateAppointmentStatus(n.metadata!.appointmentId!, 'confirmed', n.id);
                    }}>
                      <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-600" />
                      <span className="text-xs">{n.metadata.currentStatus === 'cancelled' ? 'Re-accept Appointment' : 'Accept Appointment'}</span>
                    </DropdownMenuItem>
                  )}
                  {['confirmed', 'scheduled', 'pending', 'tentative', 'To Pay'].includes(n.metadata.currentStatus || '') && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onUpdateAppointmentStatus(n.metadata!.appointmentId!, 'cancelled', n.id);
                    }}>
                      <X className="h-3.5 w-3.5 mr-2 text-red-600" />
                      <span className="text-xs">{['confirmed', 'scheduled'].includes(n.metadata.currentStatus || '') ? 'Cancel Appointment' : 'Decline Request'}</span>
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {onDelete && (
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(n.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  <span className="text-xs">Delete notification</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full bg-gray-100 hover:bg-gray-200">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0 shadow-xl rounded-xl border-gray-200" align="end">
        <div className="flex items-center justify-between p-4 pb-2">
          <h4 className="text-xl font-bold">Notifications</h4>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
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
          {recentNotifications.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No notifications to show
            </div>
          ) : (
            <div className="space-y-4">
              {newNotifications.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2">
                    <span className="font-bold text-sm">New</span>
                    <Link href={`/${portal}/notifications`} className="text-violet-600 text-xs font-medium hover:underline">See all</Link>
                  </div>
                  {newNotifications.map(renderNotificationItem)}
                </div>
              )}
              
              {earlierNotifications.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2">
                    <span className="font-bold text-sm">Earlier</span>
                  </div>
                  {earlierNotifications.map(renderNotificationItem)}
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
