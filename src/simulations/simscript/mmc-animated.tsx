import { Simulation, Entity, Queue, Exponential, setOptions, format } from 'simscript';
import { SimulationComponent, NumericParameter, HTMLDiv } from '../../simscript-react/components';

/**
 * MMC Animation Component - shows queue and servers with animated customers
 */
export class MMCAnimatedComponent extends SimulationComponent<MMCAnimated> {

    // render parameters section
    renderParams(): JSX.Element {
        const
            sim = this.props.sim,
            c = sim.qService.capacity as number;

        return <>
            <h3>
                Parameters
            </h3>
            <ul>
                <li>
                    <NumericParameter label='Number of Servers:' parent={this} value={c}
                        min={1} max={10}
                        change={v => sim.qService.capacity = v}
                        suffix={` ${format(c, 0)} servers`} />
                </li>
                <li>
                    <NumericParameter label='Mean inter-arrival time:' parent={this} value={sim.interArrival.mean}
                        min={10} max={200}
                        change={v => sim.interArrival = new Exponential(v)}
                        suffix={` ${format(sim.interArrival.mean, 0)} ${sim.timeUnit}`} />
                </li>
                <li>
                    <NumericParameter label='Mean service time:' parent={this} value={sim.service.mean}
                        min={10} max={200}
                        change={v => sim.service = new Exponential(v)}
                        suffix={` ${format(sim.service.mean, 0)} ${sim.timeUnit}`} />
                </li>
            </ul>
        </>;
    }

    // render output section
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
            <h3>
                Results
            </h3>

            {rho >= 1 && <p className='error'>
                ** The server utilization exceeds 100%; the system will not reach a steady-state. **
            </p>}

            <ul className='multi-column'>
                <li>
                    Simulated time:{' '}
                    <b>{format(sim.timeNow / 60, 0)}</b> hours</li>
                <li>
                    Elapsed time:{' '}
                    <b>{format(sim.timeElapsed / 1000, 2)}</b> seconds</li>
                <li>
                    Number of Servers:{' '}
                    <b>{format(c, 0)}</b></li>
                <li>
                    Mean Wait:{' '}
                    <b>{format(sim.qWait.grossDwell.avg, 2)}</b>{' '}
                    (<i>{format(wq, 2)})</i> {sim.timeUnit}</li>
                <li>
                    Mean Queue:{' '}
                    <b>{format(sim.qWait.grossPop.avg, 2)}</b>{' '}
                    (<i>{format(lq, 2)}</i>)</li>
                <li>
                    Server Utilization:{' '}
                    <b>{format(sim.qService.grossPop.avg / c * 100, 0)}%</b>{' '}
                    (<i>{format(rho * 100, 0)}%</i>)</li>
                <li>
                    Customers Served:{' '}
                    <b>{format(sim.qService.grossDwell.cnt, 0)}</b></li>
            </ul>
        </>;
    }

    // render animation
    getAnimationHostHtml(): string {
        return `<svg class='ss-anim' viewBox='0 0 1000 400'>
            <!-- Title -->
            <text x='5%' y='8%' font-size='18' font-weight='bold' fill='#333'>M/M/C Queue Animation</text>
            
            <!-- Waiting Queue Section -->
            <text x='5%' y='25%' font-size='14' font-weight='bold' fill='#333'>Waiting Queue</text>
            <rect x='5%' y='30%' width='40%' height='45%' fill='#f5f5f5' stroke='#999' stroke-width='2' rx='5'/>
            <circle class='ss-queue qwait' cx='25%' cy='60%' r='18'/>
            
            <!-- Servers Section -->
            <text x='55%' y='25%' font-size='14' font-weight='bold' fill='#333'>Servers</text>
            <rect x='55%' y='30%' width='40%' height='45%' fill='#f5f5f5' stroke='#999' stroke-width='2' rx='5'/>
            <circle class='ss-queue qservice' cx='75%' cy='60%' r='18'/>
            
            <!-- Legend -->
            <text x='5%' y='92%' font-size='11' fill='#666'>
                ● = Customer Waiting  |  ● = Customer Being Served
            </text>
        </svg>`;
    }

    getAnimationOptions(): any {
        const sim = this.props.sim as MMCAnimated;
        
        return {
            getEntityHtml: (e: Entity) => {
                // Color based on which queue the entity is in
                let color = '#e74c3c';  // default red
                if (e instanceof Customer) {
                    const customer = e as any;
                    if (customer.inService) {
                        color = '#f39c12';  // yellow for service
                    } else {
                        color = '#3498db';  // blue for waiting
                    }
                }
                return `<circle cx='0' cy='0' r='6' fill='${color}' stroke='white' stroke-width='1'/>`;
            },
            queues: [
                { queue: sim.qWait, element: 'svg .ss-queue.qwait', max: 12, angle: 45 },
                { queue: sim.qService, element: 'svg .ss-queue.qservice', max: 8, angle: 45 },
            ]
        };
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

    constructor(options?: any) {
        super();
        this.name = 'MMC Animated';
        this.timeUnit = 'min';
        setOptions(this, options);
    }

    onStarting() {
        super.onStarting();
        
        // Set histogram parameters for analysis
        this.qWait.grossPop.setHistogramParameters(1, 0, 10);
        this.qWait.grossDwell.setHistogramParameters(60, 0, 500 - 0.1);

        // Start simulation - generate many customers
        this.generateEntities(Customer, this.interArrival, 1e5);
    }
}

// Customer entity
class Customer extends Entity<MMCAnimated> {
    inService = false;

    async script() {
        let sim = this.simulation;
        
        // Enter waiting queue immediately
        this.enterQueueImmediately(sim.qWait);
        
        // Wait for service to become available
        await this.enterQueue(sim.qService);
        
        // Leave the waiting queue
        this.leaveQueue(sim.qWait);
        
        // Now in service
        this.inService = true;
        
        // Delay for service duration
        await this.delay(sim.service.sample());
        
        // Service complete
        this.leaveQueue(sim.qService);
    }
}
