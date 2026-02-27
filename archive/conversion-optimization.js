// AR Carrier Xpress - Conversion Optimization Script
// Maximizes application conversion rate through psychological triggers and UX optimization

(function() {
    'use strict';

    // Initialize all conversion features
    document.addEventListener('DOMContentLoaded', function() {
        initExitIntentPopup();
        initSocialProofCounters();
        initUrgencyScarcity();
        initScrollTracking();
        initFormAbandonmentTracking();
        initClickTracking();
        initMobileOptimizations();
    });

    // Exit Intent Popup - Shows when user tries to leave
    function initExitIntentPopup() {
        let exitIntentShown = localStorage.getItem('exitIntentShown');
        if (exitIntentShown) return; // Only show once per session

        document.addEventListener('mouseout', function(e) {
            if (!e.toElement && !e.relatedTarget && e.clientY < 10) {
                showExitPopup();
                localStorage.setItem('exitIntentShown', 'true');
            }
        });
    }

    function showExitPopup() {
        const popup = document.getElementById('exitPopup');
        if (popup) {
            popup.classList.add('active');
            // Track exit intent event
            trackEvent('exit_intent_shown');
        }
    }

    function closeExitPopup() {
        const popup = document.getElementById('exitPopup');
        if (popup) {
            popup.classList.remove('active');
        }
    }

    // Make closeExitPopup globally available
    window.closeExitPopup = closeExitPopup;

    // Social Proof Counter - Updates dynamically
    function initSocialProofCounters() {
        const applicantsToday = document.getElementById('applicantsToday');
        if (applicantsToday) {
            // Start with realistic number
            let count = parseInt(applicantsToday.textContent) || 8;
            
            // Increment every 2-5 minutes (simulated)
            setInterval(() => {
                if (Math.random() > 0.7) { // 30% chance to increment
                    count += Math.floor(Math.random() * 3) + 1;
                    applicantsToday.textContent = count;
                    
                    // Add animation
                    applicantsToday.style.transform = 'scale(1.2)';
                    applicantsToday.style.color = '#10b981';
                    setTimeout(() => {
                        applicantsToday.style.transform = 'scale(1)';
                        applicantsToday.style.color = '';
                    }, 300);
                }
            }, 120000); // Check every 2 minutes
        }
    }

    // Urgency & Scarcity - Updates available positions
    function initUrgencyScarcity() {
        const spotsLeft = document.getElementById('spotsLeft');
        if (spotsLeft) {
            let spots = parseInt(spotsLeft.textContent) || 5;
            
            // Decrease spots periodically (creates urgency)
            setInterval(() => {
                if (spots > 1 && Math.random() > 0.8) { // 20% chance
                    spots--;
                    spotsLeft.textContent = spots;
                    
                    // Urgency animation
                    spotsLeft.style.animation = 'pulse-urgent 1s ease-in-out';
                    setTimeout(() => {
                        spotsLeft.style.animation = '';
                    }, 1000);
                }
            }, 180000); // Check every 3 minutes
        }
    }

    // Scroll Tracking - Shows/hides sticky CTA based on scroll
    function initScrollTracking() {
        const stickyCtaBar = document.getElementById('stickyCtaBar');
        let lastScrollTop = 0;
        let scrollTimeout;

        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Hide on scroll down, show on scroll up
            if (scrollTop > lastScrollTop && scrollTop > 200) {
                stickyCtaBar.classList.add('hidden');
            } else {
                stickyCtaBar.classList.remove('hidden');
            }
            
            lastScrollTop = scrollTop;

            // Track scroll depth
            const scrollPercent = (scrollTop / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            
            if (scrollPercent > 25 && !window.scroll25Tracked) {
                trackEvent('scroll_25_percent');
                window.scroll25Tracked = true;
            }
            if (scrollPercent > 50 && !window.scroll50Tracked) {
                trackEvent('scroll_50_percent');
                window.scroll50Tracked = true;
            }
            if (scrollPercent > 75 && !window.scroll75Tracked) {
                trackEvent('scroll_75_percent');
                window.scroll75Tracked = true;
            }
        }, { passive: true });
    }

    // Form Abandonment Tracking
    function initFormAbandonmentTracking() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            let formStarted = false;
            const inputs = form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    if (!formStarted) {
                        formStarted = true;
                        trackEvent('form_started', {
                            form_id: form.id || 'application_form'
                        });
                    }
                });
            });
            
            form.addEventListener('submit', function() {
                trackEvent('form_submitted', {
                    form_id: form.id || 'application_form'
                });
            });
        });
    }

    // Click Tracking - Track all CTA clicks
    function initClickTracking() {
        // Track all CTA buttons
        document.querySelectorAll('a[href*="application"], .hero-cta-button, .sticky-cta-bar a').forEach(link => {
            link.addEventListener('click', function(e) {
                const ctaText = this.textContent.trim();
                const ctaLocation = this.closest('section')?.className || 'unknown';
                
                trackEvent('cta_clicked', {
                    cta_text: ctaText,
                    location: ctaLocation,
                    href: this.href
                });
            });
        });

        // Track phone clicks
        document.querySelectorAll('a[href^="tel:"]').forEach(link => {
            link.addEventListener('click', function() {
                trackEvent('phone_clicked', {
                    phone_number: this.href.replace('tel:', '')
                });
            });
        });
    }

    // Mobile Optimizations
    function initMobileOptimizations() {
        // Add touch feedback to buttons
        if ('ontouchstart' in window) {
            document.querySelectorAll('a, button').forEach(element => {
                element.addEventListener('touchstart', function() {
                    this.style.opacity = '0.8';
                });
                element.addEventListener('touchend', function() {
                    setTimeout(() => {
                        this.style.opacity = '1';
                    }, 150);
                });
            });
        }

        // Optimize sticky CTA for mobile
        if (window.innerWidth <= 768) {
            const stickyCtaBar = document.getElementById('stickyCtaBar');
            if (stickyCtaBar) {
                // Always show on mobile (more important)
                stickyCtaBar.classList.remove('hidden');
            }
        }
    }

    // Event Tracking Function
    function trackEvent(eventName, eventData = {}) {
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                ...eventData,
                event_category: 'conversion',
                event_label: 'AR Carrier Xpress'
            });
        }

        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('trackCustom', eventName, eventData);
        }

        // Console log for debugging (remove in production)
        console.log('Event tracked:', eventName, eventData);
    }

    // Time on Page Tracking
    let timeOnPage = 0;
    setInterval(() => {
        timeOnPage += 5;
        
        // Track milestones
        if (timeOnPage === 30 && !window.time30Tracked) {
            trackEvent('time_on_page_30s');
            window.time30Tracked = true;
        }
        if (timeOnPage === 60 && !window.time60Tracked) {
            trackEvent('time_on_page_60s');
            window.time60Tracked = true;
        }
    }, 5000);

    // Track page view
    trackEvent('page_view', {
        page: window.location.pathname,
        referrer: document.referrer
    });

    // Heatmap tracking (if available)
    if (typeof heatmap !== 'undefined') {
        heatmap.init();
    }

    // A/B Testing Helper (if needed)
    window.abTest = function(testName, variantA, variantB) {
        const stored = localStorage.getItem('ab_test_' + testName);
        if (stored) {
            return stored === 'A' ? variantA : variantB;
        }
        
        const variant = Math.random() > 0.5 ? 'A' : 'B';
        localStorage.setItem('ab_test_' + testName, variant);
        return variant === 'A' ? variantA : variantB;
    };

    // Conversion Rate Optimization Tips
    console.log('%cConversion Optimization Active', 'color: green; font-weight: bold; font-size: 16px;');
    console.log('Features enabled:');
    console.log('- Exit intent popup');
    console.log('- Social proof counters');
    console.log('- Urgency/scarcity updates');
    console.log('- Scroll tracking');
    console.log('- Form abandonment tracking');
    console.log('- Click tracking');
    console.log('- Mobile optimizations');

})();

