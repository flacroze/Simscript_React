import { Simulation, Entity, Queue, Exponential, setOptions, format } from 'simscript';
import { SimulationComponent, NumericParameter } from '../../simscript-react/components';

/**
 * MMC Animation Component - shows servers, queue, and animated customers
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
                    Customers Waiting:{' '}
                    <b>{format(sim.qWait.grossPop.avg, 2)}</b></li>
                <li>
                    Customers Being Served:{' '}
                    <b>{format(sim.qService.grossPop.avg, 2)}</b></li>
                <li>
                    Server Utilization:{' '}
                    <b>{format(sim.qService.grossPop.avg / c * 100, 0)}%</b>{' '}
                    (<i>{format(rho * 100, 0)}%</i>)</li>
                <li>
                    Mean Wait:{' '}
                    <b>{format(sim.qWait.grossDwell.avg, 2)}</b>{' '}
                    (<i>{format(wq, 2)})</i> {sim.timeUnit}</li>
                <li>
                    Mean Queue:{' '}
                    <b>{format(sim.qWait.grossPop.avg, 2)}</b>{' '}
                    (<i>{format(lq, 2)}</i>)</li>
                <li>
                    Customers Served:{' '}
                    <b>{format(sim.qService.grossDwell.cnt, 0)}</b></li>
            </ul>
        </>;
    }

    // render animation
    getAnimationHostHtml(): string {
        const sim = this.props.sim as MMCAnimated;
        const c = sim.qService.capacity as number;
        let serverElements = '';
        
        // Create server representations
        for (let i = 0; i < c; i++) {
            const x = 20 + (i * 60);
            serverElements += `<circle class='ss-queue server-${i}' cx='${x}%' cy='30%' r='15'/>`;
        }

        return `<svg class='ss-anim' viewBox='0 0 1000 600'>
            <!-- Title -->
            <text x='5%' y='8%' font-size='16' font-weight='bold'>Servers</text>
            ${serverElements}
            
            <!-- Arrival -->
            <text x='5%' y='55%' font-size='14' font-weight='bold'>Arrivals</text>
            <circle class='ss-queue customer-arr' cx='10%' cy='65%' r='15'/>
            
            <!-- Queue -->
            <text x='40%' y='55%' font-size='14' font-weight='bold'>Waiting Queue</text>
            <rect x='35%' y='60%' width='30%' height='25%' fill='none' stroke='#ccc' stroke-width='2' rx='5'/>
            <circle class='ss-queue customer-queue' cx='50%' cy='72.5%' r='15'/>
            
            <!-- Service -->
            <text x='75%' y='55%' font-size='14' font-weight='bold'>Served</text>
            <circle class='ss-queue customer-service' cx='85%' cy='65%' r='15'/>
            
            <!-- Legend -->
            <text x='5%' y='95%' font-size='12' fill='#666'>
                Blue = Customer | Green = Waiting | Yellow = Being Served
            </text>
        </svg>`;
    }

    getAnimationOptions(): any {
        const sim = this.props.sim as MMCAnimated;
        const c = sim.qService.capacity as number;
        
        // Build queue configs for servers
        const queueConfigs: any[] = [
            { queue: sim.qArrival, element: 'svg .ss-queue.customer-arr' },
            { queue: sim.qWait, element: 'svg .ss-queue.customer-queue', max: 8 },
            { queue: sim.qService, element: 'svg .ss-queue.customer-service', max: c },
        ];

        return {
            getEntityHtml: (e: Entity) => {
                if (e instanceof Customer) {
                    const status = (e as any).status || 'waiting';
                    const colors: { [key: string]: string } = {
                        'arriving': '#3498db',
                        'waiting': '#2ecc71',
                        'serving': '#f39c12',
                        'leaving': '#95a5a6'
                    };
                    const color = colors[status] || '#3498db';
                    return `<circle cx='0' cy='0' r='8' fill='${color}' stroke='#2c3e50' stroke-width='1'/>`;
                }
                return `<circle cx='0' cy='0' r='8' fill='#3498db'/>`;
            },
            queues: queueConfigs
        };
    }

    initializeAnimation(animHost: HTMLElement): void {
        const sim = this.props.sim as MMCAnimated;
        
        // Update animation on time changes
        sim.timeNowChanged.addEventListener(() => {
            this.forceUpdate();
        });
    }
}

/**
 * MMC Simulation with Animation Support
 */
export class MMCAnimated extends Simulation {
    qArrival = new Queue('Arrival');    // For animation
    qWait = new Queue('Wait');          // Customers waiting
    qService = new Queue('Service', 2); // Being served
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

        // Start simulation
        this.generateEntities(Customer, this.interArrival, 1e5);
    }
}

// Customer entity
class Customer extends Entity<MMCAnimated> {
    status = 'arriving';

    async script() {
        let sim = this.simulation;
        
        // Arrival phase
        this.status = 'arriving';
        this.enterQueueImmediately(sim.qArrival);
        await this.delay(0.1);
        this.leaveQueue(sim.qArrival);
        
        // Enter wait queue
        this.status = 'waiting';
        this.enterQueueImmediately(sim.qWait);
        
        // Wait for service
        await this.enterQueue(sim.qService);
        this.leaveQueue(sim.qWait);
        
        // Service phase
        this.status = 'serving';
        await this.delay(sim.service.sample());
        
        // Leaving
        this.status = 'leaving';
        this.leaveQueue(sim.qService);
    }
}
