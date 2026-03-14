/**
 * Expo 配置 - 使用 dotenv 加载 .env，确保 API Key 正确注入
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  expo: {
    name: 'Interview Quiz',
    slug: 'interview-quiz',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    splash: {
      backgroundColor: '#f0f2f5',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.interview.quiz',
      infoPlist: {
        NSMicrophoneUsageDescription: '用于模拟面试录音与语音转文字',
      },
    },
    android: {
      package: 'com.interview.quiz',
      permissions: ['RECORD_AUDIO'],
    },
    extra: {
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
      openaiBaseUrl: process.env.EXPO_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com',
    },
  },
};
