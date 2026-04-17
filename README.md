# AI Video Generator

Create stunning AI-powered videos from text prompts, powered by Claude AI. Similar to InVideo — just type your topic, pick a style, and watch your video script come to life with animated scenes and narration.

## Features

- **AI Script Generation** — Claude AI writes full video scripts with scenes, narration, and key points
- **Live Canvas Preview** — Animated scene previews with transitions, particles, and visual elements
- **Text-to-Speech Narration** — Browser-native TTS reads your script aloud as you preview
- **Scene Editor** — Edit any scene's text, emoji, duration, transition, and key points
- **Regenerate Scenes** — AI can rewrite individual scenes based on your feedback
- **Multiple Styles** — Professional, Cinematic, Educational, Social Media, Motivational, Documentary
- **Export** — Copy the full script or export as JSON

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd Video

# Install all dependencies
npm run install:all
```

### 2. Configure API Key

```bash
cd backend
cp .env.example .env
# Edit .env and add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-...
```

Get your API key from [console.anthropic.com](https://console.anthropic.com)

### 3. Run

```bash
# From root directory - starts both backend and frontend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Project Structure

```
Video/
├── backend/
│   ├── index.js          # Express API server with Claude AI
│   ├── package.json
│   └── .env.example      # Copy to .env and add API key
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx      # Landing page
│   │   │   └── Creator.jsx   # Main video creator workspace
│   │   ├── components/
│   │   │   ├── VideoPreview.jsx   # Canvas-based animated preview
│   │   │   ├── SceneCard.jsx      # Scene list item
│   │   │   └── SceneEditor.jsx    # Scene edit modal
│   │   ├── services/
│   │   │   └── api.js        # API client
│   │   └── App.jsx
│   └── package.json
└── package.json          # Root scripts for running both
```

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`
- **Video Preview**: HTML5 Canvas API + `requestAnimationFrame`
- **Narration**: Web Speech API (browser built-in TTS)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate-script` | Generate full video script with Claude AI |
| POST | `/api/regenerate-scene` | Regenerate a single scene |
| GET | `/api/health` | Health check |
