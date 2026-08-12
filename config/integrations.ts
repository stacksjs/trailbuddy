const values = typeof Bun !== 'undefined' ? Bun.env : process.env

/** External activity providers. Secrets remain server-side. */
export default {
  appleHealth: {
    /** Apple Health requires the native iOS bridge; the web app exposes imports. */
    nativeBridgeEnabled: values.APPLE_HEALTH_NATIVE_BRIDGE === 'true',
  },
  healthConnect: {
    /** Health Connect requires the native Android bridge; the web app exposes imports. */
    nativeBridgeEnabled: values.HEALTH_CONNECT_NATIVE_BRIDGE === 'true',
  },
}
