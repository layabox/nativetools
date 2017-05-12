"use strict";
const AppCommand = require("./appCommand");
const fs = require("fs");
const path = require("path");
const fs_extra = require("fs-extra");
exports.command = 'refresh_app';
exports.describe = '刷新app项目';
exports.builder = {
    type: {
        alias: 't',
        required: false,
        requiresArg: true,
        description: '创建类型 [可选值: 0: 不打资源包 1: 打资源包 2: 单机版本]'
    },
    url: {
        alias: 'u',
        required: false,
        requiresArg: true,
        description: '游戏地址'
    }
};
exports.handler = function (argv) {
    try {
        let cmd = new AppCommand.AppCommand();
        let nativeJSON = null;
        let nativeJSONPath = AppCommand.AppCommand.getNativeJSONPath(null);
        if (fs.existsSync(nativeJSONPath)) {
            nativeJSON = fs_extra.readJSONSync(nativeJSONPath);
            if (!nativeJSON) {
                console.log('错误：读取文件 ' + nativeJSONPath + ' 失败');
                return;
            }
            if (!fs.existsSync(path.join(process.cwd(), nativeJSON.native))) {
                console.log('错误：找不到文件 ' + nativeJSON.native);
                return;
            }
        }
        else {
            console.log('错误: 在当前目录找不到文件 ' + nativeJSONPath);
            return;
        }
        if (!cmd.check(argv, nativeJSON)) {
            return;
        }
        if (!nativeJSON || !nativeJSON.h5) {
            console.log('错误: 文件 ' + nativeJSONPath + ' 无效');
        }
        let folder = path.join(process.cwd(), nativeJSON.h5);
        if (!fs.existsSync(folder)) {
            console.log('错误: 找不到目录 ' + folder);
        }
        let app = AppCommand.AppCommand.getAppPath(argv.name, AppCommand.PLATFORM_IOS, nativeJSON, null);
        if (fs.existsSync(app)) {
            cmd.excuteRefreshApp(folder, AppCommand.PLATFORM_IOS, argv.type, argv.url, argv.name, nativeJSON);
        }
        app = AppCommand.AppCommand.getAppPath(argv.name, AppCommand.PLATFORM_ANDROID_ECLIPSE, nativeJSON, null);
        if (fs.existsSync(app)) {
            cmd.excuteRefreshApp(folder, AppCommand.PLATFORM_ANDROID_ECLIPSE, argv.type, argv.url, argv.name, nativeJSON);
        }
        app = AppCommand.AppCommand.getAppPath(argv.name, AppCommand.PLATFORM_ANDROID_STUDIO, nativeJSON, null);
        if (fs.existsSync(app)) {
            cmd.excuteRefreshApp(folder, AppCommand.PLATFORM_ANDROID_STUDIO, argv.type, argv.url, argv.name, nativeJSON);
        }
    }
    catch (error) {
        console.log();
        if (error.code === 'EPERM') {
            console.log('错误：文件已经被使用或被其他程序打开');
        }
        console.log(error.name);
        console.log(error.message);
    }
};
