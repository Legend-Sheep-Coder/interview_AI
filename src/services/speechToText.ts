/**
 * 语音转文字服务
 * 支持：Web Speech API（浏览器本地）、OpenAI Whisper（云端，需 API Key）
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 调试日志：开发模式下自动开启，可在终端/控制台查看 API 请求详情
const DEBUG = __DEV__;

function getApiKey(): string {
  const fromExtra = Constants.expoConfig?.extra?.openaiApiKey;
  const fromEnv = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  return (fromExtra || fromEnv || '').trim();
}

function getBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.openaiBaseUrl;
  const fromEnv = process.env.EXPO_PUBLIC_OPENAI_BASE_URL;
  return (fromExtra || fromEnv || 'https://api.openai.com').replace(/\/$/, '');
}

function log(...args: unknown[]) {
  if (DEBUG) {
    console.log('[STT]', ...args);
  }
}

export type STTResult = {
  text: string;
  success: boolean;
  error?: string;
};

/**
 * 调试用：检查 API Key 是否已加载（不暴露 Key 内容）
 */
export function checkApiKeyStatus(): { loaded: boolean; source: string } {
  const key = getApiKey();
  const loaded = !!key;
  const source = loaded
    ? 'expoConfig.extra 或 process.env'
    : '未找到，请检查 .env 和 app.config.js';
  log('API Key 状态:', { loaded, source, keyLength: key?.length ?? 0 });
  return { loaded, source };
}

/**
 * 从录音文件转写（Native 使用 OpenAI Whisper API）
 */
export async function transcribeFromFile(uri: string): Promise<STTResult> {
  const apiKey = getApiKey();
  log('转写请求开始', { uri: uri?.slice(0, 50), hasKey: !!apiKey });

  if (Platform.OS === 'web') {
    return { text: '', success: false, error: 'Web 端请使用实时语音识别' };
  }

  if (!apiKey) {
    log('API Key 未配置');
    return {
      text: '',
      success: false,
      error: '未配置 API Key。请在项目根目录 .env 中设置 EXPO_PUBLIC_OPENAI_API_KEY=sk-xxx，然后执行 npx expo start -c 重启',
    };
  }

  const doRequest = async (): Promise<STTResult> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob);
    formData.append('model', 'whisper-1');
    formData.append('language', 'zh');

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/v1/audio/transcriptions`;
    log('请求中:', { url, method: 'POST' });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    log('响应:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const err = await response.text();
      log('API 错误:', err);
      return {
        text: '',
        success: false,
        error: `转写失败 (${response.status}): ${err}`,
      };
    }

    const data = (await response.json()) as { text: string };
    const text = data.text?.trim() || '';
    log('转写成功:', { textLength: text.length });
    return { text, success: true };
  };

  try {
    let lastError = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        log('第', attempt, '次尝试');
        const result = await doRequest();
        if (result.success) return result;
        return result;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        log('第', attempt, '次失败:', lastError);
        if (attempt < 2 && lastError === 'Network request failed') {
          await new Promise((r) => setTimeout(r, 800));
        } else {
          break;
        }
      }
    }
    const hint =
      lastError === 'Network request failed'
        ? '（建议：1. 换 便携AI 在 .env 设 EXPO_PUBLIC_OPENAI_BASE_URL=https://api.bianxieai.com 2. 或浏览器按 w 用 Web 语音）'
        : '';
    return { text: '', success: false, error: `${lastError}${hint}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('请求异常:', msg);
    return {
      text: '',
      success: false,
      error: `${msg}（可试 便携AI: EXPO_PUBLIC_OPENAI_BASE_URL=https://api.bianxieai.com）`,
    };
  }
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
  length: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

/**
 * Web 端：使用浏览器 Web Speech API 实时语音识别
 */
export function useWebSpeechRecognition(): {
  startListening: () => Promise<string>;
  isSupported: boolean;
} {
  const isSupported =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const startListening = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('当前环境不支持语音识别'));
        return;
      }

      const win = window as unknown as {
        webkitSpeechRecognition?: new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          start: () => void;
          onresult: ((e: SpeechRecognitionEvent) => void) | null;
          onend: (() => void) | null;
          onerror: ((e: { error: string }) => void) | null;
        };
        SpeechRecognition?: new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          start: () => void;
          onresult: ((e: SpeechRecognitionEvent) => void) | null;
          onend: (() => void) | null;
          onerror: ((e: { error: string }) => void) | null;
        };
      };

      const SpeechRecognition = win.webkitSpeechRecognition || win.SpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error('语音识别不可用'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = false;

      let finalText = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
          }
        }
      };

      recognition.onend = () => {
        resolve(finalText.trim());
      };

      recognition.onerror = (event: { error: string }) => {
        reject(new Error(event.error));
      };

      recognition.start();
    });
  };

  return { startListening, isSupported };
}
