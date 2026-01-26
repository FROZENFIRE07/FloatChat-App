import React, { useEffect, useRef } from 'react';
import './BubbleBackground.css';

/**
 * BubbleBackground
 * Renders the animated bubbles as requested by the user.
 * 
 * Now with cursor interaction - bubbles explode when touched!
 * Supports freeze/slow motion via isSlowed prop for transitions.
 */
function BubbleBackground({ isSlowed = false }) {
  const bubbleHolderRef = useRef(null);

  useEffect(() => {
    const bubbles = bubbleHolderRef.current?.querySelectorAll('.bubble-large, .bubble-small');
    if (!bubbles) return;

    let mouseX = 0;
    let mouseY = 0;
    let animationFrameId;

    const updateMousePosition = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const checkProximity = () => {
      bubbles.forEach((bubble) => {
        if (bubble.classList.contains('exploded')) return;

        const rect = bubble.getBoundingClientRect();
        const bubbleCenterX = rect.left + rect.width / 2;
        const bubbleCenterY = rect.top + rect.height / 2;
        const bubbleRadius = rect.width / 2;

        const distance = Math.sqrt(
          Math.pow(mouseX - bubbleCenterX, 2) + Math.pow(mouseY - bubbleCenterY, 2)
        );

        // If cursor is within bubble radius, explode it
        if (distance < bubbleRadius) {
          explodeBubble(bubble, bubbleCenterX, bubbleCenterY);
        }
      });

      animationFrameId = requestAnimationFrame(checkProximity);
    };

    const explodeBubble = (bubble, x, y) => {
      bubble.classList.add('exploded');

      // Immediately hide the bubble completely
      bubble.style.opacity = '0';
      bubble.style.transform = 'scale(0)';
      bubble.style.display = 'none';

      // Create explosion particles
      const particleCount = 8;
      const explosionContainer = document.createElement('div');
      explosionContainer.className = 'bubble-explosion-container';
      explosionContainer.style.left = `${x}px`;
      explosionContainer.style.top = `${y}px`;
      document.body.appendChild(explosionContainer);

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'bubble-explosion-particle';

        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 80 + Math.random() * 60;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.animationDelay = `${Math.random() * 0.05}s`;

        explosionContainer.appendChild(particle);
      }

      // Remove explosion after animation and respawn bubble
      setTimeout(() => {
        document.body.removeChild(explosionContainer);
        // Respawn bubble after 3 seconds
        setTimeout(() => {
          bubble.classList.remove('exploded');
          bubble.style.opacity = '';
          bubble.style.transform = '';
          bubble.style.display = '';
        }, 3000);
      }, 800);
    };

    window.addEventListener('mousemove', updateMousePosition);
    checkProximity();

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section ref={bubbleHolderRef} className={`bubble-holder ${isSlowed ? 'bubble-holder--slowed' : ''}`} aria-hidden="true">
      <div className="bubble-1 bubble-container bubble-animation-x">
        <div className="bubble-large bubble-animation-y"></div>
      </div>

      <div className="bubble-2 bubble-container bubble-animation-x">
        <div className="bubble-large bubble-animation-y"></div>
      </div>

      <div className="bubble-3 bubble-container bubble-animation-x">
        <div className="bubble-large bubble-animation-y"></div>
      </div>

      <div className="bubble-4 bubble-container bubble-animation-x">
        <div className="bubble-small bubble-animation-y"></div>
      </div>

      <div className="bubble-5 bubble-container bubble-animation-x">
        <div className="bubble-small bubble-animation-y"></div>
      </div>

      <div className="bubble-6 bubble-container bubble-animation-x">
        <div className="bubble-small bubble-animation-y"></div>
      </div>

      <div className="bubble-7 bubble-container bubble-animation-x">
        <div className="bubble-small bubble-animation-y"></div>
      </div>

      <div className="bubble-8 bubble-container bubble-animation-x">
        <div className="bubble-small bubble-animation-y"></div>
      </div>

      {/* Static background circles */}
      <div className="bubble-9 bubble-static"></div>
      <div className="bubble-10 bubble-static"></div>
    </section>
  );
}

export default BubbleBackground;
