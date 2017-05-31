"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require("fs");
const path = require("path");
const fs_extra = require("fs-extra");
const gen_dcc = require("layadcc");
const request = require("request");
const child_process = require("child_process");
const xmldom = require("xmldom");
const ProgressBar = require("progress");
exports.STAND_ALONE_URL = 'http://stand.alone.version/index.html';
exports.VERSION_CONFIG_URL = 'http://layabox.com/layaplayer/layanativeRes/versionconfig.json';
exports.DEFAULT_NAME = 'LayaBox';
exports.DEFAULT_APP_NAME = 'LayaBox';
exports.DEFAULT_PACKAGE_NAME = 'com.layabox.game';
exports.DEFAULT_TYPE = 0;
exports.NATIVE_JSON_FILE_NAME = 'native.json';
exports.PLATFORM_ANDROID_ALL = 'all';
exports.PLATFORM_IOS = 'ios';
exports.PLATFORM_ANDROID_ECLIPSE = 'android_eclipse';
exports.PLATFORM_ANDROID_STUDIO = 'android_studio';
exports.H5_PROJECT_CONFIG_FILE = 'config.json';
class AppCommand {
    constructor() {
    }
    excuteRefreshRes(folder, url, appPath) {
        if (!fs.existsSync(folder)) {
            console.log('错误: 找不到目录 ' + folder);
            return false;
        }
        var me = this;
        if (!fs.existsSync(appPath)) {
            console.log("警告: 找不到目录 " + appPath);
            return false;
        }
        let configPath = path.join(appPath, "config.json");
        if (!fs.existsSync(configPath)) {
            console.log('错误: 找不到文件 ' + configPath);
            return false;
        }
        let config = fs_extra.readJSONSync(configPath);
        if (!config) {
            console.log('错误: 读取文件 ' + configPath + ' 失败');
            return false;
        }
        if (fs.existsSync(path.join(appPath, config["res"]["path"], 'stand.alone.version'))) {
            if (url === '' || url === undefined) {
                url = exports.STAND_ALONE_URL;
                console.log('您正在打包单机版...');
            }
            else {
                if (url === exports.STAND_ALONE_URL) {
                    console.log('您正在打包单机版...');
                }
                else {
                    console.log('您正在从单机版地址切换到网络版,请注意修改相关代码...');
                }
            }
        }
        else {
            if (url === '' || url === undefined) {
                console.log('错误: 缺少参数url，请重新输入 ');
                return false;
            }
            else {
                if (url === exports.STAND_ALONE_URL) {
                    console.log('您正在从网络版地址切换到单机版,请注意修改相关代码...');
                }
                else {
                    console.log('您正在打包网络版...');
                }
            }
        }
        fs_extra.removeSync(path.join(appPath, config["res"]["path"]));
        this.processDcc(config, folder, url, appPath);
        return true;
    }
    excuteRemoveRes(appPath) {
        let configPath = path.join(appPath, "config.json");
        if (!fs.existsSync(appPath)) {
            console.log("警告: 找不到目录 " + appPath);
            return false;
        }
        if (!fs.existsSync(configPath)) {
            console.log('错误: 找不到文件 ' + configPath);
            return false;
        }
        let config = fs_extra.readJSONSync(configPath);
        if (!config) {
            console.log('错误: 读取文件 ' + configPath + ' 失败');
            return false;
        }
        let dir = path.join(appPath, config["res"]["path"]);
        console.log('正在删除 ' + dir + ' ...');
        fs_extra.emptyDirSync(dir);
        return true;
    }
    excuteCreateApp(folder, sdk, platform, type, url, name, app_name, package_name, outputPath) {
        if (!fs.existsSync(folder)) {
            console.log('错误: 找不到目录 ' + folder);
            return false;
        }
        var me = this;
        let appPath = AppCommand.getAppPath(AppCommand.getNativePath(path.join(outputPath, name)), platform);
        let configPath = path.isAbsolute(sdk) ? path.join(path.join(sdk, platform), "config.json") : path.join(path.join(process.cwd(), sdk, platform), "config.json");
        if (!fs.existsSync(configPath)) {
            console.log('错误: 找不到文件 ' + configPath + '。不是有效的SDK目录');
            return false;
        }
        let config = fs_extra.readJSONSync(configPath);
        if (!config) {
            console.log('错误: 读取文件 ' + configPath + ' 失败');
            return false;
        }
        if (fs.existsSync(appPath)) {
            console.log("错误： 项目 " + appPath + " 已经存在");
            return false;
        }
        fs_extra.copySync(path.join(sdk, platform), appPath);
        if (type === 2) {
            url = exports.STAND_ALONE_URL;
        }
        this.processUrl(config, type, url, appPath);
        this.processPackageName(config, package_name, appPath);
        if (type === 1 || type === 2) {
            this.processDcc(config, folder, url, appPath);
        }
        this.processDisplayName(config, platform, app_name, appPath);
        this.processName(config, name, appPath);
        let newConfigPath = path.join(appPath, "config.json");
        config["res"]["path"] = config["res"]["path"].replace(config["template"]["name"], name);
        fs_extra.writeJSONSync(newConfigPath, config);
        let nativeJSONPath = AppCommand.getNativeJSONPath(path.join(outputPath, name));
        let nativeJSON = { h5: path.relative(path.dirname(nativeJSONPath), folder) };
        fs_extra.writeJSONSync(nativeJSONPath, nativeJSON);
        return true;
    }
    processUrl(config, type, url, appPath) {
        var me = this;
        if (type === 2) {
            if (config.localize && config.localize.replace) {
                config.localize.replace.forEach((v, i, arr) => {
                    var p = path.join(appPath, v);
                    var s = me.read(p);
                    s = s.replace(new RegExp(config.localize.src, 'g'), config.localize.des);
                    fs.writeFileSync(p, s);
                });
            }
        }
        if (url && url != "") {
            config["url"]["replace"].forEach(function (file) {
                var srcPath = path.join(appPath, file);
                var str = me.read(srcPath);
                str = str.replace(new RegExp(config["url"]["src"]), config["url"]["des"].replace("${url}", url));
                fs_extra.outputFileSync(srcPath, str);
            });
        }
    }
    processPackageName(config, package_name, appPath) {
        var me = this;
        if (package_name && package_name != "") {
            config["package"]["replace"].forEach(function (file) {
                var destPath = path.join(appPath, file);
                var str = me.read(destPath);
                str = str.replace(new RegExp(config["package"]["name"], "g"), package_name);
                fs_extra.outputFileSync(destPath, str);
            });
        }
    }
    processDcc(config, folder, url, appPath) {
        let res_path = AppCommand.getResFolder(folder);
        if (res_path && res_path != "" && fs.existsSync(res_path)) {
            var outpath = url;
            var index = outpath.indexOf('?');
            if (index > 0) {
                outpath = outpath.substring(0, index);
            }
            index = outpath.lastIndexOf('/');
            if (index > 0) {
                outpath = outpath.substring(0, index);
            }
            outpath = outpath.replace("http://", "");
            outpath = outpath.replace(/:/g, '.');
            outpath = outpath.replace(/\\/g, '_');
            outpath = outpath.replace(/\//g, '_');
            outpath = path.join(config["res"]["path"], outpath);
            outpath = path.join(appPath, outpath);
            if (!fs.existsSync(outpath)) {
                fs_extra.mkdirsSync(outpath);
            }
            console.log('正在执行LayaDcc...');
            gen_dcc.gendcc(res_path, outpath, true, false);
        }
    }
    processDisplayName(config, platform, app_name, appPath) {
        let file = path.join(appPath, config["template"]["display"]);
        let xml = this.read(file);
        let doc = new xmldom.DOMParser().parseFromString(xml);
        if (platform === exports.PLATFORM_IOS) {
            let dictNode = doc.getElementsByTagName('dict')[0];
            let keyNode = doc.createElement("key");
            let keyTextNode = doc.createTextNode("CFBundleDisplayName");
            keyNode.appendChild(keyTextNode);
            dictNode.appendChild(keyNode);
            let stringNode = doc.createElement("string");
            let stringTextNode = doc.createTextNode(app_name);
            stringNode.appendChild(stringTextNode);
            dictNode.appendChild(stringNode);
            dictNode.appendChild(stringNode);
        }
        else {
            let stringNodes = doc.getElementsByTagName('string');
            for (let i = 0; i < stringNodes.length; i++) {
                if (stringNodes[i].attributes.getNamedItem("name").value === "app_name") {
                    stringNodes[i].replaceChild(doc.createTextNode(app_name), stringNodes[i].childNodes[0]);
                    break;
                }
            }
        }
        fs_extra.outputFileSync(file, doc.toString());
    }
    processName(config, name, appPath) {
        var me = this;
        config["template"]["replace"].forEach(function (file) {
            var srcPath = path.join(appPath, file);
            var str = me.read(srcPath);
            str = str.replace(new RegExp(config["template"]["name"], "g"), name);
            fs_extra.outputFileSync(srcPath, str);
        });
        config["template"]["rename"].forEach(function (file) {
            var oldPath = path.join(appPath, file);
            var newPath = path.join(appPath, file);
            var dir_name = path.dirname(newPath);
            var base_name = path.basename(newPath);
            var new_base_name = base_name.replace(config["template"]["name"], name);
            newPath = path.join(dir_name, new_base_name);
            fs.renameSync(oldPath, newPath);
        });
    }
    static getAppPath(dir, platform) {
        if (path.isAbsolute(dir))
            return path.join(dir, platform);
        return path.join(process.cwd(), dir, platform);
    }
    static getNativeJSONPath(dir) {
        return path.join(this.getNativePath(dir), exports.NATIVE_JSON_FILE_NAME);
    }
    static getNativePath(dir) {
        if (path.isAbsolute(dir))
            return dir;
        return path.join(process.cwd(), dir);
    }
    static isH5Folder(folder) {
        return fs.existsSync(path.join(folder, exports.H5_PROJECT_CONFIG_FILE));
    }
    static getH5BinFolder(folder) {
        let config = fs_extra.readJSONSync(path.join(folder, exports.H5_PROJECT_CONFIG_FILE));
        return path.join(folder, config.res);
    }
    static getResFolder(folder) {
        if (AppCommand.isH5Folder(folder)) {
            return AppCommand.getH5BinFolder(folder);
        }
        return folder;
    }
    static getAppDataPath() {
        let dataPath;
        if (process.platform === 'darwin') {
            let home = process.env.HOME || ("/Users/" + (process.env.NAME || process.env.LOGNAME));
            dataPath = home + "/Library/Application Support/Laya/NativeTools/template/";
        }
        else {
            var appdata = process.env.AppData || process.env.USERPROFILE + "/AppData/Roaming/";
            dataPath = appdata + "/Laya/layanative/template/";
        }
        if (!fs_extra.existsSync(dataPath)) {
            fs_extra.mkdirsSync(dataPath);
        }
        return dataPath;
    }
    static getSDKRootPath() {
        return AppCommand.getAppDataPath();
    }
    static getSDKPath(version) {
        return path.join(AppCommand.getAppDataPath(), version);
    }
    static isSDKExists(version) {
        return fs.existsSync(path.join(AppCommand.getAppDataPath(), version));
    }
    read(path) {
        try {
            var text = fs.readFileSync(path, "utf-8");
            text = text.replace(/^\uFEFF/, '');
        }
        catch (err0) {
            return "";
        }
        return text;
    }
}
exports.AppCommand = AppCommand;
function getServerJSONConfig(url) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!url)
            url = exports.VERSION_CONFIG_URL + '?' + Math.random();
        return new Promise(function (res, rej) {
            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    res(JSON.parse(body));
                }
                else {
                    console.log('错误: 网络连接异常，下载 ' + url + '失败');
                    res(null);
                }
            });
        });
    });
}
exports.getServerJSONConfig = getServerJSONConfig;
function download(url, file, callBack) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(function (res, rej) {
            let stream = fs.createWriteStream(file);
            let layaresponse;
            var bar;
            request(url).on('response', function (response) {
                layaresponse = response;
                var len = parseInt(layaresponse.headers['content-length'], 10);
                bar = new ProgressBar('  下载 [:bar] :rate/bps :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: len
                });
            }).on('data', function (chunk) {
                bar.tick(chunk.length);
            }).pipe(stream).on('close', function () {
                if (layaresponse.statusCode === 200) {
                    callBack();
                    res(true);
                }
                else {
                    console.log('错误: 网络连接异常，下载 ' + url + '失败');
                    res(false);
                }
            }).on('end', function () {
                console.log('\n');
            });
        });
    });
}
exports.download = download;
function unzip(unzipurl, filepath, callbackHandler) {
    console.log('正在解压 ' + unzipurl + ' 到 ' + filepath + ' ...');
    if (process.platform === 'darwin') {
        var cmd = "unzip -oq \"" + unzipurl + "\" -d \"" + filepath + "\"";
        child_process.execSync(cmd);
    }
    else {
        var unzipexepath = path.join(__dirname, '..', 'tools', 'unzip.exe');
        var cmd = "\"" + unzipexepath + "\" -oq \"" + unzipurl + "\" -d \"" + filepath + "\"";
        child_process.execSync(cmd);
    }
}
exports.unzip = unzip;
function unzipAsync(unzipurl, filepath, cb) {
    console.log('正在解压 ' + unzipurl + ' 到 ' + filepath + ' ...');
    if (process.platform === 'darwin') {
        var cmd = "unzip -oq \"" + unzipurl + "\" -d \"" + filepath + "\"";
        child_process.exec(cmd, { maxBuffer: 1024 * 1024 }, cb);
    }
    else {
        var unzipexepath = path.join(__dirname, '..', 'tools', 'unzip.exe');
        var cmd = "\"" + unzipexepath + "\" -oq \"" + unzipurl + "\" -d \"" + filepath + "\"";
        child_process.exec(cmd, { maxBuffer: 1024 * 1024 }, cb);
    }
}
exports.unzipAsync = unzipAsync;
