const express = require('express');
const cors = require('cors');
const { RouterOSAPI } = require('node-routeros');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper koneksi dinamis ke MikroTik berdasarkan konfigurasi dari Dashboard HachiNet
async function withMikrotik(config, callback) {
  const { host, port = 8728, user, password } = config || {};
  if (!host || !user) {
    throw new Error('Host/IP dan User API MikroTik wajib diisi.');
  }

  const conn = new RouterOSAPI({
    host: host.trim(),
    port: Number(port) || 8728,
    user: user.trim(),
    password: password || '',
    timeout: 8
  });

  await conn.connect();
  try {
    return await callback(conn);
  } finally {
    conn.close();
  }
}

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HachiNet ISP Bridge (server.cjs)',
    timestamp: new Date().toISOString()
  });
});

// 2. Tes Koneksi MikroTik
app.post('/api/mikrotik/test', async (req, res) => {
  try {
    const data = await withMikrotik(req.body, async (conn) => {
      const [identity] = await conn.write('/system/identity/print');
      const [resource] = await conn.write('/system/resource/print');
      return {
        identity: identity?.name || 'MikroTik',
        version: resource?.version || '-',
        uptime: resource?.uptime || '-',
        boardName: resource?.['board-name'] || '-'
      };
    });
    res.json({ ok: true, message: `Terhubung ke ${data.identity} (${data.boardName})`, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 3. Ambil Data Monitoring Lengkap (CPU, RAM, PPP Active, PPP Secret, Interface)
app.post('/api/mikrotik/summary', async (req, res) => {
  try {
    const result = await withMikrotik(req.body, async (conn) => {
      const [identity] = await conn.write('/system/identity/print');
      const [resource] = await conn.write('/system/resource/print');
      const pppSecrets = await conn.write('/ppp/secret/print');
      const pppActives = await conn.write('/ppp/active/print');
      const interfaces = await conn.write('/interface/print');

      const totalMem = Number(resource?.['total-memory'] || 1);
      const freeMem = Number(resource?.['free-memory'] || 0);
      const usedMem = totalMem - freeMem;
      const memPercent = Math.round((usedMem / totalMem) * 100);

      const activeNames = new Set(pppActives.map((a) => a.name));
      const disabledCount = pppSecrets.filter((s) => s.disabled === 'true').length;

      const pppItems = pppSecrets.map((s) => {
        const activeInfo = pppActives.find((a) => a.name === s.name);
        return {
          id: s['.id'],
          name: s.name,
          profile: s.profile,
          service: s.service,
          disabled: s.disabled === 'true',
          online: activeNames.has(s.name),
          address: activeInfo?.address || s['remote-address'] || '-',
          uptime: activeInfo?.uptime || 'Offline',
          callerId: activeInfo?.['caller-id'] || s['caller-id'] || '-'
        };
      });

      return {
        identity: {
          identity: identity?.name || 'MikroTik',
          version: resource?.version || '-',
          uptime: resource?.uptime || '-'
        },
        summary: {
          cpuLoad: Number(resource?.['cpu-load'] || 0),
          memory: {
            percent: memPercent,
            used: Math.round(usedMem / 1048576),
            total: Math.round(totalMem / 1048576)
          },
          ppp: {
            active: pppActives.length,
            secret: pppSecrets.length,
            offline: Math.max(0, pppSecrets.length - pppActives.length),
            disabled: disabledCount
          }
        },
        pppItems,
        interfaces: interfaces.map((iface) => ({
          name: iface.name,
          type: iface.type,
          running: iface.running === 'true',
          disabled: iface.disabled === 'true',
          rxByte: Number(iface['rx-byte'] || 0),
          txByte: Number(iface['tx-byte'] || 0)
        }))
      };
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 4. Tambah / Sinkronisasi Pelanggan Baru ke PPP Secret MikroTik
app.post('/api/mikrotik/ppp/create', async (req, res) => {
  const { config, username, password, profile, comment } = req.body;
  try {
    await withMikrotik(config, async (conn) => {
      const existing = await conn.write('/ppp/secret/print', [`?name=${username}`]);
      if (existing.length > 0) {
        await conn.write('/ppp/secret/set', [
          `=.id=${existing[0]['.id']}`,
          `=password=${password}`,
          `=profile=${profile}`,
          `=comment=${comment || 'HachiNet Sync'}`
        ]);
      } else {
        await conn.write('/ppp/secret/add', [
          `=name=${username}`,
          `=password=${password}`,
          `=service=pppoe`,
          `=profile=${profile}`,
          `=comment=${comment || 'HachiNet Baru'}`
        ]);
      }
    });
    res.json({ ok: true, message: `PPP Secret ${username} berhasil disinkronkan ke MikroTik.` });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 5. Isolir & Buka Isolir Pelanggan (Ubah Profile + Putus Sesi Aktif agar IP Isolir langsung aktif)
app.post('/api/mikrotik/ppp/isolir', async (req, res) => {
  const { config, username, targetProfile } = req.body;
  try {
    await withMikrotik(config, async (conn) => {
      const secrets = await conn.write('/ppp/secret/print', [`?name=${username}`]);
      if (!secrets.length) throw new Error(`User PPPoE "${username}" tidak ditemukan di MikroTik.`);

      await conn.write('/ppp/secret/set', [
        `=.id=${secrets[0]['.id']}`,
        `=profile=${targetProfile}`
      ]);

      // Kick active session agar modem langsung dial ulang dan mendapat profil baru
      const actives = await conn.write('/ppp/active/print', [`?name=${username}`]);
      for (const act of actives) {
        await conn.write('/ppp/active/remove', [`=.id=${act['.id']}`]);
      }
    });
    res.json({ ok: true, message: `Profil ${username} diubah ke ${targetProfile} & sesi di-refresh.` });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 6. Kick / Reboot Sesi PPPoE Pelanggan
app.post('/api/mikrotik/ppp/kick', async (req, res) => {
  const { config, username } = req.body;
  try {
    await withMikrotik(config, async (conn) => {
      const actives = await conn.write('/ppp/active/print', [`?name=${username}`]);
      if (!actives.length) throw new Error(`User "${username}" sedang tidak aktif.`);
      for (const act of actives) {
        await conn.write('/ppp/active/remove', [`=.id=${act['.id']}`]);
      }
    });
    res.json({ ok: true, message: `Sesi PPPoE ${username} berhasil diputus (reconnect otomatis).` });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 7. Relay WhatsApp Gateway (Menghindari masalah CORS dari browser ke Fonnte/Wablas/dll.)
app.post('/api/wagw/send', async (req, res) => {
  const { url, token, target, message } = req.body;
  try {
    if (!url || !token || !target) {
      throw new Error('URL Gateway, Token, dan Nomor Tujuan wajib diisi.');
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target, message })
    });
    const text = await response.text();
    res.json({ ok: response.ok, status: response.status, response: text });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[HachiNet Bridge] Server berjalan di http://localhost:${PORT}`);
});
