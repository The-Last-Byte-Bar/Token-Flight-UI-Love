
import { useEffect, useRef } from 'react';

const BubbleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    // Bubble class
    class Bubble {
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      wobble: number;
      wobbleSpeed: number;
      time: number;
      
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 100;
        this.size = 4 + Math.random() * 10;
        this.speed = 0.5 + Math.random() * 1.5;
        this.opacity = 0.1 + Math.random() * 0.3;
        this.wobble = Math.random() * 5;
        this.wobbleSpeed = 0.01 + Math.random() * 0.05;
        this.time = Math.random() * 100;
      }
      
      update() {
        this.y -= this.speed;
        this.time += this.wobbleSpeed;
        this.x += Math.sin(this.time) * this.wobble;
        
        // Reset if off screen
        if (this.y < -this.size * 2) {
          this.y = canvas.height + this.size;
          this.x = Math.random() * canvas.width;
        }
      }
      
      draw() {
        if (!ctx) return;
        
        // Pixelated bubble
        ctx.fillStyle = `rgba(102, 204, 255, ${this.opacity})`;
        ctx.beginPath();
        
        // Draw a pixelated circle (square with rounded corners)
        const pixelSize = Math.max(2, Math.floor(this.size / 4));
        for (let y = -this.size; y <= this.size; y += pixelSize) {
          for (let x = -this.size; x <= this.size; x += pixelSize) {
            const distSq = x * x + y * y;
            if (distSq <= this.size * this.size) {
              ctx.fillRect(
                Math.floor((this.x + x) / pixelSize) * pixelSize,
                Math.floor((this.y + y) / pixelSize) * pixelSize,
                pixelSize,
                pixelSize
              );
            }
          }
        }
      }
    }
    
    // Create bubbles
    const bubbles: Bubble[] = [];
    for (let i = 0; i < 50; i++) {
      bubbles.push(new Bubble());
    }
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw bubbles
      bubbles.forEach(bubble => {
        bubble.update();
        bubble.draw();
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default BubbleBackground;
