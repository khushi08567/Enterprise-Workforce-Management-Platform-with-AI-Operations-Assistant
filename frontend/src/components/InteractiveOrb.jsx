import React, { useEffect, useRef, useState } from 'react';

/**
 * InteractiveOrb
 * A self-contained, high-performance procedural 2D canvas component inspired by
 * Google Antigravity. Creates a particle-based floating orb made of sparse radial
 * streams of tiny dash-shaped elements aligned to the flow.
 */
export default function InteractiveOrb({
  particleCount = 1800,
  baseOrbRadius = 250,
  interactionRadius = 160,
  repulsionStrength = 65,
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

  // Procedural gradient color stops (Golden Yellow -> Orange -> Magenta -> Purple -> Indigo -> Deep Blue)
  const colorStops = [
    { r: 255, g: 215, b: 0 },   // Golden yellow (Center)
    { r: 255, g: 135, b: 0 },   // Orange
    { r: 233, g: 30, b: 99 },   // Magenta / Pink
    { r: 156, g: 39, b: 176 },  // Purple
    { r: 63, g: 81, b: 181 },   // Indigo
    { r: 26, g: 35, b: 126 }    // Deep blue (Edge)
  ];

  // Helper to interpolate colors for the radial gradient feel
  const getInterpolatedColor = (d) => {
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
      const numRings = 22;
      const streamAngles = Array.from({ length: 5 }, (_, s) => (s / 5) * Math.PI * 2);
      
      const getAngularDistance = (a, b) => {
        const diff = Math.abs(a - b) % (Math.PI * 2);
        return diff > Math.PI ? Math.PI * 2 - diff : diff;
      };

      let generatedCount = 0;
      
      // Generate particles along concentric rings (leaving the center 22% radius open)
      for (let r = 2; r < numRings; r++) {
        const radiusPct = r / numRings;
        const radius = baseOrbRadius * (0.22 + radiusPct * 0.78);
        
        // Spacing grows wider as we go outward (sparser edges)
        const ringSpacing = 30 * (1.0 + radiusPct * 1.5);
        const circumference = 2 * Math.PI * radius;
        const count = Math.floor(circumference / ringSpacing);

        for (let j = 0; j < count; j++) {
          const baseAngle = (j / count) * Math.PI * 2;
          const angle = baseAngle + (Math.random() - 0.5) * 0.08;

          // Filter to distribute in radial arcs (streams)
          let inStream = false;
          for (let s = 0; s < streamAngles.length; s++) {
            if (getAngularDistance(angle, streamAngles[s]) < 0.38) {
              inStream = true;
              break;
            }
          }

          if (!inStream) continue;

          const x0 = Math.cos(angle) * radius;
          const y0 = Math.sin(angle) * radius;

          // Depth z-factor mapping: 1.0 (foreground) to 0.15 (background)
          const z = 0.15 + (1.0 - radiusPct) * 0.8 + (Math.random() - 0.5) * 0.08;
          const clampedZ = Math.max(0.15, Math.min(1.0, z));

          const color = getInterpolatedColor(radiusPct);
          const seed = Math.random() * 1000;

          particles.push({
            x0,
            y0,
            radius,
            angle,
            
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            
            z: clampedZ,
            length: Math.max(1.8, 2.2 + clampedZ * 2.8),
            thickness: 1.0,
            baseOpacity: 0.18 + clampedZ * 0.62,
            color,
            seed
          });

          generatedCount++;
          if (generatedCount >= particleCount) break;
        }
        if (generatedCount >= particleCount) break;
      }
    };

    initParticles();

    let hasInitializedPositions = false;
    let time = 0;

    // Render / Animation Loop
    const render = () => {
      if (!isComponentMounted) return;

      const rect = containerRef.current.getBoundingClientRect();
      
      // Wait for layout calculation to give non-zero dimensions
      if (rect.width === 0 || rect.height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (!hasInitializedPositions) {
        particles.forEach(p => {
          p.x = centerX + p.x0;
          p.y = centerY + p.y0;
        });
        hasInitializedPositions = true;
      }

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Increment clock
      time += 1.0;

      // Subtle global floating motion
      const globalFloatX = Math.sin(time * 0.005) * 12;
      const globalFloatY = Math.cos(time * 0.004) * 8;

      // Dynamic theme checks
      const isThemeDark = document.documentElement.classList.contains('dark');
      const globalOpacityMultiplier = isThemeDark ? 0.95 : 0.6;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Slow orbital movement
        const rotAngle = time * rotationSpeed * (1.3 - p.z);
        const currentAngle = p.angle + rotAngle;

        // 2. Breathing scale oscillation
        const breathing = 1 + Math.sin(time * breathingSpeed + p.seed) * 0.035;
        const currentRadius = p.radius * breathing;

        const rotX = Math.cos(currentAngle) * currentRadius;
        const rotY = Math.sin(currentAngle) * currentRadius;

        // 3. Parallax internal drift (harmonic waves based on depth z-factor)
        const driftX = Math.sin(time * driftSpeed + p.seed * 3) * 6 * p.z;
        const driftY = Math.cos(time * driftSpeed + p.seed * 5) * 6 * p.z;

        // Combine base target position
        let targetX = centerX + rotX + driftX + globalFloatX;
        let targetY = centerY + rotY + driftY + globalFloatY;

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

        // 7. Calculate flow direction of the dash (radial flow following circumference + seed tilt offset)
        const flowAngle = currentAngle + Math.PI / 2 + (p.seed % 0.26 - 0.13);
        const tx = Math.cos(flowAngle);
        const ty = Math.sin(flowAngle);

        const halfLen = p.length / 2;
        const x1 = p.x - tx * halfLen;
        const y1 = p.y - ty * halfLen;
        const x2 = p.x + tx * halfLen;
        const y2 = p.y + ty * halfLen;

        // Draw dash line segment
        ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${finalOpacity})`;
        ctx.lineWidth = p.thickness;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
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
        bottom: 0,
        left: 0,
        right: 0,
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
          bottom: 0,
          left: 0,
          right: 0,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
