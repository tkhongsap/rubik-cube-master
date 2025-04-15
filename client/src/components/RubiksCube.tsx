import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from 'three/examples/jsm/libs/tween.module.js';

// Types
type Axis = 'x' | 'y' | 'z';
type Move = {
  axis: Axis,
  layerIndex: number,
  angle: number
};

const RubiksCube: React.FC = () => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const movesDisplayRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const cubeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const animationQueueRef = useRef<Move[]>([]);
  const scrambleHistoryRef = useRef<Move[]>([]);
  const isAnimatingRef = useRef<boolean>(false);
  
  // State for button disabled status
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  
  // State for moves display
  const [moves, setMoves] = useState<string[]>([]);

  // Constants
  const cubieSize = 1;
  const spacing = 0.05;
  const totalCubieSize = cubieSize + spacing;
  const N = 3; // 3x3x3 cube
  const halfN = (N - 1) / 2;
  const animationDuration = 300; // Duration in ms

  // Standard Rubik's Cube Colors
  const colors = {
    right: new THREE.Color(0x0000FF), // Blue
    left: new THREE.Color(0x00FF00), // Green
    top: new THREE.Color(0xFFFFFF), // White
    bottom: new THREE.Color(0xFFFF00), // Yellow
    front: new THREE.Color(0xFF0000), // Red
    back: new THREE.Color(0xFFA500), // Orange
    inside: new THREE.Color(0x333333) // Dark grey for inside faces
  };

  // Convert internal move data to standard notation
  const getMoveNotation = (axis: Axis, layerIndex: number, angle: number): string => {
    const clockwise = angle > 0; // Determine direction based on angle convention
    const prime = "'"; // Apostrophe for counter-clockwise

    // Outer layers (F, B, U, D, R, L)
    if (layerIndex === N - 1) { // Top/Right/Front layer (index 2)
      if (axis === 'y') return clockwise ? "U'" : "U"; // Y-axis rotation: U/U' (Angle convention reversed for top)
      if (axis === 'x') return clockwise ? "R" : "R'"; // X-axis rotation: R/R'
      if (axis === 'z') return clockwise ? "F" : "F'"; // Z-axis rotation: F/F'
    }
    if (layerIndex === 0) { // Bottom/Left/Back layer (index 0)
      if (axis === 'y') return clockwise ? "D" : "D'"; // Y-axis rotation: D/D'
      if (axis === 'x') return clockwise ? "L'" : "L"; // X-axis rotation: L/L' (Angle convention reversed for left)
      if (axis === 'z') return clockwise ? "B'" : "B"; // Z-axis rotation: B/B' (Angle convention reversed for back)
    }
    // Middle layers (M, E, S)
    if (layerIndex === 1) {
       if (axis === 'y') return clockwise ? "E" : "E'"; // Y-axis rotation: E/E' (like D)
       if (axis === 'x') return clockwise ? "M'" : "M"; // X-axis rotation: M/M' (like L, angle reversed)
       if (axis === 'z') return clockwise ? "S" : "S'"; // Z-axis rotation: S/S' (like F)
    }
    return "?"; // Should not happen
  };

  // Add a move to the display
  const addMoveToDisplay = (notation: string) => {
    setMoves(prevMoves => {
      // Limit to last 30 moves
      const updatedMoves = [...prevMoves, notation];
      if (updatedMoves.length > 30) {
        return updatedMoves.slice(updatedMoves.length - 30);
      }
      return updatedMoves;
    });
    
    // Auto-scroll to bottom of moves display
    if (movesDisplayRef.current) {
      setTimeout(() => {
        if (movesDisplayRef.current) {
          movesDisplayRef.current.scrollTop = movesDisplayRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  // Clear the moves display
  const clearMovesDisplay = () => {
    setMoves([]);
  };

  // Set up the scene, camera, renderer and controls
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 4, 7);
    camera.lookAt(scene.position);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 20;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Add cube group to scene
    scene.add(cubeGroupRef.current);

    // Create the cube
    createCube();

    // Animation loop
    const animate = (time?: number) => {
      requestAnimationFrame(animate);
      
      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Update TWEEN
      TWEEN.update(time);

      // Process animation queue
      processAnimationQueue();

      // Render the scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // Create the Rubik's Cube
  const createCube = () => {
    // Clear existing cube and history
    while (cubeGroupRef.current.children.length > 0) {
      const child = cubeGroupRef.current.children[0];
      cubeGroupRef.current.remove(child);
    }
    
    scrambleHistoryRef.current = [];
    clearMovesDisplay();

    const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);

    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        for (let z = 0; z < N; z++) {
          // Skip inner core
          if (x > 0 && x < N - 1 && y > 0 && y < N - 1 && z > 0 && z < N - 1) {
            continue;
          }

          const materials = [
            (x === N - 1) ? new THREE.MeshStandardMaterial({ color: colors.right }) : new THREE.MeshStandardMaterial({ color: colors.inside }), // +X
            (x === 0) ? new THREE.MeshStandardMaterial({ color: colors.left }) : new THREE.MeshStandardMaterial({ color: colors.inside }),   // -X
            (y === N - 1) ? new THREE.MeshStandardMaterial({ color: colors.top }) : new THREE.MeshStandardMaterial({ color: colors.inside }),    // +Y
            (y === 0) ? new THREE.MeshStandardMaterial({ color: colors.bottom }) : new THREE.MeshStandardMaterial({ color: colors.inside }), // -Y
            (z === N - 1) ? new THREE.MeshStandardMaterial({ color: colors.front }) : new THREE.MeshStandardMaterial({ color: colors.inside }),  // +Z
            (z === 0) ? new THREE.MeshStandardMaterial({ color: colors.back }) : new THREE.MeshStandardMaterial({ color: colors.inside })    // -Z
          ];

          const cubie = new THREE.Mesh(geometry, materials);
          cubie.position.set(
            (x - halfN) * totalCubieSize,
            (y - halfN) * totalCubieSize,
            (z - halfN) * totalCubieSize
          );
          
          // Store initial world position (useful for layer selection)
          cubie.userData.initialWorldPos = cubie.position.clone();
          cubeGroupRef.current.add(cubie);
        }
      }
    }
    
    setButtonsDisabled(false);
  };

  // Helper to get cubies in a specific layer based on initial position
  const getLayer = (axis: Axis, layerIndex: number): THREE.Mesh[] => {
    const layer: THREE.Mesh[] = [];
    const threshold = totalCubieSize * (layerIndex - halfN);
    const tolerance = 0.1;

    cubeGroupRef.current.children.forEach((cubie) => {
      if (Math.abs((cubie as THREE.Mesh).userData.initialWorldPos[axis] - threshold) < tolerance) {
        layer.push(cubie as THREE.Mesh);
      }
    });

    return layer;
  };

  // Helper to snap rotation
  const snapRotation = (object: THREE.Object3D) => {
    const euler = new THREE.Euler().setFromQuaternion(object.quaternion, 'XYZ');
    euler.x = Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2);
    euler.y = Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2);
    euler.z = Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2);
    object.quaternion.setFromEuler(euler);
  };

  // Process the animation queue
  const processAnimationQueue = () => {
    if (isAnimatingRef.current || animationQueueRef.current.length === 0) {
      if (!isAnimatingRef.current && animationQueueRef.current.length === 0) {
        // Re-enable buttons when queue is empty
        setButtonsDisabled(false);
        console.log("Animation queue complete.");
      }
      return;
    }

    isAnimatingRef.current = true;
    setButtonsDisabled(true);

    const move = animationQueueRef.current.shift()!;
    
    // Add move notation to display before starting animation
    const notation = getMoveNotation(move.axis, move.layerIndex, move.angle);
    addMoveToDisplay(notation);
    
    animateLayerRotation(move.axis, move.layerIndex, move.angle);
  };

  // Animate the rotation of a layer
  const animateLayerRotation = (axis: Axis, layerIndex: number, angle: number) => {
    const layer = getLayer(axis, layerIndex);
    const pivot = new THREE.Object3D();
    sceneRef.current?.add(pivot);

    // Attach cubies to pivot
    layer.forEach(cubie => {
      pivot.attach(cubie);
    });

    const targetRotation: Record<string, number> = {};
    targetRotation[axis] = angle;

    new TWEEN.Tween(pivot.rotation)
      .to(targetRotation, animationDuration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        // Animation finished for this move
        layer.forEach(cubie => {
          // Get world matrix after pivot rotation
          cubie.updateMatrixWorld();
          const worldPosition = new THREE.Vector3();
          const worldQuaternion = new THREE.Quaternion();
          cubie.getWorldPosition(worldPosition);
          cubie.getWorldQuaternion(worldQuaternion);

          // Remove from pivot and add back to the main group
          cubeGroupRef.current.attach(cubie);

          // Update the 'initialWorldPos' based on the new logical position
          const logicalX = Math.round(worldPosition.x / totalCubieSize) + halfN;
          const logicalY = Math.round(worldPosition.y / totalCubieSize) + halfN;
          const logicalZ = Math.round(worldPosition.z / totalCubieSize) + halfN;
          cubie.userData.initialWorldPos.set(
            (logicalX - halfN) * totalCubieSize,
            (logicalY - halfN) * totalCubieSize,
            (logicalZ - halfN) * totalCubieSize
          );
          
          // Position correction and snap rotation
          cubie.position.copy(worldPosition);
          cubie.quaternion.copy(worldQuaternion);
          cubie.position.x = Math.round(cubie.position.x / totalCubieSize) * totalCubieSize;
          cubie.position.y = Math.round(cubie.position.y / totalCubieSize) * totalCubieSize;
          cubie.position.z = Math.round(cubie.position.z / totalCubieSize) * totalCubieSize;
          snapRotation(cubie);
        });

        // Remove pivot
        sceneRef.current?.remove(pivot);

        // Reset animating flag and process next move
        isAnimatingRef.current = false;
        processAnimationQueue();
      })
      .start();
  };

  // Scramble the cube
  const scrambleCube = () => {
    if (isAnimatingRef.current || animationQueueRef.current.length > 0) return;
    
    console.log("Queueing scramble moves...");
    setButtonsDisabled(true);
    clearMovesDisplay();

    // Clear any existing history and queue
    scrambleHistoryRef.current = [];
    animationQueueRef.current = [];

    const numScrambleMoves = 20;
    const moves: Axis[] = ['x', 'y', 'z'];
    const layers = [0, 1, 2];
    const angles = [Math.PI/2, -Math.PI/2];
    
    for (let i = 0; i < numScrambleMoves; i++) {
      const randomAxis = moves[Math.floor(Math.random() * moves.length)];
      const randomLayer = layers[Math.floor(Math.random() * layers.length)];
      const randomAngle = angles[Math.floor(Math.random() * angles.length)];
      
      const move = { 
        axis: randomAxis, 
        layerIndex: randomLayer, 
        angle: randomAngle 
      };
      
      animationQueueRef.current.push(move);
      scrambleHistoryRef.current.push(move);
    }

    console.log(`Added ${numScrambleMoves} moves to queue.`);
    processAnimationQueue();
  };

  // Solve the cube
  const solveCubeAnimated = () => {
    if (isAnimatingRef.current || scrambleHistoryRef.current.length === 0) return;
    
    console.log("Queueing solve moves (reversing scramble)...");
    setButtonsDisabled(true);
    clearMovesDisplay();
    
    // Create reversed moves with inverted angles
    const solveMoves = scrambleHistoryRef.current.slice().reverse().map(move => ({
      axis: move.axis,
      layerIndex: move.layerIndex,
      angle: -move.angle
    }));
    
    animationQueueRef.current.push(...solveMoves);
    scrambleHistoryRef.current = [];
    
    console.log(`Added ${solveMoves.length} solve moves to queue.`);
    processAnimationQueue();
  };

  return (
    <div className="relative w-full h-full">
      {/* Top bar */}
      <div id="top-bar" className="absolute top-0 left-0 w-full p-4 bg-white/80 backdrop-blur-md shadow-sm z-10 text-center">
        <h1 className="m-0 text-lg font-semibold text-slate-800">Rubik's Cube Simulation</h1>
      </div>
      
      {/* Container for the 3D scene */}
      <div ref={containerRef} id="container" className="absolute top-0 left-0 w-full h-full z-1"></div>
      
      {/* Moves display panel */}
      <div 
        ref={movesDisplayRef}
        id="moves-display" 
        className="absolute top-24 right-5 w-20 max-h-[calc(100vh-180px)] p-2.5 bg-slate-900/80 rounded-lg overflow-y-auto z-5 shadow-[0_0_15px_rgba(50,205,50,0.4)] border border-[rgba(50,205,50,0.3)]"
      >
        {moves.map((move, index) => (
          <p key={index} className="text-emerald-400 font-mono text-sm m-0.5 text-center whitespace-nowrap">
            {move}
          </p>
        ))}
      </div>
      
      {/* Controls */}
      <div id="controls" className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 p-3 bg-white/75 backdrop-blur-md rounded-xl shadow-lg z-10">
        <button 
          id="scrambleButton" 
          className="py-2.5 px-5 rounded-md font-medium text-sm text-slate-50 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={scrambleCube}
          disabled={buttonsDisabled}
        >
          Scramble
        </button>
        <button 
          id="solveButton" 
          className="py-2.5 px-5 rounded-md font-medium text-sm text-emerald-50 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={solveCubeAnimated}
          disabled={buttonsDisabled}
        >
          Solve
        </button>
      </div>
    </div>
  );
};

export default RubiksCube;
