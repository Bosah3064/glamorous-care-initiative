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

    // Carousel Logic
    const track = document.getElementById('leadershipCarousel');
    const slides = Array.from(document.querySelectorAll('.carousel-slide'));
    const nextBtn = document.getElementById('carouselNext');
    const prevBtn = document.getElementById('carouselPrev');
    const dotsContainer = document.getElementById('carouselDots');
    
    if (track && slides.length > 0) {
        let currentIndex = 0;
        
        // Create dots
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                goToSlide(index);
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        });
        
        const dots = Array.from(document.querySelectorAll('.carousel-dot'));
        
        function updateDots() {
            dots.forEach(dot => dot.classList.remove('active'));
            dots[currentIndex].classList.add('active');
        }
        
        function goToSlide(index) {
            currentIndex = index;
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            updateDots();
        }
        
        function nextSlide() {
            currentIndex = (currentIndex + 1) % slides.length;
            goToSlide(currentIndex);
        }
        
        function prevSlide() {
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            goToSlide(currentIndex);
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextSlide();
                resetInterval();
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                prevSlide();
                resetInterval();
            });
        }
        
        // Auto-slide every 5 seconds
        let slideInterval = setInterval(nextSlide, 5000);
        
        function resetInterval() {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, 5000);
        }
    }
});
