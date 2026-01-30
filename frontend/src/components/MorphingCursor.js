import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './MorphingCursor.css';

/**
 * MorphingCursor
 * Implements a "gooey" cursor trail effect using SVG filters and GSAP.
 * 
 * Logic ported from user provided snippet:
 * - Creates a snake of dots that follow the mouse.
 * - Uses an SVG filter to blend them together ("gooey" effect).
 * - "Idle" state creates a sine wave motion.
 */

const AMOUNT = 20;
const SINE_DOTS = Math.floor(AMOUNT * 0.3);
const WIDTH = 26;
const IDLE_TIMEOUT = 1500; // Increased to 1.5s for less aggressive idle triggering

class Dot {
    constructor(index, container) {
        this.index = index;
        this.anglespeed = 0.05;
        this.x = 0;
        this.y = 0;
        this.scale = 1 - 0.05 * index;
        this.range = WIDTH / 2 - WIDTH / 2 * this.scale + 2;
        this.limit = WIDTH * 0.75 * this.scale;

        this.element = document.createElement("span");
        this.element.className = "cursor-dot";
        gsap.set(this.element, { scale: this.scale });
        container.appendChild(this.element);
    }

    lock() {
        this.lockX = this.x;
        this.lockY = this.y;
        this.angleX = Math.PI * 2 * Math.random();
        this.angleY = Math.PI * 2 * Math.random();
    }

    draw(idle) {
        if (!idle || this.index <= SINE_DOTS) {
            gsap.set(this.element, { x: this.x, y: this.y });
        } else {
            this.angleX += this.anglespeed;
            this.angleY += this.anglespeed;
            this.y = this.lockY + Math.sin(this.angleY) * this.range;
            this.x = this.lockX + Math.sin(this.angleX) * this.range;
            gsap.set(this.element, { x: this.x, y: this.y });
        }
    }
}

function MorphingCursor({ isTransitioning = false }) {
    const containerRef = useRef(null);
    const stateRef = useRef({
        mousePosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        dots: [],
        idle: false,
        timeoutID: null,
        lastFrame: 0,
        isTransitioning: false
    });

    useEffect(() => {
        const container = containerRef.current;
        const state = stateRef.current;

        // Initialize dots
        // Clear any existing cursors (React HMR safety)
        container.innerHTML = '';
        state.dots = [];
        for (let i = 0; i < AMOUNT; i++) {
            state.dots.push(new Dot(i, container));
        }

        // Handle transition: shrink all dots
        if (isTransitioning) {
            state.isTransitioning = true;
            state.dots.forEach((dot, index) => {
                gsap.to(dot.element, {
                    scale: 0,
                    duration: 0.6,
                    delay: index * 0.02,
                    ease: 'power3.in'
                });
            });
            // Fade out container
            gsap.to(container, {
                opacity: 0,
                duration: 0.5,
                delay: 0.3
            });
        }

        const startIdleTimer = () => {
            state.timeoutID = setTimeout(goInactive, IDLE_TIMEOUT);
            state.idle = false;
        };

        const resetIdleTimer = () => {
            clearTimeout(state.timeoutID);
            startIdleTimer();
        };

        const goInactive = () => {
            state.idle = true;
            for (let dot of state.dots) {
                dot.lock();
            }
        };

        const onMouseMove = (event) => {
            state.mousePosition.x = event.clientX;
            state.mousePosition.y = event.clientY;

            // Update global cursor position for hover effects
            document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`);
            document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`);

            resetIdleTimer();
        };

        const onTouchMove = (event) => {
            state.mousePosition.x = event.touches[0].clientX;
            state.mousePosition.y = event.touches[0].clientY;

            document.documentElement.style.setProperty('--cursor-x', `${event.touches[0].clientX}px`);
            document.documentElement.style.setProperty('--cursor-y', `${event.touches[0].clientY}px`);

            resetIdleTimer();
        };

        const onClick = (event) => {
            // Create explosion effect at click position
            createExplosion(event.clientX, event.clientY);
        };

        const createExplosion = (x, y) => {
            const particleCount = 12;
            const explosionContainer = document.createElement('div');
            explosionContainer.className = 'explosion-container';
            explosionContainer.style.left = `${x}px`;
            explosionContainer.style.top = `${y}px`;
            document.body.appendChild(explosionContainer);

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'explosion-particle';

                const angle = (Math.PI * 2 * i) / particleCount;
                const velocity = 100 + Math.random() * 100;
                const tx = Math.cos(angle) * velocity;
                const ty = Math.sin(angle) * velocity;

                particle.style.setProperty('--tx', `${tx}px`);
                particle.style.setProperty('--ty', `${ty}px`);
                particle.style.animationDelay = `${Math.random() * 0.1}s`;

                explosionContainer.appendChild(particle);
            }

            // Remove explosion after animation
            setTimeout(() => {
                document.body.removeChild(explosionContainer);
            }, 1000);
        };

        const render = () => {
            // Logic from snippet
            let x = state.mousePosition.x;
            let y = state.mousePosition.y;

            state.dots.forEach((dot, index, dots) => {
                let nextDot = dots[index + 1] || dots[0];
                dot.x = x;
                dot.y = y;
                dot.draw(state.idle);
                if (!state.idle || index <= SINE_DOTS) {
                    const dx = (nextDot.x - dot.x) * 0.35;
                    const dy = (nextDot.y - dot.y) * 0.35;
                    x += dx;
                    y += dy;
                }
            });

            state.animationId = requestAnimationFrame(render);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("touchmove", onTouchMove);
        window.addEventListener("click", onClick);
        startIdleTimer();
        render();

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("click", onClick);
            clearTimeout(state.timeoutID);
            cancelAnimationFrame(state.animationId);
        };
    }, [isTransitioning]);

    return (
        <div ref={containerRef} className="gooey-cursor-container">
            {/* SVG for Filter Definition only */}
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="800" style={{ display: 'none' }}>
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -15" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>
        </div>
    );
}

export default MorphingCursor;
