import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MonitorCheck, Car, FileWarning, ClipboardList,
  TrendingUp, CheckCircle2, AlertTriangle, Clock, DoorOpen,
  XCircle, ArrowRightCircle, QrCode, RefreshCw, Search, Layers3,
} from 'lucide-react';
import { apiFetch } from '../../services/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatClock = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const relativeTime = (value) => {
  if (!value) return 'Just now';
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const statusLabel = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'available') return 'EMPTY';
  if (normalized === 'reserved' || normalized === 'booked') return 'RESERVED';
  if (normalized === 'maintenance') return 'MAINTENANCE';
  return 'OCCUPIED';
};

const statusKey = (status) => statusLabel(status).toLowerCase();

const slotKey = (floorId, slotNumber) =>
  `${String(floorId?._id || floorId || '')}:${String(slotNumber || '').trim().toUpperCase()}`;

const refId = (value) => String(value?._id || value || '');

const formatDuration = (milliseconds) => {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const averageActiveDwell = (sessions) => {
  const now = Date.now();
  const durations = sessions
    .map((session) => {
      const start = session.checkInTime ? new Date(session.checkInTime).getTime() : null;
      return start && now > start ? now - start : null;
    })
    .filter((duration) => typeof duration === 'number');

  if (!durations.length) return 0;
  return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
};

const isMissingOverviewRoute = (res) =>
  res.status === 404 && String(res.data?.message || '').toLowerCase().includes('/api/staff/dashboard/overview');

const StatCard = ({ icon, label, value, sub, color, loading }) => (
  <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/10 transition-colors group">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <TrendingUp size={13} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-white">{loading ? '...' : value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-emerald-400 mt-1 font-medium">{sub}</p>}
    </div>
  </div>
);

const BookingRow = ({ booking }) => {
  const slot = booking.slotCode || booking.parkingSlot || 'N/A';
  const badge =
    booking.status === 'active' ? 'bg-green-900/50 text-green-400' :
    booking.status === 'completed' ? 'bg-blue-900/50 text-blue-400' :
    booking.status === 'cancelled' || booking.status === 'expired' ? 'bg-red-900/50 text-red-400' :
    'bg-yellow-900/50 text-yellow-400';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Car size={13} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-200 font-mono truncate">{booking.licensePlate || 'UNKNOWN'}</p>
        <p className="text-[10px] text-gray-600 truncate">
          {booking.floorId?.name || booking.floorName || 'Floor'} - Slot {slot}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] text-gray-500">{formatClock(booking.startTime || booking.createdAt)}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badge}`}>{booking.status || 'pending'}</span>
      </div>
    </div>
  );
};

const percentOf = (value, total) => {
  if (!total) return 0;
  return (Number(value || 0) / total) * 100;
};

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const floorLabel = (floor) => {
  const raw = floor?.floorNumber ?? floor?.name ?? 'N/A';
  const text = String(raw);
  return /^b/i.test(text) ? text.toUpperCase() : `B${text}`;
};

const FloorStatCell = ({ value, total, colorClass }) => (
  <div className="text-center">
    <p className={`text-lg font-black leading-tight ${colorClass}`}>{value}</p>
    <p className="mt-1 text-xs font-semibold text-gray-400">({formatPercent(percentOf(value, total))})</p>
  </div>
);

const FloorOverviewTable = ({ rows, totalRow }) => {
  const tableRows = [...rows, totalRow].filter(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E131A]/80">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-bold text-gray-400">
              <th className="px-4 py-4">Floor</th>
              <th className="px-4 py-4 text-center">Total slots</th>
              <th className="px-4 py-4 text-center text-emerald-400">Empty</th>
              <th className="px-4 py-4 text-center text-sky-400">Occupied</th>
              <th className="px-4 py-4 text-center text-yellow-400">Reserved</th>
              <th className="px-4 py-4 text-center text-red-400">Maintenance</th>
              <th className="px-4 py-4">Usage rate</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, index) => {
              const isTotal = row.id === 'total';
              const usage = percentOf(row.occupied, row.total);

              return (
                <tr key={row.id} className={`border-b border-white/[0.07] last:border-0 ${isTotal ? 'bg-white/[0.035]' : 'hover:bg-white/[0.025]'}`}>
                  <td className="px-4 py-3">
                    <div className={`flex h-14 min-w-[98px] items-center gap-3 rounded-xl border px-3 ${
                      isTotal
                        ? 'border-white/10 bg-white/[0.05]'
                        : 'border-emerald-400/10 bg-emerald-500/[0.09]'
                    }`}>
                      {!isTotal && <Layers3 size={20} className="text-emerald-300" />}
                      <span className="text-base font-black text-white">{isTotal ? 'Total' : floorLabel(row)}</span>
                    </div>
                  </td>
                  <td className="border-l border-white/[0.06] px-4 py-3 text-center text-lg font-black text-gray-100">{row.total}</td>
                  <td className="border-l border-white/[0.06] px-4 py-3"><FloorStatCell value={row.empty} total={row.total} colorClass="text-emerald-400" /></td>
                  <td className="border-l border-white/[0.06] px-4 py-3"><FloorStatCell value={row.occupied} total={row.total} colorClass="text-sky-400" /></td>
                  <td className="border-l border-white/[0.06] px-4 py-3"><FloorStatCell value={row.reserved} total={row.total} colorClass="text-yellow-400" /></td>
                  <td className="border-l border-white/[0.06] px-4 py-3"><FloorStatCell value={row.maintenance} total={row.total} colorClass="text-red-400" /></td>
                  <td className="border-l border-white/[0.06] px-4 py-3">
                    <p className="text-sm font-black text-gray-100">{formatPercent(usage)}</p>
                    <div className="mt-2 h-2.5 w-full rounded-full bg-slate-700/70">
                      <div className="h-full rounded-full bg-sky-500 shadow-[0_0_12px_rgba(59,130,246,0.45)]" style={{ width: `${Math.min(100, usage)}%` }} />
                    </div>
                    {!isTotal && <p className="mt-1 text-[10px] text-gray-500">Floor #{index + 1}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5 border-t border-white/[0.07] px-4 py-4">
        {[
          ['bg-emerald-400', 'Empty'],
          ['bg-sky-400', 'Occupied'],
          ['bg-yellow-400', 'Reserved'],
          ['bg-red-400', 'Maintenance'],
        ].map(([color, label]) => (
          <div key={label} className="flex items-center gap-2 text-xs font-medium text-gray-300">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

const AlertPill = ({ alert }) => {
  const level = alert?.level || 'ok';
  const icon =
    level === 'error' ? <XCircle size={14} className="text-red-400" /> :
    level === 'warn' ? <AlertTriangle size={14} className="text-yellow-400" /> :
    <CheckCircle2 size={14} className="text-emerald-400" />;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${
      level === 'warn' ? 'bg-yellow-500/[0.08] border-yellow-500/15' :
      level === 'error' ? 'bg-red-500/[0.08] border-red-500/15' :
      'bg-emerald-500/[0.08] border-emerald-500/15'
    }`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-300 font-medium">{alert.text}</p>
        <p className="text-[10px] text-gray-600 mt-0.5">{relativeTime(alert.time)}</p>
      </div>
    </div>
  );
};

export default function StaffDashboard() {
  const [gateOpen, setGateOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapFilters, setMapFilters] = useState({ lotId: 'all', floorId: 'all', status: 'all', search: '' });

  const buildOverviewFromExistingApis = async () => {
    const headers = getAuthHeaders();
    const [floorsRes, activeRes, sessionsRes] = await Promise.all([
      apiFetch('/parking-floors', { method: 'GET', headers }),
      apiFetch('/sessions/active-status', { method: 'GET', headers }),
      apiFetch('/sessions', { method: 'GET', headers }),
    ]);

    const floors = floorsRes.ok && floorsRes.data?.success ? floorsRes.data.data || [] : [];
    const activeSessions = activeRes.ok && activeRes.data?.success ? activeRes.data.data || [] : [];
    const sessions = sessionsRes.ok && sessionsRes.data?.success ? sessionsRes.data.data || [] : [];

    const slotResults = await Promise.all(
      floors.map((floor) => apiFetch(`/parking-floors/${floor._id}/slots`, { method: 'GET', headers }))
    );
    const slots = slotResults.flatMap((res) => (res.ok && res.data?.success ? res.data.data || [] : []));

    const activeBySlot = new Map();
    activeSessions.forEach((session) => {
      activeBySlot.set(slotKey(session.floorId, session.parkingSlot), session);
    });

    const liveSlots = slots.map((slot) => {
      const floor = floors.find((item) => String(item._id) === String(slot.floorID?._id || slot.floorID));
      const activeSession = activeBySlot.get(slotKey(slot.floorID?._id || slot.floorID, slot.slotNumber));
      const status = slot.status === 'maintenance'
        ? 'maintenance'
        : activeSession || slot.status === 'occupied'
          ? 'occupied'
          : slot.status === 'booked' || slot.reservedFor
            ? 'reserved'
            : 'available';

      return {
        ...slot,
        status,
        rawStatus: slot.status,
        floorId: slot.floorID?._id || slot.floorID,
        floorName: floor?.name || slot.floorID?.name || null,
        lotId: floor?.parkingLotID || slot.floorID?.parkingLotID || null,
        zoneName: slot.zoneID?.zoneName || null,
        activeSession: activeSession || null,
      };
    });

    const counts = slots.reduce(
      (acc, slot) => {
        const activeSession = activeBySlot.get(slotKey(slot.floorID?._id || slot.floorID, slot.slotNumber));
        const status = slot.status === 'maintenance'
          ? 'maintenance'
          : activeSession || slot.status === 'occupied'
            ? 'occupied'
            : slot.status === 'booked' || slot.reservedFor
              ? 'reserved'
              : 'available';
        acc[status] += 1;
        return acc;
      },
      { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
    );

    const dwellMs = averageActiveDwell(activeSessions);
    const overdueSessions = activeSessions.filter((session) => {
      if (!session.checkInTime || !session.expectedDurationHours) return false;
      const expectedExit = new Date(session.checkInTime).getTime() + Number(session.expectedDurationHours) * 3600000;
      return expectedExit < Date.now();
    });

    const recentSessions = sessions
      .slice()
      .sort((a, b) => new Date(b.checkInTime || b.createdAt || 0) - new Date(a.checkInTime || a.createdAt || 0))
      .slice(0, 5)
      .map((session) => {
        const floor = floors.find((item) => String(item._id) === String(session.floorId?._id || session.floorId));
        return {
          ...session,
          floorName: floor?.name,
          startTime: session.checkInTime,
          slotCode: session.parkingSlot,
        };
      });

    const alerts = [
      ...overdueSessions.slice(0, 5).map((session) => ({
        type: 'overstay',
        level: 'warn',
        text: `${session.licensePlate || 'Vehicle'} exceeded expected parking time at ${session.parkingSlot || 'unassigned slot'}`,
        time: session.checkInTime,
      })),
      ...slots.filter((slot) => slot.status === 'maintenance').slice(0, 5).map((slot) => ({
        type: 'maintenance',
        level: 'error',
        text: `Slot ${slot.slotNumber || 'N/A'} is under maintenance`,
        time: slot.updatedAt || new Date(),
      })),
    ].slice(0, 8);

    return {
      totalSlots: slots.length,
      availableSlots: counts.available,
      occupiedSlots: counts.occupied,
      reservedSlots: counts.reserved,
      maintenanceSlots: counts.maintenance,
      activeParkingSessions: activeSessions.length,
      vehiclesInside: new Set(activeSessions.map((session) => session.licensePlate).filter(Boolean)).size,
      occupancyRate: slots.length ? Math.round((counts.occupied / slots.length) * 100) : 0,
      assignedFloors: floors.length,
      assignedLots: floors.length ? Math.max(1, new Set(floors.map((floor) => floor.parkingLotID || 'default')).size) : 0,
      averageDwellTime: {
        milliseconds: dwellMs,
        label: formatDuration(dwellMs),
        deltaMinutesVsYesterday: null,
      },
      parkingViolations: overdueSessions.length,
      pendingIssues: overdueSessions.length + counts.maintenance,
      slotSamples: liveSlots.slice(0, 8),
      slots: liveSlots,
      floors: floors.map((floor) => {
        const floorSlots = liveSlots.filter((slot) => refId(slot.floorId) === refId(floor._id));
        const floorCounts = floorSlots.reduce(
          (acc, slot) => {
            acc[statusKey(slot.status)] += 1;
            return acc;
          },
          { empty: 0, occupied: 0, reserved: 0, maintenance: 0 }
        );

        return {
          _id: floor._id,
          name: floor.name,
          floorNumber: floor.floorNumber,
          parkingLotID: floor.parkingLotID || null,
          totalSlots: floorSlots.length,
          availableSlots: floorCounts.empty,
          occupiedSlots: floorCounts.occupied,
          reservedSlots: floorCounts.reserved,
          maintenanceSlots: floorCounts.maintenance,
          occupancyRate: floorSlots.length ? Math.round((floorCounts.occupied / floorSlots.length) * 100) : 0,
        };
      }),
      recentBookings: recentSessions,
      recentSessions,
      alerts,
      fallback: true,
    };
  };

  const fetchOverview = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/staff/dashboard/overview', {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (res.ok && res.data?.success) {
        setOverview(res.data.data);
      } else if (isMissingOverviewRoute(res)) {
        const fallbackOverview = await buildOverviewFromExistingApis();
        setOverview(fallbackOverview);
      } else {
        setError(res.data?.message || 'Unable to load staff overview');
      }
    } catch (err) {
      console.error('Failed to load staff overview', err);
      setError('Unable to load staff overview');
    }

    if (!silent) setLoading(false);
  };

  useEffect(() => {
    const initialFetch = window.setTimeout(() => fetchOverview(), 0);
    const interval = setInterval(() => fetchOverview({ silent: true }), 30000);
    return () => {
      window.clearTimeout(initialFetch);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dwellSub = useMemo(() => {
    const delta = overview?.averageDwellTime?.deltaMinutesVsYesterday;
    if (delta === null || delta === undefined) return 'No yesterday baseline';
    if (delta === 0) return 'same as yesterday';
    return `${delta > 0 ? '+' : ''}${delta} min vs yesterday`;
  }, [overview]);

  const liveSlots = useMemo(() => (overview?.slots?.length ? overview.slots : (overview?.slotSamples || [])), [overview]);
  const lotOptions = overview?.lots || [];
  const floorOptions = useMemo(() => {
    const floorMap = new Map();

    (overview?.floors || []).forEach((floor) => {
      floorMap.set(refId(floor._id), floor);
    });

    liveSlots.forEach((slot) => {
      const id = refId(slot.floorId);
      if (!id || floorMap.has(id)) return;
      floorMap.set(id, {
        _id: id,
        name: slot.floorName || `Floor ${slot.floorNumber || floorMap.size + 1}`,
        floorNumber: slot.floorNumber,
        parkingLotID: slot.lotId || null,
      });
    });

    return Array.from(floorMap.values()).sort((a, b) => {
      const numberCompare = Number(a.floorNumber ?? 9999) - Number(b.floorNumber ?? 9999);
      return numberCompare || String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true });
    });
  }, [overview, liveSlots]);
  const filteredSlots = useMemo(() => {
    const needle = mapFilters.search.trim().toLowerCase();
    return liveSlots.filter((slot) => {
      const status = statusLabel(slot.status).toLowerCase();
      const plate = String(slot.activeSession?.licensePlate || slot.activeBooking?.licensePlate || '').toLowerCase();
      const lotMatches = mapFilters.lotId === 'all' || refId(slot.lotId) === mapFilters.lotId;
      const floorMatches = mapFilters.floorId === 'all' || refId(slot.floorId) === mapFilters.floorId;
      const statusMatches = mapFilters.status === 'all' || status === mapFilters.status;
      const searchMatches = !needle
        || String(slot.slotNumber || '').toLowerCase().includes(needle)
        || String(slot.floorName || '').toLowerCase().includes(needle)
        || String(slot.zoneName || '').toLowerCase().includes(needle)
        || plate.includes(needle);
      return lotMatches && floorMatches && statusMatches && searchMatches;
    });
  }, [liveSlots, mapFilters]);

  const liveGridTitle = mapFilters.floorId === 'all'
    ? 'Live Map - All Managed Slots'
    : `Live Map - ${floorOptions.find((floor) => String(floor._id) === mapFilters.floorId)?.name || 'Managed Floor'}`;

  const slotsByFloor = useMemo(() => (
    filteredSlots.reduce((groups, slot) => {
      const id = refId(slot.floorId) || 'unknown';
      if (!groups[id]) {
        groups[id] = {
          id,
          name: slot.floorName || 'Unknown Floor',
          floorNumber: slot.floorNumber,
          slots: [],
        };
      }
      groups[id].slots.push(slot);
      return groups;
    }, {})
  ), [filteredSlots]);

  const floorOverviewRows = useMemo(() => {
    const order = new Map(floorOptions.map((floor, index) => [refId(floor._id), index]));
    return Object.values(slotsByFloor)
      .map((group) => {
        const counts = group.slots.reduce(
          (acc, slot) => {
            acc[statusKey(slot.status)] += 1;
            return acc;
          },
          { empty: 0, occupied: 0, reserved: 0, maintenance: 0 }
        );
        const floorMeta = floorOptions.find((floor) => refId(floor._id) === group.id);

        return {
          id: group.id,
          name: floorMeta?.name || group.name,
          floorNumber: floorMeta?.floorNumber ?? group.floorNumber,
          total: group.slots.length,
          ...counts,
        };
      })
      .sort((a, b) => {
        const aIndex = order.has(a.id) ? order.get(a.id) : 9999;
        const bIndex = order.has(b.id) ? order.get(b.id) : 9999;
        return aIndex - bIndex || String(a.name).localeCompare(String(b.name));
      });
  }, [slotsByFloor, floorOptions]);

  const floorOverviewTotal = useMemo(() => {
    const total = floorOverviewRows.reduce(
      (acc, row) => {
        acc.total += row.total;
        acc.empty += row.empty;
        acc.occupied += row.occupied;
        acc.reserved += row.reserved;
        acc.maintenance += row.maintenance;
        return acc;
      },
      { id: 'total', name: 'Total', total: 0, empty: 0, occupied: 0, reserved: 0, maintenance: 0 }
    );
    return total.total ? total : null;
  }, [floorOverviewRows]);

  return (
    <div className="p-6 lg:p-8 space-y-8 min-h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Staff Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor and operate current parking activity</p>
        </div>
        <button
          onClick={() => fetchOverview()}
          className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 flex items-center justify-center"
          title="Refresh overview"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          loading={loading}
          icon={<MonitorCheck size={18} className="text-yellow-400" />}
          color="bg-yellow-500/10"
          label="Slots Under Management"
          value={overview?.totalSlots ?? 0}
          sub={`${overview?.assignedFloors ?? 0} floors - ${overview?.assignedLots ?? 0} lots`}
        />
        <StatCard
          loading={loading}
          icon={<Car size={18} className="text-sky-400" />}
          color="bg-sky-500/10"
          label="Vehicles Inside Now"
          value={overview?.vehiclesInside ?? 0}
          sub={`${overview?.occupancyRate ?? 0}% occupancy`}
        />
        <StatCard
          loading={loading}
          icon={<Clock size={18} className="text-violet-400" />}
          color="bg-violet-500/10"
          label="Avg. Dwell Time"
          value={overview?.averageDwellTime?.label || '0m'}
          sub={dwellSub}
        />
        <StatCard
          loading={loading}
          icon={<FileWarning size={18} className="text-orange-400" />}
          color="bg-orange-500/10"
          label="Violations Today"
          value={overview?.parkingViolations ?? 0}
          sub={`${overview?.pendingIssues ?? 0} pending issues`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#16181F] border border-white/5 rounded-2xl p-5">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-sm">{liveGridTitle}</h3>
              <p className="text-gray-600 text-[10px] mt-0.5">Full slot map from sessions, bookings and maintenance data</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-gray-500">Live - {filteredSlots.length}/{liveSlots.length}</span>
            </div>
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1.3fr]">
              <select
                value={mapFilters.lotId}
                onChange={(event) => setMapFilters((current) => ({ ...current, lotId: event.target.value, floorId: 'all' }))}
                className="h-10 rounded-xl border border-white/10 bg-[#0D0D0D] px-3 text-xs text-gray-200 outline-none"
              >
                <option className="bg-[#0D0D0D] text-gray-100" value="all">All lots</option>
                {lotOptions.map((lot) => (
                  <option className="bg-[#0D0D0D] text-gray-100" key={lot._id} value={String(lot._id)}>{lot.name}</option>
                ))}
              </select>
              <select
                value={mapFilters.floorId}
                onChange={(event) => setMapFilters((current) => ({ ...current, floorId: event.target.value }))}
                className="h-10 rounded-xl border border-white/10 bg-[#0D0D0D] px-3 text-xs text-gray-200 outline-none"
              >
                <option className="bg-[#0D0D0D] text-gray-100" value="all">-- Overview (All Floors) --</option>
                {floorOptions
                  .filter((floor) => mapFilters.lotId === 'all' || refId(floor.parkingLotID) === mapFilters.lotId)
                  .map((floor) => (
                    <option className="bg-[#0D0D0D] text-gray-100" key={floor._id} value={String(floor._id)}>{floor.name}</option>
                  ))}
              </select>
              <select
                value={mapFilters.status}
                onChange={(event) => setMapFilters((current) => ({ ...current, status: event.target.value }))}
                className="h-10 rounded-xl border border-white/10 bg-[#0D0D0D] px-3 text-xs text-gray-200 outline-none"
              >
                <option className="bg-[#0D0D0D] text-gray-100" value="all">All status</option>
                <option className="bg-[#0D0D0D] text-gray-100" value="empty">Empty</option>
                <option className="bg-[#0D0D0D] text-gray-100" value="occupied">Occupied</option>
                <option className="bg-[#0D0D0D] text-gray-100" value="reserved">Reserved</option>
                <option className="bg-[#0D0D0D] text-gray-100" value="maintenance">Maintenance</option>
              </select>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={mapFilters.search}
                  onChange={(event) => setMapFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search slot, floor, zone, plate"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0D0D0D] pl-9 pr-3 text-xs text-gray-200 outline-none placeholder:text-gray-600"
                />
              </div>
            </div>
          </div>

          {floorOverviewRows.length ? (
            <FloorOverviewTable rows={floorOverviewRows} totalRow={floorOverviewTotal} />
          ) : (
            <div className="min-h-[190px] rounded-xl border border-dashed border-white/10 flex items-center justify-center text-sm text-gray-500">
              No slots match current filters
            </div>
          )}

          <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-white/5">
            {[
              { color: 'bg-sky-500', label: `Occupied ${floorOverviewTotal?.occupied ?? 0}` },
              { color: 'bg-emerald-500', label: `Empty ${floorOverviewTotal?.empty ?? 0}` },
              { color: 'bg-yellow-500', label: `Reserved ${floorOverviewTotal?.reserved ?? 0}` },
              { color: 'bg-red-500', label: `Maintenance ${floorOverviewTotal?.maintenance ?? 0}` },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                <span className="text-[10px] text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-white font-bold text-sm">Gate & Quick Actions</h3>

          <div className={`rounded-2xl border p-4 flex flex-col items-center gap-3 transition-all duration-300 ${
            gateOpen ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-white/[0.03] border-white/5'
          }`}>
            <DoorOpen size={32} className={gateOpen ? 'text-emerald-400' : 'text-gray-600'} />
            <p className="text-xs text-gray-400 text-center">Main Gate</p>
            <button
              onClick={() => setGateOpen((open) => !open)}
              className={`w-full py-2.5 rounded-xl text-sm font-extrabold transition-all ${
                gateOpen
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {gateOpen ? 'Gate Open' : 'Open Gate Manually'}
            </button>
            {gateOpen && <p className="text-[10px] text-emerald-400 text-center animate-pulse">Manual open state is active</p>}
          </div>

          <Link to="/staff/sessions" className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-sky-500/[0.08] border border-sky-500/15 hover:bg-sky-500/[0.12] transition-colors text-left group">
            <ArrowRightCircle size={16} className="text-sky-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            <div>
              <p className="text-xs font-bold text-gray-300">Process Vehicle Exit</p>
              <p className="text-[10px] text-gray-600">Review active sessions</p>
            </div>
          </Link>

          <Link to="/staff/live-grid" className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-yellow-500/[0.08] border border-yellow-500/15 hover:bg-yellow-500/[0.12] transition-colors text-left group">
            <QrCode size={16} className="text-yellow-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-xs font-bold text-gray-300">Open Live Grid</p>
              <p className="text-[10px] text-gray-600">Inspect floor and slot status</p>
            </div>
          </Link>

          <Link to="/staff/live-grid" className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-left group">
            <ClipboardList size={16} className="text-gray-400 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
            <div>
              <p className="text-xs font-bold text-gray-300">Update Slot Status</p>
              <p className="text-[10px] text-gray-600">Handle maintenance and blocked slots</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">Recent Bookings</h3>
            <Link to="/staff/sessions" className="text-[10px] text-emerald-400 bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-700/30 hover:brightness-110">
              Manage all
            </Link>
          </div>
          {overview?.recentBookings?.length ? (
            overview.recentBookings.map((booking) => <BookingRow key={booking._id} booking={booking} />)
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No booking records yet</p>
          )}
        </div>

        <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">Lot Alerts & Violations</h3>
          <div className="space-y-2.5">
            {overview?.alerts?.length ? (
              overview.alerts.map((alert, index) => <AlertPill key={`${alert.type}-${index}`} alert={alert} />)
            ) : (
              <AlertPill alert={{ level: 'ok', text: 'No active operational alerts', time: new Date() }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
