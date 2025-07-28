import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDaGwq8hdGmsbfPOw8aPoShn75V_sPPuvY';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface GenerateCodeResponse {
  code: string;
  language: string;
}

export async function generateCodeResponse(question: string, codeSnippet?: string): Promise<GenerateCodeResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    let prompt = `You are a code-only assistant. Respond ONLY with clean, working code. No explanations, no comments, no markdown formatting - just pure code.

Question: ${question}`;

    if (codeSnippet) {
      prompt += `\n\nExisting code snippet:\n${codeSnippet}`;
    }

    prompt += `\n\nProvide only the code solution. Detect the most appropriate programming language and respond with clean, executable code.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response to remove any markdown formatting
    const cleanCode = text
      .replace(/```[\w]*\n?/g, '') // Remove markdown code blocks
      .replace(/```/g, '') // Remove any remaining backticks
      .trim();
    
    // Detect language based on code patterns
    const language = detectLanguage(cleanCode);
    
    return {
      code: cleanCode,
      language
    };
  } catch (error) {
    console.error('Error generating code response:', error);
    throw new Error('Failed to generate AI response. Please try again.');
  }
}

function detectLanguage(code: string): string {
  // Simple language detection based on common patterns
  if (code.includes('def ') || code.includes('import ') || code.includes('print(')) {
    return 'python';
  }
  if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('console.log')) {
    return 'javascript';
  }
  if (code.includes('#include') || code.includes('std::') || code.includes('int main')) {
    return 'cpp';
  }
  if (code.includes('public class') || code.includes('System.out.println') || code.includes('public static void main')) {
    return 'java';
  }
  if (code.includes('<?php') || code.includes('echo ') || code.includes('$')) {
    return 'php';
  }
  if (code.includes('fn ') || code.includes('let mut') || code.includes('println!')) {
    return 'rust';
  }
  if (code.includes('func ') || code.includes('fmt.Println') || code.includes('package main')) {
    return 'go';
  }
  if (code.includes('using System') || code.includes('Console.WriteLine') || code.includes('public static void Main')) {
    return 'csharp';
  }
  
  // Default fallback
  return 'javascript';
}