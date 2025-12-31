
import { GoogleGenAI } from "@google/genai";

// Fix: Utilizando inicialização direta com process.env.API_KEY conforme diretrizes
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateNewsContent = async (topic: string, tone: string = 'formal'): Promise<string> => {
  try {
    const prompt = `Escreva um parágrafo curto e profissional para uma newsletter interna de empresa sobre o tópico: "${topic}". O tom deve ser ${tone}. Mantenha o texto pronto para publicação, sem introduções como 'Aqui está o texto'.`;
    
    // Fix: Utilizando 'gemini-3-flash-preview' para tarefas de texto básicas conforme diretrizes
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Não foi possível gerar o conteúdo.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao comunicar com a IA.";
  }
};

export const suggestTaskDescription = async (taskTitle: string): Promise<string> => {
   try {
    const prompt = `Crie uma descrição detalhada e acionável para uma tarefa corporativa intitulada: "${taskTitle}". Use tópicos curtos.`;
    
    // Fix: Utilizando 'gemini-3-flash-preview' para tarefas de texto básicas conforme diretrizes
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "";
   } catch (error) {
     console.error("Gemini API Task Description Error:", error);
     return "";
   }
}
