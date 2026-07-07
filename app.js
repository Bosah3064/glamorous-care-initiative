document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinksContainer = document.getElementById('navLinks');

    // Active link highlighting based on current URL
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === 'index.html' && href === '#home')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Mobile menu toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }

    // Fade in current page
    pages.forEach(page => {
        page.classList.add('active');
        setTimeout(() => {
            page.classList.add('fade-in');
        }, 50);
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

    // Hero Carousel Logic
    const heroSlides = Array.from(document.querySelectorAll('.hero-slide'));
    const heroNextBtn = document.getElementById('heroNext');
    const heroPrevBtn = document.getElementById('heroPrev');
    const heroDotsContainer = document.getElementById('heroDots');
    
    if (heroSlides.length > 0) {
        let currentHeroIndex = 0;
        
        // Create hero dots
        heroSlides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.classList.add('hero-dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                goToHeroSlide(index);
                resetHeroInterval();
            });
            heroDotsContainer.appendChild(dot);
        });
        
        const heroDots = Array.from(document.querySelectorAll('.hero-dot'));
        
        function updateHeroDots() {
            heroDots.forEach(dot => dot.classList.remove('active'));
            heroDots[currentHeroIndex].classList.add('active');
        }
        
        function goToHeroSlide(index) {
            heroSlides[currentHeroIndex].classList.remove('active');
            currentHeroIndex = index;
            heroSlides[currentHeroIndex].classList.add('active');
            
            // Re-trigger animations
            const currentContent = heroSlides[currentHeroIndex].querySelectorAll('.animate-fade-in-up');
            currentContent.forEach(el => {
                el.style.animation = 'none';
                void el.offsetWidth; // trigger reflow
                el.style.animation = null;
            });
            
            updateHeroDots();
        }
        
        function nextHeroSlide() {
            let nextIndex = (currentHeroIndex + 1) % heroSlides.length;
            goToHeroSlide(nextIndex);
        }
        
        function prevHeroSlide() {
            let prevIndex = (currentHeroIndex - 1 + heroSlides.length) % heroSlides.length;
            goToHeroSlide(prevIndex);
        }
        
        if (heroNextBtn) {
            heroNextBtn.addEventListener('click', () => {
                nextHeroSlide();
                resetHeroInterval();
            });
        }
        
        if (heroPrevBtn) {
            heroPrevBtn.addEventListener('click', () => {
                prevHeroSlide();
                resetHeroInterval();
            });
        }
        
        // Auto-slide every 6 seconds
        let heroSlideInterval = setInterval(nextHeroSlide, 6000);
        
        function resetHeroInterval() {
            clearInterval(heroSlideInterval);
            heroSlideInterval = setInterval(nextHeroSlide, 6000);
        }
    }
});
