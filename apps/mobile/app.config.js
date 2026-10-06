// Dynamic Expo config: lets the web export run under different URL prefixes.
//   Hostinger (domain root):        EXPO_BASE_URL unset  -> /app
//   GitHub Pages (project subpath): EXPO_BASE_URL=/dermora/app
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments || {}), baseUrl: process.env.EXPO_BASE_URL || '/app' },
});
