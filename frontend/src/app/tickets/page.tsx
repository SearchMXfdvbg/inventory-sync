'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LifeBuoy, 
  Ticket, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Filter, 
  User, 
  CheckCircle,
  HelpCircle,
  Zap,
  ExternalLink
} from 'lucide-react';

export interface TicketMessage {
  id: string;
  sender: string;
  role: 'USER' | 'ADMIN' | 'SUPPORT';
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  user: string;
  title: string;
  category: 'ACTIVATION' | 'MARKETPLACE' | 'INVENTORY' | 'BILLING' | 'TECHNICAL' | 'OTHER';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_REVIEW' | 'ANSWERED' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

const CATEGORY_MAP: Record<SupportTicket['category'], { label: string; color: string }> = {
  ACTIVATION: { label: 'Activación de Plan', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  MARKETPLACE: { label: 'Conexión Marketplaces', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  INVENTORY: { label: 'Inventario / Catálogo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  BILLING: { label: 'Facturación / Pagos', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  TECHNICAL: { label: 'Incidencia Técnica', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  OTHER: { label: 'Consulta General', color: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
};

const PRIORITY_MAP: Record<SupportTicket['priority'], { label: string; color: string }> = {
  LOW: { label: 'Baja', color: 'bg-slate-500/20 text-slate-300' },
  NORMAL: { label: 'Normal', color: 'bg-blue-500/20 text-blue-300' },
  HIGH: { label: 'Alta', color: 'bg-amber-500/20 text-amber-300' },
  URGENT: { label: 'Urgente', color: 'bg-rose-500/20 text-rose-300' },
};

const STATUS_MAP: Record<SupportTicket['status'], { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Abierto', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Clock },
  IN_REVIEW: { label: 'En Revisión', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: AlertCircle },
  ANSWERED: { label: 'Respondido', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', icon: MessageSquare },
  RESOLVED: { label: 'Resuelto', color: 'bg-slate-500/15 text-slate-400 border-slate-600/30', icon: CheckCircle2 },
};

const INITIAL_SEED_TICKETS: SupportTicket[] = [
  {
    id: 'TK-1082',
    user: 'ggbro',
    title: 'Solicitud de Activación y Asignación de Plan de Sincronización',
    category: 'ACTIVATION',
    priority: 'HIGH',
    status: 'IN_REVIEW',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    messages: [
      {
        id: 'msg-1',
        sender: 'ggbro',
        role: 'USER',
        text: 'Hola CristAdmin, registré mi cuenta para conectar Shopify y Mercado Libre. Quedo a la espera de que activen mi plan para comenzar a sincronizar mis productos.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'msg-2',
        sender: 'CristAdmin (Soporte Oficial)',
        role: 'ADMIN',
        text: '¡Hola ggbro! Hemos recibido tu solicitud de activación. Estamos preparando los canales de sincronización para tu cuenta. Si requieres conectar Aspel SAE o Amazon, avísanos por este medio.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
      }
    ]
  },
  {
    id: 'TK-1045',
    user: 'SearchMX',
    title: 'Verificación de credenciales de API Mercado Libre',
    category: 'MARKETPLACE',
    priority: 'NORMAL',
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    messages: [
      {
        id: 'msg-101',
        sender: 'SearchMX',
        role: 'USER',
        text: 'Confirmar si los tokens de refresco para Mercado Libre México están renovándose automáticamente.',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'msg-102',
        sender: 'CristAdmin (Soporte Oficial)',
        role: 'ADMIN',
        text: 'Revisado y verificado. El worker en segundo plano ejecuta la renovación cada 5 horas con éxito.',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      }
    ]
  }
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('Cliente');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal / Formulario
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Nuevo Ticket Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicket['category']>('ACTIVATION');
  const [newPriority, setNewPriority] = useState<SupportTicket['priority']>('NORMAL');
  const [newMessage, setNewMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionRaw = localStorage.getItem('user_session');
      let username = 'Cliente';
      let isSuper = false;
      let planGuest = false;

      if (sessionRaw) {
        try {
          const parsed = JSON.parse(sessionRaw);
          username = parsed.username || 'Cliente';
          isSuper = username.toLowerCase() === 'cristadmin' || parsed.role === 'SUPER_ADMIN';
          planGuest = parsed.plan === 'Plan Guest' || parsed.plan?.toLowerCase().includes('guest') || parsed.is_active === false;
        } catch {}
      }

      setCurrentUser(username);
      setIsSuperAdmin(isSuper);
      setIsGuest(planGuest);

      // Cargar tickets de localStorage
      const saved = localStorage.getItem('inventory_sync_tickets_v1');
      if (saved) {
        try {
          setTickets(JSON.parse(saved));
        } catch {
          setTickets(INITIAL_SEED_TICKETS);
          localStorage.setItem('inventory_sync_tickets_v1', JSON.stringify(INITIAL_SEED_TICKETS));
        }
      } else {
        setTickets(INITIAL_SEED_TICKETS);
        localStorage.setItem('inventory_sync_tickets_v1', JSON.stringify(INITIAL_SEED_TICKETS));
      }
    }
  }, []);

  const saveTickets = (updated: SupportTicket[]) => {
    setTickets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventory_sync_tickets_v1', JSON.stringify(updated));
    }
  };

  // Filtrar tickets: si es superadmin ve todos; si es cliente ve los suyos
  const filteredTickets = tickets
    .filter((t) => {
      if (!isSuperAdmin && t.user.toLowerCase() !== currentUser.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.messages.some((m) => m.text.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Métricas
  const userTickets = isSuperAdmin ? tickets : tickets.filter((t) => t.user.toLowerCase() === currentUser.toLowerCase());
  const openCount = userTickets.filter((t) => t.status === 'OPEN').length;
  const inReviewCount = userTickets.filter((t) => t.status === 'IN_REVIEW' || t.status === 'ANSWERED').length;
  const resolvedCount = userTickets.filter((t) => t.status === 'RESOLVED').length;

  // Crear Ticket
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    const newTicketId = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const created: SupportTicket = {
      id: newTicketId,
      user: currentUser,
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: currentUser,
          role: 'USER',
          text: newMessage.trim(),
          timestamp: now,
        }
      ]
    };

    const updatedList = [created, ...tickets];
    saveTickets(updatedList);
    setShowModal(false);
    setSelectedTicket(created);

    // Reset form
    setNewTitle('');
    setNewMessage('');
    setNewCategory('ACTIVATION');
    setNewPriority('NORMAL');

    triggerToast(`🎉 ¡Ticket ${newTicketId} creado con éxito! CristAdmin ha sido notificado.`);
  };

  // Enviar Respuesta a Ticket
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    const now = new Date().toISOString();
    const isSenderAdmin = isSuperAdmin;

    const newMsg: TicketMessage = {
      id: `msg-${Date.now()}`,
      sender: isSenderAdmin ? 'CristAdmin (Soporte Oficial)' : currentUser,
      role: isSenderAdmin ? 'ADMIN' : 'USER',
      text: replyText.trim(),
      timestamp: now,
    };

    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      updatedAt: now,
      status: isSenderAdmin ? 'ANSWERED' : 'OPEN',
      messages: [...selectedTicket.messages, newMsg]
    };

    const updatedList = tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));
    saveTickets(updatedList);
    setSelectedTicket(updatedTicket);
    setReplyText('');
    triggerToast('Respuesta enviada correctamente.');
  };

  // Cambiar Estado (Solo Super Admin o Cerrar por Usuario)
  const handleChangeStatus = (ticketId: string, newStatus: SupportTicket['status']) => {
    const now = new Date().toISOString();
    const updatedList = tickets.map((t) => {
      if (t.id === ticketId) {
        return { ...t, status: newStatus, updatedAt: now };
      }
      return t;
    });
    saveTickets(updatedList);
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus, updatedAt: now });
    }
    triggerToast(`Estado del ticket actualizado a "${STATUS_MAP[newStatus].label}".`);
  };

  // Plantillas Rápidas
  const applyTemplate = (type: 'activation' | 'marketplace' | 'urgent') => {
    if (type === 'activation') {
      setNewTitle('Solicitud de Activación Inmediata de Plan');
      setNewCategory('ACTIVATION');
      setNewPriority('HIGH');
      setNewMessage(`Hola CristAdmin, solicito por favor la activación de mi cuenta (${currentUser}) para comenzar a sincronizar mis productos en la plataforma.`);
    } else if (type === 'marketplace') {
      setNewTitle('Asistencia para vincular tienda Shopify y Mercado Libre');
      setNewCategory('MARKETPLACE');
      setNewPriority('NORMAL');
      setNewMessage('Necesito apoyo para validar mis llaves de API y configurar el inventario base.');
    } else if (type === 'urgent') {
      setNewTitle('Urgente: Desconexión de sincronización de stock');
      setNewCategory('TECHNICAL');
      setNewPriority('URGENT');
      setNewMessage('He detectado una inconsistencia de stock en mi canal de ventas y requiero revisión técnica inmediata.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white font-semibold text-xs shadow-2xl shadow-emerald-950/40 animate-fade-in border border-emerald-400/30">
          <CheckCircle size={18} className="text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner de Ayuda para Usuarios en Espera / Plan Guest */}
      {isGuest && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-500/15 border border-amber-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Zap size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Canal Prioritario de Activación de Cuenta</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  PLAN GUEST
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                ¿Tu cuenta está en espera de aprobación? Crea un ticket solicitando la activación y el Super Administrador <strong className="text-amber-300 font-bold">CristAdmin</strong> asignará tu plan para que puedas operar de inmediato.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              applyTemplate('activation');
              setShowModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <Ticket size={16} />
            <span>Solicitar Activación Ahora</span>
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <LifeBuoy className="text-blue-500" size={26} />
              <span>Tickets de Soporte y Activación</span>
            </h1>
            {isSuperAdmin && (
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                VISTA SUPER ADMIN
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Comunícate directamente con el equipo técnico y administra solicitudes de activación o soporte.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft size={14} />
            <span>Volver al Dashboard</span>
          </Link>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>Crear Nuevo Ticket</span>
          </button>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Tickets Abiertos</span>
            <div className="text-2xl font-black text-emerald-500 mt-1">{openCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">En Revisión / Respondidos</span>
            <div className="text-2xl font-black text-amber-500 mt-1">{inReviewCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <MessageSquare size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Tickets Resueltos</span>
            <div className="text-2xl font-black text-slate-400 mt-1">{resolvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID de ticket, asunto o mensaje..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'OPEN', label: 'Abiertos' },
            { id: 'IN_REVIEW', label: 'En Revisión' },
            { id: 'ANSWERED', label: 'Respondidos' },
            { id: 'RESOLVED', label: 'Resueltos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal: Lista de Tickets + Detalle / Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Lista de Tickets */}
        <div className={`space-y-3 ${selectedTicket ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {filteredTickets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <Ticket size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No hay tickets registrados</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No se encontraron tickets con los filtros seleccionados.'
                  : 'Crea tu primer ticket para contactar a soporte o solicitar la activación de tu plan.'}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
              >
                + Crear Nuevo Ticket
              </button>
            </div>
          ) : (
            filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const StatusIcon = STATUS_MAP[t.status].icon;
              const lastMsg = t.messages[t.messages.length - 1];

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${
                    isSelected
                      ? 'bg-blue-500/10 border-blue-500 shadow-md dark:bg-blue-950/20'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-blue-500 dark:text-blue-400">
                        {t.id}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${CATEGORY_MAP[t.category].color}`}>
                        {CATEGORY_MAP[t.category].label}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_MAP[t.status].color}`}>
                      <StatusIcon size={11} />
                      <span>{STATUS_MAP[t.status].label}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 line-clamp-1 group-hover:text-blue-500 transition-colors">
                    {t.title}
                  </h3>

                  {lastMsg && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">{lastMsg.sender}: </strong>
                      {lastMsg.text}
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      {isSuperAdmin && (
                        <span className="text-slate-600 dark:text-slate-400 font-semibold">
                          Usuario: {t.user}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${PRIORITY_MAP[t.priority].color}`}>
                        {PRIORITY_MAP[t.priority].label}
                      </span>
                    </div>

                    <span>{new Date(t.updatedAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Columna Derecha: Detalle del Ticket y Conversación */}
        {selectedTicket && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in sticky top-24">
            
            {/* Header del Ticket Seleccionado */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-blue-500 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    {selectedTicket.id}
                  </span>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border font-bold ${CATEGORY_MAP[selectedTicket.category].color}`}>
                    {CATEGORY_MAP[selectedTicket.category].label}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
                >
                  Cerrar Detalle ✕
                </button>
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                  {selectedTicket.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-mono">
                  <span>Creado por: <strong className="text-slate-300">{selectedTicket.user}</strong></span>
                  <span>•</span>
                  <span>Prioridad: <strong className="text-amber-400">{PRIORITY_MAP[selectedTicket.priority].label}</strong></span>
                  <span>•</span>
                  <span>Estado: <strong className="text-emerald-400">{STATUS_MAP[selectedTicket.status].label}</strong></span>
                </div>
              </div>

              {/* Botones de acción rápida de estado */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {isSuperAdmin ? (
                  <>
                    <span className="text-[10px] font-mono text-slate-400">Marcar como:</span>
                    <button
                      onClick={() => handleChangeStatus(selectedTicket.id, 'IN_REVIEW')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-all"
                    >
                      En Revisión
                    </button>
                    <button
                      onClick={() => handleChangeStatus(selectedTicket.id, 'RESOLVED')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all"
                    >
                      ✓ Resuelto
                    </button>
                  </>
                ) : (
                  selectedTicket.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleChangeStatus(selectedTicket.id, 'RESOLVED')}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                    >
                      Marcar este ticket como resuelto
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Hilo de Mensajes */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
              {selectedTicket.messages.map((m) => {
                const isAdmin = m.role === 'ADMIN' || m.role === 'SUPPORT';
                const isMe = m.sender === currentUser;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-slate-400">
                      {isAdmin && <ShieldCheck size={13} className="text-amber-400" />}
                      <span className={isAdmin ? 'text-amber-300 font-bold' : 'text-slate-300 font-semibold'}>
                        {m.sender}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(m.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                        isAdmin
                          ? 'bg-slate-800/90 text-slate-100 border border-amber-500/20 rounded-tl-sm'
                          : isMe
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 rounded-tr-sm'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tr-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Caja de Respuesta */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="relative">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    isSuperAdmin
                      ? 'Escribe tu respuesta como Administrador oficial...'
                      : 'Escribe un mensaje de respuesta o proporciona más información...'
                  }
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  {isSuperAdmin ? 'Respondiendo como Super Administrador' : 'Mensaje cifrado con soporte'}
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Send size={14} />
                  <span>Enviar Respuesta</span>
                </button>
              </div>
            </form>

          </div>
        )}

      </div>

      {/* Modal: Crear Nuevo Ticket */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Ticket className="text-blue-500" size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Abrir Ticket de Soporte</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Plantillas Rápidas */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Plantillas Frecuentes:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyTemplate('activation')}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                >
                  ⚡ Solicitar Activación de Cuenta
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('marketplace')}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
                >
                  🔌 Vincular Marketplaces
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('urgent')}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                >
                  🚨 Incidencia Urgente
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asunto del Ticket
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Solicitud de Activación de Plan de Sincronización"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="ACTIVATION">Activación de Cuenta</option>
                    <option value="MARKETPLACE">Conexión Marketplaces</option>
                    <option value="INVENTORY">Inventario / Catálogo</option>
                    <option value="BILLING">Facturación y Pagos</option>
                    <option value="TECHNICAL">Incidencia Técnica</option>
                    <option value="OTHER">Consulta General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="LOW">Baja</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción Detallada
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe con claridad tu solicitud o requerimiento..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-200 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Crear y Enviar Ticket
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
