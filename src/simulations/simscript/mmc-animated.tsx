import React from 'react';
import { Simulation, Entity, Queue, Exponential, setOptions, format, Animation, SimulationState } from 'simscript';
import { SimulationComponent, NumericParameter, BooleanParameter, HTMLDiv } from '../../simscript-react/components';

/**
 * MMC Animation Component - Custom visualization of waiting queue and servers
 */
export class MMCAnimatedComponent extends SimulationComponent<MMCAnimated> {
    _animation: Animation | null = null;
    _animVersion: number = 0;
    _animRef = React.createRef<HTMLDivElement>();

    // Initialize animation when the animation div is ready
    initAnimationFromRef() {
        if (this._animRef.current) {
            const animHost = this._animRef.current.querySelector('.ss-anim') as HTMLElement;
            if (animHost) {
                this._animation = new Animation(this.props.sim, animHost, this.getAnimationOptions());
                this.initializeAnimation(animHost);
            }
        }
    }

    componentDidMount() {
        (this as any)._mounted = true;
        this.initAnimationFromRef();
    }

    componentDidUpdate(prevProps: any, prevState: any) {
        // If animation version changed, reinitialize the animation
        if (this._animRef.current) {
            const animHost = this._animRef.current.querySelector('.ss-anim') as HTMLElement;
            if (animHost && !animHost.hasAttribute('data-initialized')) {
                animHost.setAttribute('data-initialized', 'true');
                this._animation = new Animation(this.props.sim, animHost, this.getAnimationOptions());
                this.initializeAnimation(animHost);
            }
        }
    }

    renderParams(): JSX.Element {
        const
            sim = this.props.sim,
            c = sim.qService.capacity as number;

        // Helper to restart simulation after parameter change
        const restartSim = () => {
            const wasRunning = sim.state === SimulationState.Running;
            sim.stop(true);
            // Increment version to force new animation DOM
            this._animVersion++;
            if (wasRunning) {
                setTimeout(() => sim.start(), 150);
            }
            this.forceUpdate();
        };

        return <>
            <h3>Parameters</h3>
            <ul>
                <li>
                    <NumericParameter label='Number of Servers:' parent={this} value={c}
                        min={1} max={10}
                        change={v => { sim.qService.capacity = v; restartSim(); }}
                        suffix={` ${format(c, 0)} servers`} />
                </li>
                <li>
                    <NumericParameter label='Mean inter-arrival time:' parent={this} value={sim.interArrival.mean}
                        min={10} max={200}
                        change={v => { sim.interArrival = new Exponential(v); restartSim(); }}
                        suffix={` ${format(sim.interArrival.mean, 0)} ${sim.timeUnit}`} />
                </li>
                <li>
                    <NumericParameter label='Mean service time:' parent={this} value={sim.service.mean}
                        min={10} max={200}
                        change={v => { sim.service = new Exponential(v); restartSim(); }}
                        suffix={` ${format(sim.service.mean, 0)} ${sim.timeUnit}`} />
                </li>
                <li>
                    <BooleanParameter label='Slow Mode:' parent={this}
                        value={sim.slowMode}
                        change={v => sim.slowMode = v} />
                </li>
            </ul>
        </>;
    }

    renderOutput(): JSX.Element {
        const sum = (rho1: number, c: number): number => {
            let sum = 0;
            for (let i = 0; i < c; i++) {
                sum += 1 / factorial(i) * Math.pow(rho1, i);
            }
            return sum;
        }
        const factorial = (n: number): number => {
            let f = 1;
            for (let i = 2; i <= n; i++) f *= i;
            return f;
        }
        const
            sim = this.props.sim as MMCAnimated,
            lambda = 1 / sim.interArrival.mean,
            mu = 1 / sim.service.mean,
            c = sim.qService.capacity as number,
            rho1 = lambda / mu,
            rho = rho1 / c;
        const
            p0 = 1 / (sum(rho1, c) + 1 / factorial(c) * Math.pow(rho1, c) * c * mu / (c * mu - lambda)),
            ws = Math.pow(rho1, c) * mu * p0 / (factorial(c - 1) * Math.pow(c * mu - lambda, 2)) + 1 / mu,
            ls = ws * lambda,
            lq = ls - rho1,
            wq = lq / lambda;
        
        return <>
            <h3>Results</h3>
            {rho >= 1 && <p className='error'>
                ** The server utilization exceeds 100%; the system will not reach a steady-state. **
            </p>}
            <ul className='multi-column'>
                <li>Simulated time: <b>{format(sim.timeNow / 60, 0)}</b> hours</li>
                <li>Elapsed time: <b>{format(sim.timeElapsed / 1000, 2)}</b> seconds</li>
                <li>Number of Servers: <b>{format(c, 0)}</b></li>
                <li>Customers in Queue: <b>{format(sim.qWait.grossPop.avg, 2)}</b></li>
                <li>Customers in Service: <b>{format(sim.qService.grossPop.avg, 2)}</b></li>
                <li>Mean Wait: <b>{format(sim.qWait.grossDwell.avg, 2)}</b> ({format(wq, 2)}) {sim.timeUnit}</li>
                <li>Server Utilization: <b>{format(sim.qService.grossPop.avg / c * 100, 0)}%</b></li>
                <li>Customers Served: <b>{format(sim.qService.grossDwell.cnt, 0)}</b></li>
            </ul>
        </>;
    }

    getAnimationHostHtml(): string {
        const sim = this.props.sim as MMCAnimated;
        const serverCount = sim.qService.capacity as number;
        
        // Create server circles inside the Servers rectangle (right side)
        let serverCircles = '';
        for (let i = 0; i < serverCount; i++) {
            const x = 550 + (i % 4) * 90;
            const y = 120 + Math.floor(i / 4) * 100;
            serverCircles += `<circle id='server-${i}' cx='${x}' cy='${y}' r='30' fill='#2ecc71' stroke='#27ae60' stroke-width='2'/>`;
        }

        return `<svg class='ss-anim' viewBox='0 0 1000 450' style='background-color: #fafafa;'>
            <text x='20' y='30' font-size='18' font-weight='bold' fill='#333'>M/M/C Queue Animation</text>
            
            <!-- Waiting Queue Section -->
            <text x='20' y='70' font-size='14' font-weight='bold' fill='#333'>Waiting Queue</text>
            <rect x='20' y='85' width='380' height='300' fill='white' stroke='#bbb' stroke-width='2' rx='5'/>
            
            <!-- Servers Section -->
            <text x='450' y='70' font-size='14' font-weight='bold' fill='#333'>Servers</text>
            <rect x='450' y='85' width='520' height='300' fill='white' stroke='#bbb' stroke-width='2' rx='5'/>
            ${serverCircles}
            
            <!-- Legend -->
            <text x='20' y='410' font-size='11' fill='#666'>● = Customer Waiting</text>
            <circle cx='15' cy='405' r='4' fill='#3498db'/>
            
            <text x='250' y='410' font-size='11' fill='#666'>● = Server Available</text>
            <circle cx='245' cy='405' r='8' fill='#2ecc71'/>
            
            <text x='580' y='410' font-size='11' fill='#666'>● = Server Busy</text>
            <circle cx='575' cy='405' r='8' fill='#e74c3c'/>
        </svg>`;
    }

    getAnimationOptions(): any {
        return {
            queues: []
        };
    }

    // Override render to use a key that forces recreation of animation DOM
    render() {
        const sim = this.props.sim;
        const runText = String.fromCharCode(9654) + ' Run';
        const stopText = String.fromCharCode(9632) + ' Stop';
        const animHtml = this.getAnimationHostHtml();
        
        return <div className='sim-cmp'>
            <div className='sim-params'>
                {this.renderParams()}
            </div>
            <div className='sim-animation' ref={this._animRef} key={`anim-${this._animVersion}`}>
                {animHtml != null && <HTMLDiv html={animHtml} />}
            </div>
            <button className='btn-run' onClick={e => this.clickRun(e)}>
                {sim.state !== SimulationState.Running ? runText : stopText}
            </button>
            <div className='sim-output'>
                {sim.timeNow > 0 && this.renderOutput()}
            </div>
        </div>;
    }

    clickRun(e?: any) {
        const sim = this.props.sim;
        (this as any)._lastUpdate = 0;
        if (sim.state === SimulationState.Running) {
            sim.stop();
        } else {
            sim.start(e?.ctrlKey);
        }
        this.forceUpdate();
    }

    initializeAnimation(animHost: HTMLElement): void {
        const sim = this.props.sim as MMCAnimated;
        let lastServerCount = 0;
        let lastWaitingCount = -1;
        
        // Function to find the current SVG in the DOM (it may be replaced by React re-renders)
        const findCurrentSvg = (): SVGElement | null => {
            return document.querySelector('svg.ss-anim') as SVGElement | null;
        };
        
        // Function to create/update server circles dynamically
        const ensureServerCircles = (serverCount: number, svg: SVGElement) => {
            const existingCircles = svg.querySelectorAll('circle[id^="server-"]');
            
            if (existingCircles.length === serverCount && lastServerCount === serverCount) return;
            lastServerCount = serverCount;
            
            existingCircles.forEach(c => c.remove());
            
            for (let i = 0; i < serverCount; i++) {
                const x = 550 + (i % 4) * 90;
                const y = 120 + Math.floor(i / 4) * 100;
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('id', `server-${i}`);
                circle.setAttribute('cx', String(x));
                circle.setAttribute('cy', String(y));
                circle.setAttribute('r', '30');
                circle.setAttribute('fill', '#2ecc71');
                circle.setAttribute('stroke', '#27ae60');
                circle.setAttribute('stroke-width', '2');
                svg.appendChild(circle);
            }
        };
        
        // Function to update waiting queue display (10 per row, new rows above)
        const updateWaitingQueue = (svg: SVGElement) => {
            const waitingCount = (sim.qWait as any).pop || 0;
            
            if (waitingCount === lastWaitingCount) return;
            lastWaitingCount = waitingCount;
            
            // Remove old waiting circles
            const oldCircles = svg.querySelectorAll('circle[id^="waiting-"]');
            oldCircles.forEach(c => c.remove());
            
            // Create waiting customer circles: 10 per row, rows go upward
            const circlesPerRow = 10;
            const circleRadius = 12;
            const spacing = 35;
            const startX = 55;
            const bottomY = 360;
            
            for (let i = 0; i < waitingCount; i++) {
                const col = i % circlesPerRow;
                const row = Math.floor(i / circlesPerRow);
                const x = startX + col * spacing;
                const y = bottomY - row * spacing;
                
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('id', `waiting-${i}`);
                circle.setAttribute('cx', String(x));
                circle.setAttribute('cy', String(y));
                circle.setAttribute('r', String(circleRadius));
                circle.setAttribute('fill', '#3498db');
                circle.setAttribute('stroke', '#2980b9');
                circle.setAttribute('stroke-width', '1.5');
                svg.appendChild(circle);
            }
        };
        
        // Update all animations
        const updateAll = () => {
            const svg = findCurrentSvg();
            if (!svg) return;
            
            // Update servers
            const serverCount = sim.qService.capacity as number;
            ensureServerCircles(serverCount, svg);
            
            const inService = (sim.qService as any).pop || 0;
            const serverCircles = svg.querySelectorAll('circle[id^="server-"]');
            
            serverCircles.forEach((circle: any, index: number) => {
                if (index < serverCount) {
                    if (index < inService) {
                        circle.setAttribute('fill', '#e74c3c');
                        circle.setAttribute('stroke', '#c0392b');
                    } else {
                        circle.setAttribute('fill', '#2ecc71');
                        circle.setAttribute('stroke', '#27ae60');
                    }
                }
            });
            
            // Update waiting queue
            updateWaitingQueue(svg);
        };
        
        // Update on time changes
        sim.timeNowChanged.addEventListener(updateAll);
        sim.stateChanged.addEventListener(updateAll);
        
        // Also update frequently via interval for better responsiveness
        const interval = setInterval(updateAll, 50);
        
        // Clean up interval when component unmounts
        const originalStop = sim.stop.bind(sim);
        sim.stop = function(immediately?: boolean) {
            clearInterval(interval);
            return originalStop(immediately);
        };
        
        // Initial update
        updateAll();
    }
}

/**
 * MMC Simulation with Animation Support
 */
export class MMCAnimated extends Simulation {
    qWait = new Queue('Wait');
    qService = new Queue('Service', 2);
    interArrival = new Exponential(80);
    service = new Exponential(100);
    _slowMode = false;

    constructor(options?: any) {
        super();
        this.name = 'MMC Animated';
        this.timeUnit = 'min';
        setOptions(this, options);
    }

    onStarting() {
        super.onStarting();
        this.qWait.grossPop.setHistogramParameters(1, 0, 10);
        this.qWait.grossDwell.setHistogramParameters(60, 0, 500 - 0.1);
        this.generateEntities(Customer, this.interArrival, 1e5);
    }

    // toggle simulation speed
    get slowMode(): boolean {
        return this._slowMode;
    }
    set slowMode(value: boolean) {
        this._slowMode = value;
        if (value) {
            this.maxTimeStep = 1;
            this.frameDelay = 30;
        } else {
            this.maxTimeStep = 0;
            this.frameDelay = 0;
        }
    }
}

class Customer extends Entity<MMCAnimated> {
    async script() {
        let sim = this.simulation;
        this.enterQueueImmediately(sim.qWait);
        await this.enterQueue(sim.qService);
        this.leaveQueue(sim.qWait);
        
        // Service the customer
        await this.delay(sim.service.sample());
        
        this.leaveQueue(sim.qService);
    }
}
