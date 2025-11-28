# SimScript React Demo

## Overview
This is a React application that demonstrates SimScript simulations - a Discrete Event Simulation Library in TypeScript with support for 2D and 3D animations. The app showcases various simulation examples including SimScript, GPSS, and Steering behavior simulations.

## Project Structure
- **Frontend**: React 18 application built with Create React App
- **Language**: TypeScript
- **Framework**: React with React Router for navigation
- **Simulations**: Uses the `simscript` npm package for simulation functionality

## Key Technologies
- React 18.2.0
- TypeScript 4.9.5
- React Router DOM 6.20.0
- SimScript 1.0.37
- X3DOM for 3D animations

## Development
The development server runs on port 5000 and is configured to work with Replit's proxy system.

### Environment Variables
- `PORT=5000` - Frontend server port
- `HOST=0.0.0.0` - Bind to all network interfaces
- `DANGEROUSLY_DISABLE_HOST_CHECK=true` - Allow Replit proxy
- `WDS_SOCKET_PORT=0` - WebSocket port configuration for hot reload

### Running Locally
The "React App" workflow is configured to run `npm start` which starts the development server.

## Deployment
The project is configured for static site deployment:
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Deployment Type**: Static

## Simulation Categories

### SimScript Examples
- Barbershop Simulation
- M/M/C Queueing System
- Crosswalk with Traffic Light
- Asteroids Game

### GPSS Examples
Inspired by GPSS samples from Minuteman software:
- Telephone System
- TV Repair Shop
- Order Point Inventory
- Textile Factory Production

### Steering Behavior Examples
Based on autonomous character navigation:
- Seek Behavior
- Avoid Obstacles
- Seek and Avoid Combined
- Network Navigation

Both SVG and X3DOM (3D) versions are available for steering examples.

## Recent Changes
- **2025-11-28**: Initial Replit environment setup
  - Configured React dev server for Replit proxy compatibility
  - Set up workflow to run on port 5000
  - Configured static deployment settings
  - Fixed npm-force-resolutions compatibility issues by removing preinstall hook
  - Removed caret notation from package.json resolutions

## Notes
- The project uses X3DOM library for 3D visualizations, loaded via CDN in public/index.html
- React Router handles client-side routing for different simulation examples
- Some React 18 and React Router v6 deprecation warnings are present but don't affect functionality
