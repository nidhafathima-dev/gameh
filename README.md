# OUIJA — Cinematic 3D Horror Website

An immersive, real-time 3D cinematic horror experience and interactive antique Ouija board built with **Three.js, WebGL, Vite, and the Web Audio API**.

## 🌲 Features

- **Scene 1 — The Awakening:**
  - Starts in pitch blackness.
  - Multi-stage first-person eyelid opening simulation with dynamic vision blur and depth-of-field clearing.
  - Visitor wakes up grounded on the forest floor looking up into the tall swaying pine canopy and falling leaves.
  - Smooth first-person physical rising animation from ground level (`0.42m`) to standing eye height (`1.70m`).
  - Procedural deep breathing and heartbeat audio.

- **Scene 2 & 3 — Forest Exploration & Living Environment:**
  - First-person walking along a winding Catmull-Rom path spline using <kbd>W</kbd> and <kbd>S</kbd> with synchronized footstep audio and natural head bobbing.
  - Free mouse look with pitch and yaw clamping.
  - Dynamic wind-swaying pine trees, crooked branches, ferns, mossy rocks, falling leaves, and drifting volumetric fog.

- **Scene 4 & 5 — Isolated Cabin, Door Slam & 3D Bat Swarm:**
  - Atmospheric weathered wooden cabin with a warm glowing lantern and window beacon.
  - Automated cinematic approach to the front door.
  - Sudden violent door slam accompanied by an explosion of articulated 3D bats with flapping wings swarming past the camera.

- **Scene 6 & 7 — Cabin Interior & Discovery:**
  - Transition through the doorway into the warm amber-lit cabin interior.
  - Rustic wooden table with a 3-candle candelabra, dynamic flickering point lights, and swirling golden dust motes.

- **Scene 8 & 9 — Seamless Transition:**
  - Smooth camera crane and tilt into a top-down / high-angle view over the antique Ouija board.
  - Seamless zero-cut transition directly into the interactive interface without reloading the page or redirecting.

- **Scene 10 — Interactive Ouija Board & Séance:**
  - 2K procedural aged walnut texture with wood grain, scratches, ornate borders, Sun, Moon, All-Seeing Eye, A–Z alphabet, 1–0 numbers, YES, NO, and GOODBYE.
  - 3D Planchette with brass viewing ring and glass magnifying window.
  - **Free Dragging:** Drag the planchette anywhere on the board with authentic wood sliding audio.
  - **The Séance:** Ask any custom question or pick quick prompts (*"What is your name?"*, *"How did you die?"*, *"Are we alone?"*). The spirit takes control of the planchette, spelling answers letter-by-letter with chime bells, spirit whispers, and live transcription.
  - Collapsible HUD console for an unobstructed view of the board.

- **Procedural Web Audio Engine:**
  - 100% self-contained Web Audio synthesis: wind gusts, footsteps, creaking hinges, door slam, bat screeches, flutter, candlelight hiss, planchette wood friction, and resonant occult chimes.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/nidhafathima-dev/gameh.git
cd gameh

# Install dependencies
npm install

# Run the development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.
