const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const PORT = process.env.PORT || 8787;
const DATA_FILE = path.join(__dirname, 'vc-cup-data.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const fallbackData = {
  matches: [],
  points: [],
  stats: { runs: [], wickets: [] },
  mom: []
};

async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallbackData;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vc-cup-backend' });
});

app.get('/api/tournament', async (_req, res) => {
  const data = await readData();
  res.json({ data, updatedAt: new Date().toISOString() });
});

app.put('/api/tournament', async (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid payload. Expected { data: object }' });
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true, updatedAt: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`VC Cup backend listening on http://localhost:${PORT}`);
});
