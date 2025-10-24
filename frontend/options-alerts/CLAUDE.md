# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite frontend application for a Stock Alerts Dashboard. The project uses React 19 with TypeScript for type safety and Vite for fast development and building.

## Development Commands

**Working directory**: All commands should be run from `/home/william/Development/OptionsAlerts/frontend/options-alerts`

- **Start dev server**: `npm run dev` - Starts Vite dev server with HMR
- **Build**: `npm run build` - Type-checks with `tsc -b` then builds with Vite
- **Lint**: `npm run lint` - Runs ESLint on all files
- **Preview production build**: `npm run preview` - Preview the production build locally

## Architecture

### Technology Stack
- **React 19** with TypeScript (strict mode enabled)
- **Vite 7** for build tooling with Fast Refresh
- **ESLint 9** with TypeScript ESLint for linting
- **Target**: ES2022, modern browser environments

### Project Structure
```
src/
├── main.tsx          # Application entry point with React root
├── App.tsx           # Main App component (stock alerts dashboard)
├── components/       # Reusable React components
│   └── Post.tsx      # Post component for displaying alerts
├── App.css           # App-level styles
└── index.css         # Global styles
```

### TypeScript Configuration
- Uses project references pattern with separate configs for app and node
- Strict mode enabled with additional linting flags (`noUnusedLocals`, `noUnusedParameters`, etc.)
- Module resolution: "bundler" mode for Vite compatibility
- JSX transform: `react-jsx` (new JSX transform)

### Component Patterns
- All components use TypeScript with explicit type definitions
- Functional components with `React.FC` type
- Props defined as separate type definitions (e.g., `type PostProps`)
- Currently using inline styles (no CSS modules or styled-components yet)

## Key Notes

- The project uses React 19's latest features including the new JSX transform
- ESLint is configured with flat config (eslint.config.js) format
- Vite plugin uses Babel for Fast Refresh (not SWC)
- TypeScript compiler is set to ES2022 target with DOM libraries
