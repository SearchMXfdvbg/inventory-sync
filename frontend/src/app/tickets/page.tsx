'use client';

import React, { useState } from 'react';
import { Plus, Search, Filter, MessageSquare, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 'TKT-001',
      title: 'Error al sincronizar stock de SKU-PRO-4090',
      description: 'El producto aparece con stock 0 en Shopify pero tiene 5 unidades en SAE',
      status: 'open',
      priority: 'high',
      createdAt: '2026-04-15T10:30:00Z',
      updatedAt: '2026-04-15T10:30:00Z',
      assignedTo: 'Carlos Rodríguez'
    },
    {
      id: 'TKT-002',
      title: 'Problema con conexión a Mercado Libre',
      description: 'No se pueden actualizar los precios de los productos',
      status: 'closed',
      priority: 'medium',
      createdAt: '2026-04-14T14:22:00Z',
      updatedAt: '2026-04-14T16:45:00Z',
      assignedTo: 'María González'
    },
    {
      id: 'TKT-003',
      title: 'Importación de catálogo fallida',
      description: 'El archivo Excel con 200 productos no se importó correctamente',
      status: 'pending',
      priority: 'high',
      createdAt: '2026-04-14T09:15:00Z',
      updatedAt: '2026-04-14T09:15:00Z',
      assignedTo: 'Pedro Martínez'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#ff3b00]/20 text-[#ff3b00] font-mono-code text-[10px]">
            <Clock className="w-3 h-3" /> ABIERTO
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#00ff66]/20 text-[#00ff66] font-mono-code text-[10px]">
            <CheckCircle2 className="w-3 h-3" /> CERRADO
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#f59e0b]/20 text-[#f59e0b] font-mono-code text-[10px]">
            <Clock className="w-3 h-3" /> PENDIENTE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#555d6e]/20 text-[#555d6e] font-mono-code text-[10px]">
            <AlertTriangle className="w-3 h-3" /> DESCONOCIDO
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="text-[#ff3b00] font-mono-code text-[10px]">ALTA</span>;
      case 'medium':
        return <span className="text-[#f59e0b] font-mono-code text-[10px]">MEDIA</span>;
      case 'low':
        return <span className="text-[#00ff66] font-mono-code text-[10px]">BAJA</span>;
      default:
        return <span className="text-[#555d6e] font-mono-code text-[10px]">-</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-mono-code">TICKETS DE SOPORTE</h1>
        <button className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> NUEVO TICKET
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 border border-[#20242c] bg-[#0d0e12] shadow-hard">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555d6e]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tickets..."
            className="w-full pl-8 pr-3 py-2 bg-[#090a0c] border border-[#20242c] font-mono-code text-xs text-[#a1a7b5] focus:outline-none focus:border-[#00ff66]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#090a0c] border border-[#20242c] font-mono-code text-xs text-[#a1a7b5] focus:outline-none focus:border-[#00ff66]"
          >
            <option value="all">Todos los Estados</option>
            <option value="open">Abierto</option>
            <option value="closed">Cerrado</option>
            <option value="pending">Pendiente</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-[#090a0c] border border-[#20242c] font-mono-code text-xs text-[#a1a7b5] focus:outline-none focus:border-[#00ff66]"
          >
            <option value="all">Todas las Prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <button className="px-3 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" /> FILTRAR
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 mb-2 px-4 font-mono-code text-[10px] text-[#555d6e] uppercase tracking-widest">
        <div className="col-span-1">ID</div>
        <div className="col-span-3">Título</div>
        <div className="col-span-2">Asignado a</div>
        <div className="col-span-2">Estado</div>
        <div className="col-span-2">Prioridad</div>
        <div className="col-span-2">Última Actualización</div>
      </div>

      {/* Ticket Rows */}
      <div className="border border-[#20242c] bg-[#0d0e12] shadow-hard">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-[#555d6e]">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-mono-code">No se encontraron tickets</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-[#20242c] last:border-b-0 hover:bg-[#14171e]/50 transition-colors"
            >
              <div className="col-span-1 font-mono-code text-xs">{ticket.id}</div>
              <div className="col-span-3 font-mono-code text-xs">
                <div className="font-bold">{ticket.title}</div>
                <div className="text-[#8e95a5] text-[10px] truncate">{ticket.description}</div>
              </div>
              <div className="col-span-2 font-mono-code text-xs text-[#8e95a5]">
                {ticket.assignedTo || 'Sin asignar'}
              </div>
              <div className="col-span-2">
                {getStatusBadge(ticket.status)}
              </div>
              <div className="col-span-2">
                {getPriorityBadge(ticket.priority)}
              </div>
              <div className="col-span-2 font-mono-code text-[10px] text-[#8e95a5]">
                {new Date(ticket.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}