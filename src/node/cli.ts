/** @format */

import cac from 'cac'
import { startDevServer } from './server'

const cli = cac()
//命令行工具 跟commander类似，   比如输入 vite serve  vite dev 执行对应的方法
cli
  .command('[root]', 'Run the development server')
  .alias('serve')
  .alias('dev')
  .action(async (option) => {
    // 核心 server 启动方法
    await startDevServer(option)
  })
// build 使用 rollup 打包，暂不处理
cli.command('build', 'Build the app for production').action(() => {})

cli.help()

cli.parse()
