import type {App, Plugin} from "vue";
import {Store} from "vuex";
import type {
    Router
} from "vue-router";
import {extractComponentsGuards} from "./utils/extractComponentsGuards";

type NavigationGuardNextCallback = (vm: ComponentPublicInstance) => any;
declare type NavigationGuardReturn = void | Error | RouteLocationRaw | boolean | NavigationGuardNextCallback;
interface AdditionParams {
    app:App,
    store: Store<any>,
    router: Router,
    isClient: boolean
}
export declare interface NavigationGuardFetchWithThis<T> {
    (
        this: T,
        opt: AdditionParams,
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next: NavigationGuardNext
    ): NavigationGuardReturn | Promise<NavigationGuardReturn>;
}

import {ComponentCustomOptions, ComponentPublicInstance} from 'vue'
import {NavigationGuardNext, RouteLocationNormalized, RouteLocationRaw} from "vue-router";
declare module '@vue/runtime-core' {

    // provide typings for `this.$store`
    interface ComponentCustomOptions {
        prefetch?: NavigationGuardFetchWithThis<undefined>
    }
}
interface Prefetch {
    install(app: App, router: Router, store: Store<any>, name: string):void
}

/**
 * Fetcher for vue router
 */
export const createPrefetch = (): Prefetch => {
    type Lazy<T> = () => Promise<T> | Promise<Array<Promise<T>>>;

    /**
     * Run queue of guards
     * @param guards
     * @returns
     */
    function runGuardQueue(guards: Lazy<any>[]): Promise<void> {

        return guards.reduce((promise, guard) => {
            const promises = Array.isArray(promise) ? promise : [promise]
            return Promise.all(promises).then(() => guard())
        }, Promise.resolve())
    }

    return {

        install: (app: App, router: Router, store: Store<any>, name: string = "prefetch") => {
            router.beforeResolve(async(to, from) => {
                const guards = extractComponentsGuards(to.matched, name, app, to, from, store, router);
                await runGuardQueue(guards);
            });
        }
    }
}