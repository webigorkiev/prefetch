<p align="center">
  <a href="https://github.com/webigorkiev/prefetch" target="_blank" rel="noopener noreferrer">
    <img width="180" src="https://github.com/webigorkiev/prefetch/blob/master/logo.svg" alt="@vuemod/prefetch logo">
  </a>
</p>

# @vuemod/prefetch
> Easily fetch data before rendering a vue component with vue-router and vuex

If you've used vue-router, vue and vuex or pinia, you are familiar with this problem.

> The beforeRouteEnter guard does NOT have access to this, because the guard is called before the navigation is confirmed ...

Of course you can use:
```typescript
beforeRouteEnter (to, from, next) {
  next(vm => {
    // access to component instance via `vm`
  })
}
```

But, if you use vuex and make a mutation, then the component will be rendered first, 
and then the data will appear. (The code in the next construct is executed after all hooks).

Of course, you can get data centrally in the **beforeResolve** hook, but then if your application grows, you will have to write a separate router ...

Plugin adds additional **prefectch** hook (Similar to serverPrefetch) to components, mixins, extended components and global mixins.

## Installation

```bash
    yarn add @vuemod/prefetch
```
or
```bash
    npm i @vuemod/prefetch
```

## Usage

### In app initialization

```typescript
import {createPrefetch} from "@vuemod/prefetch";

// ....
const prefetch = createPrefetch();
app.use(prefetch, router, store);

```

### In components

```typescript
export default defineComponent({
    prefetch: definePrefetch(async({
       app,  // Instance of the app
       store, // Instance of the store|pinia
       router, // Instance of the router
       isClient,  // Execute on client
       isInitial,  // Execute in initial navigation (server or client)
       isFetch // Execute in fetch mode (client and first navigation or server)
   }, to, from, next?) => { 
        // your code
    })
});
```