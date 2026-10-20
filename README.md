# Kount It

Kount It is a personal countdown app for keeping the next big moment in sight. Create a countdown with an optional label, watch the days, hours, minutes, and seconds tick by, and celebrate when it reaches zero.

## Features

- Create a countdown to any future date and time.
- Add an optional name to make the countdown your own.
- Choose a date quickly with the tomorrow, one-week, and one-month presets.
- Keep your countdown on this device between visits using browser local storage.
- Enable soft countdown ticks and a completion chime, with a control to turn sound off.
- See a confetti celebration when an active countdown finishes.
- Edit a saved countdown without losing its current name or date.
- Use the responsive interface on desktop and mobile, with reduced-motion support.

## Requirements

- Node.js 20 or later
- npm

## Installation

Clone the repository and change into the project directory:

```bash
git clone https://github.com/icodervivek/kount-it.git
cd kount-it
```

Install dependencies:

```bash
npm install
```

## Run locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build locally. |

## How to use

1. Optionally enter a label for your countdown.
2. Choose a future date and time, or use a quick date preset.
3. Select **Start the countdown**.
4. Use the sound control to enable or mute countdown sounds.
5. Select **Edit countdown** to change its name or date; save your changes or cancel to keep the original.
6. Select **Reset countdown** to remove the saved countdown and start over.

The countdown is stored in this browser on this device. Clearing site data removes it. Browsers may require a user interaction before playing audio; sound is enabled by default and starts after the first interaction with the page.

## Tech stack

- Next.js 16 with the App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Framer Motion
