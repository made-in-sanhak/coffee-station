module.exports = {
  preset: '@react-native/jest-preset',
  testTimeout: 30000,
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(?:-[^/]+)?|@react-native(-community)?|@react-navigation)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
