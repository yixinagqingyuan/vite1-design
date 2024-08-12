const legacy = require('@vitejs/plugin-legacy').default

module.exports = {
  plugins: [legacy()],
  build: {
    manifest: true,
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`
      }
    }
  }
}
