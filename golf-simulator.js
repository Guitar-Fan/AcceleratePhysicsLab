/**
 * Golf Swing Simulator using Double Pendulum Physics
 * Focused on arm-club system with ball trajectory analysis
 */

class GolfSimulator {
    constructor() {
        console.log('🏌️ Initializing Golf Simulator...');
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Camera system
        this.cameraSystem = {
            mode: 'setup', // 'setup', 'swing', 'follow', 'overview'
            followTarget: null,
            smoothFactor: 0.1,
            originalPosition: { x: 3, y: 2, z: 5 },
            originalTarget: { x: 0, y: 0, z: 0 }
        };
        
        // Pendulum system (arm + club)
        this.pendulum = {
            pivot: null,
            arm: null,        // Upper pendulum (golfer's arm)
            club: null,       // Lower pendulum (golf club)
            armMass: null,
            clubHead: null,
            trail: []
        };
        
        // Golf ball and trajectory
        this.ball = {
            mesh: null,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            isFlying: false,
            isRolling: false,
            trail: [],
            maxDistance: 0,
            maxHeight: 0,
            bounceCount: 0,
            rollDistance: 0,
            carryDistance: 0
        };
        
        // Physics parameters - FIXED VALUES (shoulder at 1.5m, ground at 0m)
        this.params = {
            armLength: 0.6,   // Realistic arm length - FIXED
            clubLength: 1.0,  // Realistic club length - FIXED (total 1.4m < 1.5m shoulder height)
            armMass: 70,      // Effective arm mass
            clubMass: 0.45,   // Golf club mass
            damping: 0.05,
            gravity: -9.81,
            
            // Current angles (in radians)
            armAngle: 0,
            clubAngle: 0,
            
            // Angular velocities
            armVelocity: 0,
            clubVelocity: 0,
            
            // Swing parameters
            swingForce: 500,
            ballMass: 0.046   // Golf ball mass in kg
        };
        
        // Animation state
        this.isSwinging = false;
        this.animationId = null;
        this.time = 0;
        
        // Golf course elements
        this.courseElements = [];
        
        // Physics equations and calculations
        this.physics = {
            // Golf ball physics constants
            ballRadius: 0.021, // m
            ballMass: 0.046, // kg
            airDensity: 1.225, // kg/m³
            dragCoefficient: 0.47, // sphere
            liftCoefficient: 0.15, // golf ball with dimples
            magnusEffect: true,
            
            // Bouncing physics
            coefficientOfRestitution: 0.8, // energy retained after bounce
            groundFriction: 0.3, // rolling friction coefficient
            bounceThreshold: 0.1, // minimum speed for bouncing (m/s)
            rollThreshold: 2.0, // speed below which ball starts rolling (m/s)
            
            // Swing physics
            momentOfInertia: {
                arm: 0.5, // kg⋅m²
                club: 0.1  // kg⋅m²
            },
            
            // Environmental factors
            windSpeed: 0, // m/s
            temperature: 20, // °C
            humidity: 50 // %
        };
        
        // Lock physics parameters to prevent modification
        this.lockPhysicsParameters();
        
        this.initializeThreeJS();
        this.createScene();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
        
        console.log('✅ Golf Simulator ready!');
    }
    
    /**
     * Lock physics parameters to prevent any modification
     */
    lockPhysicsParameters() {
        // Make arm and club lengths immutable
        Object.defineProperty(this.params, 'armLength', {
            value: 0.6,
            writable: false,
            configurable: false
        });
        
        Object.defineProperty(this.params, 'clubLength', {
            value: 1.0,
            writable: false,
            configurable: false
        });
        
        console.log(`🔒 Physics locked: Arm=${this.params.armLength}m, Club=${this.params.clubLength}m`);
        console.log(`📏 Total reach: ${this.params.armLength + this.params.clubLength}m (shoulder at 1.5m)`);
    }
    
    /**
     * Initialize Three.js scene, camera, renderer
     */
    initializeThreeJS() {
        const container = document.getElementById('threejs-container');
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        
        // Camera setup - positioned for side view of swing
        this.camera = new THREE.PerspectiveCamera(
            60, 
            container.offsetWidth / container.offsetHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(3, 2, 5);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.physicallyCorrectLights = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Clear loading and add renderer
        container.innerHTML = '';
        container.appendChild(this.renderer.domElement);
        
        // Orbit controls for viewing
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 30;
        this.controls.minDistance = 2;
        this.controls.maxPolarAngle = Math.PI * 0.48; // Limit to above ground
        
        console.log('📐 Three.js initialized');
    }
    
    /**
     * Create the golf scene with pendulum, ball, and course
     */
    createScene() {
        this.setupLighting();
        this.createGolfCourse();
        this.createPendulumSystem();
        this.createGolfBall();
        this.createTargets();
    }
    
    /**
     * Setup realistic lighting for outdoor golf scene
     */
    setupLighting() {
        // Ambient light (sky)
        const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.4);
        this.scene.add(ambientLight);
        
        // Sun (directional light)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(20, 20, 10);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 100;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        this.scene.add(sunLight);
        
        // Soft fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
    }
    
    /**
     * Create golf course environment
     */
    createGolfCourse() {
        // Fairway (main ground)
        const fairwayGeometry = new THREE.PlaneGeometry(100, 20);
        const fairwayMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x228B22,
            transparent: false
        });
        const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
        fairway.rotation.x = -Math.PI / 2;
        fairway.position.y = -0.1;
        fairway.receiveShadow = true;
        this.scene.add(fairway);
        
        // Tee box
        const teeGeometry = new THREE.PlaneGeometry(3, 3);
        const teeMaterial = new THREE.MeshLambertMaterial({ color: 0x32CD32 });
        const tee = new THREE.Mesh(teeGeometry, teeMaterial);
        tee.rotation.x = -Math.PI / 2;
        tee.position.set(0, -0.05, 0);
        tee.receiveShadow = true;
        this.scene.add(tee);
        
        // Distance markers
        for (let distance = 50; distance <= 300; distance += 50) {
            const markerGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
            const markerMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(distance / 10, 1, 0); // Scale down for viewport
            marker.castShadow = true;
            this.scene.add(marker);
            
            // Distance text (simplified)
            const textGeometry = new THREE.RingGeometry(0.1, 0.15, 8);
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.set(distance / 10, 2.2, 0);
            this.scene.add(textMesh);
        }
        
        console.log('🏌️ Golf course created');
    }
    
    /**
     * Create double pendulum system (arm + club)
     */
    createPendulumSystem() {
        // Materials
        const pivotMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513, // Brown for shoulder
            shininess: 30
        });
        
        const armMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFDBB3, // Skin color
            shininess: 50
        });
        
        const clubMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2F4F4F, // Dark slate gray for club shaft
            shininess: 100
        });
        
        const clubHeadMaterial = new THREE.MeshPhongMaterial({
            color: 0xC0C0C0, // Silver for club head
            shininess: 200
        });
        
        // Pivot point (shoulder)
        const pivotGeometry = new THREE.SphereGeometry(0.08);
        this.pendulum.pivot = new THREE.Mesh(pivotGeometry, pivotMaterial);
        this.pendulum.pivot.position.set(0, 1.5, 0); // Shoulder height
        this.pendulum.pivot.castShadow = true;
        this.scene.add(this.pendulum.pivot);
        
        // Arm (upper pendulum)
        const armGeometry = new THREE.CylinderGeometry(0.04, 0.04, this.params.armLength);
        this.pendulum.arm = new THREE.Mesh(armGeometry, armMaterial);
        this.pendulum.arm.position.set(0, 1.5 - this.params.armLength/2, 0);
        this.pendulum.arm.castShadow = true;
        this.scene.add(this.pendulum.arm);
        
        // Arm mass (hand/wrist)
        const armMassGeometry = new THREE.SphereGeometry(0.06);
        this.pendulum.armMass = new THREE.Mesh(armMassGeometry, pivotMaterial);
        this.pendulum.armMass.position.set(0, 1.5 - this.params.armLength, 0);
        this.pendulum.armMass.castShadow = true;
        this.scene.add(this.pendulum.armMass);
        
        // Golf club shaft (lower pendulum)
        const clubGeometry = new THREE.CylinderGeometry(0.015, 0.015, this.params.clubLength);
        this.pendulum.club = new THREE.Mesh(clubGeometry, clubMaterial);
        this.pendulum.club.position.set(0, 1.5 - this.params.armLength - this.params.clubLength/2, 0);
        this.pendulum.club.castShadow = true;
        this.scene.add(this.pendulum.club);
        
        // Club head
        const clubHeadGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.05);
        this.pendulum.clubHead = new THREE.Mesh(clubHeadGeometry, clubHeadMaterial);
        this.pendulum.clubHead.position.set(0, 1.5 - this.params.armLength - this.params.clubLength, 0);
        this.pendulum.clubHead.castShadow = true;
        this.scene.add(this.pendulum.clubHead);
        
        // Update positions based on initial angles
        this.updatePendulumPositions();
        
        console.log('🎯 Pendulum system created');
    }
    
    /**
     * Create golf ball at tee position
     */
    createGolfBall() {
        const ballGeometry = new THREE.SphereGeometry(0.021); // Standard golf ball radius
        const ballMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            shininess: 100
        });
        
        this.ball.mesh = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.mesh.position.set(0, 0.021, 0); // On tee
        this.ball.mesh.castShadow = true;
        this.scene.add(this.ball.mesh);
        
        // Reset ball state
        this.ball.position = { x: 0, y: 0.021, z: 0 };
        this.ball.velocity = { x: 0, y: 0, z: 0 };
        this.ball.isFlying = false;
        this.ball.trail = [];
        this.ball.maxDistance = 0;
        this.ball.maxHeight = 0;
        
        console.log('⚪ Golf ball created');
    }
    
    /**
     * Create target markers and green
     */
    createTargets() {
        // Flag at various distances
        const flagPositions = [10, 15, 20, 25];
        
        flagPositions.forEach(distance => {
            // Flag pole
            const poleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2);
            const poleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const pole = new THREE.Mesh(poleGeometry, poleMaterial);
            pole.position.set(distance, 1, 0);
            pole.castShadow = true;
            this.scene.add(pole);
            
            // Flag
            const flagGeometry = new THREE.PlaneGeometry(1, 0.6);
            const flagMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xff0000,
                side: THREE.DoubleSide
            });
            const flag = new THREE.Mesh(flagGeometry, flagMaterial);
            flag.position.set(distance + 0.5, 1.7, 0);
            this.scene.add(flag);
        });
        
        console.log('🚩 Targets created');
    }
    
    /**
     * Update pendulum positions based on current angles
     */
    updatePendulumPositions() {
        const shoulderX = 0;
        const shoulderY = 1.5;
        const groundLevel = 0;
        
        // Calculate arm end position
        const armEndX = shoulderX + this.params.armLength * Math.sin(this.params.armAngle);
        const armEndY = shoulderY - this.params.armLength * Math.cos(this.params.armAngle);
        
        // Update arm position and rotation
        this.pendulum.arm.position.set(
            shoulderX + (armEndX - shoulderX) / 2,
            shoulderY + (armEndY - shoulderY) / 2,
            0
        );
        this.pendulum.arm.rotation.z = this.params.armAngle;
        
        // Update arm mass (hand) position
        this.pendulum.armMass.position.set(armEndX, armEndY, 0);
        
        // Calculate club end position (relative to arm end)
        const clubEndX = armEndX + this.params.clubLength * Math.sin(this.params.armAngle + this.params.clubAngle);
        const clubEndY = armEndY - this.params.clubLength * Math.cos(this.params.armAngle + this.params.clubAngle);
        
        // Safety check: ensure club head doesn't go below ground
        const finalClubY = Math.max(clubEndY, groundLevel + 0.1);
        if (clubEndY < groundLevel + 0.1) {
            console.warn(`⚠️  Club head would go below ground (${clubEndY.toFixed(2)}m) - adjusted to ${finalClubY.toFixed(2)}m`);
        }
        
        // Update club position and rotation
        this.pendulum.club.position.set(
            armEndX + (clubEndX - armEndX) / 2,
            armEndY + (finalClubY - armEndY) / 2,
            0
        );
        this.pendulum.club.rotation.z = this.params.armAngle + this.params.clubAngle;
        
        // Update club head position
        this.pendulum.clubHead.position.set(clubEndX, finalClubY, 0);
        this.pendulum.clubHead.rotation.z = this.params.armAngle + this.params.clubAngle;
    }
    
    /**
     * Setup UI controls
     */
    setupControls() {
        // Angle sliders
        const armAngleSlider = document.getElementById('arm-angle-slider');
        const clubAngleSlider = document.getElementById('club-angle-slider');
        const armAngleValue = document.getElementById('arm-angle-value');
        const clubAngleValue = document.getElementById('club-angle-value');
        
        armAngleSlider.addEventListener('input', (e) => {
            const degrees = parseFloat(e.target.value);
            this.params.armAngle = degrees * Math.PI / 180;
            armAngleValue.textContent = degrees;
            this.updatePendulumPositions();
        });
        
        clubAngleSlider.addEventListener('input', (e) => {
            const degrees = parseFloat(e.target.value);
            this.params.clubAngle = degrees * Math.PI / 180;
            clubAngleValue.textContent = degrees;
            this.updatePendulumPositions();
        });
        
        // Force input
        const swingForceInput = document.getElementById('swing-force');
        swingForceInput.addEventListener('input', (e) => {
            this.params.swingForce = parseFloat(e.target.value) || 0;
        });
        
        // Physics parameter sliders
        const dampingSlider = document.getElementById('damping-slider');
        const bounceSlider = document.getElementById('bounce-slider');
        const frictionSlider = document.getElementById('friction-slider');
        
        dampingSlider.addEventListener('input', (e) => {
            this.params.damping = parseFloat(e.target.value);
            document.getElementById('damping-value').textContent = e.target.value;
        });
        
        bounceSlider.addEventListener('input', (e) => {
            this.physics.coefficientOfRestitution = parseFloat(e.target.value);
            document.getElementById('bounce-value').textContent = e.target.value;
        });
        
        frictionSlider.addEventListener('input', (e) => {
            this.physics.groundFriction = parseFloat(e.target.value);
            document.getElementById('friction-value').textContent = e.target.value;
        });
        
        console.log('🎛️ Controls setup complete');
    }
    

    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Swing button
        document.getElementById('swing-btn').addEventListener('click', () => {
            this.executeSwing();
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSimulation();
        });
        
        // Equations toggle button
        document.getElementById('equations-btn').addEventListener('click', () => {
            this.toggleEquationsDisplay();
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
        
        console.log('👂 Event listeners setup');
    }
    
    /**
     * Execute golf swing with physics simulation
     */
    executeSwing() {
        if (this.isSwinging) return;
        
        console.log(`⚡ Executing swing with ${this.params.swingForce}N force`);
        
        this.isSwinging = true;
        this.time = 0;
        
        // Reset ball
        this.resetBall();
        
        // Calculate initial angular velocities from force
        const forceScale = this.params.swingForce / 1000; // Normalize force
        this.params.armVelocity = forceScale * 8;  // Initial arm velocity
        this.params.clubVelocity = forceScale * 15; // Club moves faster due to leverage
        
        // Start swing animation
        this.swingAnimation();
        
        // Update button state
        document.getElementById('swing-btn').textContent = '⏳ Swinging...';
        document.getElementById('swing-btn').disabled = true;
    }
    
    /**
     * Animate the golf swing using physics - Improved stability
     */
    swingAnimation() {
        if (!this.isSwinging) return;
        
        const dt = 0.008; // Smaller timestep to prevent instability
        this.time += dt;
        
        // Safety check to prevent infinite loops
        if (this.time > 5.0) {
            console.log('⚠️ Swing timeout - finishing');
            this.finishSwing();
            return;
        }
        
        // Double pendulum physics equations with stability improvements
        const g = Math.abs(this.params.gravity);
        const L1 = this.params.armLength;
        const L2 = this.params.clubLength;
        const m1 = this.params.armMass;
        const m2 = this.params.clubMass;
        
        const theta1 = this.params.armAngle;
        const theta2 = this.params.armAngle + this.params.clubAngle;
        const omega1 = this.params.armVelocity;
        const omega2 = this.params.clubVelocity;
        
        // Prevent division by zero and numerical instabilities
        const delta = theta2 - theta1;
        const cosDelta = Math.cos(delta);
        const sinDelta = Math.sin(delta);
        
        // Add small epsilon to prevent division by zero
        const epsilon = 1e-6;
        const den1 = (m1 + m2) * L1 - m2 * L1 * cosDelta * cosDelta + epsilon;
        const den2 = (L2 / L1) * den1;
        
        // Clamp denominators to prevent extreme values
        const safeDen1 = Math.max(Math.abs(den1), epsilon) * Math.sign(den1);
        const safeDen2 = Math.max(Math.abs(den2), epsilon) * Math.sign(den2);
        
        // Angular accelerations with stability limits
        const num1 = -m2 * L1 * omega1 * omega1 * sinDelta * cosDelta +
                     m2 * g * Math.sin(theta2) * cosDelta +
                     m2 * L2 * omega2 * omega2 * sinDelta -
                     (m1 + m2) * g * Math.sin(theta1);
        
        const num2 = -m2 * L2 * omega2 * omega2 * sinDelta * cosDelta +
                     (m1 + m2) * g * Math.sin(theta1) * cosDelta -
                     (m1 + m2) * L1 * omega1 * omega1 * sinDelta -
                     (m1 + m2) * g * Math.sin(theta2);
        
        let alpha1 = num1 / safeDen1;
        let alpha2 = num2 / safeDen2;
        
        // Clamp accelerations to prevent explosion
        const maxAccel = 50; // rad/s²
        alpha1 = Math.max(-maxAccel, Math.min(maxAccel, alpha1));
        alpha2 = Math.max(-maxAccel, Math.min(maxAccel, alpha2));
        
        // Apply damping
        alpha1 -= this.params.damping * omega1;
        alpha2 -= this.params.damping * omega2;
        
        // Update velocities with limits
        const maxVel = 30; // rad/s
        this.params.armVelocity = Math.max(-maxVel, Math.min(maxVel, this.params.armVelocity + alpha1 * dt));
        this.params.clubVelocity = Math.max(-maxVel, Math.min(maxVel, this.params.clubVelocity + alpha2 * dt));
        
        // Update angles
        this.params.armAngle += this.params.armVelocity * dt;
        this.params.clubAngle += (this.params.clubVelocity - this.params.armVelocity) * dt;
        
        // Wrap angles to prevent overflow
        this.params.armAngle = ((this.params.armAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
        this.params.clubAngle = ((this.params.clubAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        // Update visual positions
        this.updatePendulumPositions();
        
        // Update equations display if visible
        if (document.getElementById('physics-equations').style.display === 'block') {
            this.updateEquationsContent();
        }
        
        // Check for ball contact
        this.checkBallContact();
        
        // Continue swing for 2 seconds or until ball is hit
        if (this.time < 2.0 && !this.ball.isFlying && this.isSwinging) {
            requestAnimationFrame(() => this.swingAnimation());
        } else {
            this.finishSwing();
        }
    }
    
    /**
     * Check if club head contacts the ball
     */
    checkBallContact() {
        if (this.ball.isFlying) return;
        
        const clubHeadPos = this.pendulum.clubHead.position;
        const ballPos = this.ball.mesh.position;
        
        const distance = Math.sqrt(
            Math.pow(clubHeadPos.x - ballPos.x, 2) +
            Math.pow(clubHeadPos.y - ballPos.y, 2) +
            Math.pow(clubHeadPos.z - ballPos.z, 2)
        );
        
        // Contact threshold
        if (distance < 0.15) {
            this.hitBall();
        }
    }
    
    /**
     * Handle ball being hit by club - Advanced Physics
     */
    hitBall() {
        console.log('💥 Ball contact!');
        
        // Calculate club head velocity components
        // v = ω × r (angular velocity × radius)
        const armTipVx = this.params.armVelocity * this.params.armLength * Math.cos(this.params.armAngle);
        const armTipVy = this.params.armVelocity * this.params.armLength * Math.sin(this.params.armAngle);
        
        const clubTipVx = this.params.clubVelocity * this.params.clubLength * Math.cos(this.params.armAngle + this.params.clubAngle);
        const clubTipVy = this.params.clubVelocity * this.params.clubLength * Math.sin(this.params.armAngle + this.params.clubAngle);
        
        const clubHeadVx = armTipVx + clubTipVx;
        const clubHeadVy = armTipVy + clubTipVy;
        const clubHeadSpeed = Math.sqrt(clubHeadVx * clubHeadVx + clubHeadVy * clubHeadVy);
        
        // Golf Impact Physics - Conservation of momentum and energy
        const clubMass = this.params.clubMass;
        const ballMass = this.physics.ballMass;
        const e = 0.83; // Coefficient of restitution for golf ball-club
        
        // Smash factor (ball speed / club speed) - typically 1.4-1.5 for drivers
        const smashFactor = 1.45;
        const ballSpeed = clubHeadSpeed * smashFactor;
        
        // Launch angle calculation based on club loft and attack angle
        const clubLoft = 10.5; // degrees (driver loft)
        const attackAngle = this.params.clubAngle * 180 / Math.PI; // degrees
        const launchAngle = clubLoft + (attackAngle * 0.7); // Dynamic loft
        const launchAngleRad = Math.max(5, Math.min(25, launchAngle)) * Math.PI / 180;
        
        // Spin calculation - backspin affects trajectory
        const spinRate = Math.abs(attackAngle) * 100 + 2000; // rpm
        const spinRateRadS = spinRate * 2 * Math.PI / 60; // rad/s
        
        // Initial velocity components with Magnus effect consideration
        this.ball.velocity.x = ballSpeed * Math.cos(launchAngleRad);
        this.ball.velocity.y = ballSpeed * Math.sin(launchAngleRad);
        this.ball.velocity.z = 0;
        
        // Store physics data for calculations
        this.ball.spinRate = spinRateRadS;
        this.ball.isFlying = true;
        
        // Switch to follow camera
        this.cameraSystem.mode = 'follow';
        this.cameraSystem.followTarget = this.ball.mesh;
        
        // Update displays with detailed physics
        document.getElementById('club-speed').textContent = `${clubHeadSpeed.toFixed(1)} m/s`;
        document.getElementById('ball-speed').textContent = `${ballSpeed.toFixed(1)} m/s`;
        
        // Log physics equations
        console.log(`📊 Impact Physics:`);
        console.log(`   Club Head Speed: ${clubHeadSpeed.toFixed(2)} m/s`);
        console.log(`   Smash Factor: ${smashFactor}`);
        console.log(`   Launch Angle: ${(launchAngleRad * 180/Math.PI).toFixed(1)}°`);
        console.log(`   Spin Rate: ${spinRate.toFixed(0)} rpm`);
        console.log(`   Ball Speed: ${ballSpeed.toFixed(2)} m/s`);
        
        // Start advanced ball flight
        this.animateBallFlightAdvanced();
    }
    
    /**
     * Advanced ball flight animation with proper aerodynamics
     */
    animateBallFlightAdvanced() {
        if (!this.ball.isFlying) return;
        
        const dt = 0.008; // Smaller timestep for accuracy
        
        // Current velocity magnitude and direction
        const vx = this.ball.velocity.x;
        const vy = this.ball.velocity.y;
        const vz = this.ball.velocity.z;
        const v = Math.sqrt(vx*vx + vy*vy + vz*vz);
        
        if (v < 0.1) {
            this.landBall();
            return;
        }
        
        // Unit velocity vector
        const vx_unit = vx / v;
        const vy_unit = vy / v;
        const vz_unit = vz / v;
        
        // Air density at current altitude (simplified)
        const altitude = Math.max(0, this.ball.position.y);
        const rho = this.physics.airDensity * Math.exp(-altitude / 8000);
        
        // Reynolds number for drag calculation
        const Re = rho * v * (2 * this.physics.ballRadius) / (1.8e-5); // dynamic viscosity of air
        
        // Drag coefficient (varies with Reynolds number)
        let Cd = this.physics.dragCoefficient;
        if (Re > 100000) {
            Cd = 0.2; // Turbulent flow - golf ball dimples reduce drag
        }
        
        // Drag force: Fd = 0.5 * ρ * v² * Cd * A
        const A = Math.PI * this.physics.ballRadius * this.physics.ballRadius;
        const dragMagnitude = 0.5 * rho * v * v * Cd * A;
        
        // Drag acceleration components (opposite to velocity)
        const ax_drag = -(dragMagnitude / this.physics.ballMass) * vx_unit;
        const ay_drag = -(dragMagnitude / this.physics.ballMass) * vy_unit;
        const az_drag = -(dragMagnitude / this.physics.ballMass) * vz_unit;
        
        // Magnus force due to spin (F = (ρ * A * v * ω * r) * (v × ω))
        // Simplified: lift force perpendicular to velocity and spin axis
        let ax_magnus = 0, ay_magnus = 0, az_magnus = 0;
        
        if (this.physics.magnusEffect && this.ball.spinRate > 0) {
            // Backspin creates lift force
            const magnusCoeff = 0.5 * rho * A * this.ball.spinRate * this.physics.ballRadius;
            const liftMagnitude = magnusCoeff * v / this.physics.ballMass;
            
            // Lift is perpendicular to velocity in the xy-plane
            ay_magnus = liftMagnitude * Math.abs(vx_unit); // Upward lift from backspin
            ax_magnus = -liftMagnitude * vy_unit * 0.1;    // Small forward component
        }
        
        // Total acceleration
        const ax_total = ax_drag + ax_magnus;
        const ay_total = this.params.gravity + ay_drag + ay_magnus;
        const az_total = az_drag + az_magnus;
        
        // Update velocity using Verlet integration for stability
        this.ball.velocity.x += ax_total * dt;
        this.ball.velocity.y += ay_total * dt;
        this.ball.velocity.z += az_total * dt;
        
        // Update position
        this.ball.position.x += this.ball.velocity.x * dt;
        this.ball.position.y += this.ball.velocity.y * dt;
        this.ball.position.z += this.ball.velocity.z * dt;
        
        // Update mesh position
        this.ball.mesh.position.set(
            this.ball.position.x,
            this.ball.position.y,
            this.ball.position.z
        );
        
        // Track maximum values
        this.ball.maxDistance = Math.max(this.ball.maxDistance, this.ball.position.x);
        this.ball.maxHeight = Math.max(this.ball.maxHeight, this.ball.position.y);
        
        // Add to trail (less frequent for performance)
        if (this.ball.trail.length === 0 || this.ball.trail.length % 5 === 0) {
            if (this.ball.trail.length > 200) this.ball.trail.shift();
            this.ball.trail.push({
                x: this.ball.position.x,
                y: this.ball.position.y,
                z: this.ball.position.z
            });
        }
        
        // Update displays
        const currentDistance = Math.sqrt(this.ball.position.x * this.ball.position.x + this.ball.position.z * this.ball.position.z);
        document.getElementById('ball-distance').textContent = `${currentDistance.toFixed(1)} m`;
        document.getElementById('ball-height').textContent = `${this.ball.position.y.toFixed(1)} m`;
        
        // Update camera to follow ball
        this.updateFollowCamera();
        
        // Check if ball hits ground
        if (this.ball.position.y <= this.physics.ballRadius && this.ball.velocity.y < 0) {
            this.handleBallGroundCollision();
        }
        
        // Check if ball should stop (very slow and on ground)
        if (this.ball.position.y <= this.physics.ballRadius && 
            Math.sqrt(this.ball.velocity.x*this.ball.velocity.x + this.ball.velocity.z*this.ball.velocity.z) < 0.1) {
            this.stopBall();
            return;
        }
        
        // Continue flight
        requestAnimationFrame(() => this.animateBallFlightAdvanced());
    }
    
    /**
     * Handle ball-ground collision with bouncing physics
     */
    handleBallGroundCollision() {
        console.log('⚾ Ball hits ground - bounce physics engaged');
        
        // Set ball exactly on ground
        this.ball.position.y = this.physics.ballRadius;
        this.ball.mesh.position.y = this.physics.ballRadius;
        
        // Calculate velocity magnitude
        const horizontalSpeed = Math.sqrt(
            this.ball.velocity.x * this.ball.velocity.x + 
            this.ball.velocity.z * this.ball.velocity.z
        );
        const verticalSpeed = Math.abs(this.ball.velocity.y);
        
        // Only bounce if sufficient speed
        if (verticalSpeed > this.physics.bounceThreshold) {
            this.ball.bounceCount++;
            
            // Vertical bounce with energy loss
            this.ball.velocity.y = -this.ball.velocity.y * this.physics.coefficientOfRestitution;
            
            // Horizontal velocity reduction due to impact
            const impactReduction = 0.9; // 10% speed loss on impact
            this.ball.velocity.x *= impactReduction;
            this.ball.velocity.z *= impactReduction;
            
            // Record carry distance on first bounce
            if (this.ball.bounceCount === 1) {
                this.ball.carryDistance = Math.sqrt(
                    this.ball.position.x * this.ball.position.x + 
                    this.ball.position.z * this.ball.position.z
                );
            }
            
            console.log(`🏀 Bounce #${this.ball.bounceCount} - COR: ${this.physics.coefficientOfRestitution}`);
            
            // Update bounce counter display
            document.getElementById('bounce-count').textContent = this.ball.bounceCount;
            
        } else {
            // Ball stops bouncing, starts rolling
            this.ball.velocity.y = 0;
            this.startRolling();
        }
    }
    
    /**
     * Start ball rolling phase with friction
     */
    startRolling() {
        if (!this.ball.isRolling) {
            this.ball.isRolling = true;
            this.ball.isFlying = false;
            console.log('🎳 Ball starts rolling phase');
        }
        
        // Apply rolling friction
        const horizontalSpeed = Math.sqrt(
            this.ball.velocity.x * this.ball.velocity.x + 
            this.ball.velocity.z * this.ball.velocity.z
        );
        
        if (horizontalSpeed > 0.05) {
            // Rolling friction force
            const frictionForce = this.physics.groundFriction * this.physics.ballMass * Math.abs(this.params.gravity);
            const frictionAccel = frictionForce / this.physics.ballMass;
            
            // Apply friction opposite to motion direction
            const frictionFactor = 1 - (frictionAccel * 0.016) / horizontalSpeed; // dt = 0.016
            this.ball.velocity.x *= Math.max(0, frictionFactor);
            this.ball.velocity.z *= Math.max(0, frictionFactor);
            
            // Update roll distance
            const rollDelta = horizontalSpeed * 0.016;
            this.ball.rollDistance += rollDelta;
            document.getElementById('roll-distance').textContent = `${this.ball.rollDistance.toFixed(1)} m`;
            
            // Continue rolling
            this.ball.position.x += this.ball.velocity.x * 0.016;
            this.ball.position.z += this.ball.velocity.z * 0.016;
            this.ball.mesh.position.set(this.ball.position.x, this.ball.position.y, this.ball.position.z);
            
            requestAnimationFrame(() => this.startRolling());
        } else {
            this.stopBall();
        }
    }
    
    /**
     * Stop ball completely
     */
    stopBall() {
        console.log('🛑 Ball comes to rest');
        this.ball.isFlying = false;
        this.ball.isRolling = false;
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.ball.velocity.z = 0;
        
        this.finalizeBallStats();
    }
    
    /**
     * Finalize ball statistics and reset camera
     */
    finalizeBallStats() {
        const totalDistance = Math.sqrt(
            this.ball.position.x * this.ball.position.x + 
            this.ball.position.z * this.ball.position.z
        );
        
        console.log(`🏌️ Ball final statistics:`);
        console.log(`   Total Distance: ${totalDistance.toFixed(1)}m`);
        console.log(`   Carry Distance: ${this.ball.carryDistance.toFixed(1)}m`);
        console.log(`   Roll Distance: ${this.ball.rollDistance.toFixed(1)}m`);
        console.log(`   Max Height: ${this.ball.maxHeight.toFixed(2)}m`);
        console.log(`   Bounces: ${this.ball.bounceCount}`);
        
        // Advanced efficiency calculation
        const optimalDistance = 25; // 250m scaled down for our viewport
        const optimalHeight = 3; // 30m scaled down
        
        // Distance efficiency (carry + roll)
        const distanceEff = Math.min(100, (totalDistance / optimalDistance) * 100);
        
        // Trajectory efficiency (penalize too high or too low)
        const heightDiff = Math.abs(this.ball.maxHeight - optimalHeight);
        const trajectoryEff = Math.max(0, 100 - (heightDiff / optimalHeight) * 50);
        
        // Bounce efficiency (fewer bounces = better control)
        const bounceEff = Math.max(0, 100 - (this.ball.bounceCount * 10));
        
        // Overall efficiency
        const efficiency = (distanceEff * 0.5 + trajectoryEff * 0.3 + bounceEff * 0.2);
        
        // Update displays
        document.getElementById('efficiency').textContent = `${efficiency.toFixed(0)}%`;
        document.getElementById('ball-distance').textContent = `${totalDistance.toFixed(1)} m`;
        
        // Wait 3 seconds then reset camera
        setTimeout(() => {
            this.resetCameraPosition();
        }, 3000);
        
        this.finishSwing();
    }
    
    /**
     * Finish swing and reset controls
     */
    finishSwing() {
        this.isSwinging = false;
        
        // Reset button state
        document.getElementById('swing-btn').textContent = '🏌️ Swing!';
        document.getElementById('swing-btn').disabled = false;
        
        console.log('✅ Swing complete');
    }
    
    /**
     * Reset ball to tee position
     */
    resetBall() {
        this.ball.position = { x: 0, y: 0.021, z: 0 };
        this.ball.velocity = { x: 0, y: 0, z: 0 };
        this.ball.mesh.position.set(0, 0.021, 0);
        this.ball.isFlying = false;
        this.ball.isRolling = false;
        this.ball.trail = [];
        this.ball.maxDistance = 0;
        this.ball.maxHeight = 0;
        this.ball.bounceCount = 0;
        this.ball.rollDistance = 0;
        this.ball.carryDistance = 0;
        
        // Reset displays
        document.getElementById('ball-distance').textContent = '0 m';
        document.getElementById('ball-height').textContent = '0 m';
        document.getElementById('ball-speed').textContent = '0 m/s';
        document.getElementById('club-speed').textContent = '0 m/s';
        document.getElementById('efficiency').textContent = '0%';
        document.getElementById('bounce-count').textContent = '0';
        document.getElementById('roll-distance').textContent = '0 m';
    }
    
    /**
     * Reset entire simulation
     */
    resetSimulation() {
        console.log('🔄 Resetting simulation');
        
        // Stop any ongoing animations
        this.isSwinging = false;
        
        // Reset camera position
        this.resetCameraPosition();
        
        // Reset pendulum angles and velocities
        this.params.armAngle = 0;
        this.params.clubAngle = 0;
        this.params.armVelocity = 0;
        this.params.clubVelocity = 0;
        
        // Update UI
        document.getElementById('arm-angle-slider').value = 0;
        document.getElementById('club-angle-slider').value = 0;
        document.getElementById('arm-angle-value').textContent = '0';
        document.getElementById('club-angle-value').textContent = '0';
        
        // Reset pendulum positions
        this.updatePendulumPositions();
        
        // Reset ball
        this.resetBall();
        
        // Reset button state
        document.getElementById('swing-btn').textContent = '🏌️ Swing!';
        document.getElementById('swing-btn').disabled = false;
        
        // Reset time
        this.time = 0;
    }
    

    
    /**
     * Toggle physics equations display
     */
    toggleEquationsDisplay() {
        const equationsPanel = document.getElementById('physics-equations');
        const btn = document.getElementById('equations-btn');
        
        if (equationsPanel.style.display === 'none' || !equationsPanel.style.display) {
            equationsPanel.style.display = 'block';
            btn.textContent = '📊 Hide Equations';
            this.updateEquationsContent();
        } else {
            equationsPanel.style.display = 'none';
            btn.textContent = '📊 Show Equations';
        }
    }
    
    /**
     * Update equations content based on current simulation state
     */
    updateEquationsContent() {
        const content = document.getElementById('equation-content');
        
        let equations = '';
        
        if (this.isSwinging) {
            equations = `
                <div style="color: #ff6b6b; margin-bottom: 0.5rem;">🏌️ Swing Dynamics:</div>
                <div>Double Pendulum Motion:</div>
                <div>θ₁" = (num₁) / [(m₁+m₂)L₁ - m₂L₁cos²(Δθ)]</div>
                <div>θ₂" = (num₂) / [L₂/L₁ × den₁]</div>
                <div style="margin-top: 0.3rem; font-size: 0.6rem;">
                where Δθ = θ₂ - θ₁, L₁ = arm length, L₂ = club length
                </div>
            `;
        }
        
        if (this.ball.isFlying || this.ball.isRolling) {
            const v = Math.sqrt(
                this.ball.velocity.x * this.ball.velocity.x + 
                this.ball.velocity.y * this.ball.velocity.y + 
                this.ball.velocity.z * this.ball.velocity.z
            );
            
            if (this.ball.isFlying) {
                equations += `
                    <div style="color: #4ecdc4; margin: 0.5rem 0;">⚪ Ball Flight:</div>
                    <div>Drag Force: F_d = ½ρv²C_dA</div>
                    <div>Magnus Force: F_m = ρAv(ω×v)</div>
                    <div>Position: x(t) = x₀ + v₀t + ½at²</div>
                    <div style="margin-top: 0.3rem;">
                    <div>Current Speed: ${v.toFixed(1)} m/s</div>
                    <div>Spin Rate: ${(this.ball.spinRate * 60/(2*Math.PI)).toFixed(0)} rpm</div>
                    <div>Reynolds: ${((1.225 * v * 0.042) / 1.8e-5).toExponential(2)}</div>
                    </div>
                `;
            }
            
            if (this.ball.isRolling || this.ball.bounceCount > 0) {
                equations += `
                    <div style="color: #feca57; margin: 0.5rem 0;">🏀 Bounce Physics:</div>
                    <div>Bounce: v_y' = -e × v_y (COR = ${this.physics.coefficientOfRestitution})</div>
                    <div>Rolling Friction: F_f = μ × N = μmg</div>
                    <div>Deceleration: a = -μg = ${(-this.physics.groundFriction * Math.abs(this.params.gravity)).toFixed(1)} m/s²</div>
                    <div style="margin-top: 0.3rem;">
                    <div>Bounces: ${this.ball.bounceCount}</div>
                    <div>Roll Distance: ${this.ball.rollDistance.toFixed(1)} m</div>
                    <div>Ground Speed: ${Math.sqrt(this.ball.velocity.x*this.ball.velocity.x + this.ball.velocity.z*this.ball.velocity.z).toFixed(1)} m/s</div>
                    </div>
                `;
            }
        }
        
        if (!this.isSwinging && !this.ball.isFlying) {
            equations = `
                <div style="color: #00d4ff;">📐 Setup Phase:</div>
                <div>Club Head Speed: v = ωL</div>
                <div>Smash Factor: SF = v_ball / v_club ≈ 1.45</div>
                <div>Launch Angle: α = loft + 0.7 × attack_angle</div>
                <div style="margin-top: 0.3rem;">
                <div>Optimal Launch: 12-15° angle</div>
                <div>Optimal Spin: 2000-3000 rpm</div>
                <div>Max Range: R = v²sin(2α)/g</div>
                </div>
            `;
        }
        
        content.innerHTML = equations;
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        const container = document.getElementById('threejs-container');
        this.camera.aspect = container.offsetWidth / container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    }
    
    /**
     * Update camera to follow ball during flight
     */
    updateFollowCamera() {
        if (this.cameraSystem.mode !== 'follow' || !this.ball.isFlying) return;
        
        const ballPos = this.ball.mesh.position;
        const ballVel = this.ball.velocity;
        
        // Predict ball position ahead of time for smoother tracking
        const lookAhead = 0.5; // seconds
        const predictedX = ballPos.x + ballVel.x * lookAhead;
        const predictedY = ballPos.y + ballVel.y * lookAhead;
        const predictedZ = ballPos.z + ballVel.z * lookAhead;
        
        // Camera position - behind and above the ball
        const offsetDistance = 8;
        const offsetHeight = 3;
        
        const targetCameraX = predictedX - offsetDistance;
        const targetCameraY = Math.max(2, predictedY + offsetHeight);
        const targetCameraZ = predictedZ + 2;
        
        // Smooth camera movement
        const smoothFactor = 0.05;
        this.camera.position.x += (targetCameraX - this.camera.position.x) * smoothFactor;
        this.camera.position.y += (targetCameraY - this.camera.position.y) * smoothFactor;
        this.camera.position.z += (targetCameraZ - this.camera.position.z) * smoothFactor;
        
        // Look at the ball
        this.camera.lookAt(ballPos.x, ballPos.y, ballPos.z);
        
        // Disable orbit controls during follow mode
        this.controls.enabled = false;
    }
    
    /**
     * Reset camera to setup position
     */
    resetCameraPosition() {
        this.cameraSystem.mode = 'setup';
        this.controls.enabled = true;
        
        // Smooth transition back to original position
        const originalPos = this.cameraSystem.originalPosition;
        const originalTarget = this.cameraSystem.originalTarget;
        
        gsap.to(this.camera.position, {
            duration: 2,
            x: originalPos.x,
            y: originalPos.y,
            z: originalPos.z,
            ease: "power2.out"
        });
        
        gsap.to(this.controls.target, {
            duration: 2,
            x: originalTarget.x,
            y: originalTarget.y,
            z: originalTarget.z,
            ease: "power2.out"
        });
    }
    
    /**
     * Main animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Update controls only when not in follow mode
        if (this.cameraSystem.mode !== 'follow') {
            this.controls.update();
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Starting Golf Simulator...');
    window.golfSimulator = new GolfSimulator();
});