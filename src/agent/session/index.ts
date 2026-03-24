import type { ModelMessage } from 'ai';

const sessions = new Map<string, ModelMessage[]>();

export const getSession = (sessionId: string): ModelMessage[] => {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, [{role:"system",content:"你是一位养猪专家，你需要解答用户关于养猪方面的知识"}]);
    }
    return sessions.get(sessionId)!;
};

export const appendMessages = (sessionId: string, messages: ModelMessage[]): void => {
    const history = getSession(sessionId);
    history.push(...messages);
};

export const clearSession = (sessionId: string): void => {
    sessions.delete(sessionId);
};
