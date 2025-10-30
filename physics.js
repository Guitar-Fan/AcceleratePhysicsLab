/**
 * Double Pendulum Physics Engine
 * Implements 4th-order Runge-Kutta numerical integration for accurate physics simulation
 */

class DoublePendulumPhysics {
    constructor() {
        // Physical parameters
        this.g = 9.81;           // Gravity (m/s²)
        this.m1 = 1.0;           // Mass of first bob (kg)
        this.m2 = 1.0;           // Mass of second bob (kg)
        this.l1 = 1.0;           // Length of first rod (m)
        this.l2 = 1.0;           // Length of second rod (m)
        
        // State variables
        this.theta1 = Math.PI / 2;  // Angle of first pendulum (rad)
        this.theta2 = Math.PI / 2;  // Angle of second pendulum (rad)
        this.omega1 = 0.0;          // Angular velocity of first pendulum (rad/s)
        this.omega2 = 0.0;          // Angular velocity of second pendulum (rad/s)
        
        // Environmental factors
        this.damping = 0.0;         // Air resistance coefficient
        this.externalForce = { x: 0, y: 0 }; // External force vector
        
        // Simulation control
        this.timeStep = 0.01;       // Integration time step (s)
        this.time = 0.0;            // Current simulation time (s)
        
        // Data collection
        this.trajectory = [];       // Position history for tracing
        this.energyHistory = [];    // Energy conservation tracking
        this.maxTrajectoryLength = 1000;
        
        // Pendulum type
        this.pendulumType = 'rod';  // 'rod', 'string', 'spring'
        this.springConstant = 50.0; // For spring connections
    }
    
    /**
     * Calculate derivatives for the system of differential equations
     * Uses the full nonlinear equations of motion derived from Lagrangian mechanics
     */
    calculateDerivatives(theta1, theta2, omega1, omega2) {
        const cosDiff = Math.cos(theta1 - theta2);
        const sinDiff = Math.sin(theta1 - theta2);
        
        // Denominator for angular acceleration calculations
        const denom = this.m1 + this.m2 * sinDiff * sinDiff;
        
        // Calculate angular accelerations using Lagrangian mechanics
        const alpha1 = (
            -this.g * (2 * this.m1 + this.m2) * Math.sin(theta1)
            - this.m2 * this.g * Math.sin(theta1 - 2 * theta2)
            - 2 * sinDiff * this.m2 * (
                omega2 * omega2 * this.l2
                + omega1 * omega1 * this.l1 * cosDiff
            )
        ) / (this.l1 * denom);
        
        const alpha2 = (
            2 * sinDiff * (
                omega1 * omega1 * this.l1 * (this.m1 + this.m2)
                + this.g * (this.m1 + this.m2) * Math.cos(theta1)
                + omega2 * omega2 * this.l2 * this.m2 * cosDiff
            )
        ) / (this.l2 * denom);
        
        // Apply damping (air resistance)
        const damping1 = -this.damping * omega1;
        const damping2 = -this.damping * omega2;
        
        // Apply external forces if present
        const externalAlpha1 = this.externalForce.x * Math.cos(theta1) / (this.m1 * this.l1);
        const externalAlpha2 = this.externalForce.x * Math.cos(theta2) / (this.m2 * this.l2);
        
        return {
            dTheta1: omega1,
            dTheta2: omega2,
            dOmega1: alpha1 + damping1 + externalAlpha1,
            dOmega2: alpha2 + damping2 + externalAlpha2
        };
    }
    
    /**
     * 4th-order Runge-Kutta numerical integration
     * Provides high accuracy for chaotic systems
     */
    rungeKuttaStep() {
        const h = this.timeStep;
        
        // Current state
        const theta1 = this.theta1;
        const theta2 = this.theta2;
        const omega1 = this.omega1;
        const omega2 = this.omega2;
        
        // Calculate k1
        const k1 = this.calculateDerivatives(theta1, theta2, omega1, omega2);
        
        // Calculate k2
        const k2 = this.calculateDerivatives(
            theta1 + 0.5 * h * k1.dTheta1,
            theta2 + 0.5 * h * k1.dTheta2,
            omega1 + 0.5 * h * k1.dOmega1,
            omega2 + 0.5 * h * k1.dOmega2
        );
        
        // Calculate k3
        const k3 = this.calculateDerivatives(
            theta1 + 0.5 * h * k2.dTheta1,
            theta2 + 0.5 * h * k2.dTheta2,
            omega1 + 0.5 * h * k2.dOmega1,
            omega2 + 0.5 * h * k2.dOmega2
        );
        
        // Calculate k4
        const k4 = this.calculateDerivatives(
            theta1 + h * k3.dTheta1,
            theta2 + h * k3.dTheta2,
            omega1 + h * k3.dOmega1,
            omega2 + h * k3.dOmega2
        );
        
        // Update state using weighted average
        this.theta1 += h * (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1) / 6;
        this.theta2 += h * (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2) / 6;
        this.omega1 += h * (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1) / 6;
        this.omega2 += h * (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2) / 6;
        
        // Normalize angles to [-π, π]
        this.theta1 = this.normalizeAngle(this.theta1);
        this.theta2 = this.normalizeAngle(this.theta2);
        
        // Update time
        this.time += h;
        
        // Collect data
        this.collectData();
    }
    
    /**
     * Normalize angle to [-π, π] range
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
    
    /**
     * Calculate Cartesian coordinates of pendulum bobs
     */
    getPositions() {
        const x1 = this.l1 * Math.sin(this.theta1);
        const y1 = this.l1 * Math.cos(this.theta1);
        const x2 = x1 + this.l2 * Math.sin(this.theta2);
        const y2 = y1 + this.l2 * Math.cos(this.theta2);
        
        return {
            pivot: { x: 0, y: 0 },
            bob1: { x: x1, y: y1 },
            bob2: { x: x2, y: y2 }
        };
    }
    
    /**
     * Calculate total energy of the system
     */
    calculateEnergy() {
        const positions = this.getPositions();
        
        // Kinetic energy
        const v1x = this.omega1 * this.l1 * Math.cos(this.theta1);
        const v1y = -this.omega1 * this.l1 * Math.sin(this.theta1);
        const v2x = v1x + this.omega2 * this.l2 * Math.cos(this.theta2);
        const v2y = v1y - this.omega2 * this.l2 * Math.sin(this.theta2);
        
        const ke1 = 0.5 * this.m1 * (v1x * v1x + v1y * v1y);
        const ke2 = 0.5 * this.m2 * (v2x * v2x + v2y * v2y);
        const kineticEnergy = ke1 + ke2;
        
        // Potential energy (relative to pivot)
        const pe1 = this.m1 * this.g * (positions.bob1.y + this.l1);
        const pe2 = this.m2 * this.g * (positions.bob2.y + this.l1 + this.l2);
        const potentialEnergy = pe1 + pe2;
        
        return {
            kinetic: kineticEnergy,
            potential: potentialEnergy,
            total: kineticEnergy + potentialEnergy
        };
    }
    
    /**
     * Collect simulation data for analysis and visualization
     */
    collectData() {
        const positions = this.getPositions();
        const energy = this.calculateEnergy();
        
        // Add to trajectory
        this.trajectory.push({
            x: positions.bob2.x,
            y: positions.bob2.y,
            time: this.time,
            velocity: Math.sqrt(
                this.omega1 * this.omega1 * this.l1 * this.l1 +
                this.omega2 * this.omega2 * this.l2 * this.l2
            )
        });
        
        // Limit trajectory length
        if (this.trajectory.length > this.maxTrajectoryLength) {
            this.trajectory.shift();
        }
        
        // Add to energy history
        this.energyHistory.push({
            time: this.time,
            kinetic: energy.kinetic,
            potential: energy.potential,
            total: energy.total
        });
        
        // Limit energy history length
        if (this.energyHistory.length > this.maxTrajectoryLength) {
            this.energyHistory.shift();
        }
    }
    
    /**
     * Reset simulation to initial conditions
     */
    reset(theta1 = Math.PI / 2, theta2 = Math.PI / 2, omega1 = 0, omega2 = 0) {
        this.theta1 = theta1;
        this.theta2 = theta2;
        this.omega1 = omega1;
        this.omega2 = omega2;
        this.time = 0.0;
        this.trajectory = [];
        this.energyHistory = [];
    }
    
    /**
     * Set physical parameters
     */
    setParameters(params) {
        if (params.m1 !== undefined) this.m1 = params.m1;
        if (params.m2 !== undefined) this.m2 = params.m2;
        if (params.l1 !== undefined) this.l1 = params.l1;
        if (params.l2 !== undefined) this.l2 = params.l2;
        if (params.g !== undefined) this.g = params.g;
        if (params.damping !== undefined) this.damping = params.damping;
        if (params.springConstant !== undefined) this.springConstant = params.springConstant;
    }
    
    /**
     * Apply external force for one time step
     */
    applyForce(force) {
        this.externalForce = force;
    }
    
    /**
     * Clear external forces
     */
    clearForces() {
        this.externalForce = { x: 0, y: 0 };
    }
    
    /**
     * Get current state for analysis
     */
    getState() {
        return {
            theta1: this.theta1,
            theta2: this.theta2,
            omega1: this.omega1,
            omega2: this.omega2,
            time: this.time,
            energy: this.calculateEnergy(),
            positions: this.getPositions()
        };
    }
}

/**
 * Multiple pendulum system for chaos demonstration
 */
class ChaosPendulumSystem {
    constructor(basePendulum, numPendulums = 4, perturbation = 0.001) {
        this.pendulums = [];
        this.numPendulums = numPendulums;
        this.perturbation = perturbation;
        
        // Create pendulums with slightly different initial conditions
        for (let i = 0; i < numPendulums; i++) {
            const pendulum = new DoublePendulumPhysics();
            
            // Copy parameters from base
            pendulum.setParameters({
                m1: basePendulum.m1,
                m2: basePendulum.m2,
                l1: basePendulum.l1,
                l2: basePendulum.l2,
                g: basePendulum.g,
                damping: basePendulum.damping
            });
            
            // Apply small perturbations
            const pert = perturbation * (i + 1);
            pendulum.reset(
                basePendulum.theta1 + pert * (Math.random() - 0.5),
                basePendulum.theta2 + pert * (Math.random() - 0.5),
                basePendulum.omega1 + pert * (Math.random() - 0.5) * 0.1,
                basePendulum.omega2 + pert * (Math.random() - 0.5) * 0.1
            );
            
            this.pendulums.push(pendulum);
        }
    }
    
    /**
     * Advance all pendulums by one time step
     */
    step() {
        this.pendulums.forEach(pendulum => pendulum.rungeKuttaStep());
    }
    
    /**
     * Calculate divergence between pendulum trajectories
     */
    calculateDivergence() {
        const positions = this.pendulums.map(p => p.getPositions().bob2);
        const divergence = [];
        
        for (let i = 1; i < positions.length; i++) {
            const dx = positions[i].x - positions[0].x;
            const dy = positions[i].y - positions[0].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            divergence.push(distance);
        }
        
        return divergence;
    }
    
    /**
     * Reset all pendulums
     */
    reset() {
        this.pendulums.forEach((pendulum, i) => {
            const pert = this.perturbation * (i + 1);
            pendulum.reset(
                this.pendulums[0].theta1 + pert * (Math.random() - 0.5),
                this.pendulums[0].theta2 + pert * (Math.random() - 0.5),
                this.pendulums[0].omega1 + pert * (Math.random() - 0.5) * 0.1,
                this.pendulums[0].omega2 + pert * (Math.random() - 0.5) * 0.1
            );
        });
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DoublePendulumPhysics, ChaosPendulumSystem };
}