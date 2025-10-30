/**
 * Double Pendulum Visualization Engine
 * Handles rendering, animation, and visual effects
 */

class PendulumVisualization {
    constructor(canvasId, width = 800, height = 600) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Visual settings
        this.scale = 150; // Pixels per meter
        this.centerX = width / 2;
        this.centerY = height / 4;
        
        // Animation settings
        this.animationId = null;
        this.isRunning = false;
        this.mode = 'normal'; // 'normal', 'trace', 'chaos', 'slow'
        this.slowMotionFactor = 0.1;
        
        // Visual effects
        this.showTrajectory = true;
        this.showEnergy = true;
        this.showVelocity = true;
        this.showForces = false;
        
        // Colors
        this.colors = {
            pivot: '#c17817',
            rod1: '#4a6b6b',
            rod2: '#a67c7c',
            bob1: '#3b82f6',
            bob2: '#f59e0b',
            trajectory: '#8b5cf6',
            velocity: '#10b981',
            force: '#ef4444',
            energy: '#f8f6f0'
        };
        
        // Background effects
        this.gridOpacity = 0.1;
        this.particles = [];
        this.initParticles();
    }
    
    /**
     * Initialize background particles for environmental effects
     */
    initParticles() {
        this.particles = [];
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.3 + 0.1
            });
        }
    }
    
    /**
     * Draw background with grid and particles
     */
    drawBackground() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1d29';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw particles
        this.updateParticles();
        this.drawParticles();
        
        // Draw coordinate system
        this.drawCoordinateSystem();
    }
    
    /**
     * Draw coordinate grid
     */
    drawGrid() {
        this.ctx.strokeStyle = `rgba(248, 246, 240, ${this.gridOpacity})`;
        this.ctx.lineWidth = 0.5;
        
        const gridSize = this.scale / 2;
        
        // Vertical lines
        for (let x = this.centerX % gridSize; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = this.centerY % gridSize; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
    
    /**
     * Update and draw floating particles
     */
    updateParticles() {
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = `rgba(248, 246, 240, ${particle.opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 1, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }
    
    /**
     * Draw coordinate system and labels
     */
    drawCoordinateSystem() {
        // Origin
        this.ctx.fillStyle = this.colors.pivot;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Labels
        this.ctx.fillStyle = '#f8f6f0';
        this.ctx.font = '12px Inter';
        this.ctx.fillText('O', this.centerX + 5, this.centerY - 5);
        this.ctx.fillText('x', this.width - 15, this.centerY - 5);
        this.ctx.fillText('y', this.centerX + 5, 15);
    }
    
    /**
     * Draw pendulum based on physics state
     */
    drawPendulum(physics, opacity = 1.0) {
        const positions = physics.getPositions();
        
        // Transform physics coordinates to canvas coordinates
        const pivotX = this.centerX;
        const pivotY = this.centerY;
        const bob1X = this.centerX + positions.bob1.x * this.scale;
        const bob1Y = this.centerY + positions.bob1.y * this.scale;
        const bob2X = this.centerX + positions.bob2.x * this.scale;
        const bob2Y = this.centerY + positions.bob2.y * this.scale;
        
        // Draw rods
        this.drawRod(pivotX, pivotY, bob1X, bob1Y, this.colors.rod1, opacity);
        this.drawRod(bob1X, bob1Y, bob2X, bob2Y, this.colors.rod2, opacity);
        
        // Draw bobs
        this.drawBob(bob1X, bob1Y, this.colors.bob1, opacity, physics.m1);
        this.drawBob(bob2X, bob2Y, this.colors.bob2, opacity, physics.m2);
        
        // Draw velocity vectors
        if (this.showVelocity) {
            this.drawVelocityVectors(physics, bob1X, bob1Y, bob2X, bob2Y, opacity);
        }
        
        // Draw force vectors
        if (this.showForces) {
            this.drawForceVectors(physics, bob1X, bob1Y, bob2X, bob2Y, opacity);
        }
    }
    
    /**
     * Draw rod/connection between points
     */
    drawRod(x1, y1, x2, y2, color, opacity = 1.0) {
        this.ctx.strokeStyle = color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
    
    /**
     * Draw pendulum bob
     */
    drawBob(x, y, color, opacity = 1.0, mass = 1.0) {
        const radius = Math.max(8, Math.min(20, mass * 8));
        
        // Bob shadow
        this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y + 2, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Bob
        this.ctx.fillStyle = color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Bob outline
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Bob highlight
        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    /**
     * Draw trajectory trace
     */
    drawTrajectory(trajectory, opacity = 1.0) {
        if (!this.showTrajectory || trajectory.length < 2) return;
        
        // Create gradient for trajectory
        const gradient = this.ctx.createLinearGradient(
            this.centerX + trajectory[0].x * this.scale,
            this.centerY + trajectory[0].y * this.scale,
            this.centerX + trajectory[trajectory.length - 1].x * this.scale,
            this.centerY + trajectory[trajectory.length - 1].y * this.scale
        );
        
        gradient.addColorStop(0, this.colors.trajectory + '00');
        gradient.addColorStop(0.5, this.colors.trajectory + Math.floor(opacity * 128).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, this.colors.trajectory + Math.floor(opacity * 255).toString(16).padStart(2, '0'));
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        const start = trajectory[0];
        this.ctx.moveTo(this.centerX + start.x * this.scale, this.centerY + start.y * this.scale);
        
        for (let i = 1; i < trajectory.length; i++) {
            const point = trajectory[i];
            this.ctx.lineTo(this.centerX + point.x * this.scale, this.centerY + point.y * this.scale);
        }
        
        this.ctx.stroke();
        
        // Draw velocity-based coloring
        this.drawVelocityTrajectory(trajectory, opacity);
    }
    
    /**
     * Draw trajectory with velocity-based colors
     */
    drawVelocityTrajectory(trajectory, opacity = 1.0) {
        if (trajectory.length < 2) return;
        
        // Find max velocity for normalization
        const maxVelocity = Math.max(...trajectory.map(p => p.velocity));
        
        for (let i = 1; i < trajectory.length; i++) {
            const prev = trajectory[i - 1];
            const curr = trajectory[i];
            
            const velocityRatio = curr.velocity / maxVelocity;
            const hue = velocityRatio * 240; // Blue to red
            
            this.ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${opacity * 0.6})`;
            this.ctx.lineWidth = 1;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX + prev.x * this.scale, this.centerY + prev.y * this.scale);
            this.ctx.lineTo(this.centerX + curr.x * this.scale, this.centerY + curr.y * this.scale);
            this.ctx.stroke();
        }
    }
    
    /**
     * Draw velocity vectors
     */
    drawVelocityVectors(physics, bob1X, bob1Y, bob2X, bob2Y, opacity = 1.0) {
        const scale = 20; // Vector scaling factor
        
        // Calculate velocities
        const v1x = physics.omega1 * physics.l1 * Math.cos(physics.theta1) * scale;
        const v1y = -physics.omega1 * physics.l1 * Math.sin(physics.theta1) * scale;
        const v2x = v1x + physics.omega2 * physics.l2 * Math.cos(physics.theta2) * scale;
        const v2y = v1y - physics.omega2 * physics.l2 * Math.sin(physics.theta2) * scale;
        
        // Draw velocity vectors
        this.drawVector(bob1X, bob1Y, bob1X + v1x, bob1Y + v1y, this.colors.velocity, opacity);
        this.drawVector(bob2X, bob2Y, bob2X + v2x, bob2Y + v2y, this.colors.velocity, opacity);
    }
    
    /**
     * Draw force vectors
     */
    drawForceVectors(physics, bob1X, bob1Y, bob2X, bob2Y, opacity = 1.0) {
        const scale = 10; // Force vector scaling
        
        // Gravity forces
        const fg1x = 0;
        const fg1y = physics.m1 * physics.g * scale;
        const fg2x = 0;
        const fg2y = physics.m2 * physics.g * scale;
        
        // External forces
        const fext1x = physics.externalForce.x * scale;
        const fext1y = physics.externalForce.y * scale;
        const fext2x = physics.externalForce.x * scale;
        const fext2y = physics.externalForce.y * scale;
        
        // Draw force vectors
        this.drawVector(bob1X, bob1Y, bob1X + fg1x, bob1Y + fg1y, '#ef4444', opacity);
        this.drawVector(bob2X, bob2Y, bob2X + fg2x, bob2Y + fg2y, '#ef4444', opacity);
        this.drawVector(bob1X, bob1Y, bob1X + fext1x, bob1Y + fext1y, '#f59e0b', opacity);
        this.drawVector(bob2X, bob2Y, bob2X + fext2x, bob2Y + fext2y, '#f59e0b', opacity);
    }
    
    /**
     * Draw vector arrow
     */
    drawVector(x1, y1, x2, y2, color, opacity = 1.0) {
        this.ctx.strokeStyle = color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        
        // Line
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowLength = 8;
        const arrowAngle = Math.PI / 6;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
            x2 - arrowLength * Math.cos(angle - arrowAngle),
            y2 - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
            x2 - arrowLength * Math.cos(angle + arrowAngle),
            y2 - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.ctx.stroke();
    }
    
    /**
     * Draw energy visualization
     */
    drawEnergyVisualization(energyHistory, x, y, width, height) {
        if (!this.showEnergy || energyHistory.length < 2) return;
        
        // Background
        this.ctx.fillStyle = 'rgba(45, 55, 72, 0.8)';
        this.ctx.fillRect(x, y, width, height);
        
        // Border
        this.ctx.strokeStyle = 'rgba(248, 246, 240, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
        
        // Find max values for scaling
        const maxEnergy = Math.max(...energyHistory.map(e => e.total));
        
        // Draw energy bars
        const barWidth = width / energyHistory.length;
        
        energyHistory.forEach((energy, i) => {
            const barX = x + i * barWidth;
            
            // Kinetic energy
            const keHeight = (energy.kinetic / maxEnergy) * height * 0.8;
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.fillRect(barX, y + height - keHeight, barWidth, keHeight);
            
            // Potential energy
            const peHeight = (energy.potential / maxEnergy) * height * 0.8;
            this.ctx.fillStyle = '#10b981';
            this.ctx.fillRect(barX, y + height - keHeight - peHeight, barWidth, peHeight);
        });
        
        // Labels
        this.ctx.fillStyle = '#f8f6f0';
        this.ctx.font = '10px Inter';
        this.ctx.fillText('Energy', x + 5, y + 15);
        this.ctx.fillText('KE', x + 5, y + 30);
        this.ctx.fillText('PE', x + 5, y + 45);
    }
    
    /**
     * Main render function
     */
    render(physics, chaosSystem = null) {
        this.drawBackground();
        
        if (this.mode === 'chaos' && chaosSystem) {
            // Draw multiple pendulums for chaos demonstration
            const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
            chaosSystem.pendulums.forEach((pendulum, i) => {
                const opacity = 0.8 - i * 0.15;
                this.drawPendulum(pendulum, opacity);
                this.drawTrajectory(pendulum.trajectory, opacity);
            });
        } else {
            // Draw single pendulum
            this.drawPendulum(physics);
            
            if (this.showTrajectory) {
                this.drawTrajectory(physics.trajectory);
            }
            
            // Draw energy visualization
            if (this.showEnergy && physics.energyHistory.length > 0) {
                this.drawEnergyVisualization(
                    physics.energyHistory.slice(-50),
                    this.width - 210,
                    10,
                    200,
                    100
                );
            }
        }
    }
    
    /**
     * Start animation loop
     */
    startAnimation() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        const animate = () => {
            if (!this.isRunning) return;
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Stop animation loop
     */
    stopAnimation() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Set visualization mode
     */
    setMode(mode) {
        this.mode = mode;
    }
    
    /**
     * Toggle visualization options
     */
    toggleOption(option) {
        this[option] = !this[option];
    }
    
    /**
     * Clear canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PendulumVisualization;
}