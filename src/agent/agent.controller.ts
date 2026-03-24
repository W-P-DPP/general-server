import type { Request, Response } from "express";
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { createOpenAI, } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import config from '@/config.ts';
import { readFileTool, writeFileTool } from './tools/index.ts';
import { getSession, appendMessages, clearSession } from './session/index.ts';

const yzGateway = createOpenAI({
    baseURL: config.agent.baseURL,
    apiKey: config.agent.key
});
const yzGateway1 = createAnthropic({
    baseURL: config.agent.baseURL,
    apiKey: config.agent.key
});

const chat = async (req: Request, res: Response) => {
    const { messages, sessionId }: { messages: ModelMessage[], sessionId: string } = req.body;
    const history = getSession(sessionId);
    appendMessages(sessionId, messages);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    console.log('chat',history)
    const result = streamText({
        model: yzGateway1('claude-sonnet-4-6'),
        messages: history,
        tools: { readFile: readFileTool, writeFileTool },
        stopWhen: stepCountIs(10),
        onFinish: ({ response }) => {
            appendMessages(sessionId, response.messages as ModelMessage[]);
        },
    });

    for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
            res.write(`data: ${JSON.stringify({ type: 'text', text: part.text })}\n\n`);
        } else if (part.type === 'tool-call') {
            res.write(`data: ${JSON.stringify({ type: 'tool-call', toolName: part.toolName, text: part.input })}\n\n`);
        } else if (part.type === 'tool-result' && 'output' in part) {
            res.write(`data: ${JSON.stringify({ type: 'tool-result', toolName: part.toolName, text: (part as any).output })}\n\n`);
        }
    }
    res.write('data: [DONE]\n\n');
    res.end();
}

const clearChat = (req: Request, res: Response) => {
    const { sessionId } = req.body;
    clearSession(sessionId);
    res.json({ success: true });
}

const getModels = async (req: Request, res: Response)=>{
    try {
    const response = await fetch(`${config.agent.baseURL}/models`, {
      headers: {
        'Authorization': `Bearer ${config.agent.key}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // 提取模型 ID 列表
    // 标准响应格式通常是 { data: [ { id: 'claude-3-sonnet', ... }, ... ] }
    const modelIds = data.data.map((model: any) => model.id);
    
    console.log('当前网关支持的模型:', modelIds);
     res.sendSuccess(modelIds);
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
}

export { chat, clearChat,getModels }
