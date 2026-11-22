import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Eye, EyeOff, Sun, Moon, LogOut, Menu, X, Plus, Trash2,
  RefreshCw, Zap, ShieldAlert, Package, Lock, Unlock,
  Send, Wifi, WifiOff, MapPin, Navigation, CheckCircle2, Cloud, CloudOff
} from 'lucide-react';
import {
  db,
  isFirebaseConfigured,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from './firebase';

/* ============================================================================
   HELPER FUNCTIONS
   ============================================================================ */
function formatPriceByPkg(pkg) {
  if (pkg === '10 Mbps') return 'Rp 110.000';
  if (pkg === '20 Mbps') return 'Rp 150.000';
  if (pkg === '30 Mbps') return 'Rp 200.000';
  if (pkg === '50 Mbps') return 'Rp 300.000';
  return 'Rp 0';
}

function getPkgAmountNumber(pkg) {
  if (pkg === '10 Mbps') return 110000;
  if (pkg === '20 Mbps') return 150000;
  if (pkg === '30 Mbps') return 200000;
  if (pkg === '50 Mbps') return 300000;
  return 0;
}

function getPkgMbpsNumber(pkg) {
  const m = String(pkg || '').match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function normalizeWaNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

function parseCoordinates(rawStr, fallbackLat, fallbackLng) {
  const parts = String(rawStr || '').split(',');
  const lat = parseFloat((parts[0] || '').trim());
  const lng = parseFloat((parts[1] || '').trim());
  return {
    lat: Number.isFinite(lat) ? lat : fallbackLat,
    lng: Number.isFinite(lng) ? lng : fallbackLng
  };
}

function usePersistentCollection(collectionName, storageKey, initialValue = []) {
  const [items, setItems] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      return cached ? JSON.parse(cached) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const colRef = collection(db, `hachinet_${collectionName}`);
    const unsub = onSnapshot(colRef, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(list);
      try {
        localStorage.setItem(storageKey, JSON.stringify(list));
      } catch {}
    });
    return () => unsub();
  }, [collectionName, storageKey]);

  const saveItem = async (itemObj) => {
    const id = itemObj.id || `${collectionName.toUpperCase()}-${Date.now().toString().slice(-5)}`;
    const payload = { ...itemObj, id };
    setItems((prev) => {
      const exists = prev.some((x) => x.id === id);
      const next = exists ? prev.map((x) => (x.id === id ? payload : x)) : [payload, ...prev];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, `hachinet_${collectionName}`, id), payload, { merge: true });
    }
    return payload;
  };

  const removeItem = async (id) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, `hachinet_${collectionName}`, id));
    }
  };

  return [items, saveItem, removeItem, setItems];
}

const DEFAULT_REMINDERS = [
  { id: 'REM-1', name: 'Akmal', phone: '088212935747', day: 10, note: 'Reminder otomatis bulanan', active: true },
  { id: 'REM-2', name: 'Aldi', phone: '6282112847442', day: 10, note: 'Reminder otomatis bulanan', active: true },
  { id: 'REM-3', name: 'Nurafiansyah', phone: '6289627244450', day: 15, note: 'Reminder otomatis bulanan', active: true },
  { id: 'REM-4', name: 'Zaenal', phone: '+6287839598173', day: 15, note: 'Reminder otomatis bulanan', active: true }
];

const CONTROLLABLE_MENUS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'register', label: 'Register' },
  { key: 'activation', label: 'Aktivasi' },
  { key: 'customers', label: 'Data Pelanggan' },
  { key: 'billing', label: 'Billing' },
  { key: 'tickets', label: 'Tiket' },
  { key: 'history', label: 'Riwayat' },
  { key: 'distributor', label: 'Distribusi ODC/ODP' },
  { key: 'maps', label: 'Maps Jalur ODC/ODP' },
  { key: 'network', label: 'Network' },
  { key: 'mikrotik-control', label: 'MikroTik Control' },
  { key: 'reminder', label: 'Reminder WA' }
];

/* ============================================================================
   BEE LOGO COMPONENT
   ============================================================================ */
function GoldenBeeLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="bee-float" aria-hidden="true">
      <circle cx="11" cy="14" r="2.3" fill="#FDE047" className="bee-sparkle" />
      <circle cx="53" cy="15" r="2.1" fill="#FEF08A" className="bee-sparkle" />
      <ellipse cx="22" cy="21" rx="9.5" ry="5.5" transform="rotate(-24 22 21)" fill="#FEF9C3" fillOpacity="0.92" className="bee-wing-l" />
      <ellipse cx="42" cy="21" rx="9.5" ry="5.5" transform="rotate(24 42 21)" fill="#FEF9C3" fillOpacity="0.92" className="bee-wing-r" />
      <ellipse cx="32" cy="36" rx="12.5" ry="15" fill="#FACC15" />
      <path d="M21.5 31 Q32 35 42.5 31" stroke="#1E1B08" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M20.5 39 Q32 43 43.5 39" stroke="#1E1B08" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M29.5 50.5 L32 57.5 L34.5 50.5 Z" fill="#FDE047" />
      <path d="M27 21.5 L23 14.5 M37 21.5 L41 14.5" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="28" cy="25.5" r="2" fill="#1E1B08" />
      <circle cx="36" cy="25.5" r="2" fill="#1E1B08" />
    </svg>
  );
}

/* ============================================================================
   MAIN HACHINET APPLICATION
   ============================================================================ */
export default function App() {
  // Auth & Theme
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState({ username: 'admin', name: 'HachiNet Root Dev', role: 'Dev' });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [theme, setTheme] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toast, setToast] = useState('');

  // Cloud Firestore / LocalStorage Synced State
  const [activationQueue, saveActivation, removeActivation] = usePersistentCollection('activation_queue', 'hn_act_queue', []);
  const [customers, saveCustomer, removeCustomer] = usePersistentCollection('customers', 'hn_customers', []);
  const [billingItems, saveBilling] = usePersistentCollection('billing', 'hn_billing', []);
  const [tickets, saveTicket] = usePersistentCollection('tickets', 'hn_tickets', []);
  const [historyLogs, saveHistory] = usePersistentCollection('history', 'hn_history', []);
  const [odcList, saveOdc, removeOdc] = usePersistentCollection('odc', 'hn_odc', []);
  const [odpList, saveOdp, removeOdp] = usePersistentCollection('odp', 'hn_odp', []);
  const [customerLinks, saveCustomerLink, removeCustomerLink] = usePersistentCollection('customer_links', 'hn_cust_links', []);
  const [customRoutes, saveCustomRoute, removeCustomRoute] = usePersistentCollection('fiber_routes', 'hn_routes', []);
  const [waReminders, saveReminder, removeReminder] = usePersistentCollection('wa_reminders', 'hn_reminders', DEFAULT_REMINDERS);
  const [customAccounts, saveAccount, removeAccount] = usePersistentCollection('accounts', 'hn_accounts', []);

  // RBAC Permissions
  const [rolePermissions, setRolePermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('hn_rbac');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      Admin: CONTROLLABLE_MENUS.map((m) => m.key),
      Teknisi: ['dashboard', 'register', 'activation', 'customers', 'tickets', 'history', 'distributor', 'maps', 'mikrotik-control'],
      Billing: ['dashboard', 'customers', 'billing', 'history', 'reminder']
    };
  });

  // Sub-selection & Modals
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedActivationId, setSelectedActivationId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [techModal, setTechModal] = useState({ open: false, action: '', param: '' });
  const [operationalCost] = useState(0);

  // Register Form
  const [regForm, setRegForm] = useState({
    name: '', phone: '', nik: '', email: '', pkg: '20 Mbps',
    ip: '', addr: '', coord: '', odp: '', pppoe: '', sn: ''
  });

  // Provisioning Form & Log
  const [provForm, setProvForm] = useState({ pon: 'EPON0/1', onuId: '1', vlan: '101', secret: '' });
  const [provLog, setProvLog] = useState('[HachiNet Provisioning] Siap menjalankan perintah aktivasi OLT Hioso & MikroTik...');

  // WA Gateway State
  const [wagw, setWagw] = useState({
    enabled: false,
    url: '',
    token: '',
    sender: '',
    autoOnPaid: true
  });
  const [wagwLogs, setWagwLogs] = useState(['[WA Gateway] Siap dikonfigurasi untuk pengiriman tagihan HACHI NET WARNASARI.']);

  // Network & MikroTik Control Center
  const [mtkConfig, setMtkConfig] = useState({
    connected: false,
    bridgeUrl: 'http://localhost:3001',
    host: '',
    port: '8728',
    user: '',
    password: '',
    isolirProfile: 'PROFILE-ISOLIR'
  });
  const [mtkData, setMtkData] = useState({
    identity: { identity: '-', version: '-', uptime: '-' },
    summary: { cpuLoad: 0, memory: { percent: 0, used: 0, total: 0 }, ppp: { active: 0, offline: 0, secret: 0, disabled: 0 } },
    pppItems: [],
    interfaces: [],
    tab: 'ppp',
    logs: ['[MikroTik Control] Siap menghubungkan ke backend server.cjs...']
  });

  // Distributor Forms
  const [odcForm, setOdcForm] = useState({ name: '', coord: '', capacity: 48, area: '' });
  const [odpForm, setOdpForm] = useState({ odcId: '', name: '', coord: '', ports: 8, splitter: '1:8' });
  const [linkForm, setLinkForm] = useState({ customerId: '', odpId: '', port: 'Port 1', coord: '' });

  // Interactive Maps State
  const [mapForm, setMapForm] = useState({ type: 'ODC', name: '', parentVal: '', coord: '', targetCoord: '' });
  const [mapLayers, setMapLayers] = useState({ odc: true, odp: true, cust: true, route: true });
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [pickCoordMode, setPickCoordMode] = useState(false);
  const [selectedMapEntity, setSelectedMapEntity] = useState(null);
  const hitNodesRef = useRef([]);

  // Reminder & Developer Forms
  const [remForm, setRemForm] = useState({ name: '', phone: '', day: 10, note: '' });
  const [accForm, setAccForm] = useState({ name: '', username: '', password: '', role: 'Admin' });
  const [hideDevAccounts, setHideDevAccounts] = useState(false);
  const [rbacRole, setRbacRole] = useState('Admin');
  const [ticketForm, setTicketForm] = useState({ customer: '', issue: '' });

  // Canvas Refs
  const trendCanvasRef = useRef(null);
  const donutCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const topoCanvasRef = useRef(null);

  const notify = (msg) => {
    setToast(msg);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const addHistoryLog = async (category, detail) => {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await saveHistory({
      id: `HIS-${Date.now()}`,
      time,
      category,
      detail
    });
  };

  // Theme Effect
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('light');
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
      html.classList.remove('light');
    }
  }, [theme]);

  // Allowed Menus based on Role
  const allowedMenus = useMemo(() => {
    if (String(currentUser.role).toLowerCase() === 'dev') {
      return [...CONTROLLABLE_MENUS.map((m) => m.key), 'developer'];
    }
    return (rolePermissions[currentUser.role] || ['dashboard', 'customers']).filter((k) => k !== 'developer');
  }, [currentUser, rolePermissions]);

  // Dashboard Computed KPIs
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const activePppoe = customers.filter((c) => c.status === 'Aktif').length;
    const isolirCount = customers.filter((c) => c.status === 'Isolir').length;
    const offlineCount = customers.filter((c) => c.status !== 'Aktif' && c.status !== 'Isolir').length;
    const unpaidBills = billingItems.filter((b) => b.status !== 'Lunas').length;
    const paidBills = billingItems.filter((b) => b.status === 'Lunas').length;
    const openTickets = tickets.filter((t) => t.status !== 'Selesai').length;
    const monthlyRevenue = billingItems
      .filter((b) => b.status === 'Lunas')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const totalMbps = customers
      .filter((c) => c.status === 'Aktif')
      .reduce((sum, c) => sum + getPkgMbpsNumber(c.pkg), 0);

    return {
      totalCustomers,
      activePppoe,
      isolirCount,
      offlineCount,
      unpaidBills,
      paidBills,
      openTickets,
      monthlyRevenue,
      totalMbps
    };
  }, [customers, billingItems, tickets]);

  /* ============================================================================
     LOGIN & LOGOUT
     ============================================================================ */
  const handleLogin = (e) => {
    e.preventDefault();
    const u = loginUser.trim();
    const p = loginPass.trim();

    if (u === 'admin' && p === 'admin') {
      setCurrentUser({ username: 'admin', name: 'HachiNet Root Dev', role: 'Dev' });
      setIsAuthenticated(true);
      setLoginError('');
      setCurrentPage('dashboard');
      notify('Masuk sebagai admin (Dev)');
      return;
    }

    const matched = customAccounts.find(
      (a) => a.username.toLowerCase() === u.toLowerCase() && a.password === p
    );
    if (matched) {
      setCurrentUser({ username: matched.username, name: matched.name, role: matched.role });
      setIsAuthenticated(true);
      setLoginError('');
      const userAllowed = rolePermissions[matched.role] || ['dashboard'];
      setCurrentPage(userAllowed.includes('dashboard') ? 'dashboard' : userAllowed[0] || 'dashboard');
      notify(`Masuk sebagai ${matched.username} (${matched.role})`);
      return;
    }

    setLoginError('Username atau password tidak valid.');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginUser('');
    setLoginPass('');
    setSidebarOpen(false);
    notify('Sesi berakhir.');
  };

  /* ============================================================================
     DRAW DASHBOARD ANALYTICAL CHARTS
     ============================================================================ */
  useEffect(() => {
    if (!isAuthenticated || currentPage !== 'dashboard') return;

    const isLight = theme === 'light';
    const pal = {
      grid: isLight ? 'rgba(15, 23, 42, 0.09)' : 'rgba(255, 255, 255, 0.08)',
      text: isLight ? '#475569' : '#94A3B8',
      track: isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.1)',
      surface: isLight ? '#FFFFFF' : '#151824'
    };

    const setupCanvas = (canvas) => {
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(240, rect.width || 420);
      const height = 230;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      return { ctx, width, height };
    };

    // 1. Trend Chart
    const c1 = setupCanvas(trendCanvasRef.current);
    if (c1) {
      const { ctx, width, height } = c1;
      const months = ['Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'];
      const revSeries = [0, 0, 0, 0, 0, stats.monthlyRevenue];
      const trafSeries = [0, 0, 0, 0, 0, stats.totalMbps];
      const maxRev = Math.max(100000, ...revSeries);
      const maxTraf = Math.max(100, ...trafSeries);
      const padL = 42, padR = 20, padT = 20, padB = 32;
      const plotW = width - padL - padR, plotH = height - padT - padB;

      ctx.font = '600 11px sans-serif';
      for (let i = 0; i <= 4; i++) {
        const y = padT + (plotH / 4) * i;
        ctx.strokeStyle = pal.grid;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
        const val = Math.round(maxRev - (maxRev / 4) * i);
        ctx.fillStyle = pal.text; ctx.textAlign = 'right';
        ctx.fillText(val === 0 ? '0' : `${Math.round(val / 1000)}k`, padL - 8, y + 4);
      }

      const stepX = plotW / (months.length - 1);
      ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 2.5; ctx.beginPath();
      months.forEach((m, idx) => {
        const x = padL + idx * stepX;
        const y = padT + plotH - (revSeries[idx] / maxRev) * plotH;
        idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        ctx.fillStyle = pal.text; ctx.textAlign = 'center';
        ctx.fillText(m, x, height - 10);
      });
      ctx.stroke();

      ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2.2; ctx.beginPath();
      months.forEach((_, idx) => {
        const x = padL + idx * stepX;
        const y = padT + plotH - (trafSeries[idx] / maxTraf) * plotH;
        idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 2. Donut Chart
    const c2 = setupCanvas(donutCanvasRef.current);
    if (c2) {
      const { ctx, width, height } = c2;
      const segs = [
        { label: 'Aktif', count: stats.activePppoe, color: '#10B981' },
        { label: 'Isolir', count: stats.isolirCount, color: '#F59E0B' },
        { label: 'Offline', count: stats.offlineCount, color: '#EF4444' },
        { label: 'Antrean', count: activationQueue.length, color: '#8B5CF6' }
      ];
      const total = segs.reduce((a, b) => a + b.count, 0);
      const cx = width * 0.36, cy = height * 0.5;
      const outerR = Math.min(cx - 16, cy - 16, 76), innerR = outerR * 0.62;

      if (total === 0) {
        ctx.strokeStyle = pal.track; ctx.lineWidth = outerR - innerR;
        ctx.beginPath(); ctx.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2); ctx.stroke();
      } else {
        let start = -Math.PI / 2;
        segs.forEach((s) => {
          if (s.count <= 0) return;
          const slice = (s.count / total) * Math.PI * 2;
          ctx.fillStyle = s.color;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, outerR, start, start + slice); ctx.closePath(); ctx.fill();
          start += slice;
        });
        ctx.fillStyle = pal.surface;
        ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = pal.text; ctx.font = '800 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(total), cx, cy + 5);

      const listX = Math.min(width * 0.64, cx + outerR + 18);
      ctx.font = '600 11px sans-serif'; ctx.textAlign = 'left';
      segs.forEach((s, i) => {
        const y = 46 + i * 36;
        ctx.fillStyle = s.color; ctx.fillRect(listX, y - 8, 10, 10);
        ctx.fillStyle = pal.text; ctx.fillText(`${s.label}: ${s.count}`, listX + 16, y);
      });
    }

    // 3. Bar Comparison Chart
    const c3 = setupCanvas(barCanvasRef.current);
    if (c3) {
      const { ctx, width, height } = c3;
      const bars = [
        { label: 'OLT Hioso', val: customers.filter((c) => c.modemSn && c.modemSn !== '-').length, color: '#8B5CF6' },
        { label: 'MikroTik', val: customers.filter((c) => c.pppoeUser && c.pppoeUser !== '-').length, color: '#3B82F6' },
        { label: 'Lunas', val: stats.paidBills, color: '#10B981' },
        { label: 'Belum Bayar', val: stats.unpaidBills, color: '#F59E0B' }
      ];
      const maxV = Math.max(5, ...bars.map((b) => b.val));
      const padL = 34, padR = 16, padT = 22, padB = 34;
      const plotW = width - padL - padR, plotH = height - padT - padB;
      const slotW = plotW / bars.length, barW = Math.min(36, slotW * 0.52);

      ctx.font = '600 11px sans-serif';
      bars.forEach((b, i) => {
        const cx = padL + i * slotW + slotW / 2;
        const bh = (b.val / maxV) * plotH;
        const y = padT + plotH - bh;
        ctx.fillStyle = b.color; ctx.fillRect(cx - barW / 2, y, barW, bh);
        ctx.fillStyle = pal.text; ctx.textAlign = 'center';
        ctx.fillText(String(b.val), cx, Math.max(14, y - 5));
        ctx.fillText(b.label, cx, height - 10);
      });
    }

    // 4. Live Session Chart
    const c4 = setupCanvas(liveCanvasRef.current);
    if (c4) {
      const { ctx, width, height } = c4;
      const rxVal = mtkConfig.connected ? stats.totalMbps : 0;
      const txVal = mtkConfig.connected ? Math.round(stats.totalMbps * 0.35) : 0;
      const rxArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, rxVal];
      const txArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, txVal];
      const maxBw = Math.max(100, ...rxArr, ...txArr);
      const padL = 38, padR = 16, padT = 20, padB = 28;
      const plotW = width - padL - padR, plotH = height - padT - padB;
      const stepX = plotW / (rxArr.length - 1);

      ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2.4; ctx.beginPath();
      rxArr.forEach((v, i) => {
        const x = padL + i * stepX;
        const y = padT + plotH - (v / maxBw) * plotH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 2; ctx.beginPath();
      txArr.forEach((v, i) => {
        const x = padL + i * stepX;
        const y = padT + plotH - (v / maxBw) * plotH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [isAuthenticated, currentPage, theme, stats, activationQueue.length, customers, mtkConfig.connected]);

  /* ============================================================================
     TOPOLOGY MAP CANVAS DRAWING
     ============================================================================ */
  const mapBounds = useMemo(() => {
    const pts = [];
    odcList.forEach((d) => pts.push({ lat: d.lat, lng: d.lng }));
    odpList.forEach((o) => pts.push({ lat: o.lat, lng: o.lng }));
    customerLinks.forEach((l) => pts.push({ lat: l.lat, lng: l.lng }));
    customRoutes.forEach((r) => {
      pts.push({ lat: r.fromLat, lng: r.fromLng });
      pts.push({ lat: r.toLat, lng: r.toLng });
    });
    if (pts.length === 0) {
      return { minLat: -6.628, maxLat: -6.620, minLng: 106.800, maxLng: 106.810 };
    }
    let minLat = pts[0].lat, maxLat = pts[0].lat, minLng = pts[0].lng, maxLng = pts[0].lng;
    pts.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });
    const padLat = Math.max(0.0012, (maxLat - minLat) * 0.25);
    const padLng = Math.max(0.0012, (maxLng - minLng) * 0.25);
    return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng };
  }, [odcList, odpList, customerLinks, customRoutes]);

  useEffect(() => {
    if (!isAuthenticated || currentPage !== 'maps') return;
    const canvas = topoCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(280, rect.width || 620);
    const height = 440;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const isLight = theme === 'light';
    const pal = {
      grid: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.07)',
      text: isLight ? '#475569' : '#94A3B8'
    };

    const geoToPx = (lat, lng) => {
      const pad = 48;
      const spanLat = Math.max(0.002, mapBounds.maxLat - mapBounds.minLat);
      const spanLng = Math.max(0.002, mapBounds.maxLng - mapBounds.minLng);
      const normX = (Number(lng) - mapBounds.minLng) / spanLng;
      const normY = 1 - (Number(lat) - mapBounds.minLat) / spanLat;
      const baseX = pad + normX * Math.max(80, width - pad * 2);
      const baseY = pad + normY * Math.max(80, height - pad * 2);
      const cx = width / 2, cy = height / 2;
      return {
        x: cx + (baseX - cx) * mapZoom + mapPan.x,
        y: cy + (baseY - cy) * mapZoom + mapPan.y
      };
    };

    // Grid
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    const step = 44 * mapZoom;
    for (let gx = (mapPan.x % step + step) % step; gx < width; gx += step) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
    }
    for (let gy = (mapPan.y % step + step) % step; gy < height; gy += step) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
    }

    hitNodesRef.current = [];

    if (odcList.length === 0 && odpList.length === 0 && customerLinks.length === 0 && customRoutes.length === 0) {
      ctx.fillStyle = pal.text;
      ctx.font = '600 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Peta Jalur Kosong — Tambah ODC, ODP, Pelanggan atau Jalur Fiber di atas', width / 2, height / 2);
      return;
    }

    if (mapLayers.route) {
      odpList.forEach((odp) => {
        const parent = odcList.find((d) => d.id === odp.odcId);
        if (!parent) return;
        const p1 = geoToPx(parent.lat, parent.lng);
        const p2 = geoToPx(odp.lat, odp.lng);
        ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      });

      customerLinks.forEach((lk) => {
        const odp = odpList.find((o) => o.id === lk.odpId);
        if (!odp) return;
        const p1 = geoToPx(odp.lat, odp.lng);
        const p2 = geoToPx(lk.lat, lk.lng);
        ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        ctx.setLineDash([]);
      });

      customRoutes.forEach((rt) => {
        const p1 = geoToPx(rt.fromLat, rt.fromLng);
        const p2 = geoToPx(rt.toLat, rt.toLng);
        ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      });
    }

    if (mapLayers.odc) {
      odcList.forEach((odc) => {
        const pt = geoToPx(odc.lat, odc.lng);
        ctx.fillStyle = '#8B5CF6'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = pal.text; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(odc.name, pt.x, pt.y - 14);
        hitNodesRef.current.push({ x: pt.x, y: pt.y, r: 13, title: odc.name, subtitle: `ODC • ${odc.area} • (${odc.lat}, ${odc.lng})` });
      });
    }

    if (mapLayers.odp) {
      odpList.forEach((odp) => {
        const pt = geoToPx(odp.lat, odp.lng);
        ctx.fillStyle = '#06B6D4'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = pal.text; ctx.font = '600 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(odp.name, pt.x, pt.y - 12);
        hitNodesRef.current.push({ x: pt.x, y: pt.y, r: 12, title: odp.name, subtitle: `ODP • ${odp.splitter} • (${odp.lat}, ${odp.lng})` });
      });
    }

    if (mapLayers.cust) {
      customerLinks.forEach((lk) => {
        const pt = geoToPx(lk.lat, lk.lng);
        ctx.fillStyle = '#10B981'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pal.text; ctx.font = '600 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${lk.customerName} (${lk.port})`, pt.x, pt.y + 15);
        hitNodesRef.current.push({ x: pt.x, y: pt.y, r: 11, title: lk.customerName, subtitle: `Pelanggan • ${lk.port} • (${lk.lat}, ${lk.lng})` });
      });
    }
  }, [isAuthenticated, currentPage, theme, odcList, odpList, customerLinks, customRoutes, mapLayers, mapZoom, mapPan, mapBounds]);

  const handleMapCanvasClick = (e) => {
    const canvas = topoCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (pickCoordMode) {
      const pad = 48;
      const cx = rect.width / 2, cy = rect.height / 2;
      const baseX = (px - mapPan.x - cx) / mapZoom + cx;
      const baseY = (py - mapPan.y - cy) / mapZoom + cy;
      const normX = (baseX - pad) / Math.max(80, rect.width - pad * 2);
      const normY = (baseY - pad) / Math.max(80, rect.height - pad * 2);
      const lat = Number((mapBounds.minLat + (1 - normY) * Math.max(0.002, mapBounds.maxLat - mapBounds.minLat)).toFixed(6));
      const lng = Number((mapBounds.minLng + normX * Math.max(0.002, mapBounds.maxLng - mapBounds.minLng)).toFixed(6));
      setMapForm((prev) => ({ ...prev, coord: `${lat}, ${lng}` }));
      notify(`Koordinat terisi: ${lat}, ${lng}`);
      return;
    }

    const hit = hitNodesRef.current.find((n) => Math.hypot(n.x - px, n.y - py) <= n.r);
    if (hit) setSelectedMapEntity(hit);
  };

  /* ============================================================================
     OPERATIONAL HANDLERS
     ============================================================================ */
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const [lat = '-6.625000', lng = '106.805000'] = regForm.coord.split(',').map((s) => s.trim());
    const [odpName = '-', odpPort = 'Port 1'] = regForm.odp.split('•').map((s) => s.trim());
    const item = await saveActivation({
      id: `ACT-${Date.now().toString().slice(-4)}`,
      ...regForm,
      sn: regForm.sn.toUpperCase(),
      lat,
      lng,
      odpName,
      odpPort
    });
    setSelectedActivationId(item.id);
    setRegForm({ name: '', phone: '', nik: '', email: '', pkg: '20 Mbps', ip: '', addr: '', coord: '', odp: '', pppoe: '', sn: '' });
    await addHistoryLog('Register', `Pendaftar baru ${item.name} (${item.pkg}) masuk antrean Aktivasi.`);
    notify(`${item.name} masuk ke menu Aktivasi.`);
    setCurrentPage('activation');
  };

  const activeQueueItem = activationQueue.find((x) => x.id === selectedActivationId) || activationQueue[0] || null;

  const completeActivation = async () => {
    if (!activeQueueItem) {
      notify('Pilih pendaftar dari antrean terlebih dahulu.');
      return;
    }
    const custId = `HCN-${Date.now().toString().slice(-4)}`;
    const matchedOdp = odpList.find((o) => o.name.toLowerCase() === String(activeQueueItem.odpName || '').toLowerCase());
    const parentOdc = matchedOdp ? odcList.find((d) => d.id === matchedOdp.odcId) : null;

    const newCustomer = await saveCustomer({
      id: custId,
      name: activeQueueItem.name,
      phone: activeQueueItem.phone,
      nik: activeQueueItem.nik,
      email: activeQueueItem.email,
      addr: activeQueueItem.addr,
      lat: activeQueueItem.lat,
      lng: activeQueueItem.lng,
      odpName: matchedOdp ? matchedOdp.name : activeQueueItem.odpName,
      odpPort: activeQueueItem.odpPort || 'Port 1',
      odcName: parentOdc ? parentOdc.name : '-',
      odcLat: parentOdc ? String(parentOdc.lat) : '-',
      odcLng: parentOdc ? String(parentOdc.lng) : '-',
      ontTemp: '-',
      rxDbm: '-',
      txDbm: '-',
      pppoeUser: activeQueueItem.pppoe,
      pppoeSecret: provForm.secret || 'pppoe-secret',
      pppoeProfile: `Profile-${activeQueueItem.pkg.replace(/\s+/g, '')}`,
      modemIp: activeQueueItem.ip,
      modemBrand: '-',
      modemSn: activeQueueItem.sn,
      pkg: activeQueueItem.pkg,
      price: formatPriceByPkg(activeQueueItem.pkg),
      status: 'Aktif'
    });

    if (matchedOdp) {
      const coords = parseCoordinates(`${activeQueueItem.lat}, ${activeQueueItem.lng}`, matchedOdp.lat + 0.0005, matchedOdp.lng + 0.0005);
      await saveCustomerLink({
        id: `LINK-${Date.now().toString().slice(-4)}`,
        customerId: custId,
        customerName: activeQueueItem.name,
        odpId: matchedOdp.id,
        port: activeQueueItem.odpPort || 'Port 1',
        lat: coords.lat,
        lng: coords.lng
      });
    }

    await saveBilling({
      id: `INV-${Date.now().toString().slice(-4)}`,
      customerId: custId,
      customerName: newCustomer.name,
      phone: newCustomer.phone,
      pkg: newCustomer.pkg,
      amount: getPkgAmountNumber(newCustomer.pkg),
      status: 'Belum Lunas'
    });

    await removeActivation(activeQueueItem.id);
    await addHistoryLog('Aktivasi', `Aktivasi ${newCustomer.name} (${custId}) selesai.`);
    notify(`${newCustomer.name} berhasil diaktifkan.`);
    setCurrentPage('customers');
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  const executeTechAction = async () => {
    if (!selectedCustomer || !techModal.action) return;
    const updated = { ...selectedCustomer };
    const p = techModal.param.trim();

    if (techModal.action === 'Ganti Modem' && p) {
      updated.modemSn = p.toUpperCase();
    } else if (techModal.action === 'Unconfigure') {
      updated.status = 'Offline';
    } else if (techModal.action === 'Rubah Paket' && ['10 Mbps', '20 Mbps', '30 Mbps', '50 Mbps'].includes(p)) {
      updated.pkg = p;
      updated.price = formatPriceByPkg(p);
      updated.pppoeProfile = `Profile-${p.replace(/\s+/g, '')}`;
    } else if (techModal.action === 'Isolir') {
      updated.status = updated.status === 'Isolir' ? 'Aktif' : 'Isolir';
      updated.pppoeProfile = updated.status === 'Isolir' ? 'Profile-ISOLIR' : `Profile-${updated.pkg.replace(/\s+/g, '')}`;
    }

    await saveCustomer(updated);
    await addHistoryLog(techModal.action, `Aksi ${techModal.action} dijalankan untuk ${updated.name}.`);
    setTechModal({ open: false, action: '', param: '' });
    notify(`Aksi ${techModal.action} selesai.`);
  };

  const markInvoicePaid = async (inv) => {
    await saveBilling({ ...inv, status: 'Lunas' });
    const cust = customers.find((c) => c.id === inv.customerId);
    if (cust && cust.status === 'Isolir') {
      await saveCustomer({ ...cust, status: 'Aktif', pppoeProfile: `Profile-${cust.pkg.replace(/\s+/g, '')}` });
    }
    await addHistoryLog('Billing', `Tagihan ${inv.id} (${inv.customerName}) ditandai LUNAS.`);
    if (wagw.enabled && wagw.autoOnPaid) {
      const num = normalizeWaNumber(inv.phone || cust?.phone);
      setWagwLogs((prev) => [`[${new Date().toLocaleTimeString('id-ID')}] POST ${wagw.url} -> to=${num} | Pembayaran ${inv.id} LUNAS`, ...prev]);
    }
    notify(`Tagihan ${inv.id} ditandai Lunas.`);
  };

  const sendWaInvoice = (inv) => {
    const cust = customers.find((c) => c.id === inv.customerId);
    const num = normalizeWaNumber(inv.phone || cust?.phone);
    if (!num) {
      notify('Nomor WhatsApp pelanggan belum valid.');
      return;
    }
    const nominal = `Rp ${(Number(inv.amount) || 0).toLocaleString('id-ID')}`;
    const msg = inv.status === 'Lunas'
      ? `Konfirmasi LUNAS tagihan ${inv.id} (${inv.pkg}) sebesar ${nominal} a.n ${inv.customerName} — HACHI NET WARNASARI.`
      : `Pengingat tagihan ${inv.id} paket ${inv.pkg} sebesar ${nominal} a.n ${inv.customerName} berstatus BELUM LUNAS — HACHI NET WARNASARI.`;

    setWagwLogs((prev) => [`[${new Date().toLocaleTimeString('id-ID')}] Kirim WA -> ${num} (${inv.customerName}): ${msg}`, ...prev]);
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    notify(`Membuka WhatsApp untuk ${inv.customerName}`);
  };

  // MikroTik Bridge API Caller
  const callMikrotikBridge = async (path, extra = {}) => {
    const base = mtkConfig.bridgeUrl.trim().replace(/\/+$/, '');
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: mtkConfig.host,
        port: Number(mtkConfig.port) || 8728,
        user: mtkConfig.user,
        password: mtkConfig.password,
        ...extra
      })
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  };

  const testMtkConnection = async () => {
    if (!mtkConfig.host || !mtkConfig.user || !mtkConfig.password) {
      notify('Lengkapi Host, Username, dan Password API MikroTik.');
      return;
    }
    try {
      const info = await callMikrotikBridge('/api/mikrotik/test');
      setMtkConfig((prev) => ({ ...prev, connected: true }));
      setMtkData((prev) => ({
        ...prev,
        identity: info,
        logs: [`[${new Date().toLocaleTimeString('id-ID')}] Koneksi SUKSES -> ${info.identity} (${info.version})`, ...prev.logs]
      }));
      notify(`Terhubung ke ${info.identity}`);
    } catch (err) {
      setMtkConfig((prev) => ({ ...prev, connected: false }));
      setMtkData((prev) => ({
        ...prev,
        logs: [`[${new Date().toLocaleTimeString('id-ID')}] GAGAL -> ${err.message}`, ...prev.logs]
      }));
      notify(`Gagal terhubung: ${err.message}`);
    }
  };

  const refreshMtkData = async () => {
    try {
      const [summary, ppp, interfaces] = await Promise.all([
        callMikrotikBridge('/api/mikrotik/summary'),
        callMikrotikBridge('/api/mikrotik/ppp'),
        callMikrotikBridge('/api/mikrotik/interfaces')
      ]);
      setMtkData((prev) => ({
        ...prev,
        summary,
        pppItems: ppp.items || [],
        interfaces: interfaces || [],
        logs: [`[${new Date().toLocaleTimeString('id-ID')}] Data PPP & Interface diperbarui`, ...prev.logs]
      }));
      notify('Data MikroTik diperbarui.');
    } catch (err) {
      notify(`Gagal refresh: ${err.message}`);
    }
  };

  /* ============================================================================
     RENDER: LOGIN SCREEN
     ============================================================================ */
  if (!isAuthenticated) {
    return (
      <div className="login-screen" role="dialog" aria-modal="true">
        <div className="login-glass-box">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <GoldenBeeLogo size={56} />
            <h1 className="gold-title">HachiNet</h1>
            <p className="gold-subtitle">HACHI NET WARNASARI</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#E2E8F0' }}>Username</label>
              <input
                type="text"
                required
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Masukkan username"
                style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.35)', background: '#E2E8F0', color: '#0F172A', fontSize: 13, fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#E2E8F0' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="Masukkan password"
                  style={{ width: '100%', padding: '11px 40px 11px 13px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.35)', background: '#E2E8F0', color: '#0F172A', fontSize: 13, fontWeight: 600 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: '#334155', cursor: 'pointer' }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(248,113,113,0.45)', color: '#FECACA', fontSize: 12, fontWeight: 600 }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(90deg, #2563EB, #3B82F6)', color: '#FFFFFF', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 24px rgba(37,99,235,0.45)' }}
            >
              Masuk Sistem
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ============================================================================
     RENDER: MAIN APPLICATION SHELL
     ============================================================================ */
  const menuItems = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'register', label: '📝 Register' },
    { key: 'activation', label: '⚡ Aktivasi', pill: activationQueue.length },
    { key: 'customers', label: '👥 Data Pelanggan', pill: customers.length },
    { key: 'billing', label: '💳 Billing', pill: stats.unpaidBills },
    { key: 'tickets', label: '🎫 Tiket', pill: stats.openTickets },
    { key: 'history', label: '🕒 Riwayat' },
    { key: 'distributor', label: '🔀 Distribusi ODC/ODP', pill: `${odcList.length}/${odpList.length}` },
    { key: 'maps', label: '🗺️ Maps Jalur ODC/ODP', pill: `${odpList.length + customerLinks.length + customRoutes.length} Jalur` },
    { key: 'network', label: '🌐 Network', pill: mtkConfig.connected ? 'ONLINE' : 'OFFLINE' },
    { key: 'mikrotik-control', label: '🎛️ MikroTik Control', pill: 'API' },
    { key: 'reminder', label: '📲 Reminder WA', pill: waReminders.length },
    { key: 'developer', label: '🛠️ Developer', pill: 'RBAC' }
  ];

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ overflowY: 'auto', paddingBottom: 12 }}>
          <div style={{ height: 68, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="bee-emblem-badge"><GoldenBeeLogo size={28} /></span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1 }}>HachiNet</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: 0.5 }}>HACHI NET WARNASARI</div>
              </div>
            </div>
            <button type="button" className="btn btn-ghost mobile-only-btn" onClick={() => setSidebarOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <nav style={{ padding: '12px 10px' }}>
            {menuItems
              .filter((m) => allowedMenus.includes(m.key))
              .map((m) => {
                const isActive = currentPage === m.key || (currentPage === 'view-pelanggan' && m.key === 'customers');
                return (
                  <button
                    key={m.key}
                    type="button"
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentPage(m.key);
                      setSidebarOpen(false);
                    }}
                  >
                    <span>{m.label}</span>
                    {m.pill !== undefined && <span className="nav-pill">{m.pill}</span>}
                  </button>
                );
              })}
          </nav>
        </div>

        {/* THEME SWITCHER */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800 }}>Mode Tampilan</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {theme === 'light' ? 'Siang (Light)' : 'Malam (Dark)'}
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <><Sun size={14} /> Siang</> : <><Moon size={14} /> Malam</>}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div className="main-area">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="btn btn-ghost mobile-only-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={16} />
            </button>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'capitalize' }}>
                {currentPage.replace('-', ' ')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>HACHI NET WARNASARI •</span>
                {isFirebaseConfigured ? (
                  <span style={{ color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Cloud size={12} /> Cloud Firestore Aktif
                  </span>
                ) : (
                  <span style={{ color: 'var(--accent-amber)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <CloudOff size={12} /> Mode Lokal (Isi .env Firebase)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>{currentUser.username}</div>
              <div style={{ fontSize: 10, color: 'var(--accent-gold)', fontWeight: 700 }}>{currentUser.role}</div>
            </div>
            <button type="button" className="btn btn-danger" onClick={handleLogout}>
              <LogOut size={14} /> Keluar
            </button>
          </div>
        </header>

        <main className="content-container">
          {/* A. DASHBOARD */}
          {currentPage === 'dashboard' && (
            <>
              <div className="grid-6" style={{ marginBottom: 16 }}>
                <div className="card" style={{ padding: 15 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Total Pelanggan</div>
                  <div style={{ fontSize: 20, fontWeight: 900, margin: '5px 0' }}>{stats.totalCustomers}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Terdaftar di sistem</div>
                </div>
                <div className="card" style={{ padding: 15 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>PPPoE / User Aktif</div>
                  <div style={{ fontSize: 20, fontWeight: 900, margin: '5px 0', color: 'var(--accent-emerald)' }}>{stats.activePppoe}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{mtkConfig.connected ? `Terhubung (${mtkConfig.host})` : 'Belum Terhubung'}</div>
                </div>
                <div className="card" style={{ padding: 15 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Tagihan Belum Bayar</div>
                  <div style={{ fontSize: 20, fontWeight: 900, margin: '5px 0', color: 'var(--accent-amber)' }}>{stats.unpaidBills}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Menunggu pembayaran</div>
                </div>
                <div className="card" style={{ padding: 15 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Tiket Gangguan</div>
                  <div style={{ fontSize: 20, fontWeight: 900, margin: '5px 0', color: 'var(--accent-rose)' }}>{stats.openTickets}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Antrean teknisi</div>
                </div>
                <div className="card" style={{ padding: 15 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Pendapatan Bulan Ini</div>
                  <div style={{ fontSize: 19, fontWeight: 900, margin: '5px 0', color: 'var(--accent-blue)' }}>
                    Rp {stats.monthlyRevenue.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tagihan lunas</div>
                </div>
                <div className="card" style={{ padding: 15 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Beban Operasional</div>
                  <div style={{ fontSize: 19, fontWeight: 900, margin: '5px 0', color: 'var(--accent-purple)' }}>
                    Rp {operationalCost.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Upstream & pemeliharaan</div>
                </div>
              </div>

              <div className="dash-analytics-grid" style={{ marginBottom: 16 }}>
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>Grafik Tren Trafik & Pendapatan Bulanan</h3>
                  <canvas ref={trendCanvasRef} className="chart-canvas" />
                </div>
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>Distribusi Status Pelanggan</h3>
                  <canvas ref={donutCanvasRef} className="chart-canvas" />
                </div>
              </div>

              <div className="grid-2">
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>Provisioning OLT Hioso vs MikroTik & Billing</h3>
                  <canvas ref={barCanvasRef} className="chart-canvas" />
                </div>
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>Pantauan Trafik Real-Time</h3>
                  <canvas ref={liveCanvasRef} className="chart-canvas" />
                </div>
              </div>
            </>
          )}

          {/* B. REGISTER */}
          {currentPage === 'register' && (
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900 }}>Registrasi Pelanggan Baru</h2>
              <form onSubmit={handleRegisterSubmit} className="grid-2" style={{ gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Nama Lengkap</label>
                  <input required className="input-field" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Nomor Telepon / WA</label>
                  <input required className="input-field" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>NIK KTP</label>
                  <input required className="input-field" value={regForm.nik} onChange={(e) => setRegForm({ ...regForm, nik: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Email</label>
                  <input type="email" required className="input-field" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Paket Layanan</label>
                  <select className="select-field" value={regForm.pkg} onChange={(e) => setRegForm({ ...regForm, pkg: e.target.value })}>
                    <option value="10 Mbps">10 Mbps — Rp 110.000</option>
                    <option value="20 Mbps">20 Mbps — Rp 150.000</option>
                    <option value="30 Mbps">30 Mbps — Rp 200.000</option>
                    <option value="50 Mbps">50 Mbps — Rp 300.000</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>IP Modem Target</label>
                  <input required className="input-field" value={regForm.ip} onChange={(e) => setRegForm({ ...regForm, ip: e.target.value })} placeholder="192.168.10.2" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Alamat Lengkap</label>
                  <input required className="input-field" value={regForm.addr} onChange={(e) => setRegForm({ ...regForm, addr: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Tikor Rumah (Lat, Lng)</label>
                  <input required className="input-field" value={regForm.coord} onChange={(e) => setRegForm({ ...regForm, coord: e.target.value })} placeholder="-6.625000, 106.805000" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>ODP & Port</label>
                  <input required className="input-field" value={regForm.odp} onChange={(e) => setRegForm({ ...regForm, odp: e.target.value })} placeholder="ODP-WNS-01 • Port 1" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>PPPoE Username</label>
                  <input required className="input-field" value={regForm.pppoe} onChange={(e) => setRegForm({ ...regForm, pppoe: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Serial Number ONT</label>
                  <input required className="input-field" value={regForm.sn} onChange={(e) => setRegForm({ ...regForm, sn: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-success">Kirim ke Menu Aktivasi</button>
                </div>
              </form>
            </div>
          )}

          {/* C. AKTIVASI */}
          {currentPage === 'activation' && (
            <div className="grid-2">
              <div className="card" style={{ padding: 18 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 900 }}>Antrean Aktivasi OLT Hioso & MikroTik</h2>
                {activationQueue.length === 0 ? (
                  <div style={{ padding: 18, borderRadius: 12, border: '1px dashed var(--border-color)', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                    Belum ada antrean aktivasi.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {activationQueue.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedActivationId(item.id)}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          cursor: 'pointer',
                          border: `1px solid ${activeQueueItem?.id === item.id ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                          background: activeQueueItem?.id === item.id ? 'rgba(59,130,246,0.1)' : 'var(--bg-surface-2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{item.name}</strong>
                          <span className="status-badge badge-isolir">{item.pkg}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                          SN: {item.sn} • PPPoE: {item.pppoe} • IP: {item.ip}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: 18 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Provisioning OLT & MikroTik</h3>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {activeQueueItem ? `${activeQueueItem.name} — SN ${activeQueueItem.sn}` : 'Belum ada pendaftar dipilih'}
                </p>
                <div className="grid-2" style={{ gap: 10, marginBottom: 12 }}>
                  <select className="select-field" value={provForm.pon} onChange={(e) => setProvForm({ ...provForm, pon: e.target.value })}>
                    <option value="EPON0/1">EPON0/1</option>
                    <option value="EPON0/2">EPON0/2</option>
                    <option value="GPON0/1">GPON0/1</option>
                  </select>
                  <input className="input-field" value={provForm.onuId} onChange={(e) => setProvForm({ ...provForm, onuId: e.target.value })} placeholder="ONU ID" />
                  <input className="input-field" value={provForm.vlan} onChange={(e) => setProvForm({ ...provForm, vlan: e.target.value })} placeholder="VLAN ID" />
                  <input className="input-field" value={provForm.secret} onChange={(e) => setProvForm({ ...provForm, secret: e.target.value })} placeholder="PPPoE Secret" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  <button
                    type="button"
                    className="btn btn-purple"
                    onClick={() => activeQueueItem && setProvLog((p) => `${p}\n[OLT Hioso] Auth SN ${activeQueueItem.sn} pada ${provForm.pon} VLAN ${provForm.vlan}.`)}
                  >
                    1. Auth OLT
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => activeQueueItem && setProvLog((p) => `${p}\n[MikroTik] PPP Secret ${activeQueueItem.pppoe} disiapkan.`)}
                  >
                    2. PPP Secret
                  </button>
                  <button type="button" className="btn btn-success" onClick={completeActivation}>
                    3. Aktifkan Pelanggan
                  </button>
                </div>
                <pre style={{ margin: 0, padding: 12, borderRadius: 12, background: '#090C14', color: '#34D399', fontFamily: 'monospace', fontSize: 11, height: 140, overflowY: 'auto' }}>
                  {provLog}
                </pre>
              </div>
            </div>
          )}

          {/* D. DATA PELANGGAN */}
          {currentPage === 'customers' && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Data Pelanggan</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>Klik baris pelanggan untuk membuka View Pelanggan</p>
                </div>
                <input
                  className="input-field"
                  style={{ maxWidth: 260 }}
                  placeholder="Cari nama, PPPoE, IP..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pelanggan</th>
                      <th>Paket</th>
                      <th>IP Modem & PPPoE</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter((c) => {
                        const q = customerSearch.toLowerCase();
                        return !q || c.name?.toLowerCase().includes(q) || c.pppoeUser?.toLowerCase().includes(q) || c.modemIp?.includes(q);
                      })
                      .map((c) => (
                        <tr
                          key={c.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCurrentPage('view-pelanggan');
                          }}
                        >
                          <td>
                            <div style={{ fontWeight: 800 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.id} • {c.phone}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{c.pkg}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.price}</div>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>
                            <div>{c.modemIp}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.pppoeUser}</div>
                          </td>
                          <td>
                            <span className={`status-badge ${c.status === 'Aktif' ? 'badge-active' : c.status === 'Isolir' ? 'badge-isolir' : 'badge-offline'}`}>
                              ● {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* E. VIEW PELANGGAN */}
          {currentPage === 'view-pelanggan' && selectedCustomer && (
            <>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setCurrentPage('customers')}>← Kembali</button>
                <span className="status-badge badge-neutral">#{selectedCustomer.id}</span>
              </div>

              <div className="card" style={{ padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8 }}>AKSI TEKNIS PELANGGAN</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" className="btn btn-purple" onClick={() => setTechModal({ open: true, action: 'Ganti Modem', param: selectedCustomer.modemSn })}>🔄 Ganti Modem</button>
                  <button type="button" className="btn btn-cyan" onClick={() => setTechModal({ open: true, action: 'Reboot', param: '' })}>⚡ Reboot</button>
                  <button type="button" className="btn btn-danger" onClick={() => setTechModal({ open: true, action: 'Unconfigure', param: '' })}>🧹 Unconfigure</button>
                  <button type="button" className="btn btn-primary" onClick={() => setTechModal({ open: true, action: 'Rubah Paket', param: selectedCustomer.pkg })}>📦 Rubah Paket</button>
                  <button type="button" className="btn btn-warning" onClick={() => setTechModal({ open: true, action: 'Isolir', param: '' })}>🔒 Isolir</button>
                </div>
              </div>

              <div className="grid-2">
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>1. Identitas Pelanggan</h3>
                  <table><tbody>
                    <tr><td>Nama</td><td><strong>{selectedCustomer.name}</strong></td></tr>
                    <tr><td>Telepon</td><td>{selectedCustomer.phone}</td></tr>
                    <tr><td>NIK</td><td>{selectedCustomer.nik}</td></tr>
                    <tr><td>Alamat</td><td>{selectedCustomer.addr}</td></tr>
                  </tbody></table>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>2. ODP, ODC & Koordinat</h3>
                  <table><tbody>
                    <tr><td>ODP / Port</td><td><strong>{selectedCustomer.odpName}</strong> ({selectedCustomer.odpPort})</td></tr>
                    <tr><td>ODC Induk</td><td>{selectedCustomer.odcName}</td></tr>
                    <tr><td>Tikor Rumah</td><td>{selectedCustomer.lat}, {selectedCustomer.lng}</td></tr>
                  </tbody></table>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>3. PPPoE & Modem</h3>
                  <table><tbody>
                    <tr><td>PPPoE User</td><td><strong>{selectedCustomer.pppoeUser}</strong></td></tr>
                    <tr><td>Profile</td><td>{selectedCustomer.pppoeProfile}</td></tr>
                    <tr><td>IP Modem</td><td>{selectedCustomer.modemIp}</td></tr>
                    <tr><td>SN ONT</td><td>{selectedCustomer.modemSn}</td></tr>
                  </tbody></table>
                </div>
              </div>
            </>
          )}

          {/* F. BILLING + WA GATEWAY */}
          {currentPage === 'billing' && (
            <>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800 }}>📲 Konfigurasi WA Gateway Billing</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input className="input-field" placeholder="Endpoint URL WA Gateway" value={wagw.url} onChange={(e) => setWagw({ ...wagw, url: e.target.value })} />
                    <div className="grid-2" style={{ gap: 10 }}>
                      <input type="password" className="input-field" placeholder="API Token" value={wagw.token} onChange={(e) => setWagw({ ...wagw, token: e.target.value })} />
                      <input className="input-field" placeholder="Sender No. WA" value={wagw.sender} onChange={(e) => setWagw({ ...wagw, sender: e.target.value })} />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={() => { setWagw({ ...wagw, enabled: Boolean(wagw.url) }); notify('Konfigurasi WA Gateway disimpan.'); }}>
                      Simpan Konfigurasi WA Gateway
                    </button>
                  </div>
                </div>
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800 }}>Log Pengiriman WA</h3>
                  <pre style={{ margin: 0, padding: 12, borderRadius: 12, background: '#090C14', color: '#67E8F9', fontFamily: 'monospace', fontSize: 11, height: 140, overflowY: 'auto' }}>
                    {wagwLogs.join('\n')}
                  </pre>
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900 }}>Billing & Tagihan Pelanggan</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID Tagihan</th>
                        <th>Pelanggan</th>
                        <th>Paket</th>
                        <th>Nominal</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingItems.map((b) => (
                        <tr key={b.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.id}</td>
                          <td><strong>{b.customerName}</strong></td>
                          <td>{b.pkg}</td>
                          <td><strong>Rp {(Number(b.amount) || 0).toLocaleString('id-ID')}</strong></td>
                          <td><span className={`status-badge ${b.status === 'Lunas' ? 'badge-active' : 'badge-isolir'}`}>{b.status}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {b.status !== 'Lunas' && (
                                <button type="button" className="btn btn-success" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => markInvoicePaid(b)}>
                                  Tandai Lunas
                                </button>
                              )}
                              <button type="button" className="btn btn-cyan" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => sendWaInvoice(b)}>
                                Kirim WA
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* G. TIKET */}
          {currentPage === 'tickets' && (
            <div className="card" style={{ padding: 18 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900 }}>Tiket Gangguan</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const code = `TKT-${Date.now().toString().slice(-4)}`;
                  await saveTicket({ id: code, code, customer: ticketForm.customer, issue: ticketForm.issue, status: 'Terbuka' });
                  setTicketForm({ customer: '', issue: '' });
                  notify(`Tiket ${code} dibuat.`);
                }}
                className="grid-3"
                style={{ gap: 10, marginBottom: 16 }}
              >
                <input required className="input-field" placeholder="Nama pelanggan" value={ticketForm.customer} onChange={(e) => setTicketForm({ ...ticketForm, customer: e.target.value })} />
                <input required className="input-field" placeholder="Kendala (LOS / Redaman)" value={ticketForm.issue} onChange={(e) => setTicketForm({ ...ticketForm, issue: e.target.value })} />
                <button type="submit" className="btn btn-primary">+ Buat Tiket</button>
              </form>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Kode</th><th>Pelanggan</th><th>Kendala</th><th>Status</th></tr></thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontFamily: 'monospace' }}>{t.code}</td>
                        <td><strong>{t.customer}</strong></td>
                        <td>{t.issue}</td>
                        <td><span className="status-badge badge-offline">{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* H. RIWAYAT */}
          {currentPage === 'history' && (
            <div className="card" style={{ padding: 18 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900 }}>Riwayat Aktivitas</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Waktu</th><th>Kategori</th><th>Keterangan</th></tr></thead>
                  <tbody>
                    {historyLogs.map((h) => (
                      <tr key={h.id}>
                        <td style={{ fontFamily: 'monospace' }}>{h.time}</td>
                        <td><span className="status-badge badge-neutral">{h.category}</span></td>
                        <td>{h.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* I. DISTRIBUSI ODC/ODP */}
          {currentPage === 'distributor' && (
            <>
              <div className="grid-3" style={{ marginBottom: 16 }}>
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>1. Tambah ODC</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const c = parseCoordinates(odcForm.coord, -6.6235, 106.8025);
                      await saveOdc({ id: `ODC-${Date.now().toString().slice(-4)}`, name: odcForm.name, lat: c.lat, lng: c.lng, capacity: odcForm.capacity, area: odcForm.area || 'Warnasari' });
                      setOdcForm({ name: '', coord: '', capacity: 48, area: '' });
                      notify('ODC ditambahkan.');
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <input required className="input-field" placeholder="Nama ODC (ODC-WNS-01)" value={odcForm.name} onChange={(e) => setOdcForm({ ...odcForm, name: e.target.value })} />
                    <input required className="input-field" placeholder="Koordinat (-6.6235, 106.8025)" value={odcForm.coord} onChange={(e) => setOdcForm({ ...odcForm, coord: e.target.value })} />
                    <input className="input-field" placeholder="Area" value={odcForm.area} onChange={(e) => setOdcForm({ ...odcForm, area: e.target.value })} />
                    <button type="submit" className="btn btn-purple">+ Simpan ODC</button>
                  </form>
                </div>

                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>2. Tambah ODP</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const parent = odcList.find((d) => d.id === odpForm.odcId) || odcList[0];
                      if (!parent) return notify('Buat ODC induk dulu.');
                      const c = parseCoordinates(odpForm.coord, parent.lat - 0.0008, parent.lng + 0.001);
                      await saveOdp({ id: `ODP-${Date.now().toString().slice(-4)}`, odcId: parent.id, name: odpForm.name, lat: c.lat, lng: c.lng, ports: odpForm.ports, splitter: odpForm.splitter });
                      setOdpForm({ odcId: parent.id, name: '', coord: '', ports: 8, splitter: '1:8' });
                      notify('ODP ditambahkan.');
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <select className="select-field" value={odpForm.odcId} onChange={(e) => setOdpForm({ ...odpForm, odcId: e.target.value })}>
                      {odcList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <input required className="input-field" placeholder="Nama ODP (ODP-WNS-01A)" value={odpForm.name} onChange={(e) => setOdpForm({ ...odpForm, name: e.target.value })} />
                    <input required className="input-field" placeholder="Koordinat ODP" value={odpForm.coord} onChange={(e) => setOdpForm({ ...odpForm, coord: e.target.value })} />
                    <button type="submit" className="btn btn-cyan">+ Simpan ODP</button>
                  </form>
                </div>

                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>3. Hubungkan Pelanggan ke ODP</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const cust = customers.find((c) => c.id === linkForm.customerId) || customers[0];
                      const odp = odpList.find((o) => o.id === linkForm.odpId) || odpList[0];
                      if (!cust || !odp) return notify('Pilih pelanggan & ODP.');
                      const c = parseCoordinates(linkForm.coord, odp.lat - 0.0005, odp.lng + 0.0006);
                      await saveCustomerLink({ id: `LINK-${cust.id}`, customerId: cust.id, customerName: cust.name, odpId: odp.id, port: linkForm.port, lat: c.lat, lng: c.lng });
                      notify(`${cust.name} terhubung ke ${odp.name}`);
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <select className="select-field" value={linkForm.customerId} onChange={(e) => setLinkForm({ ...linkForm, customerId: e.target.value })}>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="select-field" value={linkForm.odpId} onChange={(e) => setLinkForm({ ...linkForm, odpId: e.target.value })}>
                      {odpList.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <input className="input-field" placeholder="Port (Port 1)" value={linkForm.port} onChange={(e) => setLinkForm({ ...linkForm, port: e.target.value })} />
                    <button type="submit" className="btn btn-success">🔗 Hubungkan</button>
                  </form>
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Topologi Terhubung (ODC → ODP → Pelanggan)</h2>
                {odcList.map((odc) => (
                  <div key={odc.id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 10 }}>
                    <strong>{odc.name}</strong> <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({odc.lat}, {odc.lng})</span>
                    <div className="grid-2" style={{ marginTop: 10 }}>
                      {odpList.filter((o) => o.odcId === odc.id).map((odp) => (
                        <div key={odp.id} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-surface-2)' }}>
                          <strong>{odp.name}</strong> ({odp.splitter})
                          {customerLinks.filter((l) => l.odpId === odp.id).map((lk) => (
                            <div key={lk.id} style={{ fontSize: 11, marginTop: 4 }}>
                              ● {lk.port}: <strong>{lk.customerName}</strong>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* J. MAPS JALUR */}
          {currentPage === 'maps' && (
            <>
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>Maps Jalur ODC / ODP & Pelanggan</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className={`btn ${pickCoordMode ? 'btn-warning' : 'btn-ghost'}`} onClick={() => setPickCoordMode(!pickCoordMode)}>
                      📍 Klik Peta: {pickCoordMode ? 'ON' : 'OFF'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setMapZoom((z) => Math.min(2.5, z * 1.15))}>+</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setMapZoom((z) => Math.max(0.65, z * 0.87))}>-</button>
                  </div>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const c = parseCoordinates(mapForm.coord, -6.6245, 106.804);
                    if (mapForm.type === 'ODC') {
                      await saveOdc({ id: `ODC-${Date.now().toString().slice(-4)}`, name: mapForm.name, lat: c.lat, lng: c.lng, capacity: 48, area: 'Maps' });
                    } else if (mapForm.type === 'ODP') {
                      const odcId = odcList[0]?.id || 'ODC-DEFAULT';
                      await saveOdp({ id: `ODP-${Date.now().toString().slice(-4)}`, odcId, name: mapForm.name, lat: c.lat, lng: c.lng, ports: 8, splitter: '1:8' });
                    } else {
                      const tc = parseCoordinates(mapForm.targetCoord, c.lat - 0.0008, c.lng + 0.0012);
                      await saveCustomRoute({ id: `RT-${Date.now().toString().slice(-4)}`, name: mapForm.name, fromLat: c.lat, fromLng: c.lng, toLat: tc.lat, toLng: tc.lng });
                    }
                    setMapForm({ type: 'ODC', name: '', parentVal: '', coord: '', targetCoord: '' });
                    notify('Titik / Jalur ditambahkan ke peta.');
                  }}
                  className="grid-4"
                  style={{ gap: 10 }}
                >
                  <select className="select-field" value={mapForm.type} onChange={(e) => setMapForm({ ...mapForm, type: e.target.value })}>
                    <option value="ODC">Titik ODC</option>
                    <option value="ODP">Titik ODP</option>
                    <option value="Jalur">Jalur Fiber</option>
                  </select>
                  <input required className="input-field" placeholder="Nama Titik / Jalur" value={mapForm.name} onChange={(e) => setMapForm({ ...mapForm, name: e.target.value })} />
                  <input required className="input-field" placeholder="Koordinat (Lat, Lng)" value={mapForm.coord} onChange={(e) => setMapForm({ ...mapForm, coord: e.target.value })} />
                  <button type="submit" className="btn btn-primary">+ Tambah ke Peta</button>
                </form>
              </div>

              <div className="maps-workspace-grid">
                <div className="card" style={{ padding: 16 }}>
                  <canvas ref={topoCanvasRef} className="topo-map-canvas" onClick={handleMapCanvasClick} />
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Detail Node Terpilih</h3>
                  <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-surface-2)', fontSize: 12 }}>
                    {selectedMapEntity ? (
                      <>
                        <strong>{selectedMapEntity.title}</strong>
                        <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{selectedMapEntity.subtitle}</div>
                      </>
                    ) : 'Klik salah satu titik di peta untuk melihat detail.'}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* K. NETWORK & MIKROTIK CONTROL */}
          {(currentPage === 'network' || currentPage === 'mikrotik-control') && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>MikroTik RouterOS & Control Center</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>Terhubung via backend bridge Node.js (server.cjs)</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`status-badge ${mtkConfig.connected ? 'badge-active' : 'badge-offline'}`}>
                    {mtkConfig.connected ? 'Terhubung' : 'Belum Terhubung'}
                  </span>
                  <button type="button" className="btn btn-cyan" onClick={testMtkConnection}>🔌 Tes Koneksi</button>
                  <button type="button" className="btn btn-primary" onClick={refreshMtkData}>🔄 Refresh Data</button>
                </div>
              </div>

              <div className="grid-4" style={{ gap: 10, marginBottom: 16 }}>
                <input className="input-field" placeholder="Bridge URL (http://localhost:3001)" value={mtkConfig.bridgeUrl} onChange={(e) => setMtkConfig({ ...mtkConfig, bridgeUrl: e.target.value })} />
                <input className="input-field" placeholder="Host / IP MikroTik" value={mtkConfig.host} onChange={(e) => setMtkConfig({ ...mtkConfig, host: e.target.value })} />
                <input className="input-field" placeholder="User API" value={mtkConfig.user} onChange={(e) => setMtkConfig({ ...mtkConfig, user: e.target.value })} />
                <input type="password" className="input-field" placeholder="Password API" value={mtkConfig.password} onChange={(e) => setMtkConfig({ ...mtkConfig, password: e.target.value })} />
              </div>

              <div className="grid-4" style={{ gap: 12, marginBottom: 14 }}>
                <div className="card" style={{ padding: 12, background: 'var(--bg-surface-2)' }}>
                  <div style={{ fontSize: 11 }}>PPP Aktif</div>
                  <strong style={{ fontSize: 18, color: 'var(--accent-emerald)' }}>{mtkData.summary.ppp?.active || 0}</strong>
                </div>
                <div className="card" style={{ padding: 12, background: 'var(--bg-surface-2)' }}>
                  <div style={{ fontSize: 11 }}>PPP Offline</div>
                  <strong style={{ fontSize: 18, color: 'var(--accent-rose)' }}>{mtkData.summary.ppp?.offline || 0}</strong>
                </div>
                <div className="card" style={{ padding: 12, background: 'var(--bg-surface-2)' }}>
                  <div style={{ fontSize: 11 }}>PPP Secret</div>
                  <strong style={{ fontSize: 18, color: 'var(--accent-blue)' }}>{mtkData.summary.ppp?.secret || 0}</strong>
                </div>
                <div className="card" style={{ padding: 12, background: 'var(--bg-surface-2)' }}>
                  <div style={{ fontSize: 11 }}>CPU Load</div>
                  <strong style={{ fontSize: 18, color: 'var(--accent-cyan)' }}>{mtkData.summary.cpuLoad || 0}%</strong>
                </div>
              </div>

              <pre style={{ margin: 0, padding: 12, borderRadius: 12, background: '#090C14', color: '#34D399', fontFamily: 'monospace', fontSize: 11, height: 150, overflowY: 'auto' }}>
                {mtkData.logs.join('\n')}
              </pre>
            </div>
          )}

          {/* L. REMINDER WA */}
          {currentPage === 'reminder' && (
            <div className="card" style={{ padding: 18 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900 }}>Reminder WA Otomatis Bulanan</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveReminder({
                    id: `REM-${Date.now().toString().slice(-4)}`,
                    name: remForm.name,
                    phone: remForm.phone,
                    day: Number(remForm.day) || 10,
                    note: remForm.note || 'Reminder bulanan',
                    active: true
                  });
                  setRemForm({ name: '', phone: '', day: 10, note: '' });
                  notify('Reminder WA ditambahkan.');
                }}
                className="grid-4"
                style={{ gap: 10, marginBottom: 16 }}
              >
                <input required className="input-field" placeholder="Nama Penerima" value={remForm.name} onChange={(e) => setRemForm({ ...remForm, name: e.target.value })} />
                <input required className="input-field" placeholder="Nomor WA" value={remForm.phone} onChange={(e) => setRemForm({ ...remForm, phone: e.target.value })} />
                <input type="number" min="1" max="31" required className="input-field" value={remForm.day} onChange={(e) => setRemForm({ ...remForm, day: e.target.value })} />
                <button type="submit" className="btn btn-success">+ Tambah Reminder</button>
              </form>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nama</th><th>Nomor WA</th><th>Tanggal</th><th>Catatan</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {waReminders.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong></td>
                        <td style={{ fontFamily: 'monospace' }}>{r.phone}</td>
                        <td><span className="status-badge badge-neutral">Tanggal {r.day}</span></td>
                        <td>{r.note}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-success"
                              style={{ padding: '5px 10px', fontSize: 11 }}
                              onClick={() => {
                                const num = normalizeWaNumber(r.phone);
                                const txt = encodeURIComponent(`Halo ${r.name}, pengingat otomatis HACHI NET WARNASARI tanggal ${r.day}: ${r.note}`);
                                window.open(`https://wa.me/${num}?text=${txt}`, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              Kirim WA
                            </button>
                            <button type="button" className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => removeReminder(r.id)}>
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* M. DEVELOPER & RBAC */}
          {currentPage === 'developer' && (
            <>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Buat Akun Pengguna</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await saveAccount({ id: `ACC-${Date.now().toString().slice(-4)}`, ...accForm });
                      setAccForm({ name: '', username: '', password: '', role: 'Admin' });
                      notify('Akun baru dibuat.');
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <input required className="input-field" placeholder="Nama Lengkap" value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} />
                    <input required className="input-field" placeholder="Username" value={accForm.username} onChange={(e) => setAccForm({ ...accForm, username: e.target.value })} />
                    <input required type="password" className="input-field" placeholder="Password" value={accForm.password} onChange={(e) => setAccForm({ ...accForm, password: e.target.value })} />
                    <select className="select-field" value={accForm.role} onChange={(e) => setAccForm({ ...accForm, role: e.target.value })}>
                      <option value="Admin">Admin</option>
                      <option value="Teknisi">Teknisi</option>
                      <option value="Billing">Billing</option>
                      <option value="Dev">Dev</option>
                    </select>
                    <button type="submit" className="btn btn-primary">+ Buat Akun</button>
                  </form>
                </div>

                <div className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>Daftar Akun</h3>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={hideDevAccounts} onChange={(e) => setHideDevAccounts(e.target.checked)} />
                      Sembunyikan Akun Dev
                    </label>
                  </div>
                  <table>
                    <thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {!hideDevAccounts && (
                        <tr><td><strong>HachiNet Root Dev</strong></td><td>admin</td><td><span className="status-badge badge-isolir">Dev</span></td><td>Akun Utama</td></tr>
                      )}
                      {customAccounts
                        .filter((a) => !hideDevAccounts || a.role !== 'Dev')
                        .map((a) => (
                          <tr key={a.id}>
                            <td><strong>{a.name}</strong></td>
                            <td>{a.username}</td>
                            <td><span className="status-badge badge-active">{a.role}</span></td>
                            <td>
                              <button type="button" className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => removeAccount(a.id)}>Hapus</button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Pengaturan Hak Akses Menu (RBAC)</h3>
                  <select className="select-field" style={{ maxWidth: 180 }} value={rbacRole} onChange={(e) => setRbacRole(e.target.value)}>
                    <option value="Admin">Role: Admin</option>
                    <option value="Teknisi">Role: Teknisi</option>
                    <option value="Billing">Role: Billing</option>
                  </select>
                </div>
                <div className="grid-4" style={{ gap: 10 }}>
                  {CONTROLLABLE_MENUS.map((m) => {
                    const checked = (rolePermissions[rbacRole] || []).includes(m.key);
                    return (
                      <label key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderRadius: 10, background: 'var(--bg-surface-2)', fontSize: 12, fontWeight: 700 }}>
                        <span>{m.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const cur = new Set(rolePermissions[rbacRole] || []);
                            e.target.checked ? cur.add(m.key) : cur.delete(m.key);
                            const updated = { ...rolePermissions, [rbacRole]: Array.from(cur) };
                            setRolePermissions(updated);
                            localStorage.setItem('hn_rbac', JSON.stringify(updated));
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODAL AKSI TEKNIS */}
      {techModal.open && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: 420, padding: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>{techModal.action}</h3>
            <input
              className="input-field"
              style={{ marginBottom: 14 }}
              placeholder="Parameter (SN / Paket)..."
              value={techModal.param}
              onChange={(e) => setTechModal({ ...techModal, param: e.target.value })}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setTechModal({ open: false, action: '', param: '' })}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={executeTechAction}>Jalankan</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="toast-banner">
          <span>✨</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
