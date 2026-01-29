# CanBox开发

1. fork 代码
2. 提交修改
3. 提交pr
4. 等待合并 😁

## 项目结构

```
canbox/
├── dist/                  # 构建输出目录
├── modules/               # 核心模块
├── public/                # 静态资源
├── src/                   # 前端源码
├── main.js                # 主进程入口
├── ipcHandlers.js         # IPC 通信处理
└── package.json           # 项目配置
```

## 调试

- 启动开发服务器：
  ```bash
  npm run dev
  ```
- 调试主进程：
  ```bash
  npm run start
  ```

## 编译打包

```bash
# 1 克隆项目
git clone https://github.com/lizl6/canbox.git

# 2 安装依赖：
npm install

# 3 vite编译
npm run build

# 4 打包
npm run build-dist:linux  # Linux包需要在linux环境下
npm run build-dist:win    # Windows包需要在windows下，我是用的win11
```

## CanBox API提示

1. 安装 `typescript` ： `npm i -D typescript`
2. 在项目根目录下创建目录  `types `，将 `canbox.d.ts `放到 `types` 目录中
3. 在项目根目录下创建 `tsconfig.json` 或 `jsconfig.json` 文件

tsconfig.json 文件内容示例如下：

```json
{
    "compilerOptions": {
        "target": "es6",
        "module": "commonjs",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "typeRoots": ["./types", "./node_modules/@types"]
    },
    "include": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    "exclude": ["node_modules"]
}
```

如果你的项目使用 `javascript`，`tsconfig.json` 文件内容如下：

```json
{
    "compilerOptions": {
        "allowJs": true,
        "checkJs": false,
        "noEmit": true,   // 仅进行类型检查，不生成输出文件（JS项目无需编译）
        "strict": false,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "maxNodeModuleJsDepth": 0,
        "target": "es6",
        "module": "commonjs",
        "forceConsistentCasingInFileNames": true,
        "typeRoots": ["./types", "./node_modules/@types"]
    },
    "include": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    "exclude": ["node_modules"]
}
```

或者是使用使用 `jsconfig.json` 文件示例内容如下：

```json
{
    "compilerOptions": {
        "checkJs": false,
        "strict": false,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "maxNodeModuleJsDepth": 0,
        "target": "es6",
        "module": "commonjs",
        "forceConsistentCasingInFileNames": true,
        "typeRoots": ["./types", "./node_modules/@types"]
    },
    "include": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    "exclude": ["node_modules"]
}
```


# repos

canbox没有中心服务器，所有能使用的app都靠交流传播😆

repos文件就是app信息的集合，这是一个json格式的描述文件：

```json
{
    "title": "",
    "version": "",
    "repos": [
        {
            "app": "",
            "description": "",
            "history": "",
            "release": ""
        }
    ]
}
```

# electron-store

这里罗列出了canbox中所有使用electron-store保存的数据

你可以在electron的userData目录下找到它们：`app.getPath('userData'), 'Users')`

## apps.json

```json
{
    "default": {
        "3a6f487d7f9f4fae86dcfbc3dde401a2": {
            "id": "com.gitee.lizl6.cb-jsonbox",
            "name": "jsonbox",
            "version": "0.0.1",
            "description": "JsonBox - 跨平台的 JSON 格式化工具",
            "author": "lizl6",
            "logo": "logo.png"
        },
        "885f615f9c374c96a022294950fed558": {
            "id": "com.gitee.lizl6.cb-passgen",
            "name": "passgen",
            "version": "0.0.2",
            "description": "PassGen - 密码生成器",
            "author": "lizl6",
            "logo": "logo.png",
            "sourceTag": "import",
            "importTime": "2025-09-02 10:28:12"
        }
    }
}
```

| 字段        | 类型   | 释义                                                |
| ----------- | ------ | --------------------------------------------------- |
| uid         | object | 应用唯一标识，由canbox生成，用于区分不同的应用      |
| id          | string | 应用id，形如：com.github.username.appname           |
| name        |        | 应用名称                                            |
| version     |        | 应用版本                                            |
| description |        | 应用描述                                            |
| author      |        | 应用作者                                            |
| logo        |        | 应用logo                                            |
| sourceTag   |        | 应用来源标记，用于区分应用来源：`import`、`git` |

## appsDev.json

```json
{
    "default": [
        {
            "id": "d80c120e35ec4216a7428241b9ac294a",
            "path": "/depot/cargo/cb-jsonbox/",
            "name": "jsonbox"
        },
        {
            "id": "f2dff38866914ad0a81c49504f5da266",
            "path": "/depot/cargo/canbox-demo/",
            "name": "demo"
        }
    ]
}
```

## repos.json

```json
{
    "default": {
        "3a6f487d7f9f4fae86dcfbc3dde401a2": {
            "id": "com.gitee.lizl6.cb-jsonbox",
            "name": "jsonbox",
            "repo": "https://gitee.com/lizl6/cb-jsonbox",
            "branch": "master",
            "author": "lizl6",
            "version": "0.0.2",
            "description": "JsonBox - 跨平台的 JSON 格式化工具",
            "logo": "/home/lizl6/.config/canbox/Users/repos/3a6f487d7f9f4fae86dcfbc3dde401a2/logo.png",
            "files": {
                "app": {
                    "json": "39f57b38922a67772fc8b1535b3f3a678f95854f7e5b0791fde9caab8009be8a"
                },
                "README": {
                    "md": "b98eaa8cdea3f6325a13764d259c80cb4996a7bc0adaab228dbd68d2e275c51d"
                },
                "HISTORY": {
                    "md": "a3c15b800afcc01ff4d9b8e8bc700957b84cea81"
                }
            },
            "createTime": "2025-08-09 11:31:50"
            "downloaded": true,
            "downloadedTime": "2025-08-29 14:12:33",
            "toUpdate": true
        }
    }
}
```

| 字段           | 释义                                               |
| -------------- | -------------------------------------------------- |
| id             | 仓库唯一标识，由仓库的作者和仓库名称组成           |
| name           | 仓库名称                                           |
| repo           | 仓库地址，一段git仓库url，务必注意仓库一定要可访问 |
| branch         | 仓库分支，默认 main                                |
| author         | 仓库作者                                           |
| version        | 仓库版本                                           |
| description    | 仓库描述                                           |
| logo           | 仓库logo                                           |
| files          | 仓库文件                                           |
| createTime     | 仓库创建时间，yyyy-MM-dd HH:mm:ss                  |
| downloaded     | `boolean` ，是否已经下载                         |
| downloadedTime | 下载时间                                           |
| toUpdate       | `boolean` ，是否可更新                           |
