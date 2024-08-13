/** @format */

import { NextHandleFunction } from 'connect'
import { CLIENT_PUBLIC_PATH } from '../../constants'
import { isImportRequest } from '../../utils'
//用于处理静态资产请求的优化轻量级中间件
import sirv from 'sirv'

export function staticMiddleware(root: string): NextHandleFunction {
  // 获取静态资源
  const serveFromRoot = sirv(root, { dev: true })
  return async (req, res, next) => {
    // 最后一个了，next 就不用调用了
    // 如果啥也没有，那就直接返回
    if (!req.url) {
      return
    }
    // 如果是 import 资源，或者，"/@vite/client" 资源 不处理
    // 之所以不处理 ?import 资源，是由于带 import 本质上是个js 文件，而不是个静态资源
    if (isImportRequest(req.url) || req.url === CLIENT_PUBLIC_PATH) {
      return
    }
    // 正式处理静态文件
    serveFromRoot(req, res, next)
  }
}
