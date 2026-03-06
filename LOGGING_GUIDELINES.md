# 日志编码规范 / Logging Guidelines

## 概述 / Overview

本文档定义了 Canbox 项目的日志编码规范。所有模块必须使用统一的 `logger` 模块进行日志记录，禁止直接使用 `console.*` 方法。

This document defines the logging coding standards for the Canbox project. All modules must use the unified `logger` module for logging, and direct use of `console.*` methods is prohibited.

---

## 基本要求 / Basic Requirements

### 1. 使用 logger 模块 / Use Logger Module

所有模块必须引用并使用 `logger` 模块：
All modules must import and use the `logger` module:

```javascript
const logger = require('@modules/utils/logger');
```

禁止使用：
Prohibited:
- `console.log()`
- `console.error()`
- `console.warn()`
- `console.info()`
- `console.debug()`

### 2. 日志级别 / Log Levels

logger 模块提供四个级别，必须根据场景选择合适的级别：
The logger module provides four levels, choose the appropriate level based on the scenario:

| 级别 | 使用场景 | 示例 |
|------|----------|------|
| **debug** | 详细的调试信息，通常在生产环境禁用 / Detailed debug info, usually disabled in production | 变量值、函数参数、执行流程 |
| **info** | 一般信息，记录系统正常运行的关键事件 / General info, key events of normal operation | 应用启动、用户操作、配置加载 |
| **warn** | 警告信息，可能的问题但不影响功能 / Warnings, potential issues but not blocking | 废弃 API 使用、性能降级 |
| **error** | 错误信息，影响功能但程序继续运行 / Errors, affecting function but program continues | 文件读取失败、网络超时 |

### 3. 中英文双语 / Bilingual Messages

日志消息必须包含中英文双语，方便不同语言背景的开发者理解：
Log messages must be bilingual for developers with different language backgrounds:

```javascript
logger.info('应用已启动 / Application started');
logger.error('文件读取失败 / Failed to read file: {}', filePath);
```

### 4. 上下文信息 / Context Information

日志消息必须包含足够的上下文信息，避免模糊的消息：
Log messages must contain sufficient context information, avoid vague messages:

```javascript
// 好的实践 / Good practice
logger.error('移动文件失败 / Failed to move file: {}, error: {}', fileName, error.message);

// 不好的实践 / Bad practice
logger.error('Error occurred');
```

---

## 代码示例 / Code Examples

### 基本使用 / Basic Usage

```javascript
const logger = require('@modules/utils/logger');

// Debug - 调试信息
logger.debug('开始处理请求 / Starting request processing: {}', requestId);

// Info - 正常事件
logger.info('应用已启动 / Application started, version: {}', version);
logger.info('用户登录 / User logged in: {}', userId);

// Warn - 警告信息
logger.warn('使用默认配置 / Using default config: key={}, value={}', key, defaultValue);
logger.warn('API 即将废弃 / API will be deprecated: {}', apiName);

// Error - 错误信息
logger.error('文件读取失败 / Failed to read file: {}, error: {}', filePath, error.message);
logger.error('数据库连接失败 / Database connection failed: {}', error.stack);
```

### 占位符格式化 / Placeholder Formatting

logger 使用 `{}` 作为占位符，可以传递多个参数：
The logger uses `{}` as placeholders, multiple parameters can be passed:

```javascript
logger.info('用户 {} 于 {} 执行了 {} 操作 / User {} performed {} action at {}', 
    userId, actionName, timestamp);

logger.error('文件 {} 读取失败，原因：{} / Failed to read file {}, reason: {}', 
    fileName, error.message);
```

---

## 最佳实践 / Best Practices

### 1. 选择合适的日志级别 / Choose Appropriate Log Level

```javascript
// ✅ 正确 / Correct
logger.debug('处理变量值 / Processing variable: {}', variable); // 调试信息
logger.info('配置加载完成 / Config loaded successfully');      // 重要事件
logger.warn('连接超时，使用缓存 / Connection timeout, using cache'); // 警告
logger.error('文件不存在 / File not found: {}', filePath);     // 错误

// ❌ 错误 / Wrong
logger.info('文件不存在 / File not found: {}', filePath);     // 应该用 error
logger.error('配置加载完成 / Config loaded successfully');      // 应该用 info
```

### 2. 包含足够的上下文 / Include Sufficient Context

```javascript
// ✅ 正确 / Correct
logger.error('仓库克隆失败 / Repo clone failed: url={}, error={}', repoUrl, error.message);

// ❌ 错误 / Wrong
logger.error('Clone failed'); // 太模糊 / Too vague
logger.error('Error: ' + error.message); // 缺少关键信息 / Missing key info
```

### 3. 使用中英文双语 / Use Bilingual Messages

```javascript
// ✅ 正确 / Correct
logger.info('应用已启动 / Application started');

// ❌ 错误 / Wrong
logger.info('应用已启动'); // 只有中文
logger.info('Application started'); // 只有英文
```

### 4. 避免日志污染 / Avoid Log Pollution

```javascript
// ❌ 避免在循环中记录大量日志
for (let i = 0; i < 10000; i++) {
    logger.debug('Processing item: {}', i); // 会产生大量日志
}

// ✅ 记录汇总信息
logger.debug('开始处理 {} 个项目 / Starting to process {} items', total);
for (let i = 0; i < 10000; i++) {
    // process item
}
logger.debug('处理完成 / Processing completed');
```

---

## 常见问题 / FAQ

### Q1: 什么时候使用 debug 级别？/ When to use debug level?

**A**: Debug 级别用于详细的调试信息，通常只在开发环境使用。生产环境可以将日志级别设置为 info 或 warn，从而禁用 debug 日志。

Debug level is for detailed debug information, typically used only in development. Production environments can set the log level to info or warn to disable debug logs.

### Q2: 错误应该抛出异常还是只记录日志？/ Should errors be thrown or just logged?

**A**: 取决于场景：
- 如果错误可以被恢复（例如重试、使用默认值），只记录日志即可
- 如果错误无法恢复且影响功能，应该抛出异常并在调用方记录日志

Depends on the scenario:
- If the error can be recovered (e.g., retry, use default), just log it
- If the error cannot be recovered and affects functionality, throw an exception and log in the caller

### Q3: 日志文件在哪里？/ Where are the log files?

**A**: 日志文件位于用户数据目录的 `logs/` 文件夹：
- `app.log`: 一般应用日志
- `monitor.log`: 监控相关日志

Log files are in the `logs/` folder of the user data directory:
- `app.log`: General application logs
- `monitor.log`: Monitor-related logs

### Q4: 可以在代码中临时使用 console.log 吗？/ Can I use console.log temporarily in code?

**A**: 不推荐。如果确实需要临时调试，请：
- 使用 `logger.debug()` 替代 `console.log()`
- 在提交前清理临时日志，或使用注释标记 `// DEBUG:`
- 考虑使用开发模式开关

Not recommended. If you really need temporary debugging:
- Use `logger.debug()` instead of `console.log()`
- Clean up temporary logs before committing, or mark with `// DEBUG:`
- Consider using a development mode switch

### Q5: 如何记录对象的详细信息？/ How to log detailed object information?

**A**: 使用 `JSON.stringify()` 将对象转换为字符串：
Use `JSON.stringify()` to convert objects to strings:

```javascript
const config = { host: 'localhost', port: 3000 };
logger.debug('配置详情 / Config details: {}', JSON.stringify(config));
```

### Q6: 日志文件会一直增长吗？/ Will log files grow indefinitely?

**A**: 不会。logger 模块配置了文件滚动策略：
- 单个日志文件最大 10MB
- 保留最近 5 个备份文件
- 总日志量约 50MB

No. The logger module is configured with a file rolling policy:
- Maximum 10MB per log file
- Keep the most recent 5 backup files
- Total log size about 50MB

---

## 代码审查清单 / Code Review Checklist

在提交代码时，请检查以下事项：
When submitting code, please check the following:

- [ ] 是否使用了 `logger` 模块而不是 `console.*`？
- [ ] 日志级别选择是否合适（debug/info/warn/error）？
- [ ] 日志消息是否包含中英文双语？
- [ ] 日志消息是否包含足够的上下文信息？
- [ ] 是否有临时调试日志需要清理？
- [ ] 日志是否可能过于频繁（例如在循环中）？
- [ ] 错误日志是否包含详细的错误信息？

---

## 参考资料 / References

- `modules/utils/logger.js` - logger 模块实现
- OpenSpec 变更: `logging-unification` - 日志系统统一化项目
