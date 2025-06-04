export interface MCPRequest {
  context: string;
  instruction: string;
  input: string;
  userPrompt?: string;
  model: {
    name: string;
    provider: 'OpenAI' | 'DeepSeek' | 'Gemini';
    temperature: number;
  };
}
