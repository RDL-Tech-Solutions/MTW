const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adicionar extensões suportadas
config.resolver.sourceExts.push('cjs');

// Adicionar suporte para GIF e SVG
config.resolver.assetExts.push('gif', 'svg');

// DESABILITAR package.exports para evitar erro import.meta
// Isso resolve o erro "Cannot use 'import.meta' outside a module"
config.resolver.unstable_enablePackageExports = false;

// Configuração para evitar problemas com import.meta
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
