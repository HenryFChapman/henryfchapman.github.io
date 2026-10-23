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
    const [R, G, B] = [30, 58, 95];  // --button-bg navy

    const trail = [];  // { x, y, born }
    const ripples = [];  // { x, y, born }
    const RIPPLE_MS   = 2400;
    const RIPPLE_MAX  = 1100;  // px the wave travels
    const RIPPLE_BAND = 56;    // px width of the lit band
    let lastCol = null, lastRow = null;
    let animId  = null;

    function resize() {
        canvas.width  = main.offsetWidth;
        // offsetHeight, not scrollHeight: scrollHeight includes the canvas itself,
        // so the canvas could never shrink (e.g. after web fonts load and reflow).
        canvas.height = main.offsetHeight;
    }

    function tick() {
        const now = performance.now();

        // Drop expired trail dots from the tail
        while (trail.length > 0 && now - trail[0].born > FADE_MS) trail.shift();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        while (ripples.length > 0 && now - ripples[0].born > RIPPLE_MS) ripples.shift();

        // Ripple: a ring of grid dots that brightens as a wave passes through them
        for (const rp of ripples) {
            const t = (now - rp.born) / RIPPLE_MS;
            const r = RIPPLE_MAX * (1 - (1 - t) ** 3);  // ease-out
            const fade = 1 - t;
            const c0 = Math.max(0, Math.floor((rp.x - r - RIPPLE_BAND) / SPACING));
            const c1 = Math.min(Math.ceil(canvas.width / SPACING), Math.ceil((rp.x + r + RIPPLE_BAND) / SPACING));
            const r0 = Math.max(0, Math.floor((rp.y - r - RIPPLE_BAND) / SPACING));
            const r1 = Math.min(Math.ceil(canvas.height / SPACING), Math.ceil((rp.y + r + RIPPLE_BAND) / SPACING));
            for (let row = r0; row <= r1; row++) {
                for (let col = c0; col <= c1; col++) {
                    const x = col * SPACING + SPACING / 2;
                    const y = row * SPACING + SPACING / 2;
                    const off = Math.abs(Math.hypot(x - rp.x, y - rp.y) - r);
                    if (off > RIPPLE_BAND) continue;
                    const k = (1 - off / RIPPLE_BAND) * fade;
                    ctx.beginPath();
                    ctx.arc(x, y, DOT_R + k * 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${R},${G},${B},${(k * 0.55).toFixed(3)})`;
                    ctx.fill();
                }
            }
        }

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

        animId = trail.length > 0 || ripples.length > 0 ? requestAnimationFrame(tick) : null;
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

    // ResizeObserver (not just window resize) so late-loading content — e.g. the
    // interests gallery images — that grows main's height after initial load
    // still gets picked up and the canvas isn't left shorter than the page.
    new ResizeObserver(resize).observe(main);
    resize();

    // Send a ripple out from the portrait once the hero has faded in, and again on click
    const portrait = document.querySelector('.image-circle');
    if (portrait) {
        const ripple = () => {
            const p = portrait.getBoundingClientRect();
            const m = main.getBoundingClientRect();
            ripples.push({
                x: p.left + p.width / 2 - m.left,
                y: p.top + p.height / 2 - m.top,
                born: performance.now(),
            });
            startLoop();
        };
        setTimeout(ripple, 700);
        portrait.addEventListener('click', ripple);
    }
}

// ── Page initialisation ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (!reducedMotion && !isMobile) {
        createDotGrid();
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
        if (!link.getAttribute('href').startsWith('#')) return;
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

    // Lightbox for interests gallery
    (function() {
        const figures = Array.from(document.querySelectorAll('.interests-gallery figure'));
        const lightbox = document.getElementById('lightbox');
        if (!lightbox || !figures.length) return;

        const lbImg = lightbox.querySelector('.lightbox-img');
        const lbCaption = lightbox.querySelector('.lightbox-caption');
        let current = 0;

        function show(index) {
            current = (index + figures.length) % figures.length;
            const img = figures[current].querySelector('img');
            const cap = figures[current].querySelector('figcaption');
            lbImg.src = img.src;
            lbImg.alt = img.alt;
            lbCaption.textContent = cap ? cap.textContent : '';
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }

        figures.forEach((fig, i) => fig.addEventListener('click', () => show(i)));
        lightbox.querySelector('.lightbox-close').addEventListener('click', close);
        lightbox.querySelector('.lightbox-prev').addEventListener('click', (e) => { e.stopPropagation(); show(current - 1); });
        lightbox.querySelector('.lightbox-next').addEventListener('click', (e) => { e.stopPropagation(); show(current + 1); });
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') show(current - 1);
            if (e.key === 'ArrowRight') show(current + 1);
        });
    })();
});
