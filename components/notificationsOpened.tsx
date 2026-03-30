"use client";

import React, { useState } from "react";
import { Bell, MoreHorizontal, Calendar, CreditCard, MessageSquare, Info, Check, X, Trash2, CheckCircle, Edit2, Ban } from "lucide-react";
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
import { useDoctors } from "../hooks/useDoctors";
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
  onRefresh?: () => void;
  onReschedule?: (appointmentId: string) => void;
  onCancelAppointment?: (appointmentId: string) => void;
}

export function NotificationsOpened({ 
  notifications, 
  unreadCount, 
  portal,
  onUpdateAppointmentStatus,
  onMarkAsRead,
  onDelete,
  onRefresh,
  onReschedule,
  onCancelAppointment
}: NotificationsOpenedProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'appointment' | 'payment'>('all');
  const { doctors } = useDoctors();

  // Group notifications by appointmentId, showing active notification first, then logs
  const groupedNotifications = notifications.reduce((acc, notif) => {
    const appointmentId = notif.metadata?.appointmentId;
    if (appointmentId) {
      if (!acc[appointmentId]) {
        acc[appointmentId] = { active: null, logs: [] };
      }
      if (notif.isLog) {
        acc[appointmentId].logs.push(notif);
      } else if (!acc[appointmentId].active) {
        acc[appointmentId].active = notif;
      } else {
        acc[appointmentId].logs.push(notif);
      }
    } else {
      if (!acc['_standalone']) {
        acc['_standalone'] = { active: null, logs: [notif] };
      } else {
        acc['_standalone'].logs.push(notif);
      }
    }
    return acc;
  }, {} as Record<string, { active: Notification | null; logs: Notification[] }>);

  // Flatten back to a list of all notifications for filtering, but keep track of grouping
  // IMPORTANT: Active notifications ALWAYS come first, then logs
  const allNotificationsList = Object.entries(groupedNotifications).flatMap(([, group]) => {
    const list = [];
    if (group.active) list.push(group.active);
    list.push(...group.logs);
    return list;
  });
  
  const filteredNotifications = allNotificationsList
    .filter(n => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'appointment') return n.type === 'appointment';
      if (filter === 'payment') return n.type === 'payment';
      return true;
    })
    .sort((a, b) => {
      // Primary sort: Active notifications ALWAYS come before logs
      if (a.isLog !== b.isLog) {
        return a.isLog ? 1 : -1; // non-logs (false) come first
      }
      // Secondary sort: Within each group (active or logs), sort by date (newest first)
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

  const recentNotifications = filteredNotifications.slice(0, 10);
  const now = new Date();
  const twentyFourHoursAgo = subHours(now, 24);

  const newNotifications = recentNotifications.filter(n => 
    isAfter(new Date(n.updatedAt || n.createdAt), twentyFourHoursAgo)
  );
  
  const earlierNotifications = recentNotifications.filter(n => 
    !isAfter(new Date(n.updatedAt || n.createdAt), twentyFourHoursAgo)
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
    const statusRaw = (n.metadata?.currentStatus || '').toString().toLowerCase();
    const status = statusRaw.replace(/[\s-]/g, '');
    // Only consider scheduled, completed, or cancelled as final states where no actions are permitted
    const isActionTaken = ['cancelled', 'completed', 'scheduled'].includes(status);
    const isLog = n.isLog;

    const avatarSrc = (() => {
      try {
        if (n.type === 'appointment') {
          const meta: any = n.metadata || {};
          if (meta.doctorProfile) return meta.doctorProfile;
          const doctorKey = meta.doctor || meta.doctorId || meta.doctorName;
          if (doctorKey && Array.isArray(doctors)) {
            const doc = doctors.find((d: any) => String(d.id) === String(doctorKey) || String(d.name) === String(doctorKey));
            if (doc) return doc.profilePicture || (doc as any).profilePictureUrl || undefined;
          }
        }
      } catch (e) {
        // ignore and fallback
      }
      return undefined;
    })();

    // if the appointment already has a final status we don't want the item to look clickable
    const itemClasses = `group relative p-2 flex gap-3 rounded-lg transition-colors ${
      isLog 
        ? 'bg-gray-50/60 border-l-2 border-gray-200 ml-2 opacity-75'
        : isActionTaken 
        ? '' 
        : 'hover:bg-gray-100 cursor-pointer'
    } ${!n.isRead && !isLog ? 'bg-violet-50/40' : ''}`;
    
    return (
      <div key={n.id} className={itemClasses}>
        <div className="relative flex-shrink-0">
          <Avatar className="h-12 w-12 border border-gray-100">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} />
            ) : (
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${n.metadata?.patientName || n.title}`} />
            )}
            <AvatarFallback>{n.title.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border-2 border-white ${getIconBg(n.type as NotificationType)}`}>
            {getIcon(n.type as NotificationType)}
          </div>
        </div>
        <div className="flex-1 min-w-0 py-0.5 pr-6">
          <div className="flex items-center gap-2">
            <p className={`text-xs leading-snug line-clamp-3 ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {n.message}
            </p>
            {isLog && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-700 flex-shrink-0">
                Log
              </span>
            )}
          </div>
          <p className={`text-[10px] mt-1 ${!n.isRead ? 'text-violet-600 font-medium' : 'text-gray-400'}`}>
            {format(new Date(n.updatedAt || n.createdAt), "yyyy-MM-dd HH:mm")}
          </p>

          {n.type === 'appointment' && 
           n.metadata?.appointmentId && 
           !isLog &&
           onUpdateAppointmentStatus && 
           portal !== 'patient' && (
              <div className="mt-2 flex gap-1.5">
                <Button 
                  size="sm" 
                  disabled={isActionTaken}
                  className={`h-7 flex-1 text-[10px] font-semibold rounded-md ${
                    status === 'scheduled'
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-600 disabled:text-white disabled:cursor-not-allowed"
                      : "bg-violet-600 hover:bg-violet-700 text-white disabled:bg-violet-200"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isActionTaken) {
                      onUpdateAppointmentStatus(n.metadata!.appointmentId!, 'scheduled', n.id);
                    }
                  }}
                >
                  {status === 'scheduled' ? 'Accepted' : 'Accept'}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  disabled={isActionTaken}
                  className={`h-7 flex-1 text-[10px] font-semibold rounded-md ${
                    status === 'cancelled'
                      ? "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-600 disabled:text-white disabled:cursor-not-allowed"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isActionTaken) {
                      onUpdateAppointmentStatus(n.metadata!.appointmentId!, 'cancelled', n.id);
                    }
                  }}
                >
                  {status === 'cancelled' ? 'Declined' : 'Decline'}
                </Button>
              </div>
          )}
        </div>

        <div className="absolute right-1 top-2 flex flex-col items-center gap-2">
          {!isLog && !n.isRead && (
            <div className="w-2 h-2 rounded-full bg-violet-600"></div>
          )}
          
          {!isLog && (
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

                {/* Reversal & Action options in menu - only for non-logs and non-patient cancelled appointments */}
                {!isLog && !(portal === 'patient' && (n.type !== 'appointment' || !n.metadata?.appointmentId || status === 'cancelled')) && (
                  <>
                    {n.type === 'appointment' && n.metadata?.appointmentId && (
                      <>
                        {portal !== 'patient' && onUpdateAppointmentStatus && (
                          <>
                            {['cancelled', 'pending', 'tentative', 'topay'].includes(status) && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onUpdateAppointmentStatus(n.metadata!.appointmentId!, 'scheduled', n.id);
                              }}>
                                <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-600" />
                                <span className="text-xs">{status === 'cancelled' ? 'Re-accept Appointment' : 'Accept Appointment'}</span>
                              </DropdownMenuItem>
                            )}
                            {['scheduled', 'pending', 'tentative', 'topay'].includes(status) && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onUpdateAppointmentStatus(n.metadata!.appointmentId!, 'cancelled', n.id);
                              }}>
                                <X className="h-3.5 w-3.5 mr-2 text-red-600" />
                                <span className="text-xs">{status === 'scheduled' ? 'Cancel Appointment' : 'Decline Request'}</span>
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        
                        {portal === 'patient' && n.metadata?.currentStatus !== 'cancelled' && (
                          <>
                            {onReschedule && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onReschedule(n.metadata!.appointmentId!);
                              }}>
                                <Edit2 className="h-3.5 w-3.5 mr-2 text-violet-600" />
                                <span className="text-xs">Reschedule</span>
                              </DropdownMenuItem>
                            )}
                            {onCancelAppointment && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onCancelAppointment(n.metadata!.appointmentId!);
                              }}>
                                <Ban className="h-3.5 w-3.5 mr-2 text-red-600" />
                                <span className="text-xs">Cancel Appointment</span>
                              </DropdownMenuItem>
                            )}
                          </>
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
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full bg-gray-100 hover:bg-gray-200" onClick={onRefresh}>
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
