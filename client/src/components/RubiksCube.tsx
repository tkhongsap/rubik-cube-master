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

type MoveType = 'scramble' | 'solve' | null;

interface MoveItem {
  notation: string;
  type: MoveType;
}

type CubeSize = 3 | 4 | 5 | 6 | 7;

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
  const [moves, setMoves] = useState<MoveItem[]>([]);
  const [currentSequenceType, setCurrentSequenceType] = useState<MoveType>(null);
  
  // State for cube size
  const [cubeSize, setCubeSize] = useState<CubeSize>(3);

  // Constants
  const cubieSize = 1;
  const spacing = 0.05;
  const totalCubieSize = cubieSize + spacing;
  const animationDuration = 300; // Duration in ms

  // Computed values that depend on cube size
  const N = cubeSize;
  const halfN = (N - 1) / 2;

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

  // Convert internal move data to standard notation for various cube sizes
  const getMoveNotation = (axis: Axis, layerIndex: number, angle: number): string => {
    const prime = "'"; 
    let face = '?'; 
    let layerPrefix = ''; 
    let clockwise = false;
    
    // Determine Face, Clockwise direction, and Layer Prefix based on axis, layerIndex, angle, N, halfN
    if (axis === 'x') { // R/L faces
      if (layerIndex > halfN) { // Closer to R face (index N-1)
        face = 'R'; 
        clockwise = angle > 0;
        if (layerIndex < N - 1) layerPrefix = (N - 1 - layerIndex + 1).toString(); // 2R, 3R...
      } else { // Closer to L face (index 0)
        face = 'L'; 
        clockwise = angle < 0; // Clockwise for L is negative angle
        if (layerIndex > 0) layerPrefix = (layerIndex + 1).toString(); // 2L, 3L...
      }
    } else if (axis === 'y') { // U/D faces
      if (layerIndex > halfN) { // Closer to U face (index N-1)
        face = 'U'; 
        clockwise = angle < 0; // Clockwise for U is negative angle
        if (layerIndex < N - 1) layerPrefix = (N - 1 - layerIndex + 1).toString(); // 2U, 3U...
      } else { // Closer to D face (index 0)
        face = 'D'; 
        clockwise = angle > 0;
        if (layerIndex > 0) layerPrefix = (layerIndex + 1).toString(); // 2D, 3D...
      }
    } else if (axis === 'z') { // F/B faces
      if (layerIndex > halfN) { // Closer to F face (index N-1)
        face = 'F'; 
        clockwise = angle > 0;
        if (layerIndex < N - 1) layerPrefix = (N - 1 - layerIndex + 1).toString(); // 2F, 3F...
      } else { // Closer to B face (index 0)
        face = 'B'; 
        clockwise = angle < 0; // Clockwise for B is negative angle
        if (layerIndex > 0) layerPrefix = (layerIndex + 1).toString(); // 2B, 3B...
      }
    }
    
    // For 3x3, use classic notation (M, E, S for middle layers)
    if (N === 3) {
      if (layerIndex === 1) {
        if (axis === 'x') return clockwise ? "M'" : "M";
        if (axis === 'y') return clockwise ? "E" : "E'";
        if (axis === 'z') return clockwise ? "S" : "S'";
      }
    }
    
    // Return formatted notation
    return layerPrefix + face + (clockwise ? '' : prime);
  };

  // Add a move to the display
  const addMoveToDisplay = (notation: string, moveType: MoveType) => {
    if (!moveType) return;
    
    setMoves(prevMoves => {
      // Limit to last 40 moves
      const updatedMoves = [...prevMoves, { notation, type: moveType }];
      if (updatedMoves.length > 40) {
        return updatedMoves.slice(updatedMoves.length - 40);
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

  // Handle cube size change
  const handleCubeSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(event.target.value) as CubeSize;
    if (isAnimatingRef.current) return; // Prevent change during animation
    
    if (newSize !== cubeSize) {
      console.log(`Changing cube size to ${newSize}x${newSize}x${newSize}`);
      setCubeSize(newSize);
    }
  };

  // Effect to recreate cube when size changes
  useEffect(() => {
    if (sceneRef.current) {
      // Adjust camera for new cube size
      if (cameraRef.current) {
        cameraRef.current.position.set(0, N * 1.5, N * 2.5);
        cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0));
      }
      
      // Adjust controls for new cube size
      if (controlsRef.current) {
        controlsRef.current.maxDistance = N * 5;
        controlsRef.current.update();
      }
      
      // Adjust lighting for new cube size
      if (sceneRef.current) {
        // Update directional light
        sceneRef.current.children.forEach(child => {
          if (child instanceof THREE.DirectionalLight) {
            child.position.set(N, N * 2, N * 1.5);
          }
        });
      }
      
      createCube();
    }
  }, [cubeSize]);

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
    camera.position.set(0, N * 1.5, N * 2.5);
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
    controls.minDistance = 3;
    controls.maxDistance = N * 5;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(N, N * 2, N * 1.5);
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
    console.log(`Creating ${N}x${N}x${N} cube...`);
    
    // Clear existing cube and history
    while (cubeGroupRef.current.children.length > 0) {
      const child = cubeGroupRef.current.children[0];
      cubeGroupRef.current.remove(child);
    }
    
    scrambleHistoryRef.current = []; // Reset history ONLY on full cube creation/reset
    clearMovesDisplay();
    animationQueueRef.current = []; // Clear animation queue

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
    
    console.log(`Cube created with ${cubeGroupRef.current.children.length} cubies.`);
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
        setCurrentSequenceType(null);
        console.log("Animation queue complete.");
      }
      return;
    }

    isAnimatingRef.current = true;
    setButtonsDisabled(true);

    const move = animationQueueRef.current.shift()!;
    
    // Add move notation to display before starting animation
    const notation = getMoveNotation(move.axis, move.layerIndex, move.angle);
    addMoveToDisplay(notation, currentSequenceType);
    
    animateLayerRotation(move.axis, move.layerIndex, move.angle);
  };

  // Animate the rotation of a layer
  const animateLayerRotation = (axis: Axis, layerIndex: number, angle: number) => {
    const layer = getLayer(axis, layerIndex);
    
    // Skip the move if layer selection failed
    if (layer.length === 0) {
      console.warn(`Layer selection failed for axis ${axis}, index ${layerIndex}. Skipping move.`);
      isAnimatingRef.current = false;
      processAnimationQueue();
      return;
    }
    
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
        const currentHalfN = (N - 1) / 2; // Use N applicable at end of move
        
        // Animation finished for this move
        layer.forEach(cubie => {
          // Re-attach to cube group
          cubeGroupRef.current.attach(cubie);
          
          // Update userData.initialWorldPos based on final position
          const logicalX = Math.round(cubie.position.x / totalCubieSize + currentHalfN);
          const logicalY = Math.round(cubie.position.y / totalCubieSize + currentHalfN);
          const logicalZ = Math.round(cubie.position.z / totalCubieSize + currentHalfN);
          
          // Clamp to ensure positions are valid for the cube
          const clampedX = Math.max(0, Math.min(N - 1, logicalX));
          const clampedY = Math.max(0, Math.min(N - 1, logicalY));
          const clampedZ = Math.max(0, Math.min(N - 1, logicalZ));
          
          cubie.userData.initialWorldPos.set(
            (clampedX - currentHalfN) * totalCubieSize,
            (clampedY - currentHalfN) * totalCubieSize,
            (clampedZ - currentHalfN) * totalCubieSize
          );
          
          // Snap visual rotation
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
    setCurrentSequenceType('scramble');

    // Clear animation queue (but not scramble history)
    animationQueueRef.current = [];
    
    // Generate new scramble moves (scale with cube size)
    const numScrambleMoves = N * N; // Larger cubes need more scramble moves
    const moves: Axis[] = ['x', 'y', 'z'];
    const layers = Array.from({ length: N }, (_, i) => i); // All layers for larger cubes
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
      scrambleHistoryRef.current.push(move); // Add to history
    }

    console.log(`Added ${numScrambleMoves} moves to queue. Total history: ${scrambleHistoryRef.current.length}`);
    processAnimationQueue();
  };

  // Solve the cube
  const solveCubeAnimated = () => {
    if (isAnimatingRef.current || scrambleHistoryRef.current.length === 0) return;
    
    console.log("Queueing solve moves (reversing scramble)...");
    setButtonsDisabled(true);
    clearMovesDisplay();
    setCurrentSequenceType('solve');
    
    // Create reversed moves with inverted angles
    const solveMoves = scrambleHistoryRef.current.slice().reverse().map(move => ({
      axis: move.axis,
      layerIndex: move.layerIndex,
      angle: -move.angle
    }));
    
    animationQueueRef.current.push(...solveMoves);
    scrambleHistoryRef.current = []; // Clear history AFTER queueing the solve moves
    
    console.log(`Added ${solveMoves.length} solve moves to queue.`);
    processAnimationQueue();
  };

  // Organize moves into rows for display
  const renderMoveRows = () => {
    if (moves.length === 0) {
      return null;
    }
    
    // Group moves into rows of 4
    const rows = [];
    for (let i = 0; i < moves.length; i += 4) {
      rows.push(moves.slice(i, i + 4));
    }
    
    return rows.map((row, rowIndex) => (
      <div 
        key={`row-${rowIndex}`} 
        className="grid grid-cols-4 gap-1 mb-0.5"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}
      >
        {row.map((move, moveIndex) => (
          <span 
            key={`${rowIndex}-${moveIndex}`} 
            className={`font-mono text-sm text-center p-px rounded`}
            style={{ 
              color: move.type === 'scramble' ? '#34d399' : '#60a5fa',
              whiteSpace: 'nowrap',
              padding: '1px 3px'
            }}
          >
            {move.notation}
          </span>
        ))}
      </div>
    ));
  };

  return (
    <div className="relative w-full h-full">
      {/* Top bar with cube size selector */}
      <div className="absolute top-0 left-0 w-full p-3 bg-white/80 backdrop-blur-md shadow-sm z-10 flex justify-between items-center">
        <h1 className="m-0 text-lg font-semibold text-slate-800">Rubik's Cube Simulation</h1>
        <div>
          <select 
            className="py-1 px-3 border border-slate-300 rounded-md bg-white text-sm font-medium text-slate-700 cursor-pointer"
            value={cubeSize}
            onChange={handleCubeSizeChange}
            disabled={buttonsDisabled}
          >
            <option value={3}>3x3x3</option>
            <option value={4}>4x4x4</option>
            <option value={5}>5x5x5</option>
            <option value={6}>6x6x6</option>
            <option value={7}>7x7x7</option>
          </select>
        </div>
      </div>
      
      {/* Container for the 3D scene */}
      <div ref={containerRef} id="container" className="absolute top-0 left-0 w-full h-full z-1"></div>
      
      {/* Moves display panel - Enhanced version */}
      <div 
        ref={movesDisplayRef}
        id="moves-display" 
        className="absolute top-16 right-5 w-44 max-h-[calc(100vh-180px)] p-2.5 bg-slate-900/85 rounded-lg overflow-y-auto z-5 shadow-[0_0_15px_rgba(50,205,50,0.4)] border border-[rgba(50,205,50,0.3)]"
      >
        {renderMoveRows()}
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
          disabled={buttonsDisabled || scrambleHistoryRef.current.length === 0}
        >
          Solve
        </button>
      </div>
    </div>
  );
};

export default RubiksCube;
