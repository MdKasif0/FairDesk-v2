
# FairDesk: Smart & Collaborative Seat Management

<div align="center">
  <img src="/fairdesk-og.png" alt="FairDesk Banner" data-ai-hint="office collaboration"/>
</div>

<p align="center">
  <strong>A fair, transparent, and intelligent seat rotation system for modern teams.</strong>
</p>

<p align="center">
  <img alt="Tech Stack" src="https://img.shields.io/badge/tech-Next.js-black?logo=next.js">
  <img alt="React" src="https://img.shields.io/badge/framework-React-blue?logo=react">
  <img alt="Styling" src="https://img.shields.io/badge/styling-Tailwind_CSS-38B2AC?logo=tailwind-css">
  <img alt="AI" src="https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google-gemini">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa">
</p>

---

**FairDesk** is a Progressive Web App designed to automate and democratize office seating arrangements. It ensures fairness through a smart rotation algorithm, accommodates personal needs with features like seat locking, and adds a touch of fun with an optional randomizer. Built with Next.js and powered by Google's Gemini AI, FairDesk brings transparency and collaboration to your workspace.

## ✨ Key Features

- **Smart Seat Rotation**: Automatically rotates seats on a daily basis, skipping weekends and holidays to maintain a fair and consistent cycle.
- **Manual Overrides with Approvals**: Users can request to swap seats with a teammate for a day, requiring approval from other group members.
- **Seat Locking**: Lock a specific seat for a day for personal or medical reasons, which the rotation algorithm will respect.
- **Randomizer Mode**: Shuffle today's seating arrangement for a fun, spontaneous change of scenery.
- **Full History & Traceability**: View a complete chronological history of all past seating arrangements.
- **AI-Powered Notifications**: Receive friendly, AI-generated alerts on the status of your seat change requests.
- **Progressive Web App (PWA)**: Installable on any device (iOS, Android, Desktop) with offline support for a fast, native-app-like experience.
- **Responsive & Themeable**: A clean, mobile-first design with support for both light and dark modes.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or a compatible package manager

### Installation

1.  **Clone the repository** (or download the source code):
    ```sh
    git clone https://github.com/your-username/fairdesk.git
    cd fairdesk
    ```

2.  **Install dependencies**:
    ```sh
    npm install
    ```

3.  **Set up environment variables**:
    Create a `.env` file in the root of the project by copying the example:
    ```sh
    cp .env.example .env
    ```
    Open the `.env` file and add your Google Gemini API key:
    ```
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```
    *You can obtain a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).*

4.  **Run the development server**:
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI Library**: [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Generative AI**: [Google Gemini via Genkit](https://firebase.google.com/docs/genkit)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper for client-side storage)
- **PWA**: [@ducanh2912/next-pwa](https://github.com/DuCanh2912/next-pwa) for service worker and offline support.
- **Icons**: [Lucide React](https://lucide.dev/)

## 📂 Project Structure

- `src/app/`: Contains all the pages of the application, following the Next.js App Router structure.
- `src/ai/`: Holds the Genkit flows for interacting with the Gemini API.
- `src/components/`: Shared and reusable React components.
  - `ui/`: Core UI components from ShadCN.
  - `dashboard/`: Components specific to the dashboard page.
  - `shared/`: Components used across multiple pages (e.g., `BottomNav`).
- `src/lib/`: Core logic, type definitions, and services.
  - `data-service.ts`: Handles all business logic and interactions with the database.
  - `db.ts`: Dexie.js database configuration and schema.
  - `types.ts`: TypeScript type definitions for the application's data models.
- `public/`: Static assets, including the `manifest.json` and PWA icons.

## ✅ To-Do / Future Enhancements

- [ ] Real-time multi-user approval system for overrides.
- [ ] User-configurable working days and holidays.
- [ ] Detailed fairness statistics and visualizations.
- [ ] Admin panel for managing users and groups.

---

<p align="center">
  Made for Firebase Studio.
</p>
