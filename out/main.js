#!/usr/bin/env node
for (var i = 0 ; i < process.argv.length; i++){
  console.log(' CCCCCCCCCCCCCCC ' + process.argv[i]);
}
  require('yargs').command(require('./createAppCommand'))
  .help()
 .argv
 require('yargs').command(require('./refreshAppCommand'))
  .help()
 .argv
