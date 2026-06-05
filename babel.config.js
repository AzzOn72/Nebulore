module.exports = function (api) {
  api.cache(true);

  const isProd = process.env.NODE_ENV === 'production';

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated must always be last
      'react-native-reanimated/plugin',
      // Strip all console.* calls from production bundles to minimize size
      ...(isProd ? ['transform-remove-console'] : []),
    ],
  };
};
