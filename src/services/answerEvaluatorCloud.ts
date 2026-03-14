/**
 * 云端 NLP 评判（可选）
 * 支持：百度 UNIT、腾讯云 NLP、OpenAI 等
 * 在 .env 配置对应 API Key 后启用
 */

import Constants from 'expo-constants';
import type { EvaluationResult } from './answerEvaluator';

const OPENAI_BASE = Constants.expoConfig?.extra?.openaiBaseUrl || process.env.EXPO_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com';
const OPENAI_KEY = Constants.expoConfig?.extra?.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export async function evaluateWithCloud(
  userAnswer: string,
  question: string,
  expectedAnswers: string[]
): Promise<EvaluationResult | null> {
  if (!OPENAI_KEY) return null;

  const refText = expectedAnswers.join('\n');
  const prompt = `你是一个严格的面试官，评判用户回答与标准答案的匹配度。

【必须严格执行的评分规则】

1. 低分（0-25分）情形，必须给低分：
   - 用户明确表示不知道、不清楚、不确定（如"不知道"、"我也不懂"、"用来干嘛的"、"好像是"等）
   - 用户给出与标准答案相矛盾的错误信息（如标准答案说"不能重复"，用户说"可以重复"）
   - 答非所问、完全跑题
   - 仅复述题目或几乎无有效内容

2. 中低分（25-50分）：只提到少量正确关键词但理解有误，或核心观点错误

3. 中高分（50-75分）：覆盖部分要点，理解基本正确但有遗漏

4. 高分（75-100分）情形，才可给高分：
   - 语义上与标准答案一致（含同义表达、口语化、个别错别字如"关往"与"关注"）
   - 一字不差或几乎完全一致时给100分
   - 核心观点正确、无与标准答案相矛盾的说法

【重要】若用户说"不知道"同时又给出错误结论，必须给0-20分，不能因提到个别词就给分。

题目：${question}

标准答案要点：
${refText}

用户回答：${userAnswer}

请以 JSON 格式返回，仅返回 JSON 无其他文字：
{"score": 0-100的整数, "feedback": "简短评语", "matched": ["真正命中的正确要点"], "missing": ["可补充的要点"]}`;

  try {
    const res = await fetch(`${OPENAI_BASE.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('[云端评判] API 请求失败:', res.status, err?.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content.replace(/```json?\s*|\s*```/g, '').trim()) as {
      score?: number;
      feedback?: string;
      matched?: string[];
      missing?: string[];
    };
    return {
      score: Math.min(100, Math.max(0, parsed.score ?? 0)),
      feedback: parsed.feedback ?? '评判完成',
      matchedKeywords: parsed.matched ?? [],
      missingKeywords: parsed.missing ?? [],
    };
  } catch {
    return null;
  }
}
