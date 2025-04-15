import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as TWEEN from 'three/examples/jsm/libs/tween.module.js';
import { Button } from './ui/button';

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
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const animationQueueRef = useRef<Move[]>([]);
  const scrambleHistoryRef = useRef<Move[]>([]);
  const isAnimatingRef = useRef<boolean>(false);

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
    camera.position.z = 7;
    camera.position.y = 4;
    camera.lookAt(scene.position);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Add cube group to scene
    scene.add(cubeGroupRef.current);

    // Create the cube
    createCube();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Update TWEEN
      TWEEN.update();

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

  // Process the animation queue
  const processAnimationQueue = () => {
    if (isAnimatingRef.current || animationQueueRef.current.length === 0) {
      if (!isAnimatingRef.current && animationQueueRef.current.length === 0) {
        // Re-enable buttons when queue is empty
        const scrambleButton = document.getElementById('scrambleButton');
        const solveButton = document.getElementById('solveButton');
        if (scrambleButton) scrambleButton.removeAttribute('disabled');
        if (solveButton) solveButton.removeAttribute('disabled');
        console.log("Animation queue complete.");
      }
      return;
    }

    isAnimatingRef.current = true;
    
    // Disable buttons during animation
    const scrambleButton = document.getElementById('scrambleButton');
    const solveButton = document.getElementById('solveButton');
    if (scrambleButton) scrambleButton.setAttribute('disabled', 'true');
    if (solveButton) solveButton.setAttribute('disabled', 'true');

    const move = animationQueueRef.current.shift()!;
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

    // Clear any existing history and queue
    scrambleHistoryRef.current = [];
    animationQueueRef.current = [];

    const moves = generateScrambleSequence(20); // Generate 20 random moves
    
    // Add moves to queue and record in history for solving later
    moves.forEach(move => {
      animationQueueRef.current.push(move);
      
      // Store the inverse move in the history for solving
      const inverseMove = {
        axis: move.axis,
        layerIndex: move.layerIndex,
        angle: -move.angle
      };
      scrambleHistoryRef.current.unshift(inverseMove);
    });

    // Start processing the queue
    processAnimationQueue();
  };

  // Generate a sequence of random moves for scrambling
  const generateScrambleSequence = (moveCount: number): Move[] => {
    const moves: Move[] = [];
    const axes: Axis[] = ['x', 'y', 'z'];
    const angles = [Math.PI/2, -Math.PI/2]; // 90 degrees clockwise or counterclockwise

    let lastAxis: Axis | null = null;
    
    for (let i = 0; i < moveCount; i++) {
      let axis: Axis;
      
      // Avoid consecutive moves on the same axis for better scrambling
      do {
        axis = axes[Math.floor(Math.random() * axes.length)];
      } while (axis === lastAxis && axes.length > 1);
      
      lastAxis = axis;
      
      // Layer indices for a 3x3 cube are 0, 1, 2
      const layerIndex = Math.floor(Math.random() * N);
      const angle = angles[Math.floor(Math.random() * angles.length)];
      
      moves.push({ axis, layerIndex, angle });
    }
    
    return moves;
  };

  // Solve the cube
  const solveCubeAnimated = () => {
    if (isAnimatingRef.current || animationQueueRef.current.length > 0) return;
    
    // Add all moves from scramble history to animation queue
    animationQueueRef.current = [...scrambleHistoryRef.current];
    
    // Clear the history since we're solving back to the start
    scrambleHistoryRef.current = [];
    
    // Start processing the queue
    processAnimationQueue();
  };

  return (
    <div ref={containerRef} id="container">
      <div id="controls">
        <button 
          id="scrambleButton" 
          className="button" 
          onClick={scrambleCube}
        >
          Scramble
        </button>
        <button 
          id="solveButton" 
          className="button" 
          onClick={solveCubeAnimated}
        >
          Solve
        </button>
      </div>
    </div>
  );
};

export default RubiksCube;
