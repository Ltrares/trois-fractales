# Trois Fractales

An interactive 3D WebGL sandbox designed for real-time fractal exploration and visual experimentation. Built as an art project leveraging generative shader logic and AI-assisted web development.

[**Live Demo →**](https://ltrares.github.io/trois-fractales/)

> ⚠️ **Photosensitivity Warning:** This application contains rapidly shifting colors, lights, and geometric patterns that may trigger seizures for people with photosensitive epilepsy.

---

## Features

* **Real-time 3D Navigation:** Walk and inspect fractals in real-time with full first-person controls (WASD, mouse-look, crouching, and zoom).
* **Generative Randomization:** Instantly generate new fractal equations, color palettes, and structural parameters on the fly.
* **Interactive Tooling:** Freeze and lock parameters, capture high-resolution screenshots, and manage an in-app gallery.
* **Bilingual Interface:** French and English, switchable live via the **FR · EN** toggle on the start and pause screens. Defaults to French.
* **Touch Support:** Drag to look, touch to walk forward on phones and tablets.

---

## Controls

| Key | Action |
| :--- | :--- |
| **W A S D** | Move camera |
| **Mouse** | Look around |
| **Shift** *(Hold)* | Run |
| **Z** *(Hold)* | Zoom camera |
| **C** *(Hold)* | Crouch |
| **H / Home** | Teleport back to start |
| **R** | Generate random fractals |
| **P** | Freeze parameters for 30s (press again to extend) |
| **O** | Release frozen parameters |
| **ESC** | Release the mouse — this opens the pause menu. Also cuts an active freeze to 5s |
| **Space / Enter** | Resume from the pause menu |
| **T** | Take screenshot |
| **G** | Open screenshot gallery |
| **Q** | Toggle the FPS / stats overlay |

In the gallery, **ESC** closes the preview or the gallery and **Delete** erases the selected screenshot.

The 30s freeze counts rendered time, so it does not tick down while paused or in the gallery.

---

## Tech & Approach

* **Rendering Engine:** Raw WebGL2 with hand-written GLSL — no framework, no build step, zero dependencies. Geometry is ray marched using distance estimators rather than drawn from a scene graph.
* **Process:** Rapid prototype built with AI-assisted generative coding, focusing heavily on shader performance, fluid user input, and real-time visual output over rigid software architecture.

---

## Author & Credits

Created by [Luke Trares](https://luketrares.com).  
If you use or reference this project, please provide attribution.