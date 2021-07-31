import type {
    Router,
    NavigationGuardNext,
    RouteLocationNormalized,
    RouteLocationRaw,
    RouteRecordNormalized
} from "vue-router";
import type {ComponentPublicInstance, App} from "vue";
import type {Store} from "vuex";
import {isRouteLocation, stringifyRoute, warn, isBrowser} from "./utils";
import type {NavigationGuardFetchWithThis} from "../index";

type NavigationGuardNextCallback = (vm: ComponentPublicInstance) => any;

/**
 * Wrapper for navigation guards
 * @param guard
 * @param to
 * @param from
 * @param record
 * @param name
 * @param app
 * @param store
 * @param router
 */
export const guardToPromiseFn = (
    guard: NavigationGuardFetchWithThis<ComponentPublicInstance>,
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    record: RouteRecordNormalized,
    name: string,
    app: App,
    store: Store<any>,
    router: Router
): () => Promise<void> => {
    return () => new Promise((resolve, reject) => {
        const enterCallbackArray = record && (record.enterCallbacks[name] = record.enterCallbacks?.[name] || []);
        const next: NavigationGuardNext = (
            valid?: boolean | RouteLocationRaw | NavigationGuardNextCallback | Error
        ) => {
            if(valid === false) {
                reject(new Error(`Navigation aborted from "${from.fullPath}" to "${to.fullPath}" via a navigation guard.`))
            } else if(valid instanceof Error) {
                reject(valid)
            } else if(isRouteLocation(valid)) {
                reject(
                    new Error(`Redirected from "${from.fullPath}" to "${stringifyRoute(to)}" via a navigation guard`)
                )
            } else {
                if(enterCallbackArray && record?.enterCallbacks?.[name] === enterCallbackArray && typeof valid === 'function') {
                    enterCallbackArray.push(valid)
                }

                resolve()
            }
        };
        const guardReturn = guard.call(
            record && record.instances?.[name] as ComponentPublicInstance,
            {
                app,
                store,
                router,
                isClient: isBrowser(),
                isInitial: !from.name,
                isFetch: (isBrowser() && !!from.name) || !isBrowser()
            },
            to,
            from,
            process.env.NODE_ENV !== 'production' ? canOnlyBeCalledOnce(next, to, from) : next
        );
        let guardCall = Promise.resolve(guardReturn);

        if(guard.length < 4) {
            guardCall = guardCall.then(next)
        }
        if(process.env.NODE_ENV !== 'production' && guard.length > 3) {
            const message = `The "next" callback was never called inside of ${
                guard.name ? '"' + guard.name + '"' : ''
            }:\n${guard.toString()}\n. If you are returning a value instead of calling "next", make sure to remove the "next" parameter from your function.`;

            if(typeof guardReturn === 'object' && 'then' in guardReturn) {
                guardCall = guardCall.then(resolvedValue => {

                    // @ts-ignore
                    if(!next._called) {
                        warn(message)
                        return Promise.reject(new Error('Invalid navigation guard'))
                    }

                    return resolvedValue
                })

            } else if(guardReturn !== undefined) {

                // @ts-ignore
                if(!next._called) {
                    warn(message)
                    reject(new Error('Invalid navigation guard'))
                    return
                }
            }
        }
        guardCall.catch(err => reject(err))
    });
};

/**
 * Next function called only once
 * @param next
 * @param to
 * @param from
 */
function canOnlyBeCalledOnce(
    next: NavigationGuardNext,
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
): NavigationGuardNext {
    let called = 0;

    return function() {

        if(called++ === 1) {
            warn(
                `The "next" callback was called more than once in one navigation guard when going from "${from.fullPath}" to "${to.fullPath}". It should be called exactly one time in each navigation guard. This will fail in production.`
            )
        }

        // @ts-expect-error: we put it in the original one because it's easier to check
        next._called = true;

        if(called === 1) {

            // eslint-disable-next-line prefer-spread,prefer-rest-params
            next.apply(null, arguments as any)
        }
    }
}