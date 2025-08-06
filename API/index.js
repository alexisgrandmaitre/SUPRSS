const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

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


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API SUPRSS démarre sur le port ${PORT}`);
});