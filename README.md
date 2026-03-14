# Interview Quiz - React Native + TypeScript

面试题库随机刷题应用，由 `random.html` 重构为 React Native + TypeScript 实现，支持**模拟面试**模式。

## 功能

- 随机抽取面试题
- 显示/隐藏答案
- **模拟面试**：语音录制 → 语音转文字 → 答案评判与打分
- 下一题（从剩余题库随机）
- 题库刷完后可重置

## 模拟面试说明

| 平台 | 语音转文字 | 说明 |
|------|------------|------|
| **Web** | 浏览器 Web Speech API | 免费，需 Chrome 等支持 |
| **Android/iOS** | OpenAI Whisper API | 需配置 `EXPO_PUBLIC_OPENAI_API_KEY` |
| **无 API Key** | 手动输入 | 可手动输入答案参与评分 |

### 配置 OpenAI API Key（可选）

1. 复制 `.env.example` 为 `.env`
2. 填入 `EXPO_PUBLIC_OPENAI_API_KEY=sk-xxx`
3. **国内网络**：需配置代理，见 [proxy/README.md](proxy/README.md)
4. 重启 `npx expo start -c`

### 答案评判

使用 NLP 思路：关键词提取、Jaccard 相似度、关键点覆盖率，综合给出 0–100 分及反馈。

## 技术栈

- React Native (Expo)
- TypeScript
- expo-av（录音）
- expo-file-system

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 或指定平台
npm run android
npm run ios
npm run web
```

## 项目结构

```
interview/
├── App.tsx                    # 主应用组件
├── src/
│   ├── components/
│   │   └── VoiceRecorder.tsx  # 语音录制与评分组件
│   ├── data/
│   │   └── questionPool.ts    # 题库数据
│   ├── services/
│   │   ├── speechToText.ts    # 语音转文字
│   │   └── answerEvaluator.ts # 答案评判
│   ├── types/
│   │   └── index.ts           # 类型定义
│   └── utils/
│       └── randomQuestion.ts  # 随机选题
├── package.json
├── tsconfig.json
└── app.json
```
