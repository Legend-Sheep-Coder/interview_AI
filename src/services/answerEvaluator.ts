/**
 * 答案评判与打分服务
 * 改进版：关键词覆盖 + 模糊匹配 + 字符级相似度 + 短语包含
 */

/**
 * 提取可分词单元（按标点、空格切分，保留中英文词）
 */
function tokenize(text: string): string[] {
  if (!text || !text.trim()) return [];
  const cleaned = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[,，、：:；;]/g, ' ')
    .trim();
  const tokens: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const char = cleaned[i];
    if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(char)) {
      let word = '';
      while (i < cleaned.length && /[\u4e00-\u9fa5a-zA-Z0-9]/.test(cleaned[i])) {
        word += cleaned[i];
        i++;
      }
      if (word.length >= 1) tokens.push(word);
    } else {
      i++;
    }
  }
  return tokens;
}

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '和', '与', '或', '及', '等', '这', '那', '它', '他', '她',
  '我', '你', '们', '有', '要', '会', '可以', '能', '就', '都', '也', '还', '而', '但',
  '如果', '因为', '所以', '一个', '一种', '一些', '什么', '怎么', '如何', '为什么',
]);

function extractKeywords(text: string): Set<string> {
  const tokens = tokenize(text);
  const keywords = new Set<string>();
  for (const t of tokens) {
    if (t.length >= 1 && !STOP_WORDS.has(t)) {
      keywords.add(t);
    }
  }
  return keywords;
}

/**
 * 字符级相似度：两词相同字符占比（容错错别字如 员用率 vs 复用率）
 */
function charSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let match = 0;
  for (const c of setA) {
    if (setB.has(c)) match++;
  }
  return match / Math.max(setA.size, setB.size);
}

/**
 * 模糊匹配：用户词是否与参考词相似（含错别字、简写）
 */
function fuzzyMatch(
  userKeywords: Set<string>,
  refWord: string
): { matched: boolean; matchedWord?: string } {
  if (userKeywords.has(refWord)) return { matched: true, matchedWord: refWord };
  for (const uk of userKeywords) {
    if (uk.includes(refWord) || refWord.includes(uk)) return { matched: true, matchedWord: uk };
    if (charSimilarity(uk, refWord) >= 0.6) return { matched: true, matchedWord: uk };
  }
  return { matched: false };
}

/**
 * 短语级匹配：用户答案是否包含参考中的关键短语（按逗号拆分）
 */
function phraseCoverage(userAnswer: string, expectedAnswers: string[]): number {
  const user = userAnswer.toLowerCase().replace(/\s+/g, '');
  let hit = 0;
  const phrases: string[] = [];
  for (const line of expectedAnswers) {
    const parts = line.split(/[,，、:：]/).map((p) => p.trim().toLowerCase().replace(/\s+/g, ''));
    for (const p of parts) {
      if (p.length >= 2 && !STOP_WORDS.has(p)) {
        phrases.push(p);
      }
    }
  }
  const uniquePhrases = [...new Set(phrases)];
  for (const p of uniquePhrases) {
    if (user.includes(p)) hit++;
  }
  return uniquePhrases.length === 0 ? 1 : hit / uniquePhrases.length;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  matchedKeywords: string[];
  missingKeywords: string[];
}

/**
 * 综合评判：关键词覆盖（模糊）+ 短语覆盖 + 长度奖励
 */
/** 检测用户是否表达"不知道/不确定"等，意图识别 */
function hasUncertaintyOrIgnorance(text: string): boolean {
  const lower = text.replace(/\s+/g, '');
  const patterns = [
    /不知道|不清楚|不确定|我也不懂|用来干嘛|好像是|不太懂|没学过|忘了|忘记了|想不起来|不太会|不太了解/,
  ];
  return patterns.some((p) => p.test(lower));
}

/** 检测用户答案是否与标准答案核心观点相矛盾（简单规则） */
function hasContradiction(userAnswer: string, expectedAnswers: string[]): boolean {
  const user = userAnswer.replace(/\s+/g, '');
  const ref = expectedAnswers.join('').replace(/\s+/g, '');
  // 标准答案说"不能重复"，用户说"可以重复"
  if (/不能重复|不可重复|不得重复/.test(ref) && /可以重复|都能重复|都可重复/.test(user)) return true;
  // 标准答案说"必须/要...不能"，用户说"可以..."
  if (/必须.*不能|不能.*必须/.test(ref) && /可以[^不]/.test(user)) return true;
  return false;
}

export function evaluateAnswer(
  userAnswer: string,
  expectedAnswers: string[]
): EvaluationResult {
  const userKw = extractKeywords(userAnswer);
  const refText = expectedAnswers.join(' ');
  const refKw = extractKeywords(refText);

  if (userKw.size === 0 && userAnswer.trim().length < 3) {
    return {
      score: 0,
      feedback: '答案过短或无法识别，请重新作答',
      matchedKeywords: [],
      missingKeywords: Array.from(refKw).slice(0, 8),
    };
  }

  // 1. 模糊关键词覆盖率：参考要点被用户覆盖的比例
  let covered = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of refKw) {
    const { matched: ok, matchedWord } = fuzzyMatch(userKw, k);
    if (ok) {
      covered++;
      if (matchedWord) matched.push(matchedWord);
    } else {
      missing.push(k);
    }
  }
  const keywordCoverage = refKw.size === 0 ? 1 : covered / refKw.size;

  // 2. 短语级覆盖（更宽松）
  const phraseScore = phraseCoverage(userAnswer, expectedAnswers);

  // 3. 意图识别：不知道/不确定 → 严格扣分
  let rawScore = keywordCoverage * 0.5 + phraseScore * 0.5;
  if (hasUncertaintyOrIgnorance(userAnswer)) {
    rawScore = Math.min(rawScore, 0.25); // 最高 25 分
  }
  if (hasContradiction(userAnswer, expectedAnswers)) {
    rawScore = Math.min(rawScore, 0.2); // 与标准答案矛盾，最高 20 分
  }
  const score = Math.round(Math.min(100, Math.max(0, rawScore * 115)));

  let feedback: string;
  if (hasUncertaintyOrIgnorance(userAnswer) || hasContradiction(userAnswer, expectedAnswers)) {
    feedback = '回答存在明显错误或未掌握该知识点，建议重新学习后作答。';
  } else if (score >= 85) {
    feedback = '回答非常完整，要点覆盖充分！';
  } else if (score >= 70) {
    feedback = '回答较好，部分要点可以再补充。';
  } else if (score >= 55) {
    feedback = '回答基本正确，建议对照标准答案查漏补缺。';
  } else {
    feedback = '回答与标准答案有差距，建议重新学习后作答。';
  }

  // 若存在矛盾或不知道，不展示误导性的"命中要点"
  const finalMatched =
    hasContradiction(userAnswer, expectedAnswers) || (hasUncertaintyOrIgnorance(userAnswer) && score < 30)
      ? []
      : [...new Set(matched)].slice(0, 12);

  return {
    score: Math.min(100, score),
    feedback,
    matchedKeywords: finalMatched,
    missingKeywords: missing.slice(0, 6),
  };
}
