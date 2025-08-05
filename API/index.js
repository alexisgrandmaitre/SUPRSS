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

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // 1. Vérifier que les deux champs sont présents
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe sont requis.' });
  }

  // 2. Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
  }

  // 3. Hasher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. Créer l’utilisateur
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    }
  });

  // 5. Répondre avec le nouvel utilisateur (sans le mot de passe)
  res.status(201).json({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API SUPRSS démarre sur le port ${PORT}`);
});