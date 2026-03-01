// Scroll thresholds
const SCROLL_ACTIVE_OFFSET = 100;
const SCROLL_BACK_TO_TOP_THRESHOLD = 300;

// Intersection Observer for fade-in animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
});

// ── Hero canvas ────────────────────────────────────────────────────────────────

let heroAnimId = null;
let heroCanvas = null;
const heroMouse = { x: null, y: null };

function createParticleNetwork() {
    if (heroAnimId) {
        cancelAnimationFrame(heroAnimId);
        heroAnimId = null;
    }

    const container = document.querySelector('.hero-background');
    if (!container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    if (!heroCanvas) {
        heroCanvas = document.createElement('canvas');
        heroCanvas.setAttribute('aria-hidden', 'true');
        Object.assign(heroCanvas.style, { position: 'absolute', top: '0', left: '0' });
        container.appendChild(heroCanvas);

        // Track mouse over the hero section
        const heroSection = container.parentElement;
        heroSection.addEventListener('mousemove', (e) => {
            const rect = heroCanvas.getBoundingClientRect();
            heroMouse.x = e.clientX - rect.left;
            heroMouse.y = e.clientY - rect.top;
        });
        heroSection.addEventListener('mouseleave', () => {
            heroMouse.x = null;
            heroMouse.y = null;
        });
    }
    // Resizing clears the canvas automatically
    heroCanvas.width = width;
    heroCanvas.height = height;

    const ctx = heroCanvas.getContext('2d');
    const COLORS = ['#2b6cb0', '#4299e1', '#00b5d8', '#3182ce'];

    const particles = Array.from({ length: 90 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.56,
        vy: (Math.random() - 0.5) * 0.56,
        r: Math.random() * 2 + 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const CONNECTION_DIST = 160;
    const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
    const MOUSE_CONNECT_DIST = 200;
    const MOUSE_CONNECT_DIST_SQ = MOUSE_CONNECT_DIST * MOUSE_CONNECT_DIST;
    const MOUSE_REPEL_DIST = 100;
    const MOUSE_REPEL_DIST_SQ = MOUSE_REPEL_DIST * MOUSE_REPEL_DIST;

    function tick() {
        ctx.clearRect(0, 0, width, height);

        // Particle-to-particle connections
        ctx.strokeStyle = '#2b6cb0';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < particles.length - 1; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i], b = particles[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < CONNECTION_DIST_SQ) {
                    const dist = Math.sqrt(distSq);
                    ctx.globalAlpha = (1 - dist / CONNECTION_DIST) * 0.45;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        // Mouse interactions
        if (heroMouse.x !== null) {
            ctx.strokeStyle = '#00b5d8';
            ctx.lineWidth = 1;
            particles.forEach(p => {
                const dx = p.x - heroMouse.x;
                const dy = p.y - heroMouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < MOUSE_CONNECT_DIST_SQ) {
                    const dist = Math.sqrt(distSq);
                    // Connection line from cursor to particle
                    ctx.globalAlpha = (1 - dist / MOUSE_CONNECT_DIST) * 0.55;
                    ctx.beginPath();
                    ctx.moveTo(heroMouse.x, heroMouse.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                    // Repulsion force
                    if (distSq < MOUSE_REPEL_DIST_SQ && dist > 0) {
                        const force = (1 - dist / MOUSE_REPEL_DIST) * 0.3;
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                    }
                }
            });

            // Glowing cursor dot
            const glow = ctx.createRadialGradient(heroMouse.x, heroMouse.y, 0, heroMouse.x, heroMouse.y, 14);
            glow.addColorStop(0, 'rgba(0,181,216,0.5)');
            glow.addColorStop(1, 'rgba(0,181,216,0)');
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(heroMouse.x, heroMouse.y, 14, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(heroMouse.x, heroMouse.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#00b5d8';
            ctx.fill();
        }

        // Draw & update particles
        ctx.globalAlpha = 0.7;
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            // Decay any velocity above the natural speed
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 2) {
                p.vx = (p.vx / speed) * 2;
                p.vy = (p.vy / speed) * 2;
            } else if (speed > 0.56) {
                p.vx *= 0.98;
                p.vy *= 0.98;
            }
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
        });

        ctx.globalAlpha = 1;
        heroAnimId = requestAnimationFrame(tick);
    }

    tick();
}

// ── Dot-grid hover glow ────────────────────────────────────────────────────────

function createDotGrid() {
    const main = document.querySelector('main');
    if (!main) return;

    // Canvas lives inside main at z-index: -1 so section backgrounds naturally mask it
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
        position: 'absolute', top: '0', left: '0',
        pointerEvents: 'none', zIndex: '-1',
    });
    main.prepend(canvas);

    const ctx = canvas.getContext('2d');
    const SPACING  = 32;
    const DOT_R    = 1.5;
    const FADE_MS  = 900;  // trail lifetime in ms
    const [R, G, B] = [43, 108, 176];

    const trail = [];  // { x, y, born }
    let lastCol = null, lastRow = null;
    let animId  = null;

    function resize() {
        canvas.width  = main.offsetWidth;
        canvas.height = main.scrollHeight;
    }

    function tick() {
        const now = performance.now();

        // Drop expired trail dots from the tail
        while (trail.length > 0 && now - trail[0].born > FADE_MS) trail.shift();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (trail.length > 0) {
            ctx.lineCap = 'round';

            // Subtle lines only between immediate grid neighbours (≤50px apart)
            for (let i = 1; i < trail.length; i++) {
                const a = trail[i - 1], b = trail[i];
                const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
                if (dist > 50) continue;
                const t = 1 - (now - b.born) / FADE_MS;
                ctx.lineWidth = t * 0.8;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(${R},${G},${B},${(t * 0.25).toFixed(3)})`;
                ctx.stroke();
            }

            // Glow pass — soft bloom on each dot
            for (const dot of trail) {
                const t = 1 - (now - dot.born) / FADE_MS;
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, DOT_R + t * 7, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${R},${G},${B},${(t * 0.1).toFixed(3)})`;
                ctx.fill();
            }

            // Core dots — head bright, tail faded
            for (const dot of trail) {
                const t = 1 - (now - dot.born) / FADE_MS;
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, DOT_R + t * 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${R},${G},${B},${(t * 0.7).toFixed(3)})`;
                ctx.fill();
            }
        }

        animId = trail.length > 0 ? requestAnimationFrame(tick) : null;
    }

    function startLoop() {
        if (!animId) animId = requestAnimationFrame(tick);
    }

    main.addEventListener('mousemove', (e) => {
        const rect = main.getBoundingClientRect();
        // CSS dots sit at tile centres (SPACING/2 offset), so snap to those positions
        const col  = Math.round((e.clientX - rect.left - SPACING / 2) / SPACING);
        const row  = Math.round((e.clientY - rect.top  - SPACING / 2) / SPACING);

        if (col !== lastCol || row !== lastRow) {
            trail.push({ x: col * SPACING + SPACING / 2, y: row * SPACING + SPACING / 2, born: performance.now() });
            if (trail.length > 30) trail.shift(); // safety cap
            lastCol = col;
            lastRow = row;
            startLoop();
        }
    });

    main.addEventListener('mouseleave', () => { lastCol = null; lastRow = null; });
    window.addEventListener('resize', resize);
    resize();
}

// ── Page initialisation ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reducedMotion) {
        createParticleNetwork();
        createDotGrid();

        // Debounced resize: refit canvas on window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(createParticleNetwork, 150);
        });
    }

    const navbar = document.querySelector('.navbar');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    const backToTopButton = document.getElementById('back-to-top');
    const menuButton = document.querySelector('.menu-button');
    const navLinksContainer = document.querySelector('.nav-links');
    const footer = document.querySelector('footer');
    const contactLink = document.querySelector('.nav-links a[href="#contact"]');

    // Observe sections for fade-in
    document.querySelectorAll('.section').forEach(section => observer.observe(section));

    function closeMenu() {
        navLinksContainer.classList.remove('active');
        menuButton.setAttribute('aria-expanded', 'false');
    }

    // Mobile menu toggle
    menuButton.addEventListener('click', () => {
        const isExpanded = navLinksContainer.classList.toggle('active');
        menuButton.setAttribute('aria-expanded', String(isExpanded));
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinksContainer.contains(e.target) && !menuButton.contains(e.target)) {
            closeMenu();
        }
    });

    // Smooth scroll for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').slice(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
            closeMenu();
        });
    });

    // Smooth scroll for all other anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (anchor.closest('.nav-links')) return; // already handled above
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Back to top button
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Consolidated scroll handler: navbar, back-to-top, active nav link
    function onScroll() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;

        navbar.classList.toggle('scrolled', scrollY > 50);
        backToTopButton.classList.toggle('visible', scrollY > SCROLL_BACK_TO_TOP_THRESHOLD);

        if (footer && scrollY + windowHeight >= footer.offsetTop) {
            navLinks.forEach(link => link.classList.remove('active'));
            if (contactLink) contactLink.classList.add('active');
            return;
        }

        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top + scrollY;
            if (scrollY >= sectionTop - SCROLL_ACTIVE_OFFSET) {
                currentSection = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href').slice(1) === currentSection);
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    // Mobile: dropdown triggers scroll to their section
    document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            if (window.innerWidth > 960) return;
            e.preventDefault();
            const targetSection = document.querySelector(this.getAttribute('href'));
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
                closeMenu();
            }
        });
    });

    // Expand/collapse for insights grid
    document.querySelectorAll('.expand-button').forEach(button => {
        button.addEventListener('click', function() {
            const grid = this.previousElementSibling;
            const isCollapsed = grid.classList.contains('collapsed');
            grid.classList.toggle('collapsed', !isCollapsed);
            // Update text node only — preserve the SVG icon child
            const svg = this.querySelector('svg');
            this.textContent = isCollapsed ? 'Show Less ' : 'Show More ';
            if (svg) this.appendChild(svg);
            this.classList.toggle('expanded', isCollapsed);
        });
    });
});
