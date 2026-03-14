import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { QUESTION_POOL } from './src/data/questionPool';
import { randomQuestion } from './src/utils/randomQuestion';
import { VoiceRecorder } from './src/components/VoiceRecorder';
import { NoiseBackground } from './src/components/NoiseBackground';
import type { Question } from './src/types';

// 统一间距与配色
const SPACING = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 };
const COLORS = {
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  cardBg: '#ffffff',
  surface: '#f8fafc',
};

export default function App() {
  const [data, setData] = useState<Question[]>(() =>
    QUESTION_POOL.map((q) => ({ ...q, result: [...q.result] }))
  );
  const [current, setCurrent] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [interviewMode, setInterviewMode] = useState(false);
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    cardOpacity.setValue(0);
    cardScale.setValue(0.96);
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardScale, cardOpacity]);

  const handleNext = useCallback(() => {
    if (data.length > 0) {
      const nextQ = randomQuestion(data);
      if (nextQ) {
        setData((prev) => prev.filter((item) => item.id !== nextQ.id));
        setCurrent(nextQ);
        setShowAnswer(false);
        animateIn();
      } else setCurrent(null);
    } else setCurrent(null);
  }, [data, animateIn]);

  const handleReset = useCallback(() => {
    const freshPool = QUESTION_POOL.map((q) => ({ ...q, result: [...q.result] }));
    const first = randomQuestion(freshPool);
    if (first) {
      setCurrent(first);
      setData(freshPool.filter((item) => item.id !== first.id));
    } else {
      setCurrent(null);
      setData(freshPool);
    }
    setShowAnswer(false);
    animateIn();
  }, [animateIn]);

  const handleNextWithReset = useCallback(() => {
    setInterviewMode(false);
    handleNext();
  }, [handleNext]);

  React.useEffect(() => {
    if (current === null && data.length > 0) {
      const first = randomQuestion(data);
      if (first) {
        setCurrent(first);
        setData((prev) => prev.filter((item) => item.id !== first.id));
        animateIn();
      }
    }
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NoiseBackground />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {current?.id ? (
            <Animated.View
              style={[
                styles.cardWrapper,
                { opacity: cardOpacity, transform: [{ scale: cardScale }] },
              ]}
            >
              <View style={styles.card}>
                {/* 题号与标题 */}
                <View style={styles.header}>
                  <View style={styles.badge}>
                    <Ionicons name="document-text" size={14} color={COLORS.primaryDark} />
                    <Text style={styles.badgeText}>第 {current.id} 题</Text>
                  </View>
                  <Ionicons name="library" size={18} color={COLORS.textMuted} />
                  <Text style={styles.sectionLabel}>面试题库</Text>
                </View>

                {/* 题目内容 */}
                <View style={styles.questionBox}>
                  <View style={styles.questionLabelRow}>
                    <Ionicons name="help-circle-outline" size={18} color={COLORS.textMuted} />
                    <Text style={styles.questionLabel}>题目</Text>
                  </View>
                  <Text style={styles.questionText}>{current.text}</Text>
                </View>

                {interviewMode && <VoiceRecorder question={current} />}

                {showAnswer && (
                  <View style={styles.answerSection}>
                    <View style={styles.answerLabelRow}>
                      <Ionicons name="checkmark-done-circle-outline" size={18} color={COLORS.primaryDark} />
                      <Text style={styles.answerLabel}>参考答案</Text>
                    </View>
                    {current.result.map((item, idx) => (
                      <View key={idx} style={styles.answerItem}>
                        <Text style={styles.answerItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 操作区 */}
                <View style={styles.actionBar}>
                  <Pressable
                    onPress={() => setInterviewMode(!interviewMode)}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Ionicons
                      name={interviewMode ? 'close-circle-outline' : 'mic-outline'}
                      size={18}
                      color={COLORS.text}
                    />
                    <Text style={styles.secondaryBtnText}>
                      {interviewMode ? '退出面试' : '模拟面试'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowAnswer(!showAnswer)}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Ionicons
                      name={showAnswer ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={COLORS.text}
                    />
                    <Text style={styles.secondaryBtnText}>
                      {showAnswer ? '隐藏答案' : '查看答案'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleNextWithReset}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryBtnInner}
                    >
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>下一题</Text>
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* 底部信息 */}
                <View style={styles.footer}>
                  <View style={styles.footerLine} />
                  <Ionicons name="book-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.footerText}>剩余 {data.length} 道</Text>
                </View>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.emptyWrapper}>
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={styles.emptyTitle}>全部完成</Text>
                <Text style={styles.emptyHint}>点击下方按钮重新开始</Text>
              </View>
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.resetBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnInner}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>重置题库</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingVertical: SPACING.xl,
    justifyContent: 'center',
  },
  cardWrapper: { marginHorizontal: SPACING.xs },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  questionBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  questionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 26,
  },
  answerSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  answerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  answerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  answerItem: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  answerItemText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  actionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  secondaryBtn: {
    flex: 1,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  primaryBtn: {
    flex: 1,
    minWidth: 100,
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  primaryBtnInner: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  btnPressed: { opacity: 0.85 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  footerLine: { flex: 1 },
  footerText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  emptyWrapper: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyCard: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 48,
    paddingHorizontal: 40,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptyHint: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  resetBtn: { marginTop: SPACING.xl, minWidth: 160 },
});
