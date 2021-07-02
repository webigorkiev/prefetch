import type {
    RouteComponent,
    RouteLocationRaw
} from "vue-router";
export type Lazy<T> = () => Promise<T> | Promise<Array<Promise<T>>>;
export type RawRouteComponent = RouteComponent | Lazy<RouteComponent>;

/**
 * Check is browser
 */
export const isBrowser = new Function("try {return this===window;}catch(e){ return false;}");
/**
 * Route can be string or object
 * @param route
 */
export function isRouteLocation(route: any): route is RouteLocationRaw {

    return typeof route === 'string' || (route && typeof route === 'object');
}

/**
 * Is es module
 * @param obj
 */
export function isESModule(obj: any): obj is { default: RouteComponent } {
    return obj.__esModule || (hasSymbol && obj[Symbol.toStringTag] === 'Module')
}

export const hasSymbol =
    typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

/**
 * Stringify route
 * @param to
 */
export function stringifyRoute(to: RouteLocationRaw|string): string {
    const propertiesToLog = ['params', 'query', 'hash'] as const;

    if(typeof to === 'string') {
        return to
    }
    if('path' in to) {
        return to.path
    }

    const location = {} as Record<string, unknown>;

    for(const key of propertiesToLog) {
        if(key in to) {
            location[key] = to[key]
        }
    }

    return JSON.stringify(location, null, 2);
}

/**
 * Show warn in console
 * @param msg
 * @param _args
 */
export function warn(msg: string, ..._args: any[]): void
export function warn(msg: string): void {

    // avoid using ...args as it breaks in older Edge builds
    // eslint-disable-next-line prefer-rest-params
    const args = Array.from(arguments).slice(1);

    // eslint-disable-next-line prefer-spread
    console.warn.apply(
        console,
        ['[Fetcher warn]: ' + msg].concat(args) as [string, ...any[]]
    )
}

/**
 * Allows differentiating lazy components from functional components and vue-class-component
 *
 * @param component
 */
export function isRouteComponent(
    component: RawRouteComponent
): component is RouteComponent {
    return (
        typeof component === 'object' ||
        'displayName' in component ||
        'props' in component ||
        '__vccOpts' in component
    )
}