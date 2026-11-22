const express = require('express');
const cors = require('cors');
const { RouterOSAPI } = require('node-routeros');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

async function withMikrotik(config, callback) {
  const { host, port = 8728, user, password } = config || {};
  if (!host || !user) {
    throw new Error('Host/IP dan User API MikroTik wajib diisi.');
  }

  const conn = new RouterOSAPI({
    host: String(host).trim(),
    port: Number(port) || 8728,
    user: String(user).trim(),
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

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'ok', service: 'HachiNet ISP Bridge' });
});

// 1. Tes Koneksi
app.post('/api/mikrotik/test', async (req, res) => {
  try {
    const info = await withMikrotik(req.body, async (conn) => {
      const [identity] = await conn.write('/system/identity/print');
      const [resource] = await conn.write('/system/resource/print');
      return {
        identity: identity?.name || 'MikroTik',
        version: resource?.version || '-',
        uptime: resource?.uptime || '-',
        boardName: resource?.['board-name'] || '-'
      };
    });
    res.json({ ok: true, data: info });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 2. Summary (CPU, RAM, PPP counts)
app.post('/api/mikrotik/summary', async (req, res) => {
  try {
    const summary = await withMikrotik(req.body, async (conn) => {
      const [resource] = await conn.write('/system/resource/print');
      const pppSecrets = await conn.write('/ppp/secret/print');
      const pppActives = await conn.write('/ppp/active/print');

      const totalMem = Number(resource?.['total-memory'] || 1);
      const freeMem = Number(resource?.['free-memory'] || 0);
      const usedMem = totalMem - freeMem;
      const memPercent = Math.round((usedMem / totalMem) * 100);
      const disabledCount = pppSecrets.filter((s) => s.disabled === 'true').length;

      return {
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
      };
    });
    res.json({ ok: true, data: summary });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 3. Daftar PPP Secret + Status Aktif
app.post('/api/mikrotik/ppp', async (req, res) => {
  try {
    const items = await withMikrotik(req.body, async (conn) => {
      const pppSecrets = await conn.write('/ppp/secret/print');
      const pppActives = await conn.write('/ppp/active/print');
      const activeNames = new Set(pppActives.map((a) => a.name));

      return pppSecrets.map((s) => {
        const activeInfo = pppActives.find((a) => a.name === s.name);
        return {
          id: s['.id'],
          name: s.name,
          profile: s.profile,
          service: s.service,
          disabled: s.disabled === 'true',
          online: activeNames.has(s.name),
          address: activeInfo?.address || s['remote-address'] || '-',
          uptime: activeInfo?.uptime || 'Offline'
        };
      });
    });
    res.json({ ok: true, data: { items } });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 4. Daftar Interface
app.post('/api/mikrotik/interfaces', async (req, res) => {
  try {
    const interfaces = await withMikrotik(req.body, async (conn) => {
      const rows = await conn.write('/interface/print');
      return rows.map((iface) => ({
        name: iface.name,
        type: iface.type,
        running: iface.running === 'true',
        disabled: iface.disabled === 'true',
        rxByte: Number(iface['rx-byte'] || 0),
        txByte: Number(iface['tx-byte'] || 0)
      }));
    });
    res.json({ ok: true, data: interfaces });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 5. Isolir / Buka Isolir / Ganti Profile + Kick Active Session
app.post('/api/mikrotik/ppp/isolir', async (req, res) => {
  const { username, targetProfile } = req.body;
  try {
    const msg = await withMikrotik(req.body, async (conn) => {
      if (!username || !targetProfile) {
        throw new Error('Username PPPoE dan targetProfile wajib diisi.');
      }
      const secrets = await conn.write('/ppp/secret/print', [`?name=${username}`]);
      if (!secrets.length) {
        throw new Error(`Secret PPPoE "${username}" tidak ditemukan di MikroTik.`);
      }
      await conn.write('/ppp/secret/set', [
        `=.id=${secrets[0]['.id']}`,
        `=profile=${targetProfile}`
      ]);
      const actives = await conn.write('/ppp/active/print', [`?name=${username}`]);
      for (const act of actives) {
        await conn.write('/ppp/active/remove', [`=.id=${act['.id']}`]);
      }
      return `Profil ${username} -> ${targetProfile} (${actives.length} sesi di-refresh)`;
    });
    res.json({ ok: true, data: { message: msg } });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 6. Tambah / Update PPP Secret saat Aktivasi Pelanggan
app.post('/api/mikrotik/ppp/create', async (req, res) => {
  const { username, password, profile, comment } = req.body;
  try {
    const msg = await withMikrotik(req.body, async (conn) => {
      if (!username || !profile) {
        throw new Error('Username PPPoE dan profile wajib diisi.');
      }
      const existing = await conn.write('/ppp/secret/print', [`?name=${username}`]);
      if (existing.length > 0) {
        const setParams = [`=.id=${existing[0]['.id']}`, `=profile=${profile}`];
        if (password) setParams.push(`=password=${password}`);
        if (comment) setParams.push(`=comment=${comment}`);
        await conn.write('/ppp/secret/set', setParams);
        return `PPP Secret "${username}" diperbarui ke profil ${profile}`;
      }
      await conn.write('/ppp/secret/add', [
        `=name=${username}`,
        `=password=${password || '1234'}`,
        `=service=pppoe`,
        `=profile=${profile}`,
        `=comment=${comment || 'HachiNet'}`
      ]);
      return `PPP Secret "${username}" ditambahkan dengan profil ${profile}`;
    });
    res.json({ ok: true, data: { message: msg } });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 7. Kirim Notifikasi via WA Gateway (Relay Backend)
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
    res.json({ ok: response.ok, status: response.status, data: { response: text } });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[HachiNet Bridge] Berjalan di http://localhost:${PORT}`);
});
