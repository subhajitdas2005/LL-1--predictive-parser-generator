/**
 * Interactive SVG Parse Tree Visualizer for LL(1) Derivations.
 * Dynamically computes hierarchical tree coordinates and renders an interactive SVG
 * with zoom, pan, and styled nodes.
 */

export class ParseTreeVisualizer {
  constructor(containerElement) {
    this.container = containerElement;
    this.svg = null;
    this.zoomGroup = null;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.init();
  }

  init() {
    this.container.innerHTML = '';

    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.userSelect = 'none';

    // Zoom/Pan Group
    this.zoomGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.zoomGroup);

    this.container.appendChild(this.svg);

    // Mouse drag pan listeners
    this.container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Mouse wheel zoom
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoomLevel = Math.max(0.2, Math.min(3, this.zoomLevel * zoomFactor));
      this.updateTransform();
    });
  }

  zoomIn() {
    this.zoomLevel = Math.min(3, this.zoomLevel * 1.2);
    this.updateTransform();
  }

  zoomOut() {
    this.zoomLevel = Math.max(0.2, this.zoomLevel / 1.2);
    this.updateTransform();
  }

  resetView() {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
  }

  updateTransform() {
    if (this.zoomGroup) {
      this.zoomGroup.setAttribute(
        'transform',
        `translate(${this.panX}, ${this.panY}) scale(${this.zoomLevel})`
      );
    }
  }

  /**
   * Renders the Concrete Syntax Tree.
   *
   * @param {ParseTreeNode|null} rootNode
   */
  render(rootNode) {
    if (!rootNode) {
      this.zoomGroup.innerHTML = `
        <text x="50%" y="50%" text-anchor="middle" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15">
          No parse tree generated yet. Enter an input string and run predictive parser.
        </text>
      `;
      return;
    }

    this.zoomGroup.innerHTML = '';

    // Assign layout positions
    let leafCounter = 0;
    const nodeCoords = new Map();

    const computePositions = (node, depth = 0) => {
      if (!node.children || node.children.length === 0) {
        leafCounter++;
        const x = leafCounter * 75;
        const y = 60 + depth * 75;
        nodeCoords.set(node.id, { x, y });
        return { minX: x, maxX: x, x, y };
      }

      let sumX = 0;
      let minX = Infinity;
      let maxX = -Infinity;

      for (const child of node.children) {
        const cRes = computePositions(child, depth + 1);
        sumX += cRes.x;
        minX = Math.min(minX, cRes.minX);
        maxX = Math.max(maxX, cRes.maxX);
      }

      const x = sumX / node.children.length;
      const y = 60 + depth * 75;
      nodeCoords.set(node.id, { x, y });
      return { minX, maxX, x, y };
    };

    computePositions(rootNode);

    // Center root initially
    const rootPos = nodeCoords.get(rootNode.id);
    const containerWidth = this.container.clientWidth || 800;
    this.panX = containerWidth / 2 - (rootPos ? rootPos.x : 0);
    this.panY = 30;
    this.zoomLevel = 0.95;
    this.updateTransform();

    // 1. Draw edge lines
    const drawEdges = (node) => {
      const parentPos = nodeCoords.get(node.id);
      if (!parentPos || !node.children) return;

      for (const child of node.children) {
        const childPos = nodeCoords.get(child.id);
        if (childPos) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          // Smooth cubic bezier curve from parent to child
          const midY = (parentPos.y + childPos.y) / 2;
          const d = `M ${parentPos.x} ${parentPos.y} C ${parentPos.x} ${midY}, ${childPos.x} ${midY}, ${childPos.x} ${childPos.y}`;
          path.setAttribute('d', d);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', '#475569');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('stroke-linecap', 'round');
          this.zoomGroup.appendChild(path);

          drawEdges(child);
        }
      }
    };
    drawEdges(rootNode);

    // 2. Draw nodes
    const drawNodes = (node) => {
      const pos = nodeCoords.get(node.id);
      if (!pos) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

      // Determine styling based on symbol type
      let bgColor = '#1e293b';
      let strokeColor = '#38bdf8';
      let textColor = '#f8fafc';

      if (node.isEpsilon) {
        bgColor = 'rgba(192, 132, 252, 0.25)';
        strokeColor = '#c084fc';
        textColor = '#e9d5ff';
      } else if (node.isTerminal) {
        bgColor = 'rgba(52, 211, 153, 0.25)';
        strokeColor = '#34d399';
        textColor = '#6ee7b7';
      } else {
        bgColor = 'rgba(56, 189, 248, 0.25)';
        strokeColor = '#38bdf8';
        textColor = '#bae6fd';
      }

      // Rounded rectangle for node
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const textLength = (node.symbol.length * 9) + 24;
      const width = Math.max(38, textLength);
      const height = 30;

      rect.setAttribute('x', -width / 2);
      rect.setAttribute('y', -height / 2);
      rect.setAttribute('width', width);
      rect.setAttribute('height', height);
      rect.setAttribute('rx', '8');
      rect.setAttribute('ry', '8');
      rect.setAttribute('fill', bgColor);
      rect.setAttribute('stroke', strokeColor);
      rect.setAttribute('stroke-width', '2');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', textColor);
      text.setAttribute('font-family', 'JetBrains Mono, monospace');
      text.setAttribute('font-weight', '700');
      text.setAttribute('font-size', '13');
      text.textContent = node.symbol;

      g.appendChild(rect);
      g.appendChild(text);
      this.zoomGroup.appendChild(g);

      if (node.children) {
        for (const child of node.children) {
          drawNodes(child);
        }
      }
    };
    drawNodes(rootNode);
  }
}
