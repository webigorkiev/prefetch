import type {App, Plugin} from "vue";
import type {Store} from "vuex";
import type {Pinia} from "pinia";
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
    isClient: boolean, // Execute in client mode
    isInitial: boolean, // Execute in initial navigation (server or client)
    isFetch: boolean // Execute in fetch mode (client and first navigation or server)
}
export type NavigationGuardFetchWithThis<T, S = any>  =
    (
        this: T,
        opt: AdditionParams<S>,
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next: NavigationGuardNext
    ) =>  NavigationGuardReturn | Promise<NavigationGuardReturn>;

// Creator for prefetch field
export const definePrefetch = (fn: NavigationGuardFetchWithThis<any, Pinia|Store<any>>) => fn;

// create a field like beforeRouteEnter, but on beforeResolve stage. Prefetch.
export const createPrefetch = <T = Store<any>|Pinia>(): Plugin => {
    type Lazy = () => (Promise<void> | Promise<Promise<void>[]>);
    async function runGuardQueue(
        guards: Lazy[] // Найденные loaders
    ): Promise<void> {
        for(const guard of guards) {
            const result = await guard();
            if (Array.isArray(result)) {
                await Promise.all(result);
            }
        }
    }
    return {
        install: (
            app: App, // Instance of the app
            router: Router, // Instance of the router
            store: T, // Instance of the store|pinia
            name: string = "prefetch" // Special name for loaders
        ) => {
            router.beforeResolve(async(to, from) => {
                const guards = extractComponentsGuards<T>(
                    to.matched,
                    name,
                    app,
                    to,
                    from,
                    store,
                    router
                );
                await runGuardQueue(guards); // Запуск полученных loaders
            });
        }
    }
}

declare module 'vue' {
    interface ComponentCustomOptions {
        prefetch?: NavigationGuardFetchWithThis<undefined, any>
    }
}