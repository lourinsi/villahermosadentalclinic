"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { 
  Bell, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  Info, 
  Trash2,
  Check,
  X,
  MoreHorizontal,
  CheckCircle,
  Edit2,
  Ban
} from "lucide-react";
import { Notification, NotificationType } from "../lib/notification-types";
import { Appointment } from "@/hooks/useAppointments";
import { format, isAfter, subHours } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useDoctors } from "../hooks/useDoctors";

interface NotificationViewProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAllAsRead: () => void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment["status"], notificationId: string) => void;
  onReschedule?: (appointmentId: string) => void;
  onCancelAppointment?: (appointmentId: string) => void;
  onEditAppointment?: (appointmentId: string) => void; // new optional prop for edit action
  portal?: 'admin' | 'doctor' | 'patient';
}

export function NotificationView({ 
  notifications, 
  onMarkAsRead, 
  onDelete, 
  onMarkAllAsRead,
  onUpdateAppointmentStatus,
  onReschedule,
  onCancelAppointment,
  onEditAppointment,
  portal = 'admin'
}: NotificationViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'appointment' | 'payment'>('all');

  const filteredNotifications = notifications
    .filter(n => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'appointment') return n.type === 'appointment';
      if (filter === 'payment') return n.type === 'payment';
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

  const now = new Date();
  const twentyFourHoursAgo = subHours(now, 24);

  const newNotifications = filteredNotifications.filter(n => 
    isAfter(new Date(n.updatedAt || n.createdAt), twentyFourHoursAgo)
  );
  
  const earlierNotifications = filteredNotifications.filter(n => 
    !isAfter(new Date(n.updatedAt || n.createdAt), twentyFourHoursAgo)
  );

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-4 w-4 text-white" />;
      case 'payment': return <CreditCard className="h-4 w-4 text-white" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-white" />;
      case 'system': return <Info className="h-4 w-4 text-white" />;
      default: return <Bell className="h-4 w-4 text-white" />;
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

  const renderNotificationItem = (notification: Notification) => {
    const { doctors } = useDoctors();
    // Normalize status to lowercase for consistent comparisons
    const statusRaw = (notification.metadata?.currentStatus || '').toString().toLowerCase();
    const status = statusRaw.replace(/[\s-]/g, ''); // e.g. 'half-paid' -> 'halfpaid', 'to pay' -> 'topay'

    // Determine avatar source: for appointment notifications prefer the doctor's profile image
    const avatarSrc = (() => {
      try {
        if (notification.type === 'appointment') {
          const meta: any = notification.metadata || {};
          if (meta.doctorProfile) return meta.doctorProfile;
          const doctorKey = meta.doctor || meta.doctorId || meta.doctorName;
          if (doctorKey && Array.isArray(doctors)) {
            const doc = doctors.find((d: any) => String(d.id) === String(doctorKey) || String(d.name) === String(doctorKey));
            if (doc) return doc.profilePicture || (doc as any).profilePictureUrl || undefined;
          }
        }
      } catch (e) {
        // ignore and fallback to dicebear
      }
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.metadata?.patientName || notification.title}`;
    })();

    // Consider completed, cancelled, or already scheduled as final states; no actions permitted
    const isActionTaken = ['cancelled', 'completed', 'scheduled'].includes(status);

    // When an appointment is already finalized make the row non-clickable
    const itemClasses = `group relative p-4 flex gap-3 transition-colors rounded-xl ${!notification.isRead ? 'bg-violet-50/40' : ''} ${isActionTaken ? '' : 'cursor-pointer hover:bg-gray-100'}`;

    // normalized sets for actionable statuses
    const acceptStatuses = new Set(['cancelled', 'pending', 'tentative', 'topay', 'reserved', 'halfpaid']);
    const cancelStatuses = new Set(['scheduled', 'pending', 'tentative', 'topay', 'reserved', 'halfpaid']);

    return (
      <div 
        key={notification.id} 
        className={itemClasses}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="h-14 w-14 border border-gray-100">
            {avatarSrc ? <AvatarImage src={avatarSrc} /> : <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.metadata?.patientName || notification.title}`} />}
            <AvatarFallback>{notification.title.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white ${getIconBg(notification.type)}`}>
            {getIcon(notification.type)}
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-8">
          <div className="flex flex-col">
            <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {notification.message}
            </p>
            <span className={`text-xs mt-1 ${!notification.isRead ? 'text-violet-600 font-medium' : 'text-gray-500'}`}>
              {format(new Date(notification.updatedAt || notification.createdAt), "yyyy-MM-dd HH:mm")}
            </span>
          </div>

          {notification.type === 'appointment' &&
           notification.metadata?.appointmentId &&
           portal !== 'patient' &&
           (notification.metadata?.isRequest || isActionTaken) && (
              <div className="mt-3 flex gap-2">
                {onUpdateAppointmentStatus && (
                  <>
                    <Button 
                      size="sm" 
                      disabled={isActionTaken}
                      className={`h-9 flex-1 font-semibold rounded-lg ${
                        status === 'scheduled'
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-600 disabled:text-white disabled:cursor-not-allowed"
                          : "bg-violet-600 hover:bg-violet-700 text-white disabled:bg-violet-200"
                      }`}
                      onClick={() => {
                        if (!isActionTaken) {
                          onUpdateAppointmentStatus(notification.metadata!.appointmentId!, 'scheduled', notification.id);
                        }
                      }}
                    >
                      {status === 'scheduled' ? 'Accepted' : 'Accept'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      disabled={isActionTaken}
                      className={`h-9 flex-1 font-semibold rounded-lg ${
                        status === 'cancelled'
                          ? "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-600 disabled:text-white disabled:cursor-not-allowed"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                      }`}
                      onClick={() => {
                        if (!isActionTaken) {
                          onUpdateAppointmentStatus(notification.metadata!.appointmentId!, 'cancelled', notification.id);
                        }
                      }}
                    >
                      {status === 'cancelled' ? 'Declined' : 'Decline'}
                    </Button>
                  </>
                )}
                {/* Edit button for actionable half-paid / reserved / to-pay statuses */}
                {onEditAppointment && ['reserved','halfpaid','topay'].includes(status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 font-semibold rounded-lg border border-gray-200"
                    onClick={() => onEditAppointment(notification.metadata!.appointmentId!)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" /> Edit
                  </Button>
                )}
              </div>
          )}
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {!notification.isRead && (
            <div className="w-3 h-3 rounded-full bg-violet-600"></div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-white shadow-sm border border-gray-100"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Always offer mark-as-read when unread */}
              {!notification.isRead && (
                <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
              )}

              {/*
                For patient portal: if the notification is NOT an appointment,
                has no appointmentId, or the appointment is already cancelled,
                only show the 'Mark as read' option (per requirement).
              */}
              {!(portal === 'patient' && (notification.type !== 'appointment' || !notification.metadata?.appointmentId || status === 'cancelled')) && (
                <>
                  {/* Reversal & Action options in menu */}
                  {notification.type === 'appointment' && notification.metadata?.appointmentId && (
                    <>
                      {portal !== 'patient' && onUpdateAppointmentStatus && (
                        <>
                          {acceptStatuses.has(status) && (
                            <DropdownMenuItem onClick={() => onUpdateAppointmentStatus(notification.metadata!.appointmentId!, 'scheduled', notification.id)}>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              {status === 'cancelled' ? 'Re-accept Appointment' : 'Accept Appointment'}
                            </DropdownMenuItem>
                          )}
                          {cancelStatuses.has(status) && (
                            <DropdownMenuItem onClick={() => onUpdateAppointmentStatus(notification.metadata!.appointmentId!, 'cancelled', notification.id)}>
                              <X className="h-4 w-4 mr-2 text-red-600" />
                              {['scheduled'].includes(status) ? 'Cancel Appointment' : 'Decline Request'}
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

                      {portal === 'patient' && notification.type === 'appointment' && status !== 'cancelled' && (
                        <>
                          {onReschedule && (
                            <DropdownMenuItem onClick={() => onReschedule(notification.metadata!.appointmentId!)}>
                              <Edit2 className="h-4 w-4 mr-2 text-violet-600" />
                              Reschedule
                            </DropdownMenuItem>
                          )}
                          {onCancelAppointment && (
                            <DropdownMenuItem onClick={() => onCancelAppointment(notification.metadata!.appointmentId!)}>
                              <Ban className="h-4 w-4 mr-2 text-red-600" />
                              Cancel Appointment
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Delete stays available for non-limited menus */}
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(notification.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete this notification
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[680px] mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreHorizontal className="h-6 w-6" />
          </Button>
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
                    See all
                  </Button>
                </div>
                <div className="space-y-1">
                  {newNotifications.map(renderNotificationItem)}
                </div>
              </div>
            )}

            {earlierNotifications.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-2">
                  <h2 className="font-bold text-gray-900">Earlier</h2>
                </div>
                <div className="space-y-1">
                  {earlierNotifications.map(renderNotificationItem)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
