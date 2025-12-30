
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StudentLevel, Word, QuizQuestion, TargetLanguage } from "../types";

// Audio Helper: Decode base64 to Uint8Array
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Audio Helper: Convert PCM to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
export const geminiService = {
  async fetchWordsByLevel(level: StudentLevel, targetLanguage: TargetLanguage, count: number = 10): Promise<Word[]> {
    // 1. 微調後的 Prompt：強調純 JSON 格式與欄位一致性
    const prompt = `Generate ${count} essential English vocabulary words for ${level} students. 
    All explanations and translations MUST be in ${targetLanguage}. 
    Return the result as a PURE JSON array of objects. 
    Each object must have these EXACT keys: "word", "phonetic", "definition", "translation", "exampleSentence", "exampleTranslation".
    DO NOT include markdown formatting, backticks, or any text other than the JSON array.`;

    try {
      // 2. 呼叫 Render 後端
      const response = await fetch("https://startulip.onrender.com/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt }) 
      });

      if (!response.ok) {
        throw new Error(`伺服器回應錯誤: ${response.status}`);
      }

      const data = await response.json();

      // 3. 取得內容並處理潛在的空白字元
      let resultText = data.candidates[0].content.parts[0].text.trim();
      
      // 額外防呆：如果 Gemini 還是噴了 ```json ... ```，將其濾掉
      if (resultText.startsWith("```")) {
        resultText = resultText.replace(/```json|```/g, "").trim();
      }

      // 4. 解析為 Word 陣列
      const words: Word[] = JSON.parse(resultText);
      return words;

    } catch (error) {
      console.error("獲取單字失敗:", error);
      throw error;
    }
  }
};
    try {
      const words = JSON.parse(response.text || "[]");
      return words.map((w: any, index: number) => ({
        ...w,
        id: `${level}-${Date.now()}-${index}`,
        level,
        learned: false
      }));
    } catch (e) {
      console.error("Failed to parse words", e);
      return [];
    }
  },

  // Switch to gemini-3-flash-preview for quiz generation to avoid mandatory paid key selection
  async generateQuiz(words: Word[]): Promise<QuizQuestion[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const wordsList = words.map(w => w.word).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a vocabulary quiz for these words: ${wordsList}. For each word, create one multiple-choice question. The question can be about the meaning or a sentence completion. Provide 4 options for each.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              wordId: { type: Type.STRING, description: "The actual word this question is testing" },
              type: { type: Type.STRING, description: "One of: meaning, completion" }
            },
            propertyOrdering: ["question", "options", "correctAnswer", "wordId", "type"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  },

  // Enhanced TTS to handle different languages
  async playPronunciation(text: string, languageName: string = "English"): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      // Prompt specifically mentions the language to improve accent and naturalness
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Pronounce this in ${languageName}: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              // Kore is generally versatile, Gemini TTS will automatically adapt accent based on the text and prompt
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error("TTS Error:", error);
    }
  }
};
