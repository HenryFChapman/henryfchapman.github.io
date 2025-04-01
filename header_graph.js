// Define global constants
const NUM_NODES = 300; // Increased for more density
const NUM_CLUSTERS = 20; // Increased for better coverage
const BASE_NODE_RADIUS = 12; // Base size for nodes
const LINK_DISTANCE = 50; // Reduced for tighter connections
const REPULSION_STRENGTH = 0.2; // Reduced for gentler movement
const COLLISION_RADIUS = 15; // Adjusted for better clustering

// Define cluster information with subtle colors
const clusterInfo = [
    { color: '#2B6CB0' }, // Deep Blue
    { color: '#38A169' }, // Green
    { color: '#E53E3E' }, // Red
    { color: '#805AD5' }, // Purple
    { color: '#00B5D8' }, // Cyan
    { color: '#9F7AEA' }, // Light Purple
    { color: '#4299E1' }, // Light Blue
    { color: '#48BB78' }, // Light Green
    { color: '#F56565' }, // Light Red
    { color: '#B794F4' }, // Very Light Purple
    { color: '#2B6CB0' }, // Deep Blue
    { color: '#38A169' }, // Green
    { color: '#E53E3E' }, // Red
    { color: '#805AD5' }, // Purple
    { color: '#00B5D8' }, // Cyan
    { color: '#9F7AEA' }, // Light Purple
    { color: '#4299E1' }, // Light Blue
    { color: '#48BB78' }, // Light Green
    { color: '#F56565' }, // Light Red
    { color: '#B794F4' }  // Very Light Purple
];

// Generate simplified clustered data
function generateClusteredData() {
    const nodes = [];
    const links = [];
    const nodesPerCluster = 15;
    
    // Create nodes with cluster assignments and varying sizes
    for (let i = 0; i < NUM_NODES; i++) {
        const group = Math.floor(i / nodesPerCluster) + 1;
        const clusterIndex = i % nodesPerCluster;
        
        // Calculate size based on position in cluster
        // Nodes at the edges (first and last 3) are larger
        let size = 1;
        if (clusterIndex < 3 || clusterIndex > nodesPerCluster - 4) {
            size = 1.4; // 40% larger for edge nodes
        } else if (clusterIndex < 5 || clusterIndex > nodesPerCluster - 6) {
            size = 1.2; // 20% larger for near-edge nodes
        }
        
        nodes.push({
            id: `node${i}`,
            group: group,
            size: size
        });
    }
    
    // Create links between nodes in the same cluster
    for (let i = 0; i < NUM_NODES; i++) {
        for (let j = i + 1; j < NUM_NODES; j++) {
            if (nodes[i].group === nodes[j].group) {
                links.push({
                    source: nodes[i],
                    target: nodes[j],
                    group: nodes[i].group
                });
            }
        }
    }
    
    return { nodes, links };
}

// Create the force graph
function createForceGraph() {
    // Clear any existing SVG
    d3.select('.hero-background').selectAll('svg').remove();
    
    // Get container dimensions
    const container = document.querySelector('.hero-background');
    const width = window.innerWidth;
    const height = container.offsetHeight;
    
    // Create SVG
    const svg = d3.select('.hero-background')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('position', 'absolute')
        .style('top', '0')
        .style('left', '0')
        .style('opacity', 0.2); // More transparent for better text readability

    // Generate data
    const data = generateClusteredData();

    // Calculate grid dimensions
    const cols = 5; // 5 columns
    const rows = 4; // 4 rows
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    // Create scales for grid-based distribution
    const x = d3.scaleOrdinal()
        .domain(d3.range(1, NUM_CLUSTERS + 1))
        .range(d3.range(0, cols).map(i => (i + 0.5) * cellWidth));

    const y = d3.scaleOrdinal()
        .domain(d3.range(1, NUM_CLUSTERS + 1))
        .range(d3.range(0, rows).map(i => (i + 0.5) * cellHeight));

    const color = d3.scaleOrdinal()
        .domain(d3.range(1, NUM_CLUSTERS + 1))
        .range(clusterInfo.map(c => c.color));

    // Create links with more subtle appearance
    const link = svg.append('g')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .style('stroke', d => color(d.group))
        .style('stroke-opacity', 0.03) // More transparent
        .style('stroke-width', 1);

    // Create nodes with more subtle appearance and varying sizes
    const node = svg.append('g')
        .selectAll('circle')
        .data(data.nodes)
        .join('circle')
        .attr('r', d => BASE_NODE_RADIUS * d.size)
        .style('fill', d => color(d.group))
        .style('fill-opacity', 0.4) // More transparent
        .style('stroke', 'white')
        .style('stroke-width', d => 1.5 * d.size) // Scale stroke width with node size
        .style('stroke-opacity', 0.2)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Create force simulation with adjusted forces for more organic movement
    const simulation = d3.forceSimulation(data.nodes)
        .force('x', d3.forceX().strength(0.15).x(d => x(d.group)))
        .force('y', d3.forceY().strength(0.15).y(d => y(d.group)))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('charge', d3.forceManyBody().strength(REPULSION_STRENGTH))
        .force('collide', d3.forceCollide().strength(0.1).radius(d => COLLISION_RADIUS * d.size).iterations(1))
        .on('tick', function() {
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
        });

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.03).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0.03);
        d.fx = null;
        d.fy = null;
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', createForceGraph);

// Recreate the graph when the window is resized
window.addEventListener('resize', createForceGraph); 