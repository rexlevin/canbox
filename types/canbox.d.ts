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
                 * 插入数据
                 * @param param - 插入的数据
                 * @returns Promise<any>
                 */
                put: (param: any) => Promise<any>;

                /**
                 * 批量插入数据
                 * @param docs - 批量插入的数据
                 * @returns Promise<any>
                 */
                bulkDocs: (docs: any[]) => Promise<any>;

                /**
                 * 查询数据
                 * @param param - 查询条件
                 * @returns Promise<any>
                 */
                get: (param: any) => Promise<any>;

                /**
                 * 同步查询数据
                 * @param param - 查询条件
                 * @returns any
                 */
                getSync: (param: any) => any;

                /**
                 * 删除数据
                 * @param param - 删除条件
                 * @returns Promise<any>
                 */
                remove: (param: any) => Promise<any>;
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