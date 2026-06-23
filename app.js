document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinksContainer = document.getElementById('navLinks');

    // Initially trigger fade-in on the active page
    setTimeout(() => {
        const activePage = document.querySelector('.page.active');
        if (activePage) activePage.classList.add('fade-in');
    }, 100);

    // Navigation logic
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Allow default behavior for external links if any
            if (!href.startsWith('#')) return;
            
            e.preventDefault();
            
            const targetId = href.substring(1);
            const targetPage = document.getElementById(targetId);
            
            if (targetPage) {
                // Update active link
                navLinks.forEach(nav => nav.classList.remove('active'));
                link.classList.add('active');

                // Close mobile menu if open
                navLinksContainer.classList.remove('active');

                // Transition out current page
                const currentPage = document.querySelector('.page.active');
                if (currentPage && currentPage !== targetPage) {
                    currentPage.classList.remove('fade-in');
                    
                    setTimeout(() => {
                        currentPage.classList.remove('active');
                        targetPage.classList.add('active');
                        
                        // Trigger reflow
                        void targetPage.offsetWidth;
                        
                        targetPage.classList.add('fade-in');
                        window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    }, 300); // Wait for transition out
                }
            }
        });
    });

    // Mobile menu toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }

    // Handle generic links within pages
    const genericLinks = document.querySelectorAll('.link-text, .btn');
    genericLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetLink = document.querySelector(`.nav-link[href="${href}"]`);
                if (targetLink) {
                    targetLink.click();
                }
            }
        });
    });
});
