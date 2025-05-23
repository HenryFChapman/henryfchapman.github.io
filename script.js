// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        // Skip if the href is just '#'
        if (href === '#') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            return;
        }
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add fade-in animation to sections
document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '1';
    section.style.transform = 'none';
    section.style.transition = 'all 0.6s ease-out';
    observer.observe(section);
});

// Add hover effect to work items
document.querySelectorAll('.work-item, .case-item, .interest-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'translateY(-5px)';
    });
    
    item.addEventListener('mouseleave', () => {
        item.style.transform = 'translateY(0)';
    });
});

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Navbar functionality
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.borderBottom = '1px solid var(--border-color)';
        } else {
            navbar.style.borderBottom = 'none';
        }
    });

    // Section highlighting on scroll
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');

    function setActiveSection() {
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop - 150) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === currentSection) {
                link.classList.add('active');
            }
        });
    }

    // Initial call
    setActiveSection();

    // Update on scroll
    window.addEventListener('scroll', setActiveSection);
    window.addEventListener('resize', setActiveSection);

    // Smooth scroll for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').slice(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Back to top button functionality
    const backToTopButton = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Mobile-specific navigation handling
    if (window.innerWidth <= 768) {
        const mobileNavLinks = document.querySelector('.nav-links');
        const allMobileLinks = document.querySelectorAll('.nav-links a, .dropdown-trigger');

        // Close menu when clicking any link
        allMobileLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // For dropdown triggers, prevent default only on desktop
                if (!this.classList.contains('dropdown-trigger')) {
                    mobileNavLinks.classList.remove('active');
                }

                // Redirect dropdown triggers to their corresponding sections
                if (this.classList.contains('dropdown-trigger')) {
                    e.preventDefault();
                    const sectionId = this.getAttribute('href');
                    const targetSection = document.querySelector(sectionId);
                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                        mobileNavLinks.classList.remove('active');
                    }
                }
            });
        });
    }

    // Handle expand/collapse functionality for insights grid
    const expandButtons = document.querySelectorAll('.expand-button');
    
    expandButtons.forEach(button => {
        button.addEventListener('click', function() {
            const grid = this.previousElementSibling;
            const isExpanded = grid.classList.contains('collapsed');
            
            if (isExpanded) {
                grid.classList.remove('collapsed');
                this.textContent = 'Show Less';
                this.classList.add('expanded');
            } else {
                grid.classList.add('collapsed');
                this.textContent = 'Show More';
                this.classList.remove('expanded');
            }
        });
    });
}); 