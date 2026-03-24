import { tool } from 'ai';
import { z } from 'zod';
import { readFile } from 'fs/promises';

const schema = z.object({
  path: z.string().describe('文件路径'),
});

export const readFileTool = tool({
  description: '读取本地文件内容',
  inputSchema: schema,
  execute: async (args) => {
    const res  = await readFile(args.path, 'utf-8')
    return await readFile(args.path, 'utf-8');
  },
});
