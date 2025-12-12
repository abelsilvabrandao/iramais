import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize specific model
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateNewsContent = async (topic: string, tone: string = 'formal'): Promise<string> => {
  if (!ai) {
    console.warn("API Key not found. Returning mock data.");
    return "Nota: Configuração da API Key necessária para gerar conteúdo real. Este é um texto simulado.";
  }

  try {
    const prompt = `Escreva um parágrafo curto e profissional para uma newsletter interna de empresa sobre o tópico: "${topic}". O tom deve ser ${tone}. Mantenha o texto pronto para publicação, sem introduções como 'Aqui está o texto'.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Não foi possível gerar o conteúdo.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao comunicar com a IA.";
  }
};

export const suggestTaskDescription = async (taskTitle: string): Promise<string> => {
   if (!ai) return "Descrição automática indisponível (falta API Key).";

   try {
    const prompt = `Crie uma descrição detalhada e acionável para uma tarefa corporativa intitulada: "${taskTitle}". Use tópicos curtos.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
   } catch (error) {
     return "";
   }
}
