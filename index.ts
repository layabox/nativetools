
import {handler} from './createAppCommand';

module.exports = {
    create_app:(folder:string,sdk:string,version:string,platform:string,type:number,url:string,name:string,app_name:string,package_name:string,outputPath:string)=>{
        var args ={
            folder:folder,
            sdk:sdk,
            version:version,
            platform:platform,
            type:type,
            url:url,
            name:name,
            app_name:app_name,
            package_name:package_name,
            outputPath:outputPath
        };
        handler(args);
    },
    refresh_app:()=>{

    },
    list_versions:()=>{
    }
}