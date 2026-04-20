"use client";

import React from "react";
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
  Ban,
  Eye,
  RotateCcw
} from "lucide-react";
import { Notification, NotificationType } from "../lib/notification-types";
import { format } from "date-fns";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useDoctors } from "../hooks/useDoctors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDeleteWithResult?: (id: string) => Promise<boolean>;
  onRestore?: (id: string) => void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: string, notificationId: string) => void;
  onEditAppointment?: (appointmentId: string) => void;
  onReschedule?: (appointmentId: string) => void;
  onCancelAppointment?: (appointmentId: string) => void;
  portal: 'admin' | 'doctor' | 'patient';
  variant?: 'full' | 'compact';
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  onDeleteWithResult,
  onRestore,
  onUpdateAppointmentStatus,
  onEditAppointment,
  onReschedule,
  onCancelAppointment,
  portal,
  variant = 'full'
}: NotificationItemProps) {
  const { doctors } = useDoctors();
  const isCompact = variant === 'compact';

  const statusRaw = (notification.metadata?.currentStatus || '').toString().toLowerCase();
  const status = statusRaw.replace(/[\s-]/g, '');
  const isActionTaken = ['cancelled', 'completed', 'scheduled'].includes(status);
  const isLog = notification.isLog;

  const avatarSrc = (() => {
    try {
      if (notification.type === 'appointment' || notification.type === 'payment') {
        const meta: any = notification.metadata || {};
        if (meta.doctorProfile) return meta.doctorProfile;
        const doctorKey = meta.doctor || meta.doctorId || meta.doctorName;
        if (doctorKey && Array.isArray(doctors)) {
          const doc = doctors.find((d: any) => String(d.id) === String(doctorKey) || String(d.name) === String(doctorKey));
          if (doc) return doc.profilePicture || (doc as any).profilePictureUrl || undefined;
        }
      }
    } catch (e) {}
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.metadata?.patientName || notification.title}`;
  })();

  const getIcon = (type: NotificationType) => {
    const iconSize = isCompact ? "h-3 w-3" : "h-4 w-4";
    switch (type) {
      case 'appointment': return <Calendar className={`${iconSize} text-white`} />;
      case 'payment': return <CreditCard className={`${iconSize} text-white`} />;
      case 'message': return <MessageSquare className={`${iconSize} text-white`} />;
      case 'system': return <Info className={`${iconSize} text-white`} />;
      default: return <Bell className={`${iconSize} text-white`} />;
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

  const itemClasses = `group relative ${isCompact ? 'p-2' : 'p-4'} flex gap-3 transition-colors rounded-xl hover:bg-violet-100/50 cursor-pointer ${
    isLog 
      ? 'bg-gray-50/60 border-l-2 border-gray-200 ml-2 opacity-75'
      : !notification.isRead ? 'bg-violet-50/40' : ''
  }`;

  const acceptStatuses = new Set(['cancelled', 'pending', 'tentative', 'topay', 'reserved', 'halfpaid', 'scheduled']);
  const cancelStatuses = new Set(['scheduled', 'pending', 'tentative', 'topay', 'reserved', 'halfpaid']);

  const handleItemClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEditAppointment && notification.metadata?.appointmentId && (notification.type === 'appointment' || notification.type === 'payment')) {
      onEditAppointment(notification.metadata.appointmentId);
      if (!notification.isRead && onMarkAsRead) onMarkAsRead(notification.id);
    }
  };

  return (
    <div className={itemClasses} onClick={handleItemClick}>
      <div className="relative flex-shrink-0">
        <Avatar className={`${isCompact ? 'h-12 w-12' : 'h-14 w-14'} border border-gray-100`}>
          <AvatarImage src={avatarSrc} />
          <AvatarFallback>{notification.title.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 ${isCompact ? 'p-0.5' : 'p-1'} rounded-full border-2 border-white ${getIconBg(notification.type as NotificationType)}`}>
          {getIcon(notification.type as NotificationType)}
        </div>
      </div>

      <div className={`flex-1 min-w-0 ${isCompact ? 'pr-6 py-0.5' : 'pr-8'}`}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className={`${isCompact ? 'text-xs line-clamp-3' : 'text-sm'} leading-snug ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {notification.message}
            </p>
            {isLog && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${isCompact ? 'text-[10px]' : 'text-xs'} font-medium bg-gray-200 text-gray-700 flex-shrink-0`}>
                Log
              </span>
            )}
          </div>
          <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} ${!notification.isRead ? 'text-violet-600 font-medium' : 'text-gray-500'}`}>
            {format(new Date(isLog ? notification.createdAt : (notification.updatedAt || notification.createdAt)), "yyyy-MM-dd HH:mm")}
          </span>
        </div>

        {notification.type === 'appointment' &&
         notification.metadata?.appointmentId &&
         portal !== 'patient' &&
         !isLog &&
         (notification.metadata?.isRequest || !isActionTaken) && (
            <div className={`mt-2 flex gap-2`}>
              {onUpdateAppointmentStatus && (
                <>
                  <Button 
                    size="sm" 
                    disabled={isActionTaken}
                    className={`${isCompact ? 'h-7 text-[10px]' : 'h-9'} flex-1 font-semibold rounded-lg ${
                      status === 'scheduled'
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-600 disabled:text-white disabled:cursor-not-allowed"
                        : "bg-violet-600 hover:bg-violet-700 text-white disabled:bg-violet-200"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isActionTaken) {
                        onUpdateAppointmentStatus(notification.metadata!.appointmentId!, 'scheduled', notification.id);
                      }
                    }}
                  >
                    {status === 'scheduled' ? 'Accepted' : status === 'reserved' ? 'Accept & Schedule' : 'Accept'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    disabled={isActionTaken}
                    className={`${isCompact ? 'h-7 text-[10px]' : 'h-9'} flex-1 font-semibold rounded-lg ${
                      status === 'cancelled'
                        ? "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-600 disabled:text-white disabled:cursor-not-allowed"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isActionTaken) {
                        onUpdateAppointmentStatus(notification.metadata!.appointmentId!, 'cancelled', notification.id);
                      }
                    }}
                  >
                    {status === 'cancelled' ? 'Declined' : 'Decline'}
                  </Button>
                </>
              )}
              {onEditAppointment && !isCompact && ['reserved','halfpaid','topay'].includes(status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 font-semibold rounded-lg border border-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAppointment(notification.metadata!.appointmentId!);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" /> Edit
                </Button>
              )}
            </div>
        )}
      </div>

      <div className={`absolute ${isCompact ? 'right-1 top-2' : 'right-4 top-1/2 -translate-y-1/2'} flex flex-col items-center gap-2`}>
        {!isLog && !notification.isRead && (
          <div className={`${isCompact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-violet-600`}></div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`${isCompact ? 'h-6 w-6' : 'h-8 w-8 bg-white shadow-sm border border-gray-100'} rounded-full focus:opacity-100 transition-opacity ${isLog ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-gray-500`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Only show these options if notification is NOT deleted */}
            {!notification.deleted && (
              <>
                {notification.metadata?.appointmentId && onEditAppointment && (notification.type === 'appointment' || notification.type === 'payment') && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEditAppointment(notification.metadata!.appointmentId!);
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    <span className="text-sm">View Details</span>
                  </DropdownMenuItem>
                )}
                {!notification.isRead && onMarkAsRead && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}>
                    <Check className="h-4 w-4 mr-2" />
                    <span className="text-sm">Mark as read</span>
                  </DropdownMenuItem>
                )}
                {notification.isRead && onMarkAsUnread && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsUnread(notification.id);
                  }}>
                    <Bell className="h-4 w-4 mr-2" />
                    <span className="text-sm">Mark as unread</span>
                  </DropdownMenuItem>
                )}

                {!isLog && notification.type === 'appointment' && notification.metadata?.appointmentId && !(portal === 'patient' && (notification.type !== 'appointment' || !notification.metadata?.appointmentId || status === 'cancelled')) && (
                  <>
                    {portal !== 'patient' && onUpdateAppointmentStatus && (
                      <>
                        {acceptStatuses.has(status) && status !== 'scheduled' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onUpdateAppointmentStatus(notification.metadata!.appointmentId!, 'scheduled', notification.id);
                          }}>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            <span className="text-sm">{status === 'cancelled' ? 'Re-accept Appointment' : 'Accept Appointment'}</span>
                          </DropdownMenuItem>
                        )}
                        {cancelStatuses.has(status) && status !== 'cancelled' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onUpdateAppointmentStatus(notification.metadata!.appointmentId!, 'cancelled', notification.id);
                          }}>
                            <X className="h-4 w-4 mr-2 text-red-600" />
                            <span className="text-sm">{['scheduled'].includes(status) ? 'Cancel Appointment' : 'Decline Request'}</span>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    
                    {portal === 'patient' && status !== 'cancelled' && (
                      <>
                        {onReschedule && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onReschedule(notification.metadata!.appointmentId!);
                          }}>
                            <Edit2 className="h-4 w-4 mr-2 text-violet-600" />
                            <span className="text-sm">Reschedule</span>
                          </DropdownMenuItem>
                        )}
                        {onCancelAppointment && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onCancelAppointment(notification.metadata!.appointmentId!);
                          }}>
                            <Ban className="h-4 w-4 mr-2 text-red-600" />
                            <span className="text-sm">Cancel Appointment</span>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </>
                )}

                {(
                  onDeleteWithResult ? (
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600" 
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await onDeleteWithResult(notification.id);
                        } catch (err) {
                          console.error('[NotificationItem] onDeleteWithResult error:', err);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span className="text-sm">Delete notification</span>
                    </DropdownMenuItem>
                  ) : onDelete ? (
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span className="text-sm">Delete notification</span>
                    </DropdownMenuItem>
                  ) : null
                )}
              </>
            )}

            {/* Show restore option only if notification IS deleted */}
            {notification.deleted && onRestore && (
              <DropdownMenuItem 
                className="text-violet-600 focus:text-violet-600" 
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(notification.id);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                <span className="text-sm">Restore notification</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
