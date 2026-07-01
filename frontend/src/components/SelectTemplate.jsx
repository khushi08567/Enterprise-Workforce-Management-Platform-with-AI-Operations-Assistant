const SelectTemplate = () => {
  const [animate, setAnimate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Trigger stagger animation on load
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const templates = [
    {
      id: 1,
      label: "Minimalist Portfolio",
      badge: "Featured",
      styleClass: "card-coral-peach",
      subTitle: "Clean editorial layout for creators"
    },
    {
      id: 2,
      label: "Creative Writing Blog",
      badge: "Personal",
      styleClass: "card-butter-dots",
      subHtml: (
        <div className="blob-container">
          <div className="blob blob-one"></div>
          <div className="blob blob-two"></div>
        </div>
      ),
      subTitle: "Elegant typography-first layout"
    },
    {
      id: 3,
      label: "Artisan Commerce Shop",
      badge: "E-Commerce",
      styleClass: "card-rose-grain card-noise",
      subTitle: "Warm tactile grid for physical goods"
    },
    {
      id: 4,
      label: "Creative Agency Hub",
      badge: "Full-stack",
      styleClass: "card-sunset-slope",
      subTitle: "Multi-page showcase for studios"
    },
    {
      id: 5,
      label: "SaaS Product Dashboard",
      badge: "Admin",
      styleClass: "card-mustard-cream",
      subTitle: "Minimalist metrics and charts grid"
    },
    {
      id: 6,
      label: "Ethereal Workspace Docs",
      badge: "New",
      styleClass: "card-mesh-aurora",
      subTitle: "Document repository and wiki style"
    },
    {
      id: 7,
      label: "Creative Event Organizer",
      badge: "Template",
      styleClass: "card-salmon-flow",
      subHtml: (
        <div className="flow-lines">
          <div className="circle-orb"></div>
        </div>
      ),
      subTitle: "Warm schedules and ticket bookings"
    },
    {
      id: 8,
      label: "Interactive Dev Showcase",
      badge: "Customizable",
      styleClass: "card-shifting-drift",
      subTitle: "Glow hovers and dynamic code grids"
    }
  ];

  return (
    <div className="gallery-wrapper">
      {/* Dynamic Background Blur Blobs */}
      <div className="ambient-bg">
        <div className="ambient-blob ambient-yellow"></div>
        <div className="ambient-blob ambient-red"></div>
      </div>

      <header className={`gallery-header ${animate ? 'in-view' : ''}`}>
        <h1 className="gallery-title">Select template</h1>
        <p className="gallery-subtitle">Choose a starting point crafted with soft color harmony and organic motion.</p>
      </header>

      <div className={`gallery-grid ${animate ? 'in-view' : ''}`}>
        {templates.map((tpl, idx) => (
          <div 
            key={tpl.id} 
            className="gallery-item"
            style={{ 
              animationDelay: `${idx * 80 + 150}ms` 
            }}
          >
            {/* Template Preview Card (16:9) */}
            <div 
              className={`template-card ${tpl.styleClass} ${selectedId === tpl.id ? 'selected' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedId(selectedId === tpl.id ? null : tpl.id)}
            >
              {tpl.subHtml}
              {tpl.badge && <span className="card-badge">{tpl.badge}</span>}
              {selectedId === tpl.id && <span className="card-selected-badge">Selected ✓</span>}
              <div className="card-glass-tint"></div>
            </div>

            {/* Label and Subtext below card */}
            <div className="template-info">
              <h2 className="template-label">{tpl.label}</h2>
              <p className="template-subtext">{tpl.subTitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SVG Turbulence/Noise Filter - Hidden but referenced in CSS */}
      <svg style={{ display: 'none' }}>
        <filter id="grainyNoise">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.65" 
            numOctaves="3" 
            stitchTiles="stitch" 
          />
          <feColorMatrix 
            type="matrix" 
            values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.08 0" 
          />
        </filter>
      </svg>
    </div>
  );
};

export default SelectTemplate;
