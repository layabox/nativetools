import * as fs from 'fs';
import * as path from 'path';
import gen_dcc = require('layadcc');
import * as request from 'request';
import child_process = require('child_process');
import * as xmldom from 'xmldom';
import * as ProgressBar from 'progress';
import { BaseTools, OhosTools } from './Ohos';

export const STAND_ALONE_URL: string = 'http://stand.alone.version/index.html';
export const VERSION_CONFIG_URL: string = 'https://layabox.com/layaplayer/layanativeRes/versionconfig.json';
export const DEFAULT_NAME: string = 'LayaBox';
export const DEFAULT_APP_NAME: string = 'LayaBox';
export const DEFAULT_PACKAGE_NAME: string = 'com.layabox.game';
export const DEFAULT_TYPE: number = 0;
export const NATIVE_JSON_FILE_NAME: string = 'native.json';
export const PLATFORM_ALL: string = 'all';
export const PLATFORM_IOS: string = 'ios';
export const PLATFORM_IOS_WKWEBVIEW: string = 'wkwebview';
export const PLATFORM_ANDROID_ECLIPSE: string = 'android_eclipse';
export const PLATFORM_ANDROID_STUDIO: string = 'android_studio';
export const PLATFORM_OHOS: string = 'ohos';
export const H5_PROJECT_CONFIG_FILE: string = 'config.json';
export const DEMENSION_2D: string = '2D';
export const DEMENSION_3D: string = '3D';
export const WEBGLRENDERMODEJS: string = 'window.ConchRenderType=6;';

function mkdirsSync(dirname:string, mode?:number):boolean{
    if (fs.existsSync(dirname)){
        return true;
    }
    else
    {
        if (mkdirsSync(path.dirname(dirname), mode)){
            fs.mkdirSync(dirname, mode);
            return true;
        }
    }
    return false;
}


function copyFileSync( source, target ) {
    var targetFile = target;
    //if target is a directory a new file with the same name will be created
    if ( fs.existsSync( target ) ) {
        if ( fs.lstatSync( target ).isDirectory() ) {
            targetFile = path.join( target, path.basename( source ) );
        }
    }
    fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync( source:string, target:string ) {
    var files = [];
    //check if folder needs to be created or integrated
    var targetFolder = path.join( target, path.basename( source ) );
    if ( !fs.existsSync( targetFolder ) ) {
        mkdirsSync( targetFolder );
    }

    //copy
    if ( fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                copyFileSync( curSource, targetFolder );
            }
        } );
    }
}

function rmdirSync(dir:string){
    function iterator(url:string,dirs:string[]){
        var stat = fs.statSync(url);
        if(stat.isDirectory()){
            dirs.unshift(url);//收集目录
            inner(url,dirs);
        }else if(stat.isFile()){
            fs.unlinkSync(url);//直接删除文件
        }
    }
    function inner(path,dirs){
        var arr = fs.readdirSync(path);
        for(var i = 0, el ; el = arr[i++];){
            iterator(path+"/"+el,dirs);
        }
    }
    var dirs:string[] = [];
    try{
        iterator(dir,dirs);
        dirs.forEach((v)=>{fs.rmdirSync(v)});
    }catch(e){//如果文件或目录本来就不存在，fs.statSync会报错，不过我们还是当成没有异常发生
    }
};

export class AppCommand {
    tools:Map<string,BaseTools> = new Map<string,BaseTools>();
    constructor() {
        this.tools.set(PLATFORM_OHOS, new OhosTools());
    }
    public excuteRefreshRes(folder: string, url: string, appPath: string): boolean {
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
        //console.log('REPLACE readjson1 '+configPath);
        let config = JSON.parse( fs.readFileSync(configPath,'utf8')); 
        if (!config) {
            console.log('错误: 读取文件 ' + configPath + ' 失败');
            return false;
        }

        if (fs.existsSync(path.join(appPath, config["res"]["path"], 'stand.alone.version'))) {
            if (url === '' || url === undefined) {
                url = STAND_ALONE_URL;
                console.log('您正在打包单机版...');
            }
            else {
                if (url === STAND_ALONE_URL) {
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
                if (url === STAND_ALONE_URL) {
                    console.log('您正在从网络版地址切换到单机版,请注意修改相关代码...');
                }
                else {
                    console.log('您正在打包网络版...');
                }
            }
        }
        console.log("REPLACE rmdir1 "+path.join(appPath, config["res"]["path"]));
        rmdirSync(path.join(appPath, config["res"]["path"]));
        //fs_extra.removeSync(path.join(appPath, config["res"]["path"]));
        this.processDcc(config, folder, url, appPath);
        return true;
    }
    public excuteRemoveRes(appPath: string): boolean {

        let configPath = path.join(appPath, "config.json");
        if (!fs.existsSync(appPath)) {
            console.log("警告: 找不到目录 " + appPath);
            return false;
        }
        if (!fs.existsSync(configPath)) {
            console.log('错误: 找不到文件 ' + configPath);
            return false;
        }
        console.log('REPLACE readjson2 '+ configPath);
        let config = JSON.parse( fs.readFileSync(configPath, 'utf8'));
        if (!config) {
            console.log('错误: 读取文件 ' + configPath + ' 失败');
            return false;
        }

        let dir = path.join(appPath, config["res"]["path"]);
        console.log('正在删除 ' + dir + ' ...');

        console.log('REPLACE emptydir1 '+dir);
        rmdirSync(dir);
        mkdirsSync(dir);
        //fs_extra.emptyDirSync(dir);

        return true;
    }
    public excuteCreateApp(demension:string, folder: string, sdk: string, platform: string, type: number, url: string, name: string, app_name: string, package_name: string, outputPath: string): boolean {
        if(platform === PLATFORM_OHOS){
            return this.tools.get(platform).excuteCreateApp(demension, folder, sdk, platform, type, url, name, app_name, package_name, outputPath);
        }
        if (type > 0 && !fs.existsSync(folder)) {
            console.log('错误: 找不到目录 ' + folder);
            return false;
        }

        var me = this;

        let appPath = AppCommand.getAppPath(AppCommand.getNativePath(path.join(outputPath, name)), platform);
        let absCfgPath = path.join(path.join(sdk, platform), "config.json");
        let relCfgPath = path.join(path.join(process.cwd(), sdk, platform), "config.json");
        let configPath = path.isAbsolute(sdk) ?  absCfgPath : relCfgPath;
        if (!fs.existsSync(configPath)) {
            console.log('错误: 找不到文件 ' + configPath + '。不是有效的SDK目录');
            return false;
        }

        console.log('REPLACE  readjson2', configPath);
        let config = JSON.parse( fs.readFileSync(configPath,'utf8'));
        if (!config) {
            console.log('错误: 读取文件 ' + configPath + ' 失败');
            return false;
        }

        if (fs.existsSync(appPath)) {
            console.log("错误： 项目 " + appPath + " 已经存在");
            return false;
        }
        
        if (demension === '3D') {
            if (!config.version) {
                console.log("错误：支持3D需要版本至少为1.0");
                return false;
            }
        }

        if (config.version) {
            console.log("SDK version " + config.version);
        }
        
        let srcPath = path.join(sdk, platform);
        console.log('REPLACE copydir1 ', srcPath, path.dirname(appPath));
        copyFolderRecursiveSync(srcPath, path.dirname(appPath));
        //fs_extra.copySync(path.join(sdk, platform), appPath);

        if (type === 2) {
            url = STAND_ALONE_URL;
        }

        if (demension === '3D') {
            if (config.renderType) {
                var configJsPath = path.join(appPath, config.renderType);
                var str = this.read(configJsPath);
                str += "\n";
                str += WEBGLRENDERMODEJS;
                fs.writeFileSync(configJsPath,str);
            }
        }
        this.processUrl(config, type, url, appPath);
        this.processPackageName(config, package_name, appPath);
        if (type > 0) {
            this.processDcc(config, folder, url, appPath);
        }
        this.processDisplayName(config, platform, app_name, appPath);
        this.processName(config, name, appPath);

        let newConfigPath = path.join(appPath, "config.json");
        config["res"]["path"] = config["res"]["path"].replace(config["template"]["name"], name);
        console.log('REPLACE  writejson3 ', newConfigPath);
        var p1 = path.dirname(newConfigPath);
        mkdirsSync(p1);
        fs.writeFileSync( newConfigPath, JSON.stringify(config));

        let nativeJSONPath = AppCommand.getNativeJSONPath(path.join(outputPath, name));
        let nativeJSON = { h5: folder ? folder : ''};
        console.log('REPLACE writeJSON4', nativeJSONPath);
        p1 = path.dirname(nativeJSONPath);
        mkdirsSync(p1);
        fs.writeFileSync( nativeJSONPath, JSON.stringify(nativeJSON));

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
                    var p1 = path.dirname(p);
                    mkdirsSync(p1);
                    fs.writeFileSync(p, s);
                });
            }
        }
        if (url && url != "") {
            config["url"]["replace"].forEach(function (file) {
                var srcPath = path.join(appPath, file);
                var str = me.read(srcPath);
                str = str.replace(new RegExp(config["url"]["src"]), config["url"]["des"].replace("${url}", url));
                console.log('REPLACE outputfile5', srcPath);
                var p = path.dirname(srcPath);
                mkdirsSync(p);
                fs.writeFileSync(srcPath,str);
                //fs_extra.outputFileSync(srcPath, str);
            });
        }
    }
    private processPackageName(config: any, package_name: string, appPath: string) {
        //替换包名
        var me = this;
        if (package_name && package_name != "") {
            config["package"]["replace"].forEach(function (file) {
                var destPath = path.join(appPath, file);
                var str = me.read(destPath);
                str = str.replace(new RegExp(config["package"]["name"], "g"), package_name);
                console.log('REPLACE outfile6', destPath);
                var p = path.dirname(destPath);
                mkdirsSync(p);
                fs.writeFileSync(destPath, str);
                //fs_extra.outputFileSync(destPath, str);
            });
        }
    }
    private processDcc(config: any, folder: string, url: string, appPath: string) {
        let res_path = folder;//获取资源目录
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
                //console.log('REPLACE mkdir7', outpath);
                mkdirsSync(outpath);
                //fs_extra.mkdirsSync(outpath);
            }
            console.log('正在执行LayaDcc...');
            gen_dcc.gendcc(res_path, outpath, true, false);

        }
    }
    private processDisplayName(config: any, platform: string, app_name: string, appPath: string) {
        let file = path.join(appPath, config["template"]["display"]);
        let xml = this.read(file);
        let doc = new xmldom.DOMParser().parseFromString(xml);

        if (platform === PLATFORM_IOS || platform === PLATFORM_IOS_WKWEBVIEW) {

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
        console.log('REPLACE  outputfile8', file);
        var p1 = path.dirname(file);
        mkdirsSync(p1);        
        fs.writeFileSync(file, doc.toString());
        //fs_extra.outputFileSync(file, doc.toString());
    }
    private processName(config: any, name: string, appPath: string) {
        var me = this;
        //替换文件内容中的项目名
        config["template"]["replace"].forEach(function (file) {
            var srcPath = path.join(appPath, file);
            var str = me.read(srcPath);
            str = str.replace(new RegExp(config["template"]["name"], "g"), name);
            console.log('REPLACE outputfile9 '+srcPath);
            var p = path.dirname(srcPath);
            mkdirsSync(p);
            fs.writeFileSync(srcPath,str);
            //fs_extra.outputFileSync(srcPath, str);
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
    }
    static getAppPath(dir: string, platform: string): string {
        if (path.isAbsolute(dir))
            return path.join(dir, platform);
        return path.join(process.cwd(), dir, platform);
    }
    static getNativeJSONPath(dir: string): string {
        return path.join(this.getNativePath(dir), NATIVE_JSON_FILE_NAME);
    }
    static getNativePath(dir: string): string {
        if (path.isAbsolute(dir))
            return dir;
        return path.join(process.cwd(), dir);
    }
    static getAppDataPath(): string {
        let dataPath;
        if (process.platform === 'darwin') {
            let home = process.env.HOME || ("/Users/" + (process.env.NAME || process.env.LOGNAME));
            dataPath = home + "/Library/Application Support/Laya/NativeTools/template/";
        }
        else {
            var appdata = process.env.AppData || process.env.USERPROFILE + "/AppData/Roaming/";
            dataPath = appdata + "/Laya/layanative/template/";
        }
        if( !fs.existsSync(dataPath)){
        //if (!fs_extra.existsSync(dataPath)) {
            //fs_extra.mkdirsSync(dataPath);
            console.log('REPLACE: mkdir11 '+dataPath);
            mkdirsSync(dataPath);
        }
        return dataPath;
    }
    static getSDKRootPath(): string {
        return AppCommand.getAppDataPath();
    }
    static getSDKPath(version: string): string {
        return path.join(AppCommand.getAppDataPath(), version);
    }
    static isSDKExists(version: string): boolean {
        return fs.existsSync(path.join(AppCommand.getAppDataPath(), version));
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
export async function getServerJSONConfig(url?: string): Promise<any> {
    if(!url) url = exports.VERSION_CONFIG_URL + '?' + Math.random();
    return new Promise<any>(function (res, rej) {
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                res(JSON.parse(body));
            }
            else {
                console.log('错误: 网络连接异常，下载 ' + url + '失败');
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
    })
}
export function unzip(unzipurl: string, filepath: string, callbackHandler) {
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


export function unzipAsync(unzipurl: string, filepath: string, cb:(error:Error, stdout:string, stderror:string)=>void) {
    console.log('正在解压 ' + unzipurl + ' 到 ' + filepath + ' ...');
    //-q 的作用是不要打印具体过程，否则会导致exec出错
    if (process.platform === 'darwin') {
        var cmd = "unzip -oq \"" + unzipurl + "\" -d \"" + filepath + "\"";
        child_process.exec(cmd,{maxBuffer:1024*1024},cb);
    }
    else {
        var unzipexepath = path.join(__dirname, '..', 'tools', 'unzip.exe');
        var cmd = "\"" + unzipexepath + "\" -oq \"" + unzipurl + "\" -d \"" + filepath + "\"";
        child_process.exec(cmd,{maxBuffer:1024*1024},cb);
    }
}