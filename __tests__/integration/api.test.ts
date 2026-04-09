import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../app.ts';
import { initSiteMenuModule } from '../../src/siteMenu/siteMenu.repository.ts';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';

type SiteMenuRow = {
  id: number
  parent_id: number | null
  name: string
  path: string
  icon: string
  is_top: number
  sort: number
  create_by: string | null
  create_time: Date | string | null
  update_by: string | null
  update_time: Date | string | null
  remark: string | null
}

const TABLE_NAME = 'sys_site_menu';
const TABLE_COLUMNS = [
  'id',
  'parent_id',
  'name',
  'path',
  'icon',
  'is_top',
  'sort',
  'create_by',
  'create_time',
  'update_by',
  'update_time',
  'remark',
].join(', ');

let app: Express;
let originalRows: SiteMenuRow[] = [];

async function getSiteMenuRows(): Promise<SiteMenuRow[]> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  return dataSource.query(`SELECT ${TABLE_COLUMNS} FROM ${TABLE_NAME} ORDER BY id ASC`) as Promise<SiteMenuRow[]>;
}

async function clearSiteMenuTable(): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  await dataSource.query(`DELETE FROM ${TABLE_NAME}`);
}

async function insertSiteMenuRows(rows: SiteMenuRow[]): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  for (const row of rows) {
    await dataSource.query(
      `
        INSERT INTO ${TABLE_NAME}
          (${TABLE_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.parent_id,
        row.name,
        row.path,
        row.icon,
        row.is_top,
        row.sort,
        row.create_by,
        row.create_time,
        row.update_by,
        row.update_time,
        row.remark,
      ],
    );
  }
}

async function restoreOriginalRows(): Promise<void> {
  await clearSiteMenuTable();
  await insertSiteMenuRows(originalRows);
}

async function resetSiteMenuSeed(): Promise<void> {
  await clearSiteMenuTable();
  await initSiteMenuModule();
}

beforeAll(async () => {
  await initDataBase();
  app = createApp();
  originalRows = await getSiteMenuRows();
});

beforeEach(async () => {
  await resetSiteMenuSeed();
  process.env.JWT_ENABLED = 'false';
});

afterAll(async () => {
  await restoreOriginalRows();
  process.env.JWT_ENABLED = 'false';
  const dataSource = getDataSource();
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

describe('siteMenu 查询接口', () => {
  it('GET /api/site-menu/getMenu 应在表为空时自动导入并返回中文成功消息', async () => {
    await clearSiteMenuTable();

    const res = await request(app).get('/api/site-menu/getMenu');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取菜单成功',
    });
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        path: expect.any(String),
        icon: expect.any(String),
        isTop: expect.any(Boolean),
        sort: expect.any(Number),
        children: expect.any(Array),
      }),
    );

    const rows = await getSiteMenuRows();
    expect(rows.length).toBeGreaterThan(0);
  });

  it('GET /api/site-menu/getMenu 与 GET /api/site-menu/getMenu/:id 应同时保持可用', async () => {
    const compatibleRes = await request(app).get('/api/site-menu/getMenu');
    const detailRes = await request(app).get('/api/site-menu/getMenu/3');

    expect(compatibleRes.status).toBe(200);
    expect(detailRes.status).toBe(200);
    expect(Array.isArray(compatibleRes.body.data)).toBe(true);
    expect(detailRes.body.data).toEqual(
      expect.objectContaining({
        id: 3,
        name: '工具',
      }),
    );
  });

  it('GET /api/site-menu/getMenu/:id 应返回指定菜单详情', async () => {
    const res = await request(app).get('/api/site-menu/getMenu/3');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取菜单详情成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: 3,
        name: '工具',
      }),
    );
  });
});

describe('siteMenu CRUD 接口', () => {
  it('POST /api/site-menu/createMenu 应新增顶级菜单', async () => {
    const res = await request(app).post('/api/site-menu/createMenu').send({
      parentId: null,
      name: '测试菜单',
      path: '/test-menu',
      icon: '/icons/test.svg',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '新增菜单成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        parentId: null,
        name: '测试菜单',
      }),
    );
  });

  it('POST /api/site-menu/createMenu 父级菜单不存在时应返回中文错误', async () => {
    const res = await request(app).post('/api/site-menu/createMenu').send({
      parentId: 99999,
      name: '测试子菜单',
      path: '/test-child',
      icon: '/icons/test.svg',
    });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 404,
      msg: '父级菜单不存在',
    });
  });

  it('PUT /api/site-menu/updateMenu/:id 应更新菜单', async () => {
    const res = await request(app).put('/api/site-menu/updateMenu/2').send({
      name: 'Git工具',
      path: '/git-tools',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '更新菜单成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: 2,
        name: 'Git工具',
        path: '/git-tools',
      }),
    );
  });

  it('DELETE /api/site-menu/deleteMenu/:id 应删除菜单及其子树', async () => {
    const res = await request(app).delete('/api/site-menu/deleteMenu/3');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '删除菜单成功',
    });

    const listRes = await request(app).get('/api/site-menu/getMenu');
    const ids = listRes.body.data.flatMap((node: any) => [
      node.id,
      ...node.children.map((child: any) => child.id),
    ]);

    expect(ids).not.toContain(3);
    expect(ids).not.toContain(31);
    expect(ids).not.toContain(32);
  });
});

describe('JWT 中间件（中文返回）', () => {
  beforeEach(() => {
    process.env.JWT_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.JWT_ENABLED = 'false';
  });

  it('无 token 应返回中文错误', async () => {
    const res = await request(app).get('/api/site-menu/getMenu');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      code: 401,
      msg: '缺少授权信息或授权格式错误',
    });
  });

  it('token 格式错误应返回中文错误', async () => {
    const res = await request(app)
      .get('/api/site-menu/getMenu')
      .set('Authorization', 'InvalidToken');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      code: 401,
      msg: '缺少授权信息或授权格式错误',
    });
  });

  it('有效 token 应保持查询成功', async () => {
    const { generateToken } = await import('../../utils/middleware/jwtMiddleware.ts');
    const token = generateToken({ userId: 1 });
    const res = await request(app)
      .get('/api/site-menu/getMenu')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取菜单成功',
    });
  });
});
