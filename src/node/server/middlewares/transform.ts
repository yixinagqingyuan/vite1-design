/** @format */

import { NextHandleFunction } from 'connect'
import { CLIENT_PUBLIC_PATH } from '../../constants'
import {
  isJSRequest,
  isCSSRequest,
  isImportRequest,
  isVue,
  isInternalRequest,
  cleanUrl,
} from '../../utils'
import { ServerContext } from '../index'
import createDebug from 'debug'

const debug = createDebug('dev')

export async function transformRequest(
  url: string,
  serverContext: ServerContext,
) {
  const { moduleGraph, pluginContainer } = serverContext
  // 对 url 进行清洗
  url = cleanUrl(url)
  // 通过url 映射拿到编译后的实例
  let mod = await moduleGraph.getModuleByUrl(url)
  // 如果已经编译过了，就返回结果
  if (mod && mod.transformResult) {
    return mod.transformResult
  }
  // 不然就要重新编译
  // 分别从插件中拿到对应的 id 热更新的时候缓存的时候应该也需要这个 id
  const resolvedResult = await pluginContainer.resolveId(url)
  let transformResult
  // 启动编译，拿到代码
  if (resolvedResult?.id) {
    // 从文件中拿到源码
    let code = await pluginContainer.load(resolvedResult.id)
    // 有可能一次处理好了， 就不用再编译了直接返回好就行，比如静态资源
    if (typeof code === 'object' && code !== null) {
      code = code.code
    }
    // 这个是有可能有 mod 实例了，但是还没有编译，所以要在获取一次
    mod = await moduleGraph.ensureEntryFromUrl(url)
    // 如果已经读取了源文件了
    if (code) {
      // 启动编译流程
      // 套路还是一样，遍历插件然后调用插件中的方法，编译返回结果
      // resolvedResult?.id 这里的 id 对于能确定编译的是哪种文件
      transformResult = await pluginContainer.transform(
        code as string,
        resolvedResult?.id,
      )
    }
  }
  // 然后讲结果保存到当前 url 对应的实例中，方便后续调用
  if (mod) {
    mod.transformResult = transformResult
  }
  // 返回编译结果
  return transformResult
}

export function transformMiddleware(
  serverContext: ServerContext,
): NextHandleFunction {
  return async (req, res, next) => {
    // 如果请求方法不是 GET 或者请求 URL 为空，则跳过当前中间件，交给下一个中间件或者路由处理函数
    // 相当于兜底处理
    if (req.method !== 'GET' || !req.url) {
      return next()
    }
    const url = req.url
    debug('transformMiddleware: %s', url)
    // transform JS and CSS request
    // 判断是否是 js css,vue 或者静态资源类型
    if (
      isJSRequest(url) ||
      isVue(url) ||
      isCSSRequest(url) ||
      // 静态资源的 import 请求，如 import logo from './logo.svg?import';
      isImportRequest(url)
    ) {
      // 核心处理函数 传入 url 和上下文对象
      let result = await transformRequest(url, serverContext)
      if (!result) {
        // 如果没有结果，那么就交给下一个中间件处理
        return next()
      }
      // 如果有，并且不是一个字符串，我们拿到编译结果就可以了
      // 因为有的返回的可能是一个对象
      if (result && typeof result !== 'string') {
        result = result.code
      }
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript')
      // 返回给客户端,下一个中间件就不走了
      return res.end(result)
    }
    // 如果什么都不命中，给加一个中间件处理

    return next()
  }
}
