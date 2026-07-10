import React, { useEffect, useRef, useState } from 'react';

/**
 * InteractiveOrb
 * A self-contained, high-performance procedural 2D canvas component inspired by
 * Google Antigravity. Creates a particle-based floating orb that reacts dynamically
 * to mouse movement with spring physics.
 */
export default function InteractiveOrb({
  particleCount = 3000,
  baseOrbRadius = 250,
  interactionRadius = 180,
  repulsionStrength = 75,
  breathingSpeed = 0.0012,
  driftSpeed = 0.001,
  rotationSpeed = 0.00015,
  springK = 0.04,
  damping = 0.85
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, active: false });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Procedural gradient color stops
  const colorStops = [
    { r: 255, g: 235, b: 59 },   // Yellow (Center)
    { r: 255, g: 152, b: 0 },    // Orange
    { r: 233, g: 30, b: 99 },    // Pink/Red
    { r: 156, g: 39, b: 176 },   // Purple
    { r: 63, g: 81, b: 181 },    // Indigo
    { r: 30, g: 144, b: 255 }    // Deep Blue (Edge)
  ];

  // Helper to interpolate colors for the radial gradient feel
  const getInterpolatedColor = (d) => {
    // Clamp d to [0, 1]
    const clampedD = Math.max(0, Math.min(1, d));
    const val = clampedD * (colorStops.length - 1);
    const idx = Math.floor(val);
    const pct = val - idx;

    if (idx >= colorStops.length - 1) {
      return colorStops[colorStops.length - 1];
    }

    const c1 = colorStops[idx];
    const c2 = colorStops[idx + 1];

    return {
      r: Math.round(c1.r * (1 - pct) + c2.r * pct),
      g: Math.round(c1.g * (1 - pct) + c2.g * pct),
      b: Math.round(c1.b * (1 - pct) + c2.b * pct)
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let particles = [];
    let isComponentMounted = true;

    // Handle high-DPI displays
    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      ctx.scale(dpr, dpr);
      setDimensions({ width: rect.width, height: rect.height });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial procedural particle generation
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        // Distribute particles using radial probability distribution
        // Center is dense, edges fade (using power function on uniform random value)
        const angle = Math.random() * Math.PI * 2;
        const normalizedRadius = Math.pow(Math.random(), 2.2); 
        const distance = baseOrbRadius * normalizedRadius;

        const x0 = Math.cos(angle) * distance;
        const y0 = Math.sin(angle) * distance;

        // Depth z-factor mapping: 1.0 (closest/largest) to 0.1 (furthest/smallest)
        const z = 0.1 + (1 - normalizedRadius) * 0.9 + (Math.random() - 0.5) * 0.1;
        const clampedZ = Math.max(0.1, Math.min(1.0, z));

        // Procedural radial color mapping
        const color = getInterpolatedColor(normalizedRadius);

        // Precompute values to avoid allocations in animation loop
        particles.push({
          // Original layout offsets relative to orb center
          x0,
          y0,
          radius: distance,
          angle,
          
          // Current physics state
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          
          // Attributes
          z: clampedZ,
          size: Math.max(0.5, 0.8 + clampedZ * 1.6),
          baseOpacity: 0.15 + clampedZ * 0.7,
          color,
          seed: Math.random() * 1000
        });
      }
    };

    initParticles();

    // Set initial positions immediately
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    particles.forEach(p => {
      p.x = centerX + p.x0;
      p.y = centerY + p.y0;
    });

    let time = 0;

    // Render / Animation Loop
    const render = () => {
      if (!isComponentMounted) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Increment clock
      time += 1.0;

      // Subtle global floating motion
      const globalFloatX = Math.sin(time * 0.005) * 12;
      const globalFloatY = Math.cos(time * 0.004) * 8;

      // Dynamic theme checks
      const isThemeDark = document.documentElement.classList.contains('dark');
      const globalOpacityMultiplier = isThemeDark ? 0.9 : 0.55;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // 1. Slow rotation
        const rotAngle = time * rotationSpeed * (1.3 - p.z);
        const rotX = p.x0 * Math.cos(rotAngle) - p.y0 * Math.sin(rotAngle);
        const rotY = p.x0 * Math.sin(rotAngle) + p.y0 * Math.cos(rotAngle);

        // 2. Breathing scale oscillation
        const breathing = 1 + Math.sin(time * breathingSpeed + p.seed) * 0.035;
        const breathX = rotX * breathing;
        const breathY = rotY * breathing;

        // 3. Parallax internal drift (harmonic waves based on depth z-factor)
        const driftX = Math.sin(time * driftSpeed + p.seed * 3) * 6 * p.z;
        const driftY = Math.cos(time * driftSpeed + p.seed * 5) * 6 * p.z;

        // Combine base position
        let targetX = centerX + breathX + driftX + globalFloatX;
        let targetY = centerY + breathY + driftY + globalFloatY;

        // 4. Force field repulsion calculation
        if (mouseRef.current.active && mouseRef.current.x !== null) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < interactionRadius) {
            // Soft force field falloff curve
            const force = (1 - dist / interactionRadius) * repulsionStrength;
            const angle = Math.atan2(dy, dx);
            
            // Repel target position away from cursor, scaled by depth z-factor
            targetX += Math.cos(angle) * force * p.z;
            targetY += Math.sin(angle) * force * p.z;
          }
        }

        // 5. Spring-Mass-Damper physics solver
        const ax = (targetX - p.x) * springK;
        const ay = (targetY - p.y) * springK;

        p.vx = (p.vx + ax) * damping;
        p.vy = (p.vy + ay) * damping;

        p.x += p.vx;
        p.y += p.vy;

        // 6. Twinkling opacity fluctuation
        const twinkle = 0.85 + Math.sin(time * 0.08 + p.seed) * 0.15;
        const finalOpacity = Math.max(0, Math.min(1.0, p.baseOpacity * twinkle * globalOpacityMultiplier));

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${finalOpacity})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isComponentMounted = false;
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    particleCount,
    baseOrbRadius,
    interactionRadius,
    repulsionStrength,
    breathingSpeed,
    driftSpeed,
    rotationSpeed,
    springK,
    damping
  ]);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        mouseRef.current = { x, y, active: true };
      } else {
        mouseRef.current.active = false;
      }
    };

    const handleGlobalMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseleave', handleGlobalMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseleave', handleGlobalMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none', // Set to none so it never blocks overlay clicks or buttons
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
