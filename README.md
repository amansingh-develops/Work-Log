# WorkLog — Personal Work Journal & Daily Standup Assistant

A privacy-focused, full-stack progressive web application designed for software engineers, product managers, and knowledge workers to effortlessly log daily achievements, structure messy thoughts into polished executive bullets, sync follow-up tasks, and generate client-ready reports.

---

## ✨ Features

- **🎙️ Multi-Modal Input**
  - **Quick Text Input**: Fast keyboard-first logging with auto-tagging (`#feature`, `#bugfix`, `#meeting`, etc.) and `Cmd/Ctrl + Enter` instant capture.
  - **Live Web Speech Dictation**: Continuous, zero-latency browser-native speech-to-text.
  - **AI Audio Transcription**: High-accuracy audio recording powered by Gemini AI with automatic recognition of developer jargon, acronyms, and technical terms.

- **⚡ Gemini AI Text Enhancement**
  - Converts informal stream-of-consciousness logs into concise, impact-oriented bullet points.
  - Automatic model failover and exponential retry mechanisms to guarantee uninterrupted availability.
  - Non-destructive Dual-Version toggle: switch between raw transcripts and AI-cleaned versions at any time.

- **📅 Task Scheduling & Google Tasks Integration**
  - Extract action items directly from work logs.
  - Schedule follow-up items with custom due dates and link directly to Google Tasks.

- **📊 Comprehensive Reports & Export Engine**
  - Summarize work across custom date ranges (Today, This Week, This Month, or custom periods).
  - Export professional summaries to **PDF**, **Microsoft Word (.docx)**, **Markdown (.md)**, and **JSON backups**.

- **🕒 Real-time Audit Trail & Activity Log**
  - Complete history of all actions: entry creation, edits, AI version switches, deletions, restorations, and project updates.
  - Soft-delete with a dedicated Trash Bin and one-click item restoration.

- **📁 Project & Category Management**
  - Organize work logs by project with custom color tags.
  - Filter daily feeds by project, date, keyword, or tag.

- **🎨 Modern Responsive UI**
  - Dark and Light mode support with adaptive system themes.
  - Fluid animations powered by Motion.
  - Mobile and desktop responsive layouts.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React |
| **Backend / API** | Node.js, Express, ESBuild, TSX |
| **AI Processing** | `@google/genai` (Gemini 2.5 / Flash model with multi-model failover) |
| **Persistence** | Firebase Firestore (Real-time sync, offline-ready) |
| **Document Export** | `jspdf`, `jspdf-autotable`, `docx`, `file-saver` |

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/work-log.git
cd work-log
npm install
```

### 3. Environment Configuration

Copy the example environment file and add your Gemini API key:

```bash
cp .env.example .env
```

Edit `.env` and set your key:

```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

> ⚠️ **Security Warning**: Never commit your `.env` file or API keys to GitHub. The `.gitignore` file is pre-configured to keep your secrets private.

### 4. Running the Development Server

Start the local full-stack development server on `http://localhost:3000`:

```bash
npm run dev
```

### 5. Production Build

To compile and launch the production build:

```bash
npm run build
npm start
```

---

## 📂 Project Structure

```text
├── src/
│   ├── components/       # UI components (NewEntryForm, EntryCard, Modals, Navbar, etc.)
│   ├── context/          # State management (AuthContext, WorkLogContext)
│   ├── lib/              # Firebase & utility helper functions
│   ├── services/         # Client-side API services (text enhancement, audio transcription)
│   ├── views/            # Main views (DailyFeed, AllEntries, Projects, Reports, ActivityLog, Trash, Settings)
│   ├── types.ts          # TypeScript interfaces & data models
│   ├── App.tsx           # Main application router and navigation shell
│   └── main.tsx          # React application entry point
├── server.ts             # Express backend server & secure Gemini AI proxy routes
├── firestore.rules       # Firestore security rules
├── .env.example          # Sample environment variables template
├── .gitignore            # Git exclusion rules for private keys and build artifacts
├── package.json          # Dependencies and scripts
└── vite.config.ts        # Vite build configuration
```

---

## 🔒 Privacy & Data Security

- **Server-Side API Proxying**: API keys are securely kept on the backend server (`server.ts`) and are never exposed to the client browser.
- **Direct Database Ownership**: All log documents and projects are scoped directly to your authenticated user account in Firestore with granular security rules.
- **Local Data Portability**: Export your complete database anytime as JSON, PDF, or Word DOCX.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
