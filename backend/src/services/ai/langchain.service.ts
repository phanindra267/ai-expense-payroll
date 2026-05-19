import { ROLE_PROMPTS, DEFAULT_ROLE } from './rolePrompts';
import { agentTools, getToolByName } from './agentTools';
import { anonymiseText } from '../../utils/anonymise';
import logger from '../../utils/logger';

interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }

interface AgentResponse { answer: string; toolsUsed: string[]; model: string; }

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3';

async function callOllama(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, stream: false }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
  const data = await response.json() as any;
  return data.message?.content || '';
}

// Simple ReAct-style agent: think → act (tool) → observe → repeat → answer
export async function runAgent(query: string, role: string, context: { orgId: string; userId: string }): Promise<AgentResponse> {
  const systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS[DEFAULT_ROLE];
  const toolDescriptions = agentTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

  const toolsUsed: string[] = [];
  const messages: ChatMessage[] = [
    { role: 'system', content: `${systemPrompt}\n\nAvailable tools:\n${toolDescriptions}\n\nTo use a tool, respond with: TOOL_CALL: {"name": "tool_name", "args": {...}}\nWhen you have enough information, respond with: FINAL_ANSWER: your answer here` },
    { role: 'user', content: anonymiseText(query) },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const response = await callOllama(messages);
    messages.push({ role: 'assistant', content: response });

    if (response.includes('TOOL_CALL:')) {
      const match = response.match(/TOOL_CALL:\s*(\{[\s\S]*?\})/);
      if (match) {
        try {
          const { name, args } = JSON.parse(match[1]);
          const tool = getToolByName(name);
          if (tool) {
            toolsUsed.push(name);
            logger.info('Agent tool call', { tool: name, args });
            const result = await tool.execute(args, context);
            messages.push({ role: 'user', content: `TOOL_RESULT: ${JSON.stringify(result)}` });
          } else {
            messages.push({ role: 'user', content: `TOOL_RESULT: Error - Tool "${name}" not found` });
          }
        } catch (e: any) {
          messages.push({ role: 'user', content: `TOOL_RESULT: Error - ${e.message}` });
        }
      }
      continue;
    }

    if (response.includes('FINAL_ANSWER:')) {
      const answer = response.replace('FINAL_ANSWER:', '').trim();
      return { answer, toolsUsed, model: MODEL };
    }

    // Model responded without format - treat as final answer
    return { answer: response, toolsUsed, model: MODEL };
  }

  return { answer: 'I was unable to complete the analysis within the allowed steps. Please try a more specific question.', toolsUsed, model: MODEL };
}
