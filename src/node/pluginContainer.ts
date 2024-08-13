/** @format */

import type {
  LoadResult,
  PartialResolvedId,
  SourceDescription,
  PluginContext as RollupPluginContext,
  ResolvedId,
} from 'rollup'
import { Plugin } from './plugin'

export interface PluginContainer {
  resolveId(id: string, importer?: string): Promise<PartialResolvedId | null>
  load(id: string): Promise<LoadResult | null>
  transform(code: string, id: string): Promise<SourceDescription | null>
}

// 模拟 Rollup 的插件机制
export const createPluginContainer = (plugins: Plugin[]): PluginContainer => {
  // 插件上下文对象
  // @ts-ignore 这里仅实现上下文对象的 resolve 方法
  class Context implements RollupPluginContext {
    async resolve(id: string, importer?: string) {
      let out = await pluginContainer.resolveId(id, importer)
      if (typeof out === 'string') out = { id: out }
      return out as ResolvedId | null
    }
  }
  // 插件容器主要就是为了对于插件做解析
  const pluginContainer: PluginContainer = {
    /**
     * 尝试解析给定的模块 ID，并在解析成功时返回解析后的 ID
     *
     * 这个函数接受两个参数：ID 和可选的导入器字符串。它遍历一个插件数组，寻找具有 resolveId 方法的插件。
     * 如果找到这样的插件，它将调用该插件的 resolveId 方法，并传入 ID 和导入器作为参数。这个方法可以同步或异步地返回一个新的 ID，这个 ID 可以是字符串或者具有 id 属性的对象。
     * 如果返回了新的 ID，它将被赋值给函数的局部变量 id，并使用这个新 ID 返回一个包含 id 的对象。如果没有插件能够解析 ID，函数将返回 null。
     *
     * @param {string} id - 要解析的模块 ID
     * @param {string=} importer - 可选的导入器字符串，用于传递给插件
     * @returns {Promise<{ id: string } | null>} - 一个 Promise，解析成功时返回一个包含解析后 ID 的对象，否则返回 null
     */
    async resolveId(id: string, importer?: string) {
      const ctx = new Context() as any
      // 遍历所有的插件，知道找到一个匹配的插件，拿到拼接后的 id 结果为止返回
      // 其实调用的都是插件中的resolveId 方法
      for (const plugin of plugins) {
        if (plugin.resolveId) {
          const newId = await plugin.resolveId.call(ctx as any, id, importer)
          if (newId) {
            id = typeof newId === 'string' ? newId : newId.id
            return { id }
          }
        }
      }
      return null
    },
    async load(id) {
      const ctx = new Context() as any
      for (const plugin of plugins) {
        // 其实编译也是拿到插件中对饮的方法去编译
        // 这里就将主体流程和插件的能力做到了高度解耦
        if (plugin.load) {
          const result = await plugin.load.call(ctx, id)
          if (result) {
            return result
          }
        }
      }
      return null
    },
    async transform(code, id) {
      const ctx = new Context() as any
      for (const plugin of plugins) {
        if (plugin.transform) {
          const result = await plugin.transform.call(ctx, code, id)
          if (!result) continue
          if (typeof result === 'string') {
            code = result
          } else if (result.code) {
            code = result.code
          }
        }
      }
      return { code }
    },
  }

  return pluginContainer
}
