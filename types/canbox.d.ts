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
                 * 发送通知
                 * @param options - 通知配置
                 * @returns Promise<void>
                 */
                notification: (options: any) => Promise<void>;
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
                openFile: (options: any) => Promise<any>;

                /**
                 * 保存文件对话框
                 * @param options - 对话框配置
                 * @returns Promise<any>
                 */
                saveFile: (options: any) => Promise<any>;
            };

            /**
             * 本地存储模块
             */
            store: {
                /**
                 * 获取存储的值
                 * @param key - 存储的键
                 * @returns Promise<any>
                 */
                get: (key: string) => Promise<any>;

                /**
                 * 设置存储的值
                 * @param key - 存储的键
                 * @param value - 存储的值
                 * @returns Promise<void>
                 */
                set: (key: string, value: any) => Promise<void>;

                /**
                 * 删除存储的值
                 * @param key - 存储的键
                 * @returns Promise<void>
                 */
                delete: (key: string) => Promise<void>;

                /**
                 * 清空存储
                 * @returns Promise<void>
                 */
                clear: () => Promise<void>;
            };
        };
    }

    // 定义全局变量 canbox
    const canbox: Window['canbox'];
}