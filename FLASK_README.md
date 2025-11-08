# Flask Physics Simulation - Double Pendulum

A sophisticated Flask web application demonstrating chaotic double pendulum physics with accurate mathematical modeling using Lagrangian mechanics.

## Features

### 🔬 Accurate Physics Simulation
- **Lagrangian Mechanics**: Uses the proper equations of motion derived from the Lagrangian formulation
- **Numerical Integration**: Employs SciPy's `odeint` with Runge-Kutta methods for accurate integration
- **Energy Conservation**: Tracks total energy to verify simulation accuracy
- **Chaos Theory**: Demonstrates sensitivity to initial conditions

### 📊 Visualization Modes
1. **Real-time Animation**: Watch the double pendulum in motion with trajectory traces
2. **Phase Space Plot**: Visualize the system's evolution in θ₁-θ₂ space
3. **Energy Conservation**: Plot total energy over time to verify accuracy
4. **Chaos Comparison**: Compare multiple simulations with slightly different initial conditions

### 🎛️ Adjustable Parameters
- Initial angles (θ₁, θ₂) for both pendulums
- Masses (m₁, m₂) of pendulum bobs
- Rod lengths (L₁, L₂)
- Simulation duration
- All parameters adjustable in real-time

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask application:
```bash
python app.py
```

3. Open your browser to:
```
http://localhost:5000
```

## Mathematical Background

The double pendulum is a classic example of a chaotic system. Its equations of motion are derived from the Lagrangian:

**L = T - V**

Where:
- T = Kinetic Energy
- V = Potential Energy

### Equations of Motion

The angular accelerations are given by:

**α₁** (first pendulum):
```
Numerator: -m₂L₁ω₁²sin(Δ)cos(Δ) - m₂g·sin(θ₂)cos(Δ) - m₂L₂ω₂²sin(Δ) - (m₁+m₂)g·sin(θ₁)
Denominator: (m₁+m₂)L₁ - m₂L₁cos²(Δ)
```

**α₂** (second pendulum):
```
Numerator: m₂L₂ω₂²sin(Δ)cos(Δ) + (m₁+m₂)g·sin(θ₁)cos(Δ) + (m₁+m₂)L₁ω₁²sin(Δ) - (m₁+m₂)g·sin(θ₂)
Denominator: (L₂/L₁) × [(m₁+m₂)L₁ - m₂L₁cos²(Δ)]
```

Where Δ = θ₂ - θ₁

### Energy Conservation

Total energy E = T + V is conserved in the system:

**Kinetic Energy (T):**
```
T = ½m₁v₁² + ½m₂v₂²
```

**Potential Energy (V):**
```
V = -m₁gL₁cos(θ₁) - m₂g(L₁cos(θ₁) + L₂cos(θ₂))
```

The simulation tracks energy conservation as a measure of numerical accuracy.

## API Endpoints

### POST `/api/simulate`
Run a single simulation with specified parameters.

**Request Body:**
```json
{
  "theta1": 90,      // Initial angle of first pendulum (degrees)
  "theta2": 90,      // Initial angle of second pendulum (degrees)
  "omega1": 0,       // Initial angular velocity of first pendulum (rad/s)
  "omega2": 0,       // Initial angular velocity of second pendulum (rad/s)
  "m1": 1.0,         // Mass of first bob (kg)
  "m2": 1.0,         // Mass of second bob (kg)
  "L1": 1.0,         // Length of first rod (m)
  "L2": 1.0,         // Length of second rod (m)
  "duration": 10,    // Simulation duration (seconds)
  "dt": 0.01         // Time step (seconds, optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "time": [...],
    "theta1": [...],
    "theta2": [...],
    "x1": [...],
    "y1": [...],
    "x2": [...],
    "y2": [...],
    "energy": [...],
    "dt": 0.01,
    "L1": 1.0,
    "L2": 1.0
  }
}
```

### POST `/api/compare`
Run multiple simulations with slightly different initial conditions to demonstrate chaos.

**Request Body:**
```json
{
  "theta1": 90,
  "theta2": 90,
  "perturbation": 0.01,  // Small angle difference (degrees)
  "m1": 1.0,
  "m2": 1.0,
  "L1": 1.0,
  "L2": 1.0,
  "duration": 10,
  "dt": 0.01
}
```

## Technical Implementation

### Numerical Methods
- **Integration**: Fourth-order Runge-Kutta (via SciPy's `odeint`)
- **Time Step**: Adaptive, typically 0.01 seconds
- **Stability**: Numerical safeguards against division by zero

### Performance
- Server-side computation using NumPy/SciPy
- Client-side animation using HTML5 Canvas
- Efficient data transfer with JSON serialization

## Chaos Theory Demonstration

The double pendulum exhibits **deterministic chaos**:
- Small changes in initial conditions (< 0.01°) lead to vastly different trajectories
- Long-term behavior is unpredictable despite deterministic equations
- System is highly sensitive to perturbations

Try the "Chaos Demo" button to see three simulations with initial angles differing by only 0.01° diverge dramatically!

## Development

Built with:
- **Flask**: Web framework
- **NumPy**: Numerical computations
- **SciPy**: ODE integration
- **HTML5 Canvas**: Real-time visualization
- **Vanilla JavaScript**: Interactive UI

## License

See LICENSE file for details.

## References

1. "Classical Mechanics" by Herbert Goldstein
2. "Nonlinear Dynamics and Chaos" by Steven Strogatz
3. Wikipedia: Double Pendulum
4. SciPy Documentation: scipy.integrate.odeint
