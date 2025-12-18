import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateFeedback } from '../utils/feedback';

// Mock the Google GenAI SDK
vi.mock('@google/genai', () => {
  const generateContentMock = vi.fn();
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: generateContentMock,
      },
    })),
  };
});

describe('generateFeedback (P0)', () => {
  const mockTranscript = [
    { speaker: 'AI', content: 'Hello, welcome to the interview.' },
    { speaker: 'USER', content: 'Thank you, glad to be here.' },
    { speaker: 'AI', content: 'Tell me about a time you led a team.' },
    { speaker: 'USER', content: 'I led a team of 5 developers to launch a new app.' },
  ];

  const mockContext = {
    jobDescription: 'Senior Developer role requiring leadership.',
    resume: 'Experienced developer with leadership background.',
  };

  const mockAiResponse = {
    summary: 'Strong candidate with leadership experience.',
    strengths: `- Leadership
- Clear communication`,
    contentAndStructure: 'Answers were well-structured.',
    communicationAndDelivery: 'Clear and concise delivery.',
    presentation: 'Professional tone.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate feedback correctly with valid input', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: 'key' });
    
    vi.mocked(ai.models.generateContent).mockResolvedValue({
      text: JSON.stringify(mockAiResponse),
    } as any);

    const result = await generateFeedback(mockTranscript as any, mockContext, 'fake-api-key');

    expect(result).toEqual(mockAiResponse);
    expect(ai.models.generateContent).toHaveBeenCalled();
    const params = vi.mocked(ai.models.generateContent).mock.calls[0][0] as any;
    expect(params.contents[0].parts[0].text).toContain('Senior Developer role');
    expect(params.contents[0].parts[0].text).toContain('led a team of 5 developers');
  });

  it('should handle empty context gracefully', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: 'key' });
    
    vi.mocked(ai.models.generateContent).mockResolvedValue({
      text: JSON.stringify(mockAiResponse),
    } as any);

    const result = await generateFeedback(mockTranscript as any, { jobDescription: '', resume: '' }, 'fake-api-key');

    expect(result).toEqual(mockAiResponse);
  });

  it('should handle markdown code blocks in response', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: 'key' });
    
    vi.mocked(ai.models.generateContent).mockResolvedValue({
      text: "```json\n" + JSON.stringify(mockAiResponse) + "\n```",
    } as any);

    const result = await generateFeedback(mockTranscript as any, mockContext, 'fake-api-key');

    expect(result).toEqual(mockAiResponse);
  });

  it('should throw error if Gemini API fails', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: 'key' });
    
    vi.mocked(ai.models.generateContent).mockRejectedValue(new Error('API Error'));

    await expect(generateFeedback(mockTranscript as any, mockContext, 'fake-api-key')).rejects.toThrow('API Error');
  });

  it('should throw error if AI returns malformed JSON', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: 'key' });
    
    vi.mocked(ai.models.generateContent).mockResolvedValue({
      text: 'not a json',
    } as any);

    await expect(generateFeedback(mockTranscript as any, mockContext, 'fake-api-key')).rejects.toThrow();
  });
});