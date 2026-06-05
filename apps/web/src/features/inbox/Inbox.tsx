import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import { getCurrentUserId } from '../../lib/auth';
import type { ProjectResponse, AlertResponse, ProjectMessageResponse } from '@pulse/shared-types';
import { Bell, MessageCircle, X, Send, Circle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'budget_alert' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  taskId?: string;
  projectId?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isCurrentUser: boolean;
}

interface Channel {
  id: string;
  name: string;
  icon?: string;
  unreadCount: number;
}

// ============= MOCK DATA =============
// ============= MAIN INBOX COMPONENT =============
export default function Inbox() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'Unread';
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const currentUserId = getCurrentUserId();

  // 1. Fetch system alerts/notifications
  const { data: alertsData = [] } = useQuery<AlertResponse[]>({
    queryKey: ['global-alerts', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/alerts');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const notifications: Notification[] = alertsData.map((alert) => {
    let type: Notification['type'] = 'system';
    let title = 'System Notification';
    const msgLower = alert.message.toLowerCase();
    
    if (msgLower.includes('budget')) {
      title = 'Budget Warning';
      type = 'budget_alert';
    } else if (msgLower.includes('delay') || msgLower.includes('halt') || msgLower.includes('fail')) {
      title = 'Project Alert';
      type = 'task_completed';
    } else if (msgLower.includes('assigned')) {
      title = 'Task Assigned';
      type = 'task_assigned';
    }
    
    return {
      id: alert.id,
      type,
      title,
      message: alert.message,
      timestamp: alert.created_at ? new Date(alert.created_at) : new Date(),
      isRead: alert.dismissed,
      projectId: alert.project_id,
    };
  });

  // 2. Fetch projects to populate channels list
  const { data: projects = [] } = useQuery<ProjectResponse[]>({
    queryKey: ['projects', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/projects');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const channels: Channel[] = projects.map((proj) => ({
    id: proj.id,
    name: proj.name,
    unreadCount: 0,
  }));

  // Auto-select first channel when channels load
  useEffect(() => {
    if (projects.length > 0 && !selectedChannelId) {
      setSelectedChannelId(projects[0].id);
    }
  }, [projects, selectedChannelId]);

  // 3. Fetch messages for the selected channel
  const { data: messages = [] } = useQuery<ProjectMessageResponse[]>({
    queryKey: ['project-messages', selectedChannelId, activeCountryId],
    queryFn: async () => {
      if (!selectedChannelId) return [];
      const res = await api.get(`/projects/${selectedChannelId}/messages`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!selectedChannelId && activeTab === 'Messages',
    refetchInterval: 4000,
  });

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
  );

  const chatMessages: ChatMessage[] = sortedMessages.map((msg) => ({
    id: msg.id,
    sender: msg.sender_name || `Member ${msg.sender_id.slice(0, 8)}`,
    senderId: msg.sender_id,
    content: msg.content,
    timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
    isCurrentUser: msg.sender_id === currentUserId,
  }));

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedChannelId) throw new Error('No channel selected');
      const res = await api.post(`/projects/${selectedChannelId}/messages`, { content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-messages', selectedChannelId, activeCountryId],
      });
      setMessageInput('');
    },
    onError: (err) => {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans select-none">
      {/* ============= PAGE HEADER ============= */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Inbox
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Centralized communications hub for field operations and project updates
          </p>
        </div>
      </div>

      {/* ============= TAB NAVIGATION ============= */}
      {activeTab === 'Unread' && <UnreadNotificationsTab notifications={notifications} />}
      {activeTab === 'Messages' && selectedChannelId && (
        <MessagesTab
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
          messages={chatMessages}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onSendMessage={() => {
            const content = messageInput.trim();
            if (content) {
              sendMessageMutation.mutate(content);
            }
          }}
          isSending={sendMessageMutation.isPending}
        />
      )}
      {activeTab === 'Messages' && !selectedChannelId && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            No projects available for chat channels.
          </p>
        </div>
      )}

      {/* Fallback for unknown tabs */}
      {activeTab !== 'Unread' && activeTab !== 'Messages' && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            Content for tab "{activeTab}" not yet available.
          </p>
        </div>
      )}
    </div>
  );
}

// ============= UNREAD NOTIFICATIONS TAB =============
interface UnreadNotificationsTabProps {
  notifications: Notification[];
}

/**
 * Renders a timeline of system notifications and task alerts.
 * Each notification includes visual markers for read/unread status.
 */
function UnreadNotificationsTab({ notifications }: UnreadNotificationsTabProps) {
  if (!Array.isArray(notifications)) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">
          No notifications available.
        </p>
      </div>
    );
  }

  // Separate unread and read notifications
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const readNotifications = notifications.filter((n) => n.isRead);

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task_assigned':
        return <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />;
      case 'task_completed':
        return <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />;
      case 'budget_alert':
        return <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />;
      default:
        return <Circle className="w-2 h-2 fill-slate-500 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ============= UNREAD NOTIFICATIONS SECTION ============= */}
      {unreadNotifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Unread ({unreadNotifications.length})
            </h2>
          </div>

          <div className="space-y-2">
            {unreadNotifications.map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                icon={getNotificationIcon(notif.type)}
                relativeTime={formatRelativeTime(notif.timestamp)}
                isUnread={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============= READ NOTIFICATIONS SECTION ============= */}
      {readNotifications.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Earlier
          </h2>

          <div className="space-y-2">
            {readNotifications.map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                icon={getNotificationIcon(notif.type)}
                relativeTime={formatRelativeTime(notif.timestamp)}
                isUnread={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============= EMPTY STATE ============= */}
      {notifications.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            All caught up! No new notifications.
          </p>
        </div>
      )}
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  icon: React.ReactNode;
  relativeTime: string;
  isUnread: boolean;
}

function NotificationCard({ notification, icon, relativeTime, isUnread }: NotificationCardProps) {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
        isUnread
          ? 'bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50'
          : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50'
      }`}
    >
      {/* ============= UNREAD INDICATOR ============= */}
      <div className="flex-shrink-0 pt-1">
        {isUnread && (
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
          </div>
        )}
        {!isUnread && (
          <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
        )}
      </div>

      {/* ============= NOTIFICATION CONTENT ============= */}
      <div className="flex-1 min-w-0">
        <h3
          className={`font-semibold text-sm ${
            isUnread
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {notification.title}
        </h3>
        <p
          className={`text-sm mt-1 leading-relaxed ${
            isUnread
              ? 'text-slate-600 dark:text-slate-400'
              : 'text-slate-500 dark:text-slate-500'
          }`}
        >
          {notification.message}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
          {relativeTime}
        </p>
      </div>

      {/* ============= ACTION BUTTONS ============= */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {notification.taskId && (
          <Link
            to={`/projects/${notification.projectId}`}
            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            View Task
          </Link>
        )}
        {notification.projectId && !notification.taskId && (
          <Link
            to={`/projects/${notification.projectId}`}
            className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium transition-colors"
          >
            View Project
          </Link>
        )}
      </div>
    </div>
  );
}

// ============= MESSAGES TAB =============
interface MessagesTabProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (channelId: string) => void;
  messages: ChatMessage[];
  messageInput: string;
  onMessageInputChange: (input: string) => void;
  onSendMessage: () => void;
  isSending?: boolean;
}

/**
 * Modern chat interface with responsive layout:
 * - Desktop: Sidebar channels (left) + message stream (right)
 * - Mobile: Single-column with channel selector
 */
function MessagesTab({
  channels,
  selectedChannelId,
  onSelectChannel,
  messages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  isSending,
}: MessagesTabProps) {
  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!Array.isArray(channels) || !selectedChannel) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">
          No channels available.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[70vh]">
      {/* ============= SIDEBAR: CHANNEL SELECT (Hidden on mobile, visible on desktop) ============= */}
      <div className="hidden lg:flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Channels
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full text-left px-4 py-3 border-l-2 transition-colors ${
                selectedChannelId === channel.id
                  ? 'border-l-blue-600 dark:border-l-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                  : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-900 dark:text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium line-clamp-1">
                  {channel.name}
                </span>
                {channel.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold">
                    {channel.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ============= MAIN CHAT AREA ============= */}
      <div className="lg:col-span-3 flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* ============= CHAT HEADER ============= */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                {selectedChannel.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {messages.length > 0 ? `${messages.length} messages` : 'No messages yet'}
              </p>
            </div>
          </div>
        </div>

        {/* ============= MESSAGE STREAM ============= */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-800"
        >
          {Array.isArray(messages) && messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.isCurrentUser
                      ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-none'
                  }`}
                >
                  {!message.isCurrentUser && (
                    <p className="text-xs font-semibold opacity-75 mb-1 text-left">
                      {message.sender}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-left">
                    {message.content}
                  </p>
                  <p className={`text-xs mt-1.5 text-left ${
                    message.isCurrentUser
                      ? 'text-blue-100 dark:text-blue-200'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <p className="text-center">
                No messages in this channel yet. Start a conversation!
              </p>
            </div>
          )}
        </div>

        {/* ============= MESSAGE INPUT BAR ============= */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => onMessageInputChange(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && messageInput.trim() && !isSending) {
                  onSendMessage();
                }
              }}
            />
            <button
              disabled={isSending || !messageInput.trim()}
              className="flex-shrink-0 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50"
              aria-label="Send message"
              onClick={() => {
                if (messageInput.trim()) {
                  onSendMessage();
                }
              }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
