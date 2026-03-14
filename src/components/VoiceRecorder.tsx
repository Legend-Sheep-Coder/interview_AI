import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Audio } from 'expo-av';
import {
  transcribeFromFile,
  useWebSpeechRecognition,
  checkApiKeyStatus,
} from '../services/speechToText';
import { evaluateAnswer, type EvaluationResult } from '../services/answerEvaluator';
import { evaluateWithCloud } from '../services/answerEvaluatorCloud';
import type { Question } from '../types';

const SPACING = { xs: 8, sm: 12, md: 16, lg: 20 };
const COLORS = {
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  cardBg: '#ffffff',
  surface: '#f8fafc',
  success: '#0891b2',
  warning: '#f59e0b',
  error: '#ef4444',
};

interface VoiceRecorderProps {
  question: Question;
  onComplete?: (result: EvaluationResult) => void;
}

export function VoiceRecorder({ question, onComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showManualInputToggle, setShowManualInputToggle] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordGlow = useRef(new Animated.Value(0.5)).current;
  const webSpeech = useWebSpeechRecognition();

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.98, duration: 700, useNativeDriver: true }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(recordGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(recordGlow, { toValue: 0.4, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      glow.start();
      return () => {
        pulse.stop();
        glow.stop();
        pulseAnim.setValue(1);
        recordGlow.setValue(0.5);
      };
    }
  }, [isRecording, pulseAnim, recordGlow]);

  const evaluate = useCallback(
    async (text: string): Promise<EvaluationResult> => {
      setIsEvaluating(true);
      try {
        const cloudResult = await evaluateWithCloud(text, question.text, question.result);
        if (cloudResult) return cloudResult;
      } catch (e) {
        console.warn('[评判] 云端失败，使用本地:', e);
      } finally {
        setIsEvaluating(false);
      }
      return evaluateAnswer(text, question.result);
    },
    [question]
  );

  React.useEffect(() => {
    if (Platform.OS !== 'web') checkApiKeyStatus();
  }, []);

  const requestPermissions = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      setError('需要麦克风权限才能录音');
      return false;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    return true;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setEvaluation(null);
    setTranscript('');
    if (Platform.OS === 'web' && webSpeech.isSupported) {
      try {
        setIsTranscribing(true);
        const text = await webSpeech.startListening();
        setTranscript(text);
        setIsTranscribing(false);
        if (text) {
          const result = await evaluate(text);
          setEvaluation(result);
          onComplete?.(result);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '语音识别失败');
        setIsTranscribing(false);
      }
      return;
    }
    const ok = await requestPermissions();
    if (!ok) return;
    try {
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '录音启动失败');
    }
  }, [question, webSpeech, requestPermissions, onComplete, evaluate]);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        setIsTranscribing(true);
        const sttResult = await transcribeFromFile(uri);
        setIsTranscribing(false);
        if (sttResult.success && sttResult.text) {
          setTranscript(sttResult.text);
          const result = await evaluate(sttResult.text);
          setEvaluation(result);
          onComplete?.(result);
        } else {
          setError(sttResult.error || '转写失败，可手动输入答案');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '录音停止失败');
      setIsTranscribing(false);
    }
  }, [recording, question, onComplete, evaluate]);

  const handleManualSubmit = useCallback(async () => {
    const text = manualInput.trim();
    if (!text) return;
    setTranscript(text);
    const result = await evaluate(text);
    setEvaluation(result);
    onComplete?.(result);
  }, [manualInput, evaluate, onComplete]);

  const reset = useCallback(() => {
    setTranscript('');
    setEvaluation(null);
    setManualInput('');
    setError(null);
  }, []);

  const showManualInput =
    Platform.OS !== 'web' &&
    !transcript &&
    (showManualInputToggle || error?.includes('OPENAI_API_KEY') || error?.includes('转写失败'));

  const getScoreColor = () => {
    if (!evaluation) return COLORS.primary;
    if (evaluation.score >= 85) return COLORS.success;
    if (evaluation.score >= 70) return COLORS.primary;
    if (evaluation.score >= 50) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mic" size={20} color={COLORS.primary} />
        <Text style={styles.title}>模拟面试</Text>
      </View>

      {!transcript && !evaluation && (
        <>
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            style={({ pressed }) => [styles.recordBtnWrap, pressed && styles.pressed]}
          >
            <Animated.View style={[styles.recordBtnOuter, { transform: [{ scale: pulseAnim }] }]}>
              {isRecording && (
                <Animated.View style={[styles.recordGlow, { opacity: recordGlow }]} />
              )}
              <LinearGradient
                colors={
                  isRecording ? ['#ef4444', '#dc2626'] : [COLORS.primary, COLORS.primaryDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.recordBtn}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <>
                    <Ionicons
                      name={isRecording ? 'stop-circle' : 'mic'}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.recordBtnText}>
                      {isRecording ? '停止录音' : '开始录音作答'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Animated.View>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable onPress={() => setShowManualInputToggle(true)} style={styles.manualLink}>
              <Ionicons name="keypad-outline" size={14} color={COLORS.primary} />
              <Text style={styles.manualLinkText}>无 API Key？点击手动输入</Text>
            </Pressable>
          )}
        </>
      )}

      {showManualInput && (
        <View style={styles.manualBox}>
          <View style={styles.manualHintRow}>
            <Ionicons name="create-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.manualHint}>手动输入答案：</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="在此输入你的答案..."
            placeholderTextColor={COLORS.textMuted}
            value={manualInput}
            onChangeText={setManualInput}
            multiline
            numberOfLines={3}
          />
          <Pressable
            onPress={handleManualSubmit}
            disabled={isEvaluating}
            style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtnInner}
            >
              {isEvaluating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>提交评分</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {error && !showManualInput && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {transcript && (
        <View style={styles.transcriptBox}>
          <View style={styles.transcriptLabelRow}>
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.transcriptLabel}>你的回答</Text>
          </View>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

      {transcript && isEvaluating && (
        <View style={styles.evaluatingBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <View style={styles.evaluatingTextRow}>
            <Ionicons name="analytics-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.evaluatingText}>正在评判中…</Text>
          </View>
        </View>
      )}

      {evaluation && !isEvaluating && (
        <View style={styles.evalBox}>
          <View style={styles.scoreRow}>
            <Ionicons name="trophy" size={24} color={getScoreColor()} />
            <Text style={styles.scoreLabel}>得分</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor() }]}>{evaluation.score}</Text>
            <Text style={[styles.scoreUnit, { color: getScoreColor() }]}>分</Text>
          </View>
          <Text style={styles.feedbackText}>{evaluation.feedback}</Text>
          {evaluation.matchedKeywords.length > 0 && (
            <View style={styles.keywordsBox}>
              <View style={styles.keywordsLabelRow}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.keywordsLabel}>命中要点</Text>
              </View>
              <Text style={styles.keywordsText}>{evaluation.matchedKeywords.join('、')}</Text>
            </View>
          )}
          {evaluation.missingKeywords.length > 0 && (
            <View style={styles.keywordsBox}>
              <View style={styles.keywordsLabelRow}>
                <Ionicons name="add-circle-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.keywordsLabel}>可补充</Text>
              </View>
              <Text style={styles.keywordsText}>{evaluation.missingKeywords.join('、')}</Text>
            </View>
          )}
          <Pressable onPress={reset} style={styles.retryBtn}>
            <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
            <Text style={styles.retryBtnText}>重新作答</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  recordBtnWrap: { alignItems: 'center' },
  pressed: { opacity: 0.9 },
  recordBtnOuter: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  recordGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  recordBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 180,
  },
  recordBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualLink: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  manualLinkText: {
    fontSize: 13,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  manualBox: { marginTop: SPACING.sm },
  manualHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  manualHint: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: SPACING.sm,
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitBtnInner: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorBox: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
  },
  transcriptBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transcriptLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  transcriptLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  transcriptText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  evaluatingBox: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  evaluatingTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  evaluatingText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  evalBox: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 8,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  scoreValue: { fontSize: 36, fontWeight: '800' },
  scoreUnit: { fontSize: 18, fontWeight: '600' },
  feedbackText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  keywordsBox: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  keywordsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  keywordsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  keywordsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  retryBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
