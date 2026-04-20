"use client";

import React, { useState } from "react";
import { Bell, MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "./ui/popover";
import { Notification } from "../lib/notification-types";
import NotificationsMenuContent from "./NotificationsMenuContent";
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
	onDeleteWithResult?: (id: string) => Promise<boolean>;
	onRestore?: (id: string) => void;
	onMarkAllAsRead?: () => void;
	onDeleteAll?: () => void;
	onRefresh?: () => void;
	onReschedule?: (appointmentId: string) => void;
	onCancelAppointment?: (appointmentId: string) => void;
	onEditAppointment?: (appointmentId: string) => void;
}

function NotificationsOpened({ 
	notifications, 
	unreadCount, 
	portal,
	onUpdateAppointmentStatus,
	onMarkAsRead,
	onMarkAsUnread,
	onDelete,
	onDeleteWithResult,
	onRestore,
	onMarkAllAsRead,
	onDeleteAll,
	onRefresh,
	onReschedule,
	onCancelAppointment,
	onEditAppointment
}: NotificationsOpenedProps) {
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = React.useRef<HTMLDivElement | null>(null);
	const menuButtonRef = React.useRef<HTMLButtonElement | null>(null);
	// Exclude deleted notifications from the compact popover view so deleted items
	// only appear on the full Notifications page under the Deleted tab.
	const compactNotifications = notifications ? notifications.filter(n => !n.deleted) : [];
	const { 
		filter, 
		setFilter, 
		newNotifications, 
		earlierNotifications 
	} = useNotificationLogic(compactNotifications);

	// DEBUG: log incoming notifications & compact list to help reproduce stale/deleted state
	React.useEffect(() => {
		try {
			console.log('[NotificationsOpened] prop notifications:', notifications ? notifications.map(n => ({ id: n.id, deleted: !!n.deleted })) : 'none');
			console.log('[NotificationsOpened] compactNotifications (filtered):', compactNotifications.map(n => n.id));
		} catch (err) {
			console.log('[NotificationsOpened] logging error', err);
		}
	}, [notifications, compactNotifications]);

	// Log when popover opens so we can correlate UI with data
	React.useEffect(() => {
		if (isPopoverOpen) {
			console.log('[NotificationsOpened] popover opened — compactNotifications IDs:', compactNotifications.map(n => n.id));
		}
	}, [isPopoverOpen, compactNotifications]);

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
			onDeleteWithResult={onDeleteWithResult}
			onRestore={onRestore}
			onUpdateAppointmentStatus={onUpdateAppointmentStatus}
			onEditAppointment={onEditAppointment}
			onReschedule={onReschedule}
			onCancelAppointment={onCancelAppointment}
			portal={portal}
			variant="compact"
		/>
	);

	// Close the inline menu on outside click or Escape
	React.useEffect(() => {
		if (!isMenuOpen) return;
		const onDocClick = (e: MouseEvent) => {
			const target = e.target as Node | null;
			if (menuRef.current && !menuRef.current.contains(target) && menuButtonRef.current && !menuButtonRef.current.contains(target)) {
				setIsMenuOpen(false);
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsMenuOpen(false);
		};
		document.addEventListener("mousedown", onDocClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDocClick);
			document.removeEventListener("keydown", onKey);
		};
	}, [isMenuOpen]);

	React.useEffect(() => {
		console.log('[NotificationsOpened] isMenuOpen changed:', isMenuOpen);
	}, [isMenuOpen]);

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
			>
				<div className="flex items-center justify-between p-4 pb-2">
					<h4 className="text-xl font-bold">Notifications</h4>
					{/* Inline menu: use React state + outside click handling for reliability */}
					<div className="relative">
						<Button
							ref={menuButtonRef as any}
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full hover:bg-gray-100"
							onMouseDown={() => console.log('[NotificationsOpened] three-dot onMouseDown')}
							onClick={() => {
								const willOpen = !isMenuOpen;
								// build options list for logging
								const options: string[] = [];
								options.push("Mark all as read (show)");
								options.push(onMarkAllAsRead ? "Mark all as read (callback present)" : "Mark all as read (no callback)");
								options.push(onDeleteAll ? "Clear all notifications (callback present)" : "Clear all notifications (no callback)");
								console.log("[NotificationsOpened] three-dot button clicked; willOpen=", willOpen, "options:", options);
								setIsMenuOpen(open => !open);
							}}
							aria-expanded={isMenuOpen}
							aria-haspopup="menu"
						>
							<MoreHorizontal className="h-5 w-5 text-gray-500" />
						</Button>

						{isMenuOpen && (
							<div ref={menuRef} className="absolute right-0 mt-2 z-30">
								<NotificationsMenuContent renderMode="inline" showMarkAll={true} onMarkAllAsRead={() => { console.log('[NotificationsOpened] Mark all clicked'); onMarkAllAsRead?.(); setIsMenuOpen(false); }} onDeleteAll={() => { console.log('[NotificationsOpened] Clear all clicked'); onDeleteAll?.(); setIsMenuOpen(false); }} />
							</div>
						)}
					</div>
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

export default NotificationsOpened;

