import type {App, Plugin} from "vue";
import type {Store} from "vuex";
import type {
    Router
} from "vue-router";
import {extractComponentsGuards} from "./utils/extractComponentsGuards";
import type {ComponentPublicInstance} from 'vue'
import type {NavigationGuardNext, RouteLocationNormalized, RouteLocationRaw} from "vue-router";

type NavigationGuardNextCallback = (vm: ComponentPublicInstance) => any;
declare type NavigationGuardReturn = void | Error | RouteLocationRaw | boolean | NavigationGuardNextCallback;
interface AdditionParams<T = Store<any>> {
    app:App,
    store: T,
    router: Router,
    isClient: boolean,
    isInitial: boolean,
    isFetch: boolean
}
export type NavigationGuardFetchWithThis<T, S = any>  =
    (
        this: T,
        opt: AdditionParams<S>,
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next: NavigationGuardNext
    ) =>  NavigationGuardReturn | Promise<NavigationGuardReturn>;
export const createPrefetch = <T = Store<any>>(): Plugin => {
    type Lazy<T> = () => Promise<T> | Promise<Array<Promise<T>>>;
    function runGuardQueue(guards: Lazy<any>[]): Promise<void> {
        return guards.reduce((promise, guard) => {
            const promises = Array.isArray(promise) ? promise : [promise]
            return Promise.all(promises).then(() => guard())
        }, Promise.resolve())
    }
    return {
        install: (app: App, router: Router, store: T, name: string = "prefetch") => {
            router.beforeResolve(async(to, from) => {
                const guards = extractComponentsGuards<T>(to.matched, name, app, to, from, store, router);
                await runGuardQueue(guards);
            });
        }
    }
}

declare module 'vue' {
    interface ComponentCustomOptions {
        prefetch?: NavigationGuardFetchWithThis<undefined, any>
    }
}