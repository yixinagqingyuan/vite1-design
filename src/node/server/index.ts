/** @format */

import connect from 'connect'
import { optimize } from '../optimizer/index'
import { blue, green } from 'picocolors'
import { transformMiddleware } from './middlewares/transform'
import { ModuleGraph } from '../ModuleGraph'
import { createPluginContainer, PluginContainer } from '../pluginContainer'
import { resolvePlugins } from '../plugins'
import { indexHtmlMiddware } from './middlewares/indexHtml'
import { staticMiddleware } from './middlewares/static'
import { createWebSocketServer } from '../ws'
//极简高效的跨平台文件监视库 相当于 Nodefs 模块
import chokidar, { FSWatcher } from 'chokidar'
import { bindingHMREvents } from '../hmr'
import { Plugin } from '../plugin'
import { normalizePath } from '../utils'

export interface ServerContext {
  root: string
  pluginContainer: PluginContainer
  app: connect.Server
  plugins: Plugin[]
  moduleGraph: ModuleGraph
  ws: { send: (data: any) => void; close: () => void }
  watcher: FSWatcher
  type: string
}

export async function startDevServer(type) {
  // Connect是一个可扩展的HTTP服务器框架,类似于 koa
  const app = connect()
  //process.cwd() 是一个方法，用于获取 Node.js 进程的当前工作目录
  const root = process.cwd()
  //  时间戳
  const startTime = Date.now()
  // 得到插件数组
  const plugins = resolvePlugins()
  // 初始化插件
  const pluginContainer = createPluginContainer(plugins)
  // 初始化模块映射实例，主要后期用来快速存取用的
  const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url))
  // 监听文件变动，后期用来做热跟新
  const watcher = chokidar.watch(root, {
    ignored: ['**/node_modules/**', '**/.git/**'],
    ignoreInitial: true,
  })
  // WebSocket 对象 后期热更新就靠它
  const ws = createWebSocketServer(app)
  // 开发服务器上下文
  const serverContext: ServerContext = {
    root: normalizePath(process.cwd()),
    app,
    pluginContainer,
    plugins,
    moduleGraph,
    ws,
    type: type == 'react' ? 'react' : 'vue',
    watcher,
  }
  // 绑定热更新
  bindingHMREvents(serverContext)
  for (const plugin of plugins) {
    // 调用插件的配置方法，主要就是在插件中保存当前上下文实例
    // 后续插件中可能用的到
    if (plugin.configureServer) {
      await plugin.configureServer(serverContext)
    }
  }
  // 添加洋葱圈中间件，每次请求都会过一遍中间件
  // 根据不同类型，返回不同的资源
  // 核心编译逻辑
  app.use(transformMiddleware(serverContext))

  // 入口 HTML 资源
  app.use(indexHtmlMiddware(serverContext))

  // 静态资源
  app.use(staticMiddleware(serverContext.root))
  // 启动服务器
  app.listen(3000, async () => {
    await optimize(root, type == 'react' ? 'src/main.tsx' : 'src/main.ts')
    console.log(
      green('🚀 No-Bundle 服务已经成功启动!'),
      `耗时: ${Date.now() - startTime}ms`,
    )
    console.log(`> 本地访问路径: ${blue('http://localhost:3000')}`)
  })
}
