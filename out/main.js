#!/usr/bin/env node
if (process.argv.length === 2) {
  console.log();
  console.log('用法：');
  console.log('   nativetools create_app [OPTIONS]');
  console.log('   nativetools refresh_app [OPTIONS]');
  console.log('   nativetools list_versions');
  console.log('描述：');
  console.log('   create_app');
  console.log('       创建一个runtime项目。');
  console.log('       具体帮助信息用 nativetools create_app --help 查看。');
  console.log('   refresh_app');
  console.log('       刷新当前目录对应的项目的资源和配置。');
  console.log('       具体帮助信息用 nativetools refresh_app --help 查看。');
  console.log('   list_versions');
  console.log('       列出所有可用SDK版本。');
  console.log('       具体帮助信息用 nativetools list_versions --help 查看。');
  return;
}

require('yargs')
  .command(require('./createAppCommand'))
  .command(require('./refreshAppCommand'))
  .command(require('./listVersionsCommand'))
  .help()
  .argv
