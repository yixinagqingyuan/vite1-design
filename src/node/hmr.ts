/** @format */

import { ServerContext } from './server/index'
import { blue, green } from 'picocolors'
import { getShortName } from './utils'
//* 1. 打印一条消息到控制台，指示哪个文件已更改。
//* 2. 使模块图中的特定模块失效，以便模块的下一次请求能获取到更新的版本。
//* 3. 通过 WebSocket 连接，向客户端发送一个更新消息。这个消息告诉客户端哪个文件已更改，并且提供了一个路径，客户端可以根据这个路径获取到更新后的模块。
// 主要就是监听到文件改变像客户端提供最新的代码
export function bindingHMREvents(serverContext: ServerContext) {
  const { watcher, ws, root } = serverContext
  // 监听文件变化
  watcher.on('change', async (file) => {
    console.log(`✨${blue('[hmr]')} ${green(file)} changed`)
    const { moduleGraph } = serverContext
    // 确定改动文件
    await moduleGraph.invalidateModule(file)
    // 发送更新内容
    ws.send({
      type: 'update',
      updates: [
        {
          type: 'js-update',
          timestamp: Date.now(),
          path: '/' + getShortName(file, root),
          acceptedPath: '/' + getShortName(file, root),
        },
      ],
    })
  })
}
