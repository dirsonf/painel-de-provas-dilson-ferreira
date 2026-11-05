/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Check, Trash2, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { Notification } from '../types';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll?: () => void;
}

export default function NotificationPanel({ notifications, onMarkAsRead, onClearAll }: NotificationPanelProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'approval':
        return <Check className="w-4 h-4 text-emerald-500" />;
      case 'notes_added':
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="w-full bg-[#181818]/60 backdrop-blur-md border border-neutral-800/80 rounded-2xl p-6">
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bell className="w-5 h-5 text-neutral-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-[9px] font-bold text-black rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold tracking-wide text-neutral-100">
            Histórico de Notificações
          </h3>
        </div>
        {unreadCount > 0 && onClearAll && (
          <button 
            onClick={onClearAll}
            className="text-[11px] font-mono hover:text-amber-500 text-neutral-500 transition-colors"
          >
            Limpar tudo
          </button>
        )}
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-neutral-600 flex flex-col items-center justify-center gap-1.5">
            <Bell className="w-8 h-8 opacity-40 mb-1" />
            <p className="text-xs">Nenhuma notificação por aqui.</p>
            <p className="text-[10px] text-neutral-700">Atualizações do status de edição aparecerão aqui.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300 ${
                notif.read 
                  ? 'bg-neutral-900/20 border-neutral-900/60 opacity-65' 
                  : 'bg-gradient-to-r from-amber-500/5 to-neutral-900/40 border-neutral-800/80 hover:border-amber-500/20'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${notif.read ? 'bg-neutral-800/50' : 'bg-amber-500/10'}`}>
                {getIcon(notif.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-semibold truncate ${notif.read ? 'text-neutral-400' : 'text-neutral-200'}`}>
                    {notif.title}
                  </p>
                  {!notif.read && (
                    <button 
                      onClick={() => onMarkAsRead(notif.id)}
                      className="text-[10px] font-mono text-amber-500 hover:text-amber-400 shrink-0 uppercase tracking-widest pl-2"
                      title="Marcar como lida"
                    >
                      Marcar lida
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  {notif.message}
                </p>
                <p className="text-[9px] font-mono text-neutral-600 mt-1.5">
                  {new Date(notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
