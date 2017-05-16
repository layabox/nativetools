import * as AppCommand from './appCommand';
import * as fs from 'fs';
import * as path from 'path';
import fs_extra = require('fs-extra');


exports.command = 'removeres';
exports.describe = '删除app缓存资源'
exports.builder = {
}

exports.handler = function (argv) {
    try {
        let cmd = new AppCommand.AppCommand();

        let nativeJSONPath = null;
        let nativePath = null;
        nativePath = AppCommand.AppCommand.getNativePath(argv.path);
        nativeJSONPath = AppCommand.AppCommand.getNativeJSONPath(argv.path);

        if (!fs.existsSync(nativePath)) {
            console.log('错误: 找不到目录 ' + nativePath);
            return;
        }

        if (!fs.existsSync(nativeJSONPath)) {
            console.log('错误: 找不到文件 ' + nativeJSONPath);
            return;
        }

        let nativeJSON = fs_extra.readJSONSync(nativeJSONPath);

        if (!nativeJSON || !nativeJSON.h5) {
            console.log('错误: 文件 ' + nativeJSONPath + ' 无效');
        }

        let folder = path.join(path.dirname(nativeJSONPath), nativeJSON.h5);

        let appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_IOS);
        if (fs.existsSync(appPath)) {
            cmd.excuteRemoveRes(appPath);
        }

        appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_ANDROID_ECLIPSE);
        if (fs.existsSync(appPath)) {
            cmd.excuteRemoveRes(appPath);
        }

        appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_ANDROID_STUDIO);
        if (fs.existsSync(appPath)) {
            cmd.excuteRemoveRes(appPath);
        }
    }
    catch (error) {
        console.log();
        console.log(error.name);
        console.log(error.message);
    }
}