# Notes.ai — AI Study Notes & Quiz Generator

Paste your notes, lecture text, or study material — get back structured, exam-ready summaries and an interactive multiple-choice quiz to test yourself on the spot.

## Live Demo
- Frontend: https://incandescent-puppy-51301b.netlify.app
- Backend API: https://notes-ai-backend-1pcb.onrender.com

## Features
- 📝 **AI-generated study notes** — clean markdown-style summaries with headings and bullet points
- 🧠 **Auto-generated quizzes** — 5-10 multiple-choice questions based on your exact input
- ✅ **Instant scoring** — submit your answers and see what you got right/wrong
- 🎨 Clean, macOS-window-inspired UI

## Tech Stack
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **AI Provider:** Groq API (Llama models) — fast, free-tier friendly


## Project Structure

```text
notes-ai/
├── index.html
├── style.css
├── script.js
└── server/
    ├── index.js
    ├── .env            # Not committed (contains API keys) and will expire
    └── package.json
```

## Setup & Run Locally

**1. Clone the repo**
```bash
git clone https://github.com/adi-tya-sha-h/Notes-Ai.git
cd Notes-Ai
```

**2. Install backend dependencies**
```bash
cd server
npm install
```

**3. Add your Groq API key**

Create a `.env` file inside `server/`:GROQ_API_KEY=your_actual_groq_api_key_here
PORT=3000

Get a free key at [console.groq.com](https://console.groq.com).

**4. Start the backend**
```bash
node index.js
```
You should see `Server running on port 3000`.

**5. Open the frontend**

Open `index.html` in your browser (or use VS Code's Live Server extension). Make sure the backend is running first — the frontend calls `http://localhost:3000` for notes/quiz generation.

## How It Works
1. Paste text into the input box (minimum ~100 words recommended for good results)
2. Click **Generate Study Buddy**
3. Backend sends your text to Groq's API — once for notes, once for quiz generation
4. Notes render as structured summaries; quiz renders as clickable MCQs
5. Submit the quiz to see your score

## Status
✅ Frontend UI complete
✅ Backend Express server working
✅ AI notes generation working (Groq)
✅ AI quiz generation working (Groq)
✅ Scoring & feedback working
🚧 Deployment (Render + Netlify) — in progress
🚧 PDF upload support — planned
🚧 Quiz history / persistence — planned

## Roadmap
- [ ] Deploy backend (Render/Railway)
- [ ] Deploy frontend (Netlify/Vercel)
- [ ] PDF/file upload support
- [ ] Save quiz history (MongoDB)
- [ ] User accounts

## Author
Aditya Shah — B.Tech CSE, Graphic Era Hill University

## License
This project is for educational/portfolio purposes.
