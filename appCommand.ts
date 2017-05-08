import * as fs from 'fs';
import * as path from 'path';
import fs_extra = require('fs-extra');
import gen_dcc = require('layadcc');
import * as request from 'request';
import child_process = require('child_process');
import * as xmldom from 'xmldom';
import * as ProgressBar from 'progress';

export const STAND_ALONE_URL: string = 'http://stand.alone.version/index.html';
export const VERSION_CONFIG_URL: string = 'http://10.10.20.102:9999/versionconfig.json';
export const DEFAULT_NAME: string = 'LayaBox';
export const DEFAULT_APP_NAME: string = 'LayaBox';
export const DEFAULT_PACKAGE_NAME: string = 'com.layabox.game';
export const DEFAULT_TYPE: number = 0;
export const NATIVE_JSON_FILE_NAME: string = 'native.json';
export const PLATFORM_ANDROID_ALL: string = 'all';
export const PLATFORM_IOS: string = 'ios';
export const PLATFORM_ANDROID_ECLIPSE: string = 'android_eclipse';
export const PLATFORM_ANDROID_STUDIO: string = 'android_studio';
export const H5_PROJECT_CONFIG_FILE: string = 'config.json';

export class AppCommand {

    constructor() {
    }
    public excuteCreateApp(folder: string, sdk: string, platform: string, type: number, url: string, name: string, app_name: string, package_name: string, nativeJSON: any): boolean {
        console.log('platform: ' + platform);
        console.log('sdk: ' + path.join(sdk, platform));

        if (!fs.existsSync(folder)) {
            console.log('Error: can not find directory ' + folder);
            return false;
        }

        var me = this;
        let appPath = this.getAppPath(name, platform, nativeJSON);
        //读取配置

        let configPath = path.join(path.join(sdk, platform), "config.json");
        if (!fs.existsSync(configPath)) {
            console.log('Error: can not find file ' + configPath);
            return false;
        }
        let config = fs_extra.readJSONSync(configPath);
        if (!config) {
            console.log('Error: read ' + configPath + 'failed.');
            return false;
        }
        //判读项目是否已存在
        if (fs.existsSync(appPath)) {
            console.log("同名文件 " + appPath + " 已经存在");
            return false;
        }

        //拷贝
        config["template"]["source"].forEach(function (source) {
            var srcPath = path.join(path.join(sdk, platform), source);
            var destPath = path.join(appPath, source);
            if (fs.existsSync(destPath)) {
                console.log("发现同名文件，请选择其他输出目录");
                return false;
            }
            fs_extra.copySync(srcPath, destPath);
        });

        this.processUrl(config, type, url, appPath);
        this.processPackageName(config, package_name, appPath);
        if (type === 1 || type === 2) {
            this.processDcc(config, folder, url, appPath);
        }
        this.processDisplayName(config, platform, app_name, appPath);
        this.processName(config, name, appPath);

        nativeJSON.type = type;
        nativeJSON.url = type == 2 ? STAND_ALONE_URL : url;
        nativeJSON.name = name;
        nativeJSON.app_name = app_name;
        nativeJSON.package_name = package_name;

        fs_extra.writeJSONSync(this.getNativeJSONPath(), nativeJSON);

        return true;
    }
    public check(argv: any, nativeJSON: any): boolean {

        if (argv.type === undefined) {
            if (nativeJSON && nativeJSON.type) {
                argv.type = nativeJSON.type;
            }
            else {
                argv.type = DEFAULT_TYPE;
            }
        }
        else {

            if (argv.type !== 0 && argv.type !== 1 && argv.type != 2) {
                console.log('Invalid values:');
                console.log('  Argument: type, Given: ' + argv.type + ', Choices: 0, 1, 2');
                return false;
            }
        }
        console.log('type: ' + argv.type);

        if (!argv.url) {
            if (nativeJSON && nativeJSON.url) {
                argv.url = nativeJSON.url;
            }
        }
        if (argv.type === 0 || argv.type === 1) {
            if (!argv.url || argv.url === '') {
                console.log('Missing url');
                return false;
            }
            if (argv.url === STAND_ALONE_URL) {
                console.log('Invalid url');
                return false;
            }
        }

        if (!argv.name) {
            if (nativeJSON && nativeJSON.name) {
                argv.name = nativeJSON.name;
            }
            else {
                argv.name = DEFAULT_NAME;
            }
        }

        if (!argv.app_name) {
            if (nativeJSON && nativeJSON.app_name) {
                argv.app_name = nativeJSON.app_name;
            }
            else {
                argv.app_name = DEFAULT_APP_NAME;
            }
        }
        if (!argv.package_name) {
            if (nativeJSON && nativeJSON.package_name) {
                argv.package_name = nativeJSON.package_name;
            }
            else {
                argv.package_name = DEFAULT_PACKAGE_NAME;
            }
        }
        return true;
    }
    private processUrl(config: any, type: number, url: string, appPath: string) {
        var me = this;
        //单机版
        if (type === 2) {
            if (config.localize && config.localize.replace) {
                config.localize.replace.forEach((v, i, arr) => {
                    var p = path.join(appPath, v);
                    var s = me.read(p);
                    s = s.replace(new RegExp(config.localize.src, 'g'), config.localize.des);
                    fs.writeFileSync(p, s);
                });
            }
            url = STAND_ALONE_URL;
        }

        if (url && url != "") {
            config["url"]["replace"].forEach(function (file) {
                var srcPath = path.join(appPath, file);
                var str = me.read(srcPath);
                str = str.replace(new RegExp(config["url"]["src"]), config["url"]["des"].replace("${url}", url));
                fs_extra.outputFileSync(srcPath, str);
            });
        }
        console.log('url: ' + url);
    }
    private processPackageName(config: any, package_name: string, appPath: string) {
        //替换包名
        var me = this;
        if (package_name && package_name != "") {
            config["package"]["replace"].forEach(function (file) {
                var destPath = path.join(appPath, file);
                var str = me.read(destPath);
                str = str.replace(new RegExp(config["package"]["name"], "g"), package_name);
                fs_extra.outputFileSync(destPath, str);
            });
        }
        console.log('package_name: ' + package_name);
    }
    private processDcc(config: any, folder: string, url: string, appPath: string) {
        let res_path = this.getResFolder(folder);//获取资源目录
        //资源打包路径
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
            gen_dcc.gendcc(res_path, outpath, true, false);
        }
    }
    private processDisplayName(config: any, platform: string, app_name: string, appPath: string) {

        let file = path.join(appPath, config["template"]["display"]);
        let xml = this.read(file);
        let doc = new xmldom.DOMParser().parseFromString(xml);

        if (platform === PLATFORM_IOS) {

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
                    //stringNodes[i].childNodes[0].nodeValue = app_name;
                    stringNodes[i].replaceChild(doc.createTextNode(app_name), stringNodes[i].childNodes[0]);
                    break;
                }
            }
        }
        fs_extra.outputFileSync(file, doc.toString());
        console.log('app_name: ' + app_name);
    }
    private processName(config: any, name: string, appPath: string) {
        var me = this;
        //替换文件内容中的项目名
        config["template"]["replace"].forEach(function (file) {
            var srcPath = path.join(appPath, file);
            var str = me.read(srcPath);
            str = str.replace(new RegExp(config["template"]["name"], "g"), name);
            fs_extra.outputFileSync(srcPath, str);
        });
        //替换文件名中的项目名
        config["template"]["rename"].forEach(function (file) {
            var oldPath = path.join(appPath, file);
            var newPath = path.join(appPath, file);
            var dir_name = path.dirname(newPath);
            var base_name = path.basename(newPath);
            var new_base_name = base_name.replace(config["template"]["name"], name);
            newPath = path.join(dir_name, new_base_name);
            fs.renameSync(oldPath, newPath);
        });
        console.log('name: ' + name);
    }
    public getAppPath(name: string, platform: string, nativeJSON: any): string {
        if (nativeJSON && nativeJSON.native) {
            return path.join(path.join(process.cwd(), nativeJSON.native), platform);
        }
        return path.join(path.join(process.cwd(), name), platform);
    }
    public getNativeJSONPath(): string {
        return path.join(process.cwd(), NATIVE_JSON_FILE_NAME);
    }
    private isH5Folder(folder: string): boolean {
        return fs.existsSync(path.join(folder, H5_PROJECT_CONFIG_FILE));
    }
    private getH5BinFolder(folder: string): string {
        let config = fs_extra.readJSONSync(path.join(folder, H5_PROJECT_CONFIG_FILE));
        return path.join(folder, config.resource);
    }
    private getResFolder(folder: string): string {
        if (this.isH5Folder(folder)) {
            return this.getH5BinFolder(folder);
        }
        return folder;//不是H5项目目录，直接认为是bin目录
    }
    public getAppDataPath(): string {
        let dataPath;
        if (process.platform === 'darwin') {
            let home = process.env.HOME || ("/Users/" + (process.env.NAME || process.env.LOGNAME));
            dataPath = home + "/Library/Application Support/Laya/NativeTools/template/";
        }
        else {
            var appdata = process.env.AppData || process.env.USERPROFILE + "/AppData/Roaming/";
            dataPath = appdata + "/Laya/NativeTools/template/";
        }
        if (!fs_extra.existsSync(dataPath)) {
            fs_extra.mkdirsSync(dataPath);
        }
        return dataPath;
    }
    public getSDKRootPath(): string {
        return this.getAppDataPath();
    }
    public getSDKPath(version: string): string {
        return path.join(this.getAppDataPath(), version);
    }
    public isSDKExists(version: string): boolean {
        return fs.existsSync(path.join(this.getAppDataPath(), version));
    }
    private read(path: string): string {
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
export async function getServerJSONConfig(url: string): Promise<any> {
    return new Promise<any>(function (res, rej) {
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                res(JSON.parse(body));
            }
            else {
                console.log('Error: ' + response.statusCode + ' download ' + url + ' error.');
                res(null);
            }
        })
    });
}
export async function download(url: string, file: string, callBack: () => void): Promise<boolean> {
    return new Promise<any>(function (res, rej) {
        let stream = fs.createWriteStream(file);
        let layaresponse;

        var bar;
        request(url).on('response', function (response) {
            layaresponse = response;
            var len = parseInt(layaresponse.headers['content-length'], 10);
            bar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
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
                console.log('Error: ' + layaresponse.statusCode + ' download ' + url + ' error.');
                res(false);
            }
        }).on('end', function () {
            console.log('\n');
        });
    })
}
export async function unzip(unzipurl: string, filepath: string, callbackHandler) {
    console.log('unzip ' + unzipurl + ' to ' + filepath + ' ...');
    if (process.platform === 'darwin') {
        var cmd = "unzip -o " + unzipurl + " -d " + filepath;
        child_process.execSync(cmd);
    }
    else {
        var unzipexepath = path.join(__dirname, '..', 'tools', 'unzip.exe');
        var cmd = unzipexepath + " -o " + unzipurl + " -d " + filepath;
        child_process.execSync(cmd);
    }
}