const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const app = express();
app.use(cors());
app.use(express.json());
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const RSSParser = require('rss-parser');
const rssParser = new RSSParser({
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/rss+xml, application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
    },
    timeout: 15000
  }
});
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { XMLBuilder, XMLParser } = require('fast-xml-parser');
const { parse: csvParse } = require('csv-parse/sync');
const { stringify: csvStringify } = require('csv-stringify/sync');
const allowedOrigins = process.env.CORS_ORIGIN || ['http://localhost', 'http://localhost:5173'];
const CRON = process.env.REFRESH_CRON || "*/15 * * * *";

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.get('/health', (req, res) => res.json({ ok: true }));


async function importArticlesForFeed(feed) {
  try {
    console.log(`[IMPORT] ${feed.title} (${feed.url})…`);
    const parsed = await rssParser.parseURL(feed.url);
    console.log(`[IMPORT] ${parsed.items?.length || 0} items récupérés`);

    let created = 0;
    for (const entry of parsed.items || []) {
      const url = entry.link || entry.guid;
      if (!url) continue;

      const exists = await prisma.article.findFirst({
        where: { url, feedId: feed.id }
      });
      if (exists) continue;

      await prisma.article.create({
        data: {
          title: entry.title || 'Sans titre',
          url,
          publishedAt: entry.pubDate ? new Date(entry.pubDate) : new Date(),
          author: entry.creator || entry.author || null,
          summary: entry.contentSnippet || entry.summary || null,
          feedId: feed.id
        }
      });
      created++;
    }
    console.log(`[IMPORT] ${created} articles créés pour ${feed.title}`);
  } catch (err) {
    console.error(`[IMPORT] Erreur (${feed.url}):`, err.message);
  }
}

async function refreshAllFeeds() {
  console.log("[CRON] Démarrage import de tous les flux…");
  const feeds = await prisma.rSSFeed.findMany(); // tu peux filtrer si tu as un statut "actif"
  let totalCreated = 0;

  for (const feed of feeds) {
    try {
      const before = Date.now();
      await importArticlesForFeed(feed);
      console.log(`[CRON] OK: ${feed.title || feed.url} (${Date.now()-before}ms)`);
      // si tu veux compter les créations, fais-le dans importArticlesForFeed et retourne un nombre
    } catch (e) {
      console.error(`[CRON] Erreur sur ${feed.url}:`, e.message);
    }
  }

  console.log(`[CRON] Terminé.`);
}

app.get('/', (req, res) => {
  res.json({ message: 'API SUPRSS opérationnelle !' });
});

app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// Enregistrement des identifiants

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe sont requis.' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    }
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt
  });
});

// Connexion au compte

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe sont requis.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  res.status(200).json({
    message: 'Connexion réussie',
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    }
  });
});

// Création d'un flux

app.post('/rssfeeds', async (req, res) => {
  const { title, url, description, categories, userId } = req.body || {};
  if (!userId || !url) return res.status(400).json({ error: 'userId et url requis' });

  const rssFeed = await prisma.rSSFeed.create({
    data: { title, url, description, categories, userId: Number(userId) }
  });

  await importArticlesForFeed(rssFeed);

  res.status(201).json(rssFeed);
});

// Lister les flux d'un user

app.get('/rssfeeds/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const feeds = await prisma.rSSFeed.findMany({
      where: { userId: Number(userId) }
    });
    res.json(feeds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un flux

app.delete('/rssfeeds/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.rSSFeed.delete({ where: { id: Number(id) } });
    res.json({ message: 'Flux supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer tous les articles d’un flux RSS

app.get('/articles/:feedId', async (req, res) => {
  const { feedId } = req.params;
  try {
    const articles = await prisma.article.findMany({
      where: { feedId: Number(feedId) },
      orderBy: { publishedAt: 'desc' }
    });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/articles', async (req, res) => {
  const { title, url, publishedAt, author, summary, feedId } = req.body;
  try {
    const article = await prisma.article.create({
      data: { title, url, publishedAt: new Date(publishedAt), author, summary, feedId: Number(feedId) }
    });
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bouton article Lu/Non lu

app.patch('/articles/:id/read', async (req, res) => {
  const { read } = req.body; // { read: true } ou { read: false }
  try {
    const article = await prisma.article.update({
      where: { id: Number(req.params.id) },
      data: { read: Boolean(read) }
    });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bouton ajout d'un favoris

app.patch('/articles/:id/favorite', async (req, res) => {
  const { favorite } = req.body;
  try {
    const article = await prisma.article.update({
      where: { id: Number(req.params.id) },
      data: { favorite: Boolean(favorite) }
    });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajout d'un favoris

app.get('/favorites/:userId', async (req, res) => {
  try {
    // On récupère les articles favoris des flux appartenant à ce user
    const favorites = await prisma.article.findMany({
      where: {
        favorite: true,
        feed: {
          userId: Number(req.params.userId)
        }
      },
      include: { feed: true }
    });
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Filtres

app.get('/articles', async (req, res) => {
  try {
    const { userId, feedId, status, favorite, q, tags, category } = req.query;

    const where = {AND: [] };

    if (feedId) where.feedId = Number(feedId);
    if (favorite === 'true') where.favorite = true;
    if (favorite === 'false') where.favorite = false;
    if (status === 'read') where.read = true;
    if (status === 'unread') where.read = false;

    if (q && q.trim()) {
      where.OR = [
        { title:   { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { author:  { contains: q, mode: 'insensitive' } },
      ];
    }

    const feedWhere = {};
    if (userId) feedWhere.userId = Number(userId);
    if (tags && tags.trim()) {
      feedWhere.categories = { contains: tags, mode: 'insensitive' };
    }
    if (Object.keys(feedWhere).length > 0) {
      where.feed = feedWhere;
    }

    const articles = await prisma.article.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });

    res.json(articles);
  } catch (err) {
    console.error('GET /articles error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rafraîchir un flux spécifique

app.post('/rssfeeds/:id/refresh', async (req, res) => {
  try {
    const feedId = Number(req.params.id);
    const feed = await prisma.rSSFeed.findUnique({ where: { id: feedId } });
    if (!feed) return res.status(404).json({ error: 'Flux introuvable' });

    await importArticlesForFeed(feed);
    res.json({ ok: true, message: 'Flux rafraîchi' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Rafraîchir les flux

app.post('/rssfeeds/refresh-all', async (req, res) => {
  try {
    const { userId } = req.query;
    await refreshAllFeeds({ userId });
    res.json({ ok: true, message: 'Rafraîchissement terminé' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualisation des flux

const REFRESH_CRON = process.env.REFRESH_CRON || '*/15 * * * *'; 
cron.schedule(REFRESH_CRON, async () => {
  console.log('[CRON] Rafraîchissement automatique des flux…');
  try {
    await refreshAllFeeds(); 
    console.log('[CRON] Terminé');
  } catch (e) {
    console.error('[CRON] Échec:', e.message);
  }
});

// export opml

app.get('/export/opml', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: 'userId requis' });

    const feeds = await prisma.rSSFeed.findMany({
      where: { userId },
      select: { title: true, url: true, description: true, categories: true }
    });

    const outlines = feeds.map(f => ({
      '@_text': f.title || f.url,
      '@_title': f.title || '',
      '@_type': 'rss',
      '@_xmlUrl': f.url,
      '@_description': f.description || '',
      '@_category': f.categories || ''
    }));

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      suppressBooleanAttributes: false,
      format: true
    });

    const opmlObj = {
      opml: {
        '@_version': '2.0',
        head: { title: 'SUPRSS Export' },
        body: { outline: outlines }
      }
    };

    const xml = builder.build(opmlObj);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="suprss-feeds.opml"');
    res.send(xml);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Export json

app.get('/export/json', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: 'userId requis' });

    const withArticles = String(req.query.withArticles || 'false') === 'true';

    const feeds = await prisma.rSSFeed.findMany({
      where: { userId },
      include: withArticles ? {
        Article: {
          orderBy: { publishedAt: 'desc' },
          select: {
            title: true, url: true, publishedAt: true, author: true,
            summary: true, read: true, favorite: true
          }
        }
      } : false
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="suprss-export.json"');
    res.send(JSON.stringify({
      exportedAt: new Date().toISOString(),
      userId,
      feeds
    }, null, 2));
  } catch (e) {
    console.error('GET /export/json error:', e);
    res.status(500).json({ error: e.message });
  }
});


// Export csv

app.get('/export/csv', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: 'userId requis' });

    const feeds = await prisma.rSSFeed.findMany({
      where: { userId },
      select: { title: true, url: true, description: true, categories: true }
    });

    const records = feeds.map(f => ({
      title: f.title || '',
      url: f.url,
      description: f.description || '',
      categories: f.categories || ''
    }));

    const csv = csvStringify(records, { header: true, columns: ['title', 'url', 'description', 'categories'] });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="suprss-feeds.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Import OPML

app.post('/import/opml', upload.single('file'), async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ error: 'userId requis' });
    if (!req.file) return res.status(400).json({ error: 'fichier OPML requis' });

    const xml = req.file.buffer.toString('utf-8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(xml);

    const outlines = []
    const body = doc?.opml?.body;

    function collect(outline) {
      if (!outline) return;
      if (Array.isArray(outline)) { outline.forEach(collect); return; }
      if (outline['@_xmlUrl']) outlines.push(outline);
      if (outline.outline) collect(outline.outline);
    }
    collect(body?.outline);

    let created = 0, skipped = 0;
    for (const o of outlines) {
      const url = o['@_xmlUrl'];
      if (!url) { skipped++; continue; }

      const exists = await prisma.rSSFeed.findFirst({ where: { userId, url } });
      if (exists) { skipped++; continue; }

      await prisma.rSSFeed.create({
        data: {
          userId,
          url,
          title: o['@_title'] || o['@_text'] || url,
          description: o['@_description'] || null,
          categories: o['@_category'] || null
        }
      });
      created++;
    }

    res.json({ ok: true, imported: created, skipped });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Import Json

app.post('/import/json', upload.single('file'), async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ error: 'userId requis' });
    if (!req.file) return res.status(400).json({ error: 'fichier JSON requis' });

    const txt = req.file.buffer.toString('utf-8');
    const data = JSON.parse(txt);

    const feeds = data.feeds || [];
    let created = 0, skipped = 0;

    for (const f of feeds) {
      if (!f.url) { skipped++; continue; }
      const exists = await prisma.rSSFeed.findFirst({ where: { userId, url: f.url } });
      if (exists) { skipped++; continue; }

      await prisma.rSSFeed.create({
        data: {
          userId,
          url: f.url,
          title: f.title || f.url,
          description: f.description || null,
          categories: f.categories || null
        }
      });
      created++;
    }

    res.json({ ok: true, imported: created, skipped });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Import CSV

app.post('/import/csv', upload.single('file'), async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ error: 'userId requis' });
    if (!req.file) return res.status(400).json({ error: 'fichier CSV requis' });

    const content = req.file.buffer.toString('utf-8');
    const rows = csvParse(content, { columns: true, skip_empty_lines: true });

    let created = 0, skipped = 0;
    for (const r of rows) {
      const url = (r.url || '').trim();
      if (!url) { skipped++; continue; }

      const exists = await prisma.rSSFeed.findFirst({ where: { userId, url } });
      if (exists) { skipped++; continue; }

      await prisma.rSSFeed.create({
        data: {
          userId,
          url,
          title: (r.title || url).trim(),
          description: (r.description || '').trim(),
          categories: (r.categories || '').trim()
        }
      });
      created++;
    }

    res.json({ ok: true, imported: created, skipped });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

cron.schedule(CRON, () => {
  console.log("[CRON] Rafraîchissement automatique des flux…");
  refreshAllFeeds().catch(err => console.error("[CRON] Échec:", err));
});

if (process.env.REFRESH_ON_START !== "false") {
  refreshAllFeeds().catch(err => console.error("[START] Échec refresh:", err));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API SUPRSS démarre sur le port ${PORT}`);
});