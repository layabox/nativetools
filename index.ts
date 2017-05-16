
import { handler } from './createAppCommand';

module.exports = {
    create_app: (folder: string, sdk: string, version: string, platform: string, type: number, url: string, name: string, app_name: string, package_name: string, path: string) => {
        var args = {
            folder: folder,
            sdk: sdk,
            version: version,
            platform: platform,
            type: type,
            url: url,
            name: name,
            app_name: app_name,
            package_name: package_name,
            path: path
        };
        handler(args);
    },
    refreshres: (platform: string, path: string, url: string) => {
        var args = {
            platform: platform,
            path: path,
            url: url
        };
        handler(args);
    },
    removeres: (path: string) => {
        var args = {
            path: path
        };
        handler(args);
    },
    listversions: () => {
    }
}