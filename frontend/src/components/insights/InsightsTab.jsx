import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Map, 
  GitPullRequest, 
  User, 
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

const InsightsTab = ({ user }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [simNodes, setSimNodes] = useState([]);
  const [simLinks, setSimLinks] = useState([]);
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Overlay filters
  const [overlay, setOverlay] = useState('department'); // 'department', 'risk', 'tenure'
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity);

  const svgRef = useRef(null);
  const token = localStorage.getItem('wfm_token');

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchGraphData = async () => {
    try {
      const res = await fetch(`${API_BASE}/insights/graph`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNarrative = async () => {
    try {
      const res = await fetch(`${API_BASE}/insights/narrative`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNarrative(data.narrative);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGraphData();
    fetchNarrative();
  }, []);

  // D3 Force Simulation Setup
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    const width = 600;
    const height = 400;

    // Clone data to prevent direct state mutation
    const nodes = graphData.nodes.map(d => ({ ...d }));
    const links = graphData.links.map(d => ({ ...d }));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25));

    simulation.on("tick", () => {
      setSimNodes([...nodes]);
      setSimLinks([...links]);
    });

    // Node Dragging integration
    const svgElement = d3.select(svgRef.current);
    
    // Configure D3 zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        setZoomTransform(event.transform);
      });
    svgElement.call(zoom);

    // Cleanup old selections
    svgElement.selectAll(".node-g").remove();

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  // Color Mapping logic
  const getNodeColor = (node) => {
    if (overlay === 'risk') {
      switch (node.risk_score) {
        case 'High': return '#ef4444'; // Red
        case 'Medium': return '#f59e0b'; // Orange
        default: return '#10b981'; // Green
      }
    }
    
    if (overlay === 'tenure') {
      // Gradient intensity based on tenure days
      const days = node.tenure || 0;
      if (days > 365) return '#1e3a8a'; // Dark blue (long tenure)
      if (days > 180) return '#3b82f6'; // Medium blue
      return '#93c5fd'; // Light blue (new hires)
    }

    // Color by Department
    const dept = node.department || 'Unassigned';
    if (dept.includes('Corp') || dept.includes('Executive')) return '#8b5cf6'; // Purple
    if (dept.includes('Eng')) return '#2563eb'; // Blue
    if (dept.includes('Mark')) return '#ec4899'; // Pink
    return '#64748b'; // Slate gray
  };

  // Drag Handlers for SVG node circles
  const dragNode = (e, index) => {
    const node = simNodes[index];
    if (!node) return;
    
    // Update coordinates directly
    node.x = e.nativeEvent.offsetX;
    node.y = e.nativeEvent.offsetY;
    node.fx = node.x;
    node.fy = node.y;
    
    setSimNodes([...simNodes]);
  };

  const releaseNode = (index) => {
    const node = simNodes[index];
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  };

  // Compute metrics for scorecard
  const highRiskEmployees = simNodes.filter(n => n.risk_score === 'High');
  const benchEmployees = simNodes.filter(n => n.team_size === 0 && n.tenure > 30); // Placeholder unassigned reports

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Narrative highlights summary */}
      {narrative && (
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '16px', right: '16px', color: '#3b82f6', opacity: 0.15 }}>
            <Sparkles size={64} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={18} style={{ color: '#2563eb' }} />
            <h4 style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Workforce Intelligence Summary
            </h4>
          </div>
          <div 
            style={{ fontSize: '14.5px', color: '#334155', lineHeight: '1.6', fontFamily: 'var(--font-body)' }}
            dangerouslySetInnerHTML={{ __html: narrative.replace(/\n/g, '<br/>') }}
          />
        </div>
      )}

      {/* Main Graph & Drawer Split Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '32px' }}>
        
        {/* Interactive Network Graph */}
        <div className="auth-card" style={{ padding: '30px', maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>
                Org Network Graph
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Drag nodes to examine reporting links. Node sizes show team counts.
              </p>
            </div>
            
            {/* Filter Overlays */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'department', label: 'Department' },
                { id: 'risk', label: 'Attrition Risk' },
                { id: 'tenure', label: 'Tenure Heatmap' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setOverlay(btn.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    borderRadius: '20px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    background: overlay === btn.id ? '#2563eb' : '#ffffff',
                    color: overlay === btn.id ? '#ffffff' : '#475569',
                    fontWeight: 'bold',
                    transition: 'all 0.15s'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* SVG canvas */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', height: '400px', position: 'relative' }}>
            <svg 
              ref={svgRef} 
              width="100%" 
              height="100%" 
              viewBox="0 0 600 400"
              style={{ cursor: 'grab' }}
            >
              <g transform={zoomTransform.toString()}>
                {/* Lines (reporting connections) */}
                {simLinks.map((link, idx) => (
                  <line
                    key={`link-${idx}`}
                    x1={link.source.x}
                    y1={link.source.y}
                    x2={link.target.x}
                    y2={link.target.y}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeOpacity="0.8"
                  />
                ))}

                {/* Circles (employees) */}
                {simNodes.map((node, idx) => {
                  const color = getNodeColor(node);
                  const size = 12 + Math.min(node.team_size * 4, 16); // base radius 12, scales with team
                  
                  return (
                    <g 
                      key={`node-${node.id}`} 
                      transform={`translate(${node.x || 0}, ${node.y || 0})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedNode(node)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        // locks node
                        node.fx = node.x;
                        node.fy = node.y;
                      }}
                      onMouseMove={(e) => {
                        if (node.fx !== null) {
                          dragNode(e, idx);
                        }
                      }}
                      onMouseUp={() => releaseNode(idx)}
                      onMouseLeave={() => releaseNode(idx)}
                    >
                      <circle
                        r={size}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth="2"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                      />
                      <text
                        dy="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9px"
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        {node.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* Selected employee profile drawer slide-in / default info card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedNode ? (
            <div className="auth-card" style={{ padding: '30px', background: '#ffffff', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>
                  👤 Node Profile
                </h4>
                <button 
                  onClick={() => setSelectedNode(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Name / Employee ID</span>
                  <strong>{selectedNode.name}</strong> ({selectedNode.employee_id})
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Department & Designation</span>
                  <strong>{selectedNode.department}</strong> - {selectedNode.designation}
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Workspace Tenure</span>
                  <strong>{selectedNode.tenure} days</strong> (Joined {365 > selectedNode.tenure ? 'recently' : 'over 1yr ago'})
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Direct Reports Size</span>
                  <strong>{selectedNode.team_size} direct reports</strong>
                </div>
                
                {/* Risk assessment indicator */}
                <div style={{ marginTop: '6px' }}>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Audited Attrition Risk</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    background: selectedNode.risk_score === 'High' ? '#fee2e2' : selectedNode.risk_score === 'Medium' ? '#fef3c7' : '#d1fae5',
                    color: selectedNode.risk_score === 'High' ? '#ef4444' : selectedNode.risk_score === 'Medium' ? '#d97706' : '#065f46'
                  }}>
                    {selectedNode.risk_score} Risk
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="auth-card" style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <User size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
              <h4 style={{ margin: 0, fontWeight: '600' }}>Select Node</h4>
              <p style={{ fontSize: '13px' }}>Click any node on the graph canvas to inspect employee details and reporting manager lines.</p>
            </div>
          )}

          {/* Attrition Risk Signals scorecard */}
          <div className="auth-card" style={{ padding: '30px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontWeight: '700', fontSize: '15px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} /> Attrition Signals & Risk Audits
            </h4>
            
            {highRiskEmployees.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>No high attrition risks flagged by rule engine.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {highRiskEmployees.map(emp => (
                  <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 14px', background: '#fff5f5' }}>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: '#991b1b' }}>{emp.name}</span>
                      <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '6px' }}>({emp.department})</span>
                    </div>
                    <span style={{ fontSize: '11px', background: '#ef4444', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                      High Risk
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default InsightsTab;
