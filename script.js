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
    let ripples = [];  // { x, y, born, ms, max, strength }
    const RIPPLE_BAND = 56;  // px width of the lit band
    let lastCol = null, lastRow = null;
    let animId  = null;

    // Text sitting directly on the grid: animated dots fade out around these so the
    // trail and ripples flow around copy instead of flickering through the letters
    const KEEP_OUT = '.hero-main, .section-header, .subsection-header, .about-text > h2, ' +
                     '.about-text > p, .about-stats, .about-buttons, .contact-info, figcaption';
    const FEATHER = 24;  // px over which dots fade back in at a text block's edge
    let zones = [];

    // Re-measured whenever an animation burst starts, so layout shifts are picked up
    function ensureZones() {
        if (animId) return;
        const m = main.getBoundingClientRect();
        zones = [...main.querySelectorAll(KEEP_OUT)].map(el => {
            const r = el.getBoundingClientRect();
            return { l: r.left - m.left, t: r.top - m.top, r: r.right - m.left, b: r.bottom - m.top };
        });
    }

    // 0 inside a text block, ramping to 1 at FEATHER px away
    function clearance(x, y) {
        let c = 1;
        for (const z of zones) {
            const dx = Math.max(z.l - x, 0, x - z.r);
            const dy = Math.max(z.t - y, 0, y - z.b);
            if (dx >= FEATHER || dy >= FEATHER) continue;
            c = Math.min(c, Math.hypot(dx, dy) / FEATHER);
            if (c === 0) return 0;
        }
        return c;
    }

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

        ripples = ripples.filter(rp => now - rp.born < rp.ms);

        // Ripple: a ring of grid dots that brightens as a wave passes through them
        for (const rp of ripples) {
            const t = (now - rp.born) / rp.ms;
            const r = rp.max * (1 - (1 - t) ** 3);  // ease-out
            const fade = (1 - t) * rp.strength;
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
                    const k = (1 - off / RIPPLE_BAND) * fade * clearance(x, y);
                    if (k <= 0) continue;
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
                const t = (1 - (now - b.born) / FADE_MS) * Math.min(a.c, b.c);
                ctx.lineWidth = t * 0.8;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(${R},${G},${B},${(t * 0.25).toFixed(3)})`;
                ctx.stroke();
            }

            // Glow pass — soft bloom on each dot
            for (const dot of trail) {
                const t = (1 - (now - dot.born) / FADE_MS) * dot.c;
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, DOT_R + t * 7, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${R},${G},${B},${(t * 0.1).toFixed(3)})`;
                ctx.fill();
            }

            // Core dots — head bright, tail faded
            for (const dot of trail) {
                const t = (1 - (now - dot.born) / FADE_MS) * dot.c;
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
            const x = col * SPACING + SPACING / 2;
            const y = row * SPACING + SPACING / 2;
            ensureZones();
            const c = clearance(x, y);
            if (c > 0) trail.push({ x, y, c, born: performance.now() });
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

    // Ripple sizes, from the big hero wave down to small hover echoes
    const RIPPLES = {
        hero:    { ms: 2400, max: 1100, strength: 1 },
        click:   { ms: 1800, max: 600,  strength: 0.9 },
        hover:   { ms: 1000, max: 160,  strength: 0.5 },
    };

    function rippleFrom(el, size) {
        const e = el.getBoundingClientRect();
        const m = main.getBoundingClientRect();
        rippleAt(e.left + e.width / 2 - m.left, e.top + e.height / 2 - m.top, size);
    }

    function rippleAt(x, y, size) {
        ensureZones();
        ripples.push({ x, y, born: performance.now(), ...RIPPLES[size] });
        startLoop();
    }

    // Hero: a wave from the portrait once the hero has faded in, and again on click
    const portrait = document.querySelector('.image-circle');
    if (portrait) {
        setTimeout(() => rippleFrom(portrait, 'hero'), 700);
        portrait.addEventListener('click', () => rippleFrom(portrait, 'hero'));
    }

    // Clicking empty background sends a ripple from the click point
    main.addEventListener('click', (e) => {
        if (e.target.closest('a, button, img, .insight-item, .interests-item, .exp-item')) return;
        if (window.getSelection().toString()) return;  // user was selecting text
        const m = main.getBoundingClientRect();
        rippleAt(e.clientX - m.left, e.clientY - m.top, 'click');
    });

    // Primary buttons echo a tiny ripple on hover
    document.querySelectorAll('.btn-explore, .about-buttons .btn, .resume-download .btn')
        .forEach(btn => btn.addEventListener('mouseenter', () => rippleFrom(btn, 'hover')));
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
