import {AsyncLocalStorage} from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage();

export function getRequestId() {
    const store = requestContext.getStore();
    return store?.requestId || null;
}