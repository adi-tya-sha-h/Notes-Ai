const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'notes-ai-jwt-secret-2026';
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors());
app.use(express.json());

// ── User store helpers ──────────────────────────────────────────────────────
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ── Auth Routes ─────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const users = readUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  writeUsers(users);

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// ── Initialize Groq Client ──────────────────────────────────────────────────
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.warn('WARNING: GROQ_API_KEY is not configured. Please set a valid key in server/.env');
}

const groq = new Groq({ apiKey });
const MODEL = 'llama-3.3-70b-versatile';

// Helper: call Groq and return the text response
async function ask(prompt) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });
  return response.choices[0].message.content;
}

// ── AI Routes ───────────────────────────────────────────────────────────────

// POST /api/generate-notes
app.post('/api/generate-notes', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  try {
    const prompt = `You are Notes.ai, an advanced AI study assistant. Generate structured, clear, and comprehensive study notes in markdown format based on the raw input below.
Use clear headings (##, ###), bullet points, and highlight key terms using bold text. Keep the notes well-organized, comprehensive, and easy to study. Do not include any introductory or concluding text. Just return the structured notes.

Generate study notes for the following text:

${text}`;

    const notes = await ask(prompt);
    res.json({ notes });
  } catch (error) {
    console.error('Error generating notes:', error);
    res.status(500).json({ error: error.message || 'Failed to generate study notes' });
  }
});

// POST /api/generate-quiz
app.post('/api/generate-quiz', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  try {
    const prompt = `You are Notes.ai, an advanced AI study assistant. Generate an interactive multiple-choice quiz based on the raw notes below.
You must return a STRICT JSON array of objects. Do not wrap the response in markdown formatting or write any prose. Return ONLY the raw JSON array.
Each question object in the array must follow this exact shape:
{
  "question": "The question text",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "answer": "A"
}
"answer" must be "A", "B", "C", or "D" indicating the correct option (A = index 0, B = index 1, C = index 2, D = index 3).
Generate between 5 to 10 questions depending on the length of the text. Ensure the questions test key concepts and that only one option is correct.

Generate a multiple-choice quiz for this text:

${text}`;

    let quizText = (await ask(prompt)).trim();

    // Strip markdown fences if the model wrapped output
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = quizText.match(jsonBlockRegex);
    if (match) {
      quizText = match[1];
    } else {
      const startIdx = quizText.indexOf('[');
      const endIdx = quizText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        quizText = quizText.substring(startIdx, endIdx + 1);
      }
    }

    try {
      const quiz = JSON.parse(quizText.trim());
      if (!Array.isArray(quiz)) throw new Error('Response is not a JSON array');
      res.json({ quiz });
    } catch (parseError) {
      console.error('Failed to parse Groq JSON response:', parseError);
      res.status(500).json({ error: 'Failed to parse quiz response into valid JSON structure.' });
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

// ── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Notes.ai server (Groq / ${MODEL}) running on port ${PORT}`);
});