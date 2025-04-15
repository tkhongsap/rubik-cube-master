import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Make THREE available globally for OrbitControls
import * as THREE from "three";
// @ts-ignore
window.THREE = THREE;

createRoot(document.getElementById("root")!).render(<App />);
