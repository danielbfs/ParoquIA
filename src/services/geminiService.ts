import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateChatResponse(
  message: string, 
  history: { role: string; content: string }[], 
  context: string,
  customPrompt?: string
) {
  try {
    const prompt = `
      SISTEMA (Instrução):
      ${customPrompt || "Você é o ParoquIA, um assistente pastoral inteligente. Seja acolhedor, use linguagem cristã moderada e ajude com informações da paróquia."}

      CONTEXTO DO SISTEMA (Dados Atuais):
      ${context}

      INSTRUÇÃO ADICIONAL:
      Se o usuário enviou algo que parece um comprovante ou fala sobre pagamento e você não sabe o objetivo (Dízimo, Oferta, Festa, etc), você DEVE perguntar educadamente qual a finalidade para podermos registrar corretamente.

      HISTÓRICO DA CONVERSA:
      ${history.map(h => `${h.role === 'ai' ? 'IA' : 'Usuário'}: ${h.content}`).join('\n')}

      NOVA MENSAGEM DO USUÁRIO:
      ${message}
      
      IA:
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const responseText = response.text || "Paz de Cristo! Como posso te ajudar?";

    // Secondary analysis for metadata extraction (category/sentiment)
    const analysisResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise brevemente esta mensagem de usuário: "${message}". Extraia categoria e sentimento.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            sentiment: { type: Type.STRING }
          },
          required: ["category", "sentiment"]
        }
      }
    });

    const analysis = JSON.parse(analysisResponse.text || '{"category": "Outros", "sentiment": "Neutro"}');

    return {
      text: responseText,
      analysis
    };
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return {
      text: "Paz de Cristo! No momento estou passando por uma manutenção técnica, mas em breve poderei te ajudar melhor. Como posso te auxiliar agora?",
      analysis: { category: "Erro", sentiment: "Neutro" }
    };
  }
}
