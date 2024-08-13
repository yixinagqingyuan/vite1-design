/** @format */

import { NextHandleFunction } from 'connect'
import { ServerContext } from '../index'
import path from 'path'
import { pathExists, readFile } from 'fs-extra'

export function indexHtmlMiddware(
  serverContext: ServerContext,
): NextHandleFunction {
  return async (req, res, next) => {
    // 这里就简单来看，默认情况下，我们单斜杠就表示
    // 要载入 html 了
    if (req.url === '/') {
      // 从上下文中拿到目录
      const { root } = serverContext
      // 找到 html 文件，这里我们也不考虑别的文件名的情况
      const indexHtmlPath = path.join(root, 'index.html')
      //检查文件路径是否存在
      if (await pathExists(indexHtmlPath)) {
        // 读取
        const rawHtml = await readFile(indexHtmlPath, 'utf8')
        let html = rawHtml
        for (const plugin of serverContext.plugins) {
          if (plugin.transformIndexHtml) {
            html = await plugin.transformIndexHtml(html)
          }
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        // 直接返回
        return res.end(html)
      }
    }
    //如果没命中，那就走下一个中间件
    return next()
  }
}
