import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateSiteMenuRequestDto,
  SiteMenuListDto,
  SiteMenuResponseDto,
  SiteMenuValidationErrorContextDto,
  UpdateSiteMenuRequestDto,
} from './siteMenu.dto.ts';
import { type SiteMenuEntity } from './siteMenu.entity.ts';
import {
  siteMenuRepository,
  type SiteMenuRepositoryPort,
} from './siteMenu.repository.ts';

export class SiteMenuBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: SiteMenuValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'SiteMenuBusinessError';
  }
}

function ensurePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SiteMenuBusinessError('菜单标识不合法', {
      nodePath: 'siteMenu',
      field,
      reason: '菜单标识必须为正整数',
      value,
    }, HttpStatus.BAD_REQUEST);
  }

  return value;
}

function ensureString(value: unknown, field: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new SiteMenuBusinessError(
      allowEmpty ? `菜单${field}必须是字符串` : `菜单${field}不能为空`,
      {
        nodePath: 'siteMenu',
        field,
        reason: allowEmpty ? '菜单字段必须是字符串' : '菜单字段不能为空',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return allowEmpty ? value : value.trim();
}

function normalizeOptionalParentId(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new SiteMenuBusinessError('父级菜单标识不合法', {
      nodePath: 'siteMenu',
      field: 'parentId',
      reason: '父级菜单标识必须为正整数或空',
      value,
    }, HttpStatus.BAD_REQUEST);
  }

  return value;
}

function normalizeDateTime(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return undefined;
}

function containsNode(node: SiteMenuResponseDto, targetId: number): boolean {
  return node.children.some((child) => child.id === targetId || containsNode(child, targetId));
}

function toResponseDto(entity: SiteMenuEntity): SiteMenuResponseDto {
  return {
    id: entity.id,
    parentId: entity.parentId,
    name: entity.name,
    path: entity.path,
    icon: entity.icon,
    isTop: entity.isTop,
    sort: entity.sort,
    children: entity.children.map(toResponseDto),
    createBy: entity.createBy,
    createTime: normalizeDateTime(entity.createTime),
    updateBy: entity.updateBy,
    updateTime: normalizeDateTime(entity.updateTime),
    remark: entity.remark,
  };
}

function validateCreateInput(input: Record<string, unknown>): CreateSiteMenuRequestDto {
  return {
    parentId: normalizeOptionalParentId(input.parentId),
    name: ensureString(input.name, '名称'),
    path: ensureString(input.path, '路径', true),
    icon: ensureString(input.icon, '图标', true),
    isTop: input.parentId == null,
    sort:
      input.sort === undefined
        ? undefined
        : typeof input.sort === 'number' && Number.isInteger(input.sort) && input.sort >= 0
          ? input.sort
          : (() => {
              throw new SiteMenuBusinessError('菜单排序值不合法', {
                nodePath: 'siteMenu',
                field: 'sort',
                reason: '菜单排序值必须为非负整数',
                value: input.sort,
              }, HttpStatus.BAD_REQUEST);
            })(),
    remark: typeof input.remark === 'string' ? input.remark.trim() : undefined,
  };
}

function validateUpdateInput(input: Record<string, unknown>): UpdateSiteMenuRequestDto {
  const nextInput: UpdateSiteMenuRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'parentId')) {
    nextInput.parentId = normalizeOptionalParentId(input.parentId);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'name') && input.name !== undefined) {
    nextInput.name = ensureString(input.name, '名称');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'path') && input.path !== undefined) {
    nextInput.path = ensureString(input.path, '路径', true);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'icon') && input.icon !== undefined) {
    nextInput.icon = ensureString(input.icon, '图标', true);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'sort') && input.sort !== undefined) {
    if (typeof input.sort !== 'number' || !Number.isInteger(input.sort) || input.sort < 0) {
      throw new SiteMenuBusinessError('菜单排序值不合法', {
        nodePath: 'siteMenu',
        field: 'sort',
        reason: '菜单排序值必须为非负整数',
        value: input.sort,
      }, HttpStatus.BAD_REQUEST);
    }
    nextInput.sort = input.sort;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'remark') && input.remark !== undefined) {
    if (typeof input.remark !== 'string') {
      throw new SiteMenuBusinessError('菜单备注必须是字符串', {
        nodePath: 'siteMenu',
        field: 'remark',
        reason: '菜单备注必须是字符串',
        value: input.remark,
      }, HttpStatus.BAD_REQUEST);
    }
    nextInput.remark = input.remark.trim();
  }

  return nextInput;
}

export class SiteMenuService {
  constructor(private readonly repository: SiteMenuRepositoryPort = siteMenuRepository) {}

  async getSiteMenu(): Promise<SiteMenuListDto> {
    try {
      const entities = await this.repository.getTree();
      return entities.map(toResponseDto);
    } catch (error) {
      if (error instanceof SiteMenuBusinessError) {
        throw error;
      }

      throw new SiteMenuBusinessError('读取菜单失败', {
        nodePath: 'siteMenu',
        field: 'source',
        reason: '菜单数据源读取失败',
      }, HttpStatus.ERROR);
    }
  }

  async getSiteMenuDetail(id: number): Promise<SiteMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = await this.repository.getNodeById(targetId);

    if (!entity) {
      throw new SiteMenuBusinessError('菜单不存在', {
        nodePath: 'siteMenu',
        field: 'id',
        reason: '菜单节点不存在',
        value: id,
      }, HttpStatus.NOT_FOUND);
    }

    return toResponseDto(entity);
  }

  async createSiteMenu(input: CreateSiteMenuRequestDto | Record<string, unknown>): Promise<SiteMenuResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>);

    if (payload.parentId != null) {
      const parent = await this.repository.getNodeById(payload.parentId);
      if (!parent) {
        throw new SiteMenuBusinessError('父级菜单不存在', {
          nodePath: 'siteMenu',
          field: 'parentId',
          reason: '父级菜单不存在',
          value: payload.parentId,
        }, HttpStatus.NOT_FOUND);
      }
    }

    const created = await this.repository.createNode({
      ...payload,
      isTop: payload.parentId == null,
    });

    if (!created) {
      throw new SiteMenuBusinessError('新增菜单失败', {
        nodePath: 'siteMenu',
        field: 'create',
        reason: '菜单节点创建失败',
      }, HttpStatus.ERROR);
    }

    return toResponseDto(created);
  }

  async updateSiteMenu(
    id: number,
    input: UpdateSiteMenuRequestDto | Record<string, unknown>,
  ): Promise<SiteMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const current = await this.repository.getNodeById(targetId);

    if (!current) {
      throw new SiteMenuBusinessError('菜单不存在', {
        nodePath: 'siteMenu',
        field: 'id',
        reason: '菜单节点不存在',
        value: id,
      }, HttpStatus.NOT_FOUND);
    }

    const currentDto = toResponseDto(current);
    const payload = validateUpdateInput(input as Record<string, unknown>);
    const nextParentId =
      Object.prototype.hasOwnProperty.call(payload, 'parentId')
        ? (payload.parentId ?? null)
        : current.parentId;

    if (nextParentId != null) {
      if (nextParentId === targetId) {
        throw new SiteMenuBusinessError('父级菜单不能是当前菜单自身', {
          nodePath: 'siteMenu',
          field: 'parentId',
          reason: '父级菜单不能等于自身',
          value: nextParentId,
        }, HttpStatus.BAD_REQUEST);
      }

      if (containsNode(currentDto, nextParentId)) {
        throw new SiteMenuBusinessError('父级菜单不能是当前菜单的子节点', {
          nodePath: 'siteMenu',
          field: 'parentId',
          reason: '父级菜单不能挂到子节点下',
          value: nextParentId,
        }, HttpStatus.BAD_REQUEST);
      }

      const parent = await this.repository.getNodeById(nextParentId);
      if (!parent) {
        throw new SiteMenuBusinessError('父级菜单不存在', {
          nodePath: 'siteMenu',
          field: 'parentId',
          reason: '父级菜单不存在',
          value: nextParentId,
        }, HttpStatus.NOT_FOUND);
      }
    }

    const updated = await this.repository.updateNode(targetId, payload);
    if (!updated) {
      throw new SiteMenuBusinessError('更新菜单失败', {
        nodePath: 'siteMenu',
        field: 'update',
        reason: '菜单节点更新失败',
        value: id,
      }, HttpStatus.BAD_REQUEST);
    }

    return toResponseDto(updated);
  }

  async deleteSiteMenu(id: number): Promise<SiteMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const deleted = await this.repository.deleteNode(targetId);

    if (!deleted) {
      throw new SiteMenuBusinessError('菜单不存在', {
        nodePath: 'siteMenu',
        field: 'id',
        reason: '菜单节点不存在',
        value: id,
      }, HttpStatus.NOT_FOUND);
    }

    return toResponseDto(deleted);
  }
}

export const siteMenuService = new SiteMenuService();
