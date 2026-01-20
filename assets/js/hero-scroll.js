document.addEventListener('DOMContentLoaded', () => {
    const heroSection = document.getElementById('hero-section');
    const heroBackground = document.getElementById('hero-background');
    const heroContentContainer = document.getElementById('hero-content-container');
    const heroBody = document.getElementById('hero-body');
    const heroMiniContact = document.getElementById('hero-mini-contact');
    
    if (!heroSection || !heroBackground || !heroContentContainer || !heroBody) return;

    // Capture initial height of the body content for smooth folding
    let initialBodyHeight = heroBody.scrollHeight;
    
    // Recalculate on resize in case of layout changes
    window.addEventListener('resize', () => {
        heroBody.style.maxHeight = 'none';
        initialBodyHeight = heroBody.scrollHeight;
        handleScroll();
    });

    function handleScroll() {
        const scrollPosition = window.scrollY;
        const heroHeight = heroSection.offsetHeight;
        
        // --- 1. Background Opacity ---
        // Fades out as we scroll down
        let bgOpacity = 1 - (scrollPosition / (heroHeight * 0.8));
        heroBackground.style.opacity = Math.max(0, Math.min(1, bgOpacity));

        // --- 2. Folding Animation (Body Height & Opacity) ---
        // Calculates progress based on scroll.
        // Adjusted divisor to ensure it folds completely before it needs to stick.
        // We want the fold to complete around the time the header hits the top.
        // The container starts at ~80-100px from top. We want stick at 10px.
        // So we have about 70-90px of scroll to fold? That's too fast.
        // Let's allow it to fold naturally as we scroll past.
        
        let foldProgress = scrollPosition / (heroHeight * 0.6);
        foldProgress = Math.max(0, Math.min(1, foldProgress));

        // Height reduces from initial to 0
        const currentHeight = initialBodyHeight * (1 - foldProgress);
        heroBody.style.height = `${currentHeight}px`;
        heroBody.style.opacity = 1 - foldProgress;

        // --- 3. Button Cross-fade ---
        heroMiniContact.style.opacity = foldProgress;
        heroMiniContact.style.pointerEvents = foldProgress > 0.9 ? 'auto' : 'none';

        // --- 4. Sticky Behavior (Smoother) ---
        // Instead of hard-coding scroll positions, we check the container's natural position relative to viewport.
        // However, since we are using 'position: fixed', we need to know when to engage it.
        
        // Calculate where the section top is relative to viewport
        const sectionRect = heroSection.getBoundingClientRect();
        // The container is inside the section. It has 'top: 0' relative to section (minus padding).
        // Section has padding-top: 4rem (approx 64px).
        // So natural container top = sectionRect.top + 64.
        // We want to stick when this hits ~10px.
        
        // Note: We use computed style for padding to be precise, or just assume 4rem.
        // Let's assume 4rem = 64px for simplicity, or measure it once if needed.
        const containerNaturalTop = sectionRect.top + 64; 
        const stickThreshold = 10; // Sticky position from top of viewport

        if (containerNaturalTop <= stickThreshold) {
             // We should be STUCK.
             
             // To prevent layout jump (the section collapsing when child becomes fixed),
             // we set the section's height to preserve the space it occupied.
             // But wait, the child (heroBody) is shrinking!
             // So the section height IS shrinking.
             // If we fix the container, the section becomes 0 height (plus padding).
             // We need to keep the section height equal to what the container *is currently*.
             // heroContentContainer.offsetHeight includes the header + current body height + padding.
             
             const currentContainerHeight = heroContentContainer.offsetHeight;
             heroSection.style.height = `${currentContainerHeight + 128}px`; // 128 = 4rem top + 4rem bottom padding
             
             // Apply Fixed positioning
             heroContentContainer.style.position = 'fixed';
             heroContentContainer.style.top = `${stickThreshold}px`;
             heroContentContainer.style.left = '50%';
             heroContentContainer.style.transform = 'translateX(-50%)';
             heroContentContainer.style.width = '100%';
             heroContentContainer.style.maxWidth = '960px';
             heroContentContainer.style.zIndex = '1000';
             heroContentContainer.style.margin = '0'; // Remove auto margins
             heroContentContainer.style.backgroundColor = 'rgba(11, 17, 32, 0.6)'; // More transparent for Frutiger Aero look
             heroContentContainer.style.backdropFilter = 'blur(5px)'; // Stronger blur
             
        } else {
             // We are SCROLLING (Relative)
             
             // Reset section height to auto so it flows naturally
             heroSection.style.height = 'auto';
             
             // Reset container styles
             heroContentContainer.style.position = 'relative';
             heroContentContainer.style.top = '';
             heroContentContainer.style.left = '';
             heroContentContainer.style.transform = '';
             heroContentContainer.style.width = '';
             heroContentContainer.style.maxWidth = '';
             heroContentContainer.style.zIndex = '1';
             heroContentContainer.style.margin = '';
             heroContentContainer.style.backgroundColor = 'rgba(11, 17, 32, 0.8)';
             heroContentContainer.style.backdropFilter = 'blur(4px)';
        }
    }

    // Initialize
    window.addEventListener('scroll', handleScroll);
    handleScroll();
});
