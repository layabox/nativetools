#!/usr/bin/env node
if (process.argv.length === 2) {
  console.log();
  console.log('用法：');
  console.log('   layanative create_app [OPTIONS]');
  console.log('   layanative refresh_app [OPTIONS]');
  console.log('   layanative list_versions');
  console.log('描述：');
  console.log('   create_app');
  console.log('       创建一个runtime项目。');
  console.log('       具体帮助信息用 layanative create_app --help 查看。');
  console.log('   refresh_app');
  console.log('       刷新当前目录对应的项目的资源和配置。');
  console.log('       具体帮助信息用 layanative refresh_app --help 查看。');
  console.log('   list_versions');
  console.log('       列出所有可用SDK版本。');
  console.log('       具体帮助信息用 layanative list_versions --help 查看。');
  return;
}

require('yargs')
  .command(require('./createAppCommand'))
  .command(require('./refreshAppCommand'))
  .command(require('./listVersionsCommand'))
  .locale('zh_CN')
  .help()
  .argv
