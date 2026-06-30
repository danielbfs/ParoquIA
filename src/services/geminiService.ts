import { auth } from '../lib/firebase';

// A chamada à IA roda no SERVIDOR (POST /api/ai/chat). A chave da IA nunca é
// embutida no bundle do cliente. Enviamos o ID token do Firebase para o servidor
// autenticar a requisição (evita abuso anônimo da API paga).
export async function generateChatResponse(
  message: string,
  history: { role: string; content: string }[],
  context: string,
  customPrompt?: string
) {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, history, context, customPrompt }),
    });

    if (!response.ok) {
      throw new Error(`AI endpoint respondeu ${response.status}`);
    }

    // O servidor já devolve { text, analysis } (e degrada graciosamente em erro).
    return await response.json();
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    return {
      text: 'Paz de Cristo! No momento estou passando por uma manutenção técnica, mas em breve poderei te ajudar melhor. Como posso te auxiliar agora?',
      analysis: { category: 'Erro', sentiment: 'Neutro' },
    };
  }
}
