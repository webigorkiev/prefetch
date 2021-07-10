import type {App, ComponentOptions} from "vue";
import type {
    Router,
    RouteLocationNormalized,
    RouteRecordNormalized,
    RouteLocationNormalizedLoaded,
    RouteComponent
} from "vue-router";
import type {Store} from "vuex";
import {guardToPromiseFn} from "./guardToPromiseFn"
import {warn, isRouteComponent, RawRouteComponent, isESModule, Lazy} from "./utils";

/**
 * Extract guards from components
 * @param matched
 * @param guardType
 * @param app
 * @param to
 * @param from
 * @param store
 * @param router
 */
export function extractComponentsGuards(
    matched: RouteRecordNormalized[],
    guardType: string,
    app: App,
    to: RouteLocationNormalized,
    from: RouteLocationNormalizedLoaded,
    store: Store<any>,
    router: Router
) {
    const guards: Array<() => Promise<void> | Promise<Array<Promise<void>>>> = [];
    const globalMixins = [...app._context.mixins];

    for(const record of matched) {
        for(const name in record.components) {
            let rawComponent = record.components[name] as RawRouteComponent & {
                _context?: any
            };

            if(process.env.NODE_ENV !== 'production') {

                if(!rawComponent || (typeof rawComponent !== 'object' && typeof rawComponent !== 'function')) {
                    warn(`Component "${name}" in record with path "${record.path}" is not` +
                        ` a valid component. Received "${String(rawComponent)}".`);
                    throw new Error('Invalid route component');
                } else if('then' in rawComponent) {
                    warn(`Component "${name}" in record with path "${record.path}" is a ` +
                        `Promise instead of a function that returns a Promise. Did you ` +
                        `write "import('./MyPage.vue')" instead of ` +
                        `"() => import('./MyPage.vue')" ? This will break in ` +
                        `production if not fixed.`)
                    const promise = rawComponent;
                    rawComponent = () => promise;
                } else if((rawComponent as any).__asyncLoader && !(rawComponent as any).__warnedDefineAsync) {
                    (rawComponent as any).__warnedDefineAsync = true;
                    warn(`Component "${name}" in record with path "${record.path}" is defined ` +
                        `using "defineAsyncComponent()". ` +
                        `Write "() => import('./MyPage.vue')" instead of ` +
                        `"defineAsyncComponent(() => import('./MyPage.vue'))".`);
                }
            }

            // eslint-disable-next-line no-inner-declarations
            function resolveGuards(
                rawComponent: RawRouteComponent & { _context?: any },
                isChunk = false,
                guards: any = []
            ) {
                const options: ComponentOptions = (rawComponent as any).__vccOpts || rawComponent;

                // guards in mixins
                if(options.mixins && options.mixins.length) {
                    for(const mixin of options.mixins) {
                        resolveGuards(mixin, isChunk, guards);
                    }
                }

                // guards in extends component
                if(options.extends) {
                    resolveGuards(options.extends, isChunk, guards);
                }

                const guard = options[guardType];
                guard && guards.push(
                    isChunk
                        ? guardToPromiseFn(guard, to, from, record, name, app, store, router)()
                        : guardToPromiseFn(guard, to, from, record, name, app, store, router)
                );

                if(rawComponent._context && rawComponent._context.mixins && rawComponent._context.mixins.length) {
                    for(const mixin of rawComponent._context.mixins) {
                        resolveGuards(mixin, isChunk, guards);
                    }
                }

                return guards
            }

            if(isRouteComponent(rawComponent)) {
                rawComponent._context = {mixins: globalMixins};
                guards.push(...resolveGuards(rawComponent));
            } else {

                // start requesting the chunk already
                let componentPromise: Promise<RouteComponent | null | undefined | void> = (rawComponent as Lazy<RouteComponent>)();

                if(process.env.NODE_ENV !== 'production' && !('catch' in componentPromise)) {
                    warn(`Component "${name}" in record with path "${record.path}" is a function that does not return a Promise. If you were passing a functional component, make sure to add a "displayName" to the component. This will break in production if not fixed.`);
                    componentPromise = Promise.resolve(componentPromise as RouteComponent);
                }
                guards.push(() =>
                    componentPromise.then(resolved => {

                        if(!resolved) {
                            return Promise.reject(new Error(`Couldn't resolve component "${name}" at "${record.path}"`));
                        }

                        const resolvedComponent = (isESModule(resolved) ? resolved.default : resolved) as RawRouteComponent & { _context?: any };

                        // replace the function with the resolved component
                        record.components[name] = resolvedComponent;
                        resolvedComponent._context = {mixins: globalMixins};

                        return resolveGuards(resolvedComponent, true);
                    })
                )
            }
        }
    }

    return guards
}