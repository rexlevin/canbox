// 定义 window.canbox 的类型
export {}; // 确保文件被识别为模块
declare global {
    interface Window {
        canbox: {
            /**
             * 钩子对象
             */
            hooks: Record<string, any>;

            /**
             * 示例方法
             */
            hello: () => void;

            /**
             * 数据库操作模块
             */
            db: {
                /**
                 * 新增或更新文档
                 * @param param - 文档对象，必须包含 `_id` 字段
                 * @returns Promise<any> - 返回操作结果，成功时返回文档数据，失败时返回错误信息
                 */
                put: (param: { _id: string; [key: string]: any }) => Promise<any>;

                /**
                 * 批量新增或更新文档
                 * @param docs - 文档数组，每个文档必须包含 `_id` 字段
                 * @returns Promise<Array<any>> - 返回操作结果数组，成功时返回文档数据，失败时返回错误信息
                 */
                bulkDocs: (docs: Array<{ _id: string; [key: string]: any }>) => Promise<Array<any>>;

                /**
                 * 获取文档
                 * @param param - 查询参数，必须包含 `_id` 字段
                 * @returns Promise<any> - 返回查询结果，成功时返回文档数据，失败时返回错误信息
                 */
                get: (param: { _id: string }) => Promise<any>;

                /**
                 * 同步获取文档
                 * @param param - 查询参数，必须包含 `_id` 字段
                 * @returns any|null - 返回查询结果，成功时返回文档数据，失败时返回 null
                 */
                getSync: (param: { _id: string }) => any | null;

                /**
                 * 获取所有文档
                 * @param options - 查询选项
                 * @returns Promise<any> - 返回查询结果，包含 total_rows、offset、rows
                 */
                allDocs: (options?: { include_docs?: boolean; limit?: number; descending?: boolean; startkey?: string; endkey?: string; skip?: number }) => Promise<any>;

                /**
                 * 查询文档
                 * @param query - 查询条件，支持 Mango 查询语法
                 * @returns Promise<any> - 返回查询结果，成功时返回包含 docs 数组的结果对象
                 */
                find: (query: { selector: any; sort?: any; limit?: number; fields?: string[] }) => Promise<any>;

                /**
                 * 创建索引
                 * @param index - 索引配置对象
                 * @returns Promise<any> - 返回创建结果，成功时返回索引信息
                 */
                createIndex: (index: { index: { fields: any } }) => Promise<any>;

                /**
                 * 删除文档
                 * @param param - 删除参数，必须包含 `_id` 字段
                 * @returns Promise<any> - 返回操作结果，成功时返回删除的文档数据，失败时返回错误信息
                 */
                remove: (param: { _id: string }) => Promise<any>;
            };

            /**
             * 窗口操作模块
             */
            win: {
                /**
                 * 创建窗口
                 * @param options - 窗口配置
                 * @param params - 其他参数
                 * @returns Promise<any>
                 */
                createWindow: (options: any, params: any) => Promise<any>;

                /**
                 * 发出通知
                 * @param options - 通知配置
                 * @param options.title - 通知标题
                 * @param options.body - 通知内容
                 * @returns Promise<void>
                 */
                notification: (options: { title: string; body: string }) => Promise<void>;
            };

            /**
             * 提权执行模块
             */
            sudo: {
                /**
                 * 执行需要提权的命令
                 * @param options - 提权选项
                 * @returns Promise<any> - 返回执行结果
                 */
                exec: (options: { command: string; name: string }) => Promise<{ stdout: string; stderr: string }>;
            };

            /**
             * 对话框模块
             */
            dialog: {
                /**
                 * 打开文件对话框
                 * @param options - 对话框配置
                 * @returns Promise<any>
                 */
                showOpenDialog: (options: any) => Promise<any>;

                /**
                 * 打开保存对话框
                 * @param options - 对话框配置
                 * @returns Promise<any>
                 */
                showSaveDialog: (options: any) => Promise<any>;

                /**
                 * 打开消息对话框
                 * @param options - 对话框配置
                 * @returns Promise<any>
                 */
                showMessageBox: (options: any) => Promise<any>;
            };

            /**
             * 本地存储模块
             */
            store: {
                /**
                 * 获取存储的值
                 * @param name - 存储的名称
                 * @param key - 存储的键
                 * @returns Promise<any>
                 */
                get: (name: string, key: string) => Promise<any>;

                /**
                 * 设置存储的值
                 * @param name - 存储的名称
                 * @param key - 存储的键
                 * @param value - 存储的值
                 * @returns Promise<void>
                 */
                set: (name: string, key: string, value: any) => Promise<void>;

                /**
                 * 删除存储的值
                 * @param name - 存储的名称
                 * @param key - 存储的键
                 * @returns Promise<void>
                 */
                delete: (name: string, key: string) => Promise<void>;

                /**
                 * 清空存储
                 * @param name - 存储的名称
                 * @returns Promise<void>
                 */
                clear: (name: string) => Promise<void>;
            };

            /**
             * 注册窗口关闭时的回调函数
             * @param callback - 窗口关闭时执行的回调函数
             */
            registerCloseCallback: (callback: () => void) => void;
        };
    }

    // 定义全局变量 canbox
    const canbox: Window['canbox'];
}