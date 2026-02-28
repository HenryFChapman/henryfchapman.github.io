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

    function tick() {
        ctx.clearRect(0, 0, width, height);

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

        ctx.globalAlpha = 0.7;
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
        });

        ctx.globalAlpha = 1;
        heroAnimId = requestAnimationFrame(tick);
    }

    tick();
}

// ── Page initialisation ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    createParticleNetwork();

    // Debounced resize: refit canvas on window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(createParticleNetwork, 150);
    });

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
            if (scrollY >= section.offsetTop - SCROLL_ACTIVE_OFFSET) {
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
            this.textContent = isCollapsed ? 'Show Less' : 'Show More';
            this.classList.toggle('expanded', isCollapsed);
        });
    });
});
