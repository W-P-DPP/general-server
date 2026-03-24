import { tool } from 'ai';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
export const writeFileTool = tool({
  description: '在本地工作目录中创建或覆盖文件。',
  inputSchema: z.object({
    path: z.string().describe('相对于项目根目录的文件路径'),
    content: z.string().describe('要写入文件的完整文本内容'),
  }),
  execute: async (args) => {
    try {
      // 确保目标目录存在（类似 mkdir -p）
      const fullPath = path.resolve(process.cwd(), args.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // 写入文件
      await fs.writeFile(fullPath, args.content, 'utf8');
      
      return { success: true, message: `文件 ${args.path} 已成功保存。` };
    } catch (error: any) {
      return { success: false, message: `写入失败: ${error.message}` };
    }
  },
});
