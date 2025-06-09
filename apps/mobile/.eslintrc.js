module.exports = {
  extends: ['expo', '@react-native-community'],
  rules: {
    // React Native 및 Expo 관련 규칙
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'off', // 인라인 스타일 허용 (개발 단계에서)
    'react-native/no-color-literals': 'off',
    
    // React 관련 규칙
    'react/prop-types': 'off', // TypeScript 사용으로 비활성화
    'react/react-in-jsx-scope': 'off', // React 17+ 자동 import
    'react-hooks/exhaustive-deps': 'warn',
    
    // TypeScript 관련 규칙
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // 일반 규칙
    'prefer-const': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
  },
}; 