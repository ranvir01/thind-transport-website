# React Components Setup Guide

This project now includes React components with "use client" directives for interactive features.

## Installation

First, install the dependencies:

```bash
npm install
```

## Running the Development Server

Start the Vite development server:

```bash
npm run dev
```

The site will be available at `http://localhost:3000`

## Building for Production

Build the project:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## React Components

### ChartAreaInteractive Component

Located at `src/components/ChartAreaInteractive.jsx`, this component features:
- Interactive area chart using Recharts
- Time range selector (7 days, 30 days, 90 days)
- Responsive design
- Dark mode support

### UI Components

All UI components are in `src/components/ui/`:
- `card.jsx` - Card components
- `chart.jsx` - Chart wrapper components
- `select.jsx` - Select dropdown component

All components use the "use client" directive for client-side interactivity.

## Integration

The React chart component is integrated into `index.html` via:
- A container div with id `react-chart-container`
- The React entry point at `src/main.jsx` mounts the component

## CSS Variables

Chart colors and theming are defined in:
- `theme.css` - Main theme variables
- `src/index.css` - React-specific CSS variables

The chart uses CSS variables for colors, supporting both light and dark modes.

