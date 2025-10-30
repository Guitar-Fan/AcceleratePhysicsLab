/**
 * Interactive Control System
 * Handles real-time parameter adjustment and user interactions
 */

class PendulumControls {
    constructor(physics, visualization, chaosSystem = null) {
        this.physics = physics;
        this.visualization = visualization;
        this.chaosSystem = chaosSystem;
        
        // Control elements
        this.elements = {};
        this.isDragging = false;
        this.dragTarget = null;
        
        // Animation control
        this.animationId = null;
        this.isRunning = false;
        
        this.initializeControls();
        this.setupEventListeners();
    }
    
    /**
     * Initialize control elements
     */
    initializeControls() {
        // Create control panel structure
        this.createControlPanel();
        this.createParameterControls();
        this.createModeControls();
        this.createVisualizationControls();
    }
    
    /**
     * Create main control panel
     */
    createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'control-panel';
        panel.className = 'control-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>Physics Laboratory</h3>
                <div class="panel-controls">
                    <button id="play-pause-btn" class="control-btn">▶️</button>
                    <button id="reset-btn" class="control-btn">🔄</button>
                    <button id="settings-btn" class="control-btn">⚙️</button>
                </div>
            </div>
            <div class="panel-content">
                <div class="control-section">
                    <h4>Physical Parameters</h4>
                    <div id="physics-controls"></div>
                </div>
                <div class="control-section">
                    <h4>Initial Conditions</h4>
                    <div id="initial-controls"></div>
                </div>
                <div class="control-section">
                    <h4>Environment</h4>
                    <div id="environment-controls"></div>
                </div>
                <div class="control-section">
                    <h4>Visualization</h4>
                    <div id="visual-controls"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.elements.panel = panel;
    }
    
    /**
     * Create parameter controls
     */
    createParameterControls() {
        const physicsControls = document.getElementById('physics-controls');
        physicsControls.innerHTML = `
            <div class="control-group">
                <label>Mass 1 (kg): <span id="m1-value">${this.physics.m1}</span></label>
                <input type="range" id="m1-slider" min="0.1" max="5.0" step="0.1" value="${this.physics.m1}">
            </div>
            <div class="control-group">
                <label>Mass 2 (kg): <span id="m2-value">${this.physics.m2}</span></label>
                <input type="range" id="m2-slider" min="0.1" max="5.0" step="0.1" value="${this.physics.m2}">
            </div>
            <div class="control-group">
                <label>Length 1 (m): <span id="l1-value">${this.physics.l1}</span></label>
                <input type="range" id="l1-slider" min="0.1" max="2.0" step="0.1" value="${this.physics.l1}">
            </div>
            <div class="control-group">
                <label>Length 2 (m): <span id="l2-value">${this.physics.l2}</span></label>
                <input type="range" id="l2-slider" min="0.1" max="2.0" step="0.1" value="${this.physics.l2}">
            </div>
            <div class="control-group">
                <label>Gravity (m/s²): <span id="g-value">${this.physics.g}</span></label>
                <input type="range" id="g-slider" min="1.0" max="20.0" step="0.1" value="${this.physics.g}">
            </div>
        `;
        
        const initialControls = document.getElementById('initial-controls');
        initialControls.innerHTML = `
            <div class="control-group">
                <label>Angle 1 (°): <span id="theta1-value">${(this.physics.theta1 * 180 / Math.PI).toFixed(1)}</span></label>
                <input type="range" id="theta1-slider" min="-180" max="180" step="1" value="${this.physics.theta1 * 180 / Math.PI}">
            </div>
            <div class="control-group">
                <label>Angle 2 (°): <span id="theta2-value">${(this.physics.theta2 * 180 / Math.PI).toFixed(1)}</span></label>
                <input type="range" id="theta2-slider" min="-180" max="180" step="1" value="${this.physics.theta2 * 180 / Math.PI}">
            </div>
            <div class="control-group">
                <label>Velocity 1 (°/s): <span id="omega1-value">${(this.physics.omega1 * 180 / Math.PI).toFixed(1)}</span></label>
                <input type="range" id="omega1-slider" min="-360" max="360" step="1" value="${this.physics.omega1 * 180 / Math.PI}">
            </div>
            <div class="control-group">
                <label>Velocity 2 (°/s): <span id="omega2-value">${(this.physics.omega2 * 180 / Math.PI).toFixed(1)}</span></label>
                <input type="range" id="omega2-slider" min="-360" max="360" step="1" value="${this.physics.omega2 * 180 / Math.PI}">
            </div>
        `;
        
        const environmentControls = document.getElementById('environment-controls');
        environmentControls.innerHTML = `
            <div class="control-group">
                <label>Air Resistance: <span id="damping-value">${this.physics.damping}</span></label>
                <input type="range" id="damping-slider" min="0.0" max="0.1" step="0.01" value="${this.physics.damping}">
            </div>
            <div class="control-group">
                <label>External Force X: <span id="force-x-value">${this.physics.externalForce.x}</span></label>
                <input type="range" id="force-x-slider" min="-10" max="10" step="0.5" value="${this.physics.externalForce.x}">
            </div>
            <div class="control-group">
                <label>External Force Y: <span id="force-y-value">${this.physics.externalForce.y}</span></label>
                <input type="range" id="force-y-slider" min="-10" max="10" step="0.5" value="${this.physics.externalForce.y}">
            </div>
        `;
    }
    
    /**
     * Create mode control buttons
     */
    createModeControls() {
        const modeControls = document.createElement('div');
        modeControls.className = 'mode-controls';
        modeControls.innerHTML = `
            <h4>Simulation Mode</h4>
            <div class="mode-buttons">
                <button id="normal-mode" class="mode-btn active">Normal</button>
                <button id="trace-mode" class="mode-btn">Trace</button>
                <button id="chaos-mode" class="mode-btn">Chaos</button>
                <button id="slow-mode" class="mode-btn">Slow Motion</button>
            </div>
        `;
        
        document.querySelector('.panel-content').appendChild(modeControls);
    }
    
    /**
     * Create visualization control toggles
     */
    createVisualizationControls() {
        const visualControls = document.getElementById('visual-controls');
        visualControls.innerHTML = `
            <div class="control-group">
                <label>
                    <input type="checkbox" id="show-trajectory" checked>
                    Show Trajectory
                </label>
            </div>
            <div class="control-group">
                <label>
                    <input type="checkbox" id="show-energy" checked>
                    Show Energy
                </label>
            </div>
            <div class="control-group">
                <label>
                    <input type="checkbox" id="show-velocity">
                    Show Velocity Vectors
                </label>
            </div>
            <div class="control-group">
                <label>
                    <input type="checkbox" id="show-forces">
                    Show Force Vectors
                </label>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Play/Pause button
        document.getElementById('play-pause-btn').addEventListener('click', () => {
            this.toggleSimulation();
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSimulation();
        });
        
        // Parameter sliders
        this.setupSliderListeners();
        
        // Mode buttons
        this.setupModeListeners();
        
        // Visualization toggles
        this.setupVisualizationListeners();
        
        // Canvas interaction
        this.setupCanvasInteraction();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }
    
    /**
     * Setup slider event listeners
     */
    setupSliderListeners() {
        // Physics parameters
        const physicsSliders = ['m1', 'm2', 'l1', 'l2', 'g'];
        physicsSliders.forEach(param => {
            const slider = document.getElementById(`${param}-slider`);
            const value = document.getElementById(`${param}-value`);
            
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                value.textContent = val;
                this.physics.setParameters({ [param]: val });
                if (this.chaosSystem) {
                    this.chaosSystem.pendulums.forEach(p => p.setParameters({ [param]: val }));
                }
            });
        });
        
        // Initial conditions
        const initialSliders = ['theta1', 'theta2', 'omega1', 'omega2'];
        initialSliders.forEach(param => {
            const slider = document.getElementById(`${param}-slider`);
            const value = document.getElementById(`${param}-value`);
            
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                value.textContent = val.toFixed(1);
                
                if (param === 'theta1' || param === 'theta2') {
                    this.physics[param] = val * Math.PI / 180;
                } else {
                    this.physics[param] = val * Math.PI / 180;
                }
            });
        });
        
        // Environment parameters
        const envSliders = ['damping', 'force-x', 'force-y'];
        envSliders.forEach(param => {
            const slider = document.getElementById(`${param}-slider`);
            const value = document.getElementById(`${param}-value`);
            
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                value.textContent = val.toFixed(2);
                
                if (param === 'damping') {
                    this.physics.damping = val;
                } else if (param === 'force-x') {
                    this.physics.externalForce.x = val;
                } else if (param === 'force-y') {
                    this.physics.externalForce.y = val;
                }
            });
        });
    }
    
    /**
     * Setup mode button listeners
     */
    setupModeListeners() {
        const modes = ['normal', 'trace', 'chaos', 'slow'];
        
        modes.forEach(mode => {
            const btn = document.getElementById(`${mode}-mode`);
            btn.addEventListener('click', () => {
                this.setMode(mode);
                
                // Update button states
                modes.forEach(m => {
                    document.getElementById(`${m}-mode`).classList.remove('active');
                });
                btn.classList.add('active');
            });
        });
    }
    
    /**
     * Setup visualization toggle listeners
     */
    setupVisualizationListeners() {
        document.getElementById('show-trajectory').addEventListener('change', (e) => {
            this.visualization.showTrajectory = e.target.checked;
        });
        
        document.getElementById('show-energy').addEventListener('change', (e) => {
            this.visualization.showEnergy = e.target.checked;
        });
        
        document.getElementById('show-velocity').addEventListener('change', (e) => {
            this.visualization.showVelocity = e.target.checked;
        });
        
        document.getElementById('show-forces').addEventListener('change', (e) => {
            this.visualization.showForces = e.target.checked;
        });
    }
    
    /**
     * Setup canvas interaction
     */
    setupCanvasInteraction() {
        const canvas = this.visualization.canvas;
        
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if clicking on a pendulum bob
            const positions = this.physics.getPositions();
            const bob1X = this.visualization.centerX + positions.bob1.x * this.visualization.scale;
            const bob1Y = this.visualization.centerY + positions.bob1.y * this.visualization.scale;
            const bob2X = this.visualization.centerX + positions.bob2.x * this.visualization.scale;
            const bob2Y = this.visualization.centerY + positions.bob2.y * this.visualization.scale;
            
            const dist1 = Math.sqrt((x - bob1X) ** 2 + (y - bob1Y) ** 2);
            const dist2 = Math.sqrt((x - bob2X) ** 2 + (y - bob2Y) ** 2);
            
            if (dist1 < 20) {
                this.isDragging = true;
                this.dragTarget = 'bob1';
            } else if (dist2 < 20) {
                this.isDragging = true;
                this.dragTarget = 'bob2';
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.visualization.centerX) / this.visualization.scale;
            const y = (e.clientY - rect.top - this.visualization.centerY) / this.visualization.scale;
            
            if (this.dragTarget === 'bob1') {
                this.physics.theta1 = Math.atan2(x, y);
                this.updateSlider('theta1', this.physics.theta1 * 180 / Math.PI);
            } else if (this.dragTarget === 'bob2') {
                const positions = this.physics.getPositions();
                const relX = x - positions.bob1.x;
                const relY = y - positions.bob1.y;
                this.physics.theta2 = Math.atan2(relX, relY);
                this.updateSlider('theta2', this.physics.theta2 * 180 / Math.PI);
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.dragTarget = null;
        });
        
        canvas.addEventListener('click', (e) => {
            if (this.isDragging) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.visualization.centerX) / this.visualization.scale;
            const y = (e.clientY - rect.top - this.visualization.centerY) / this.visualization.scale;
            
            // Apply impulse force at click location
            this.physics.applyForce({ x: x * 0.1, y: y * 0.1 });
            
            // Clear force after a short time
            setTimeout(() => {
                this.physics.clearForces();
                document.getElementById('force-x-slider').value = 0;
                document.getElementById('force-y-slider').value = 0;
                document.getElementById('force-x-value').textContent = '0';
                document.getElementById('force-y-value').textContent = '0';
            }, 100);
        });
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.toggleSimulation();
                    break;
                case 'r':
                    this.resetSimulation();
                    break;
                case 'c':
                    this.setMode('chaos');
                    break;
                case 't':
                    this.setMode('trace');
                    break;
                case 'n':
                    this.setMode('normal');
                    break;
                case 's':
                    this.setMode('slow');
                    break;
            }
        });
    }
    
    /**
     * Start/stop simulation
     */
    toggleSimulation() {
        if (this.isRunning) {
            this.stopSimulation();
        } else {
            this.startSimulation();
        }
    }
    
    /**
     * Start simulation
     */
    startSimulation() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        document.getElementById('play-pause-btn').textContent = '⏸️';
        
        const animate = () => {
            if (!this.isRunning) return;
            
            // Update physics
            if (this.visualization.mode === 'chaos' && this.chaosSystem) {
                this.chaosSystem.step();
            } else {
                const steps = this.visualization.mode === 'slow' ? 1 : 1;
                for (let i = 0; i < steps; i++) {
                    this.physics.rungeKuttaStep();
                }
            }
            
            // Render
            this.visualization.render(this.physics, this.chaosSystem);
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Stop simulation
     */
    stopSimulation() {
        this.isRunning = false;
        document.getElementById('play-pause-btn').textContent = '▶️';
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Reset simulation
     */
    resetSimulation() {
        this.stopSimulation();
        
        // Reset physics
        this.physics.reset();
        
        // Reset chaos system
        if (this.chaosSystem) {
            this.chaosSystem.reset();
        }
        
        // Update sliders
        this.updateAllSliders();
        
        // Clear visualization
        this.visualization.clear();
        this.visualization.render(this.physics, this.chaosSystem);
    }
    
    /**
     * Set simulation mode
     */
    setMode(mode) {
        this.visualization.setMode(mode);
        
        if (mode === 'chaos' && !this.chaosSystem) {
            this.chaosSystem = new ChaosPendulumSystem(this.physics);
        }
        
        // Update button states
        const modes = ['normal', 'trace', 'chaos', 'slow'];
        modes.forEach(m => {
            const btn = document.getElementById(`${m}-mode`);
            if (btn) btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`${mode}-mode`);
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    /**
     * Update slider value
     */
    updateSlider(id, value) {
        const slider = document.getElementById(`${id}-slider`);
        const valueDisplay = document.getElementById(`${id}-value`);
        
        if (slider) slider.value = value;
        if (valueDisplay) valueDisplay.textContent = typeof value === 'number' ? value.toFixed(1) : value;
    }
    
    /**
     * Update all sliders to match current physics state
     */
    updateAllSliders() {
        // Physics parameters
        this.updateSlider('m1', this.physics.m1);
        this.updateSlider('m2', this.physics.m2);
        this.updateSlider('l1', this.physics.l1);
        this.updateSlider('l2', this.physics.l2);
        this.updateSlider('g', this.physics.g);
        
        // Initial conditions
        this.updateSlider('theta1', this.physics.theta1 * 180 / Math.PI);
        this.updateSlider('theta2', this.physics.theta2 * 180 / Math.PI);
        this.updateSlider('omega1', this.physics.omega1 * 180 / Math.PI);
        this.updateSlider('omega2', this.physics.omega2 * 180 / Math.PI);
        
        // Environment
        this.updateSlider('damping', this.physics.damping);
        this.updateSlider('force-x', this.physics.externalForce.x);
        this.updateSlider('force-y', this.physics.externalForce.y);
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PendulumControls;
}