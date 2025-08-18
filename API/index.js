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
      'User-Agent': 'Mozilla/5.0 (SUPRSS Demo)',
      'Accept': 'application/rss+xml, application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 15000
  }
});

// Import des articles

async function importArticlesForFeed(feed) {
  try {
    console.log(`[IMPORT] ${feed.title} (${feed.url})…`);
    const parsed = await rssParser.parseURL(feed.url);
    console.log(`[IMPORT] ${parsed.items?.length || 0} items récupérés`);

    let created = 0;
    for (const entry of parsed.items || []) {
      const url = entry.link || entry.guid; // fallback si link absent
      if (!url) continue;

      // déduplication
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

  // Ici, pas de token JWT : on renvoie juste les infos utilisateur
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
  const { title, url, description, categories, userId } = req.body;
  if (!title || !url || !userId) {
    return res.status(400).json({ error: 'Titre, url et userId sont requis.' });
  }
  
  try {
    const rssFeed = await prisma.rSSFeed.create({
      data: { title, url, description, categories, userId: Number(userId) }
    });

    await importArticlesForFeed(rssFeed);

    res.status(201).json(rssFeed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    const { userId, feedId, status, favorite, q, tags } = req.query;

    const where = {};

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

// Rafraîchir tous les flux
app.post('/rssfeeds/refresh-all', async (req, res) => {
  try {
    const { userId } = req.query;
    await refreshAllFeeds({ userId });
    res.json({ ok: true, message: 'Rafraîchissement terminé' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API SUPRSS démarre sur le port ${PORT}`);
});