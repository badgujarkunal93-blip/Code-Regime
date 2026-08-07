import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceX,
  forceY,
  forceCollide
} from 'd3-force';
import 'd3-transition';
import { 
  ZoomIn, ZoomOut, RotateCcw, Building2, MapPin, 
  Skull, X, Search, Filter, Layers, DollarSign, 
  Sparkles, ExternalLink, Activity, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import Logo from '../components/Logo';
import rawSeedData from '../data/seedData.json';

// Group color definitions with glow effects & badges
const NODE_GROUPS = {
  COMPANY: { id: 1, label: 'Startups', color: '#C99134', stroke: '#F59E0B', glow: 'rgba(201,145,52,0.6)' },
  FAILURE: { id: 9, label: 'Failure Causes', color: '#EF4444', stroke: '#F87171', glow: 'rgba(239,68,68,0.6)' },
  INDUSTRY: { id: 2, label: 'Industries', color: '#3B82F6', stroke: '#60A5FA', glow: 'rgba(59,130,246,0.6)' },
  INVESTOR: { id: 8, label: 'Investors', color: '#10B981', stroke: '#34D399', glow: 'rgba(16,185,129,0.6)' },
  FOUNDER: { id: 7, label: 'Founders', color: '#EC4899', stroke: '#F472B6', glow: 'rgba(236,72,153,0.6)' },
};

function getNodeStyle(group) {
  switch (group) {
    case 9: return NODE_GROUPS.FAILURE;
    case 2: return NODE_GROUPS.INDUSTRY;
    case 8: return NODE_GROUPS.INVESTOR;
    case 7: return NODE_GROUPS.FOUNDER;
    default: return NODE_GROUPS.COMPANY;
  }
}

// Generate an interconnected knowledge graph from 413+ startup seed dataset
function generateGraphFromSeedData() {
  const nodes = [];
  const links = [];
  const nodeMap = new Map();

  const addNode = (id, name, group, extra = {}) => {
    if (!nodeMap.has(id)) {
      const node = { id, name, label: name, group, ...extra };
      nodeMap.set(id, node);
      nodes.push(node);
    }
    return nodeMap.get(id);
  };

  const addLink = (sourceId, targetId, relation = 'connected') => {
    if (sourceId && targetId && sourceId !== targetId) {
      links.push({ source: sourceId, target: targetId, relation, value: 1 });
    }
  };

  // Add Failure Cause Nodes
  const failureTypes = [
    { id: 'f-pmf', name: 'No Product-Market Fit', group: 9 },
    { id: 'f-cash', name: 'Ran Out of Cash / High Burn', group: 9 },
    { id: 'f-fraud', name: 'Governance & Fraud', group: 9 },
    { id: 'f-unit', name: 'Unprofitable Unit Economics', group: 9 },
    { id: 'f-scale', name: 'Premature Scaling', group: 9 },
    { id: 'f-legal', name: 'Regulatory & Legal Battle', group: 9 },
    { id: 'f-competition', name: 'Outcompeted by Rivals', group: 9 },
  ];
  failureTypes.forEach(f => addNode(f.id, f.name, f.group, { isCategory: true }));

  // Add Top Industries
  const topIndustries = ['EdTech', 'Health Tech', 'Crypto / Web3', 'Food Delivery', 'Mobility & Auto', 'Hardware & Consumer', 'FinTech', 'E-Commerce'];
  topIndustries.forEach(ind => addNode(`ind-${ind.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, ind, 2, { isCategory: true }));

  // Top Investors
  const topInvestors = ['Sequoia Capital', 'Y Combinator', 'SoftBank Vision Fund', 'Andreessen Horowitz', 'Tiger Global', 'Founders Fund'];
  topInvestors.forEach(inv => addNode(`inv-${inv.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, inv, 8, { isCategory: true }));

  // Populate Startups & Create Interconnections
  (rawSeedData || []).forEach((item, idx) => {
    const name = item.name || `Startup ${idx + 1}`;
    const slug = item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const startupId = `c-${slug}`;

    addNode(startupId, name, 1, {
      slug,
      industry: item.industry || 'Technology',
      status: item.status || 'failed',
      funding: item.funding || '$50M',
      fundingInr: item.fundingInr || 50000000,
      summary: item.summary || item.tagline || 'Startup postmortem analysis.',
      country: item.country || 'USA',
      foundingYear: item.foundingYear || 2015,
      shutdownYear: item.shutdownYear || 2022
    });

    // Connect to Failure Cause
    const failCat = (item.failureCategory || item.topFailureReason || '').toLowerCase();
    let targetFailId = 'f-pmf';
    if (failCat.includes('cash') || failCat.includes('burn') || failCat.includes('finance')) targetFailId = 'f-cash';
    else if (failCat.includes('fraud') || failCat.includes('gov')) targetFailId = 'f-fraud';
    else if (failCat.includes('unit') || failCat.includes('margin')) targetFailId = 'f-unit';
    else if (failCat.includes('scale') || failCat.includes('growth')) targetFailId = 'f-scale';
    else if (failCat.includes('legal') || failCat.includes('reg')) targetFailId = 'f-legal';
    else if (failCat.includes('comp') || failCat.includes('rival')) targetFailId = 'f-competition';
    addLink(startupId, targetFailId, 'failed_due_to');

    // Connect to Industry
    if (item.industry) {
      const indSlug = `ind-${item.industry.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      addNode(indSlug, item.industry, 2, { isCategory: true });
      addLink(startupId, indSlug, 'in_industry');
    }

    // Connect to Founders
    if (Array.isArray(item.founders)) {
      item.founders.slice(0, 2).forEach(fName => {
        if (typeof fName === 'string' && fName.trim().length > 2) {
          const fId = `fnd-${fName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          addNode(fId, fName.trim(), 7);
          addLink(startupId, fId, 'founded_by');
        }
      });
    }

    // Connect to Investors
    if (Array.isArray(item.investors)) {
      item.investors.slice(0, 2).forEach(invName => {
        if (typeof invName === 'string' && invName.trim().length > 2) {
          const invId = `inv-${invName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          addNode(invId, invName.trim(), 8);
          addLink(startupId, invId, 'funded_by');
        }
      });
    }
  });

  return { nodes, links };
}

const KnowledgeGraph = () => {
  const { companyId } = useParams();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const zoomRef = useRef(null);

  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterGroup, setActiveFilterGroup] = useState('ALL');
  const [hoveredNode, setHoveredNode] = useState(null);
  const { theme } = useTheme();

  // Load and construct knowledge graph dataset
  useEffect(() => {
    const data = generateGraphFromSeedData();
    setGraphData(data);

    // If companyId param present, pre-select that node
    if (companyId) {
      const targetSlug = companyId.toLowerCase();
      const match = data.nodes.find(n => n.slug === targetSlug || n.id === `c-${targetSlug}`);
      if (match) setSelectedNode(match);
    }
  }, [companyId]);

  // Filter nodes based on searchQuery and activeFilterGroup
  const filteredGraph = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    let nodes = graphData.nodes;

    if (activeFilterGroup !== 'ALL') {
      const targetGroupId = NODE_GROUPS[activeFilterGroup]?.id;
      if (targetGroupId) {
        nodes = nodes.filter(n => n.group === targetGroupId);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      nodes = nodes.filter(n => (n.name || n.label || '').toLowerCase().includes(q));
    }

    // Keep links where both source and target exist in filtered nodes
    const nodeSet = new Set(nodes.map(n => n.id));
    const links = graphData.links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeSet.has(s) && nodeSet.has(t);
    });

    return { nodes, links };
  }, [graphData, searchQuery, activeFilterGroup]);

  // Render D3 Force Directed Simulation
  useEffect(() => {
    if (!filteredGraph.nodes.length || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Clear previous SVG contents
    select(containerRef.current).selectAll('svg').remove();

    const svg = select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    svgRef.current = svg.node();

    // SVG Defs for Glow Filters
    const defs = svg.append('defs');
    Object.values(NODE_GROUPS).forEach(g => {
      const filter = defs.append('filter')
        .attr('id', `glow-${g.id}`)
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
      filter.append('feDropShadow')
        .attr('dx', 0)
        .attr('dy', 0)
        .attr('stdDeviation', 4)
        .attr('flood-color', g.color)
        .attr('flood-opacity', 0.6);
    });

    const g = svg.append('g');

    // D3 Zoom & Pan setup
    const zoom = d3Zoom()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));

    zoomRef.current = zoom;
    svg.call(zoom);

    const processedNodes = filteredGraph.nodes.map(n => ({ ...n }));
    const processedLinks = filteredGraph.links.map(l => ({ ...l }));

    // D3 Force Simulation
    const simulation = forceSimulation(processedNodes)
      .force('link', forceLink(processedLinks).id(d => d.id).distance(d => (d.source.group === 9 || d.target.group === 9 ? 160 : 120)))
      .force('charge', forceManyBody().strength(-400))
      .force('center', forceCenter(width / 2, height / 2))
      .force('x', forceX(width / 2).strength(0.04))
      .force('y', forceY(height / 2).strength(0.04))
      .force('collide', forceCollide().radius(d => d.group === 9 ? 32 : (d.group === 1 ? 26 : 20)));

    // Render Link Lines
    const link = g.append('g')
      .attr('stroke', theme === 'blue' ? 'rgba(75, 85, 99, 0.4)' : 'rgba(203, 213, 225, 0.6)')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(processedLinks)
      .join('line')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.relation === 'failed_due_to' ? '4,4' : 'none');

    // Render Node Groups
    const node = g.append('g')
      .selectAll('g')
      .data(processedNodes)
      .join('g')
      .call(d3Drag()
        .on('start', (event) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on('drag', (event) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on('end', (event) => {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }))
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      })
      .on('mouseenter', (event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null));

    // Node Circles
    node.append('circle')
      .attr('r', d => d.group === 9 ? 22 : (d.group === 1 ? 18 : 14))
      .attr('fill', d => getNodeStyle(d.group).color)
      .attr('stroke', d => getNodeStyle(d.group).stroke)
      .attr('stroke-width', d => d.isCategory ? 3.5 : 2)
      .style('cursor', 'pointer')
      .style('filter', d => `url(#glow-${d.group})`)
      .on('mouseenter', function (event, d) {
        select(this).transition().duration(200).attr('r', d.group === 9 ? 26 : (d.group === 1 ? 22 : 18));
      })
      .on('mouseleave', function (event, d) {
        select(this).transition().duration(200).attr('r', d.group === 9 ? 22 : (d.group === 1 ? 18 : 14));
      });

    // Node Labels
    node.append('text')
      .text(d => d.name || d.label)
      .attr('x', d => d.group === 9 ? 26 : 22)
      .attr('y', 4)
      .attr('fill', theme === 'blue' ? '#F4F4F5' : '#1E293B')
      .attr('font-size', d => d.isCategory ? '13px' : '11px')
      .attr('font-weight', d => d.isCategory ? '700' : '500')
      .attr('font-family', "'Space Grotesk', sans-serif")
      .style('pointer-events', 'none')
      .style('text-shadow', theme === 'blue' ? '0 2px 4px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [filteredGraph, theme]);

  // Zoom controls handlers
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, zoomIdentity);
    }
  };

  // Connected nodes count for selected node
  const connectedCount = useMemo(() => {
    if (!selectedNode || !graphData) return 0;
    return graphData.links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return s === selectedNode.id || t === selectedNode.id;
    }).length;
  }, [selectedNode, graphData]);

  // Connected startups list for failure/category node inspection
  const connectedStartups = useMemo(() => {
    if (!selectedNode || !graphData || selectedNode.group === 1) return [];
    const connectedIds = new Set();
    graphData.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === selectedNode.id && t.startsWith('c-')) connectedIds.add(t);
      if (t === selectedNode.id && s.startsWith('c-')) connectedIds.add(s);
    });
    return graphData.nodes.filter(n => connectedIds.has(n.id));
  }, [selectedNode, graphData]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-bg">
      {/* Top Left Navigation Header & Controls */}
      <div className="absolute top-6 left-6 z-10 space-y-4 max-w-sm">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pv-card p-5 shadow-elevated">
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-5 h-5 text-accent animate-pulse" />
            <h1 className="text-lg font-display font-bold text-text-primary">Failure Knowledge Graph</h1>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mb-4">
            Interactive neural topology connecting <span className="text-[#C99134] font-semibold">413+ Startups</span> across 
            <span className="text-[#EF4444] font-semibold"> Failure Patterns</span>, <span className="text-[#3B82F6] font-semibold"> Industries</span>, and <span className="text-[#10B981] font-semibold"> Investors</span>.
          </p>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search nodes (e.g. Theranos, EdTech, Cash)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-surface-2 border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={() => setActiveFilterGroup('ALL')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                activeFilterGroup === 'ALL' ? 'bg-accent text-white shadow-sm' : 'bg-surface-2 text-text-secondary hover:text-text-primary'
              }`}
            >
              All Nodes ({graphData?.nodes?.length || 0})
            </button>
            {Object.entries(NODE_GROUPS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setActiveFilterGroup(activeFilterGroup === key ? 'ALL' : key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                  activeFilterGroup === key ? 'text-white shadow-sm' : 'bg-surface-2 text-text-secondary hover:text-text-primary'
                }`}
                style={{ backgroundColor: activeFilterGroup === key ? info.color : undefined }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                {info.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Zoom Controls Bar */}
        <div className="pv-card p-1.5 flex items-center gap-1 shadow-elevated w-fit">
          <button onClick={handleZoomIn} className="pv-btn-icon p-2 hover:bg-surface-2 rounded-md text-text-secondary hover:text-text-primary" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="pv-btn-icon p-2 hover:bg-surface-2 rounded-md text-text-secondary hover:text-text-primary" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleResetZoom} className="pv-btn-icon p-2 hover:bg-surface-2 rounded-md text-text-secondary hover:text-text-primary" title="Reset Camera">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* D3 Simulation Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" onClick={() => setSelectedNode(null)} />

      {/* Node Inspection Drawer */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-6 right-6 bottom-6 w-96 pv-card p-6 z-20 overflow-y-auto shadow-elevated border border-border"
          >
            <button 
              onClick={() => setSelectedNode(null)} 
              className="pv-btn-icon absolute top-4 right-4 p-2 rounded-full hover:bg-surface-2 text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header & Logo */}
            <div className="flex items-center gap-4 mb-5 pr-8">
              {selectedNode.group === 1 ? (
                <Logo name={selectedNode.name} domain={selectedNode.domain} size="lg" className="shrink-0" />
              ) : (
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md shrink-0"
                  style={{ backgroundColor: getNodeStyle(selectedNode.group).color }}
                >
                  {selectedNode.group === 9 ? '💀' : selectedNode.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border" style={{ color: getNodeStyle(selectedNode.group).color, borderColor: `${getNodeStyle(selectedNode.group).color}40`, backgroundColor: `${getNodeStyle(selectedNode.group).color}15` }}>
                  {getNodeStyle(selectedNode.group).label}
                </span>
                <h2 className="text-lg font-display font-bold text-text-primary mt-1 line-clamp-2">
                  {selectedNode.name || selectedNode.label}
                </h2>
              </div>
            </div>

            {/* Node Metadata Details */}
            <div className="space-y-4 text-xs text-text-secondary mb-6 border-y border-border py-4">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Network Connections:</span>
                <span className="font-bold text-text-primary bg-surface-2 px-2 py-0.5 rounded">{connectedCount} links</span>
              </div>

              {selectedNode.industry && (
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Industry:</span>
                  <span className="font-semibold text-text-primary">{selectedNode.industry}</span>
                </div>
              )}

              {selectedNode.funding && (
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Total Capital Raised:</span>
                  <span className="font-bold text-accent">{selectedNode.funding}</span>
                </div>
              )}

              {selectedNode.summary && (
                <div className="pt-2">
                  <span className="text-text-muted block mb-1 font-semibold">Postmortem Summary:</span>
                  <p className="text-xs text-text-secondary leading-relaxed bg-surface-2/60 p-3 rounded-lg border border-border/60">
                    {selectedNode.summary}
                  </p>
                </div>
              )}
            </div>

            {/* Connected Startups List for Categories/Investors */}
            {connectedStartups.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-accent" />
                  Associated Startups ({connectedStartups.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {connectedStartups.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => setSelectedNode(s)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2/50 border border-border/50 hover:border-accent/40 cursor-pointer transition-all hover:bg-surface-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Logo name={s.name} size="sm" />
                        <span className="text-xs font-medium text-text-primary truncate">{s.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-text-muted shrink-0">{s.funding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            {selectedNode.group === 1 && selectedNode.slug && (
              <Link 
                to={`/startup/${selectedNode.slug}`}
                className="pv-btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm shadow-md"
              >
                Read Full Autopsy
                <Skull className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KnowledgeGraph;
