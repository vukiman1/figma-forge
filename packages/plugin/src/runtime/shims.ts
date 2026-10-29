if (typeof Reflect.get(globalThis, 'BigInt') !== 'function') {
  Object.defineProperty(globalThis, 'BigInt', {
    value: 0n.constructor,
    writable: true,
    configurable: true,
  });
}
