# store

Uses electron-store for data storage

**Storage location**: `{userData}/Users/data/{appId}/store/{name}.json`

## canbox.store.get(name, key)

Retrieve stored value.

- Parameters
  1. `string` name - Storage name, corresponds to different `.json` files
  2. `string` key - Storage key
- Returns `any` - Stored value

```javascript
canbox.store.get('config', 'theme')
    .then(value => {
        console.info('Theme settings:', value);
    })
    .catch(error => {
        console.error('Failed to get:', error);
    });
```

## canbox.store.set(name, key, value)

Set stored value.

- Parameters
  1. `string` name - Storage name, corresponds to different `.json` files
  2. `string` key - Storage key
  3. `any` value - Value to store
- Returns `void`

```javascript
canbox.store.set('config', 'theme', 'dark')
    .then(() => {
        console.info('Theme settings saved');
    })
    .catch(error => {
        console.error('Failed to save:', error);
    });
```

## canbox.store.delete(name, key)

Delete stored value.

- Parameters
  1. `string` name - Storage name, corresponds to different `.json` files
  2. `string` key - Storage key
- Returns `void`

```javascript
canbox.store.delete('config', 'theme')
    .then(() => {
        console.info('Theme settings deleted');
    })
    .catch(error => {
        console.error('Failed to delete:', error);
    });
```

## canbox.store.clear(name)

Clear all data for specified storage.

- Parameters
  1. `string` name - Storage name, corresponds to different `.json` files
- Returns `void`

```javascript
canbox.store.clear('config')
    .then(() => {
        console.info('Configuration file cleared');
    })
    .catch(error => {
        console.error('Failed to clear:', error);
    });
```

**Note**: Each `name` corresponds to an independent `.json` file for storing different types of data. For example:
- `config.json` - Application configuration
- `user.json` - User data
- `cache.json` - Cache data

# db

Canbox uses [pouchdb](https://pouchdb.com/) as the local storage database

PouchDB Chinese tutorial: [PouchDB Tutorial](https://www.w3ccoo.com/pouchdb/)

Canbox generates a separate PouchDB storage for each APP

## canbox.db.put(doc)

Add/modify data document

**When creating a document, if there is no \_id, canbox will generate a \_id and return it in the response content to the app**

To modify a document, the parameter `_rev` is required

- Parameters
  1. object
- Returns object

```javascript
canbox.db.put({
    _id: '0001',
    boxes: '[{title:"json01",content:"hello lizl6"},{title:"json02",content:"hello world"}]'
}).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * Data successfully saved to database:
{
    id: "0001",
    ok: true,
    rev: "1-1e4db196bda552aeaf4c719d4f5f8e9e"
}
 *
 * When data fails to save, error message in catch:
"Document update conflict"
*/
```

Modify document:

```javascript
canbox.db.put({
    _id: '0001',
    boxes: '[{title:"json01",content:"hello lizl6"},{title:"json02",content:"hello world"}]',
    rev: "1-1e4db196bda552aeaf4c719d4f5f8e9e"
}).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * Modification successful:
{ ok: true, id: '0001', rev: '2-d43f99e5e956bc1da667a5208320b43b' }
 */
```

## canbox.db.bulkDocs(docs)

Bulk operation on documents, supports adding, modifying, and deleting.

- Parameters
  1. `array` docs - Document array
- Returns `array` - Operation results for each document

### Function Description

- **Add document**: When document has no `_id` or no `_rev`, canbox will automatically generate `_id` and insert new document
- **Modify document**: When document contains `_id` and `_rev`, it will update existing document
- **Delete document**: When document contains `_deleted: true` parameter, it will delete that document (requires providing `_id` and `_rev`)

### Add Document Example

```javascript
canbox.db.bulkDocs([{
    _id: '001',
    data: 'First document'
}, {
    _id: '002',
    data: 'Second document'
}]).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * Successful return:
[
    { "ok": true, "id": "001", "rev": "1-xxx" },
    { "ok": true, "id": "002", "rev": "1-xxx" }
]
 */
```

### Modify Document Example

```javascript
canbox.db.bulkDocs([{
    _id: '001',
    data: 'First document (modified)',
    _rev: '1-xxx'
}, {
    _id: '002',
    data: 'Second document (modified)',
    _rev: '1-xxx'
}]).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * Successful return:
[
    { "ok": true, "id": "001", "rev": "2-xxx" },
    { "ok": true, "id": "002", "rev": "2-xxx" }
]
 */
```

### Delete Document Example

```javascript
canbox.db.bulkDocs([{
    _id: '001',
    _rev: '1-xxx',
    _deleted: true
}, {
    _id: '002',
    data: 'Keep this document'
}]).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * Successful return (deleted documents also return ok: true):
[
    { "ok": true, "id": "001", "rev": "2-xxx" },
    { "ok": true, "id": "002", "rev": "1-xxx" }
]
 *
 * Failure:
"Document update conflict"
 */
```

### Mixed Operation Example

```javascript
canbox.db.bulkDocs([
    { _id: '001', data: 'Add' },              // Add
    { _id: '002', data: 'Modify', _rev: '1-xxx' }, // Modify
    { _id: '003', _rev: '1-xxx', _deleted: true } // Delete
]).then(result => {
    console.info('Mixed operation successful');
});
```

**Note**: Canbox automatically generates `createTime` for new documents and `updateTime` for updated documents.

## canbox.db.get(query)

- Parameters
  1. `object`
- Returns object

```javascript
canbox.db.get({
    _id: '0001'
}).then(result => {
    console.info('result:', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * Successfully retrieved data, return data example:
{
    "boxes": "[{title:\"json01\",content:\"hello lizl6\"},{title:\"json02\",content:\"hello world\"}]",
    "createTime": "20241212173838",
    "_id": "0001",
    "_rev": "1-1e4db196bda552aeaf4c719d4f5f8e9e"
}
 *
 * No data retrieved, error message in catch:
"missing"
*/
```

## canbox.db.allDocs(options)

Get all documents in the database.

- Parameters
  1. `object` options - Query options
- Returns `object` - Result object containing `total_rows`, `offset`, `rows`

### Basic Example

```javascript
// Get all documents
canbox.db.allDocs({
    include_docs: true
}).then(result => {
    console.info('Total documents:', result.total_rows);
    console.info('Document list:', result.rows);
}).catch(error => {
    console.error('Query failed:', error);
});
/*
 * Successful return:
{
    total_rows: 3,
    offset: 0,
    rows: [
        {
            id: "001",
            key: "001",
            value: { rev: "1-xxx" },
            doc: {
                _id: "001",
                _rev: "1-xxx",
                data: "Content1",
                createTime: "20241227100000"
            }
        },
        {
            id: "002",
            key: "002",
            value: { rev: "1-xxx" },
            doc: {
                _id: "002",
                _rev: "1-xxx",
                data: "Content2",
                createTime: "20241227100100"
            }
        },
        {
            id: "003",
            key: "003",
            value: { rev: "1-xxx" },
            doc: {
                _id: "003",
                _rev: "1-xxx",
                data: "Content3",
                createTime: "20241227100200"
            }
        }
    ]
}
*/
```

### Advanced Options Example

```javascript
// Limit return count
canbox.db.allDocs({
    include_docs: true,
    limit: 10
}).then(result => {
    console.info('First 10 documents:', result.rows);
});

// Reverse order
canbox.db.allDocs({
    include_docs: true,
    descending: true
}).then(result => {
    console.info('Documents in reverse order:', result.rows);
});

// Query by key range
canbox.db.allDocs({
    include_docs: true,
    startkey: '002',
    endkey: '005'
}).then(result => {
    console.info('Documents in range 002-005:', result.rows);
});

// Return only document metadata (without doc)
canbox.db.allDocs().then(result => {
    console.info('Document IDs and versions:', result.rows.map(row => ({
        id: row.id,
        rev: row.value.rev
    })));
});
```

**Parameter Descriptions**:
- `include_docs` - Whether to return full document content (default false)
- `limit` - Limit the number of documents returned
- `descending` - Whether to sort in reverse order
- `startkey` - Start document ID
- `endkey` - End document ID
- `skip` - Number of documents to skip

**Note**: `allDocs` returns all documents in the database, suitable for data traversal, statistics, etc. If you only need documents with specific conditions, it's recommended to use the `find()` method.

## canbox.db.remove(doc)

- Parameters
  1. object must contain `_id` and `_rev`
- Returns object

```javascript
canbox.db.remove({
    _id: '0001',
    _rev: '1-1e4db196bda552aeaf4c719d4f5f8e9e'
}).then(result => {
    console.info('result:', result);
}).catch(error => {
    console.error('error=', error);
});

/**
 * Deletion successful, return result as follows:
{
    "ok": true,
    "id": "0001",
    "rev": "2-7c2e19010a1048fd631bcc1ced9bf07d"
}
 *
 * No matching data to delete, error message in catch:
"missing"
*/
```

## canbox.db.find(query)

Query documents using Mango query syntax.

- Parameters
  1. `object` query - Query condition object, supports Mango query syntax
- Returns `object` - Query result containing `docs` array

### Basic Query Example

```javascript
// Query all documents with type 'hosts_entry'
canbox.db.find({
    selector: {
        type: 'hosts_entry'
    }
}).then(result => {
    console.info('Number of documents found:', result.docs.length);
    console.info('Document list:', result.docs);
}).catch(error => {
    console.error('Query failed:', error);
});
/*
 * Successful return:
{
    "docs": [
        {
            "_id": "001",
            "_rev": "1-xxx",
            "type": "hosts_entry",
            "name": "Config1",
            "content": "192.168.1.1 example.com",
            "active": true,
            "createTime": "20241227100000"
        },
        {
            "_id": "002",
            "_rev": "1-xxx",
            "type": "hosts_entry",
            "name": "Config2",
            "content": "192.168.1.2 test.com",
            "active": false,
            "createTime": "20241227100100"
        }
    ]
}
*/
```

### Advanced Query Example

```javascript
// Multiple condition query
canbox.db.find({
    selector: {
        type: 'hosts_entry',
        active: true
    }
}).then(result => {
    console.info('Active hosts configs:', result.docs);
});

// Sorting
canbox.db.find({
    selector: {
        type: 'hosts_entry'
    },
    sort: [{ createTime: 'desc' }]
}).then(result => {
    console.info('Sorted by creation time descending:', result.docs);
});

// Limit return count
canbox.db.find({
    selector: {
        type: 'hosts_entry'
    },
    limit: 10
}).then(result => {
    console.info('First 10 records:', result.docs);
});

// Specify return fields
canbox.db.find({
    selector: {
        type: 'hosts_entry'
    },
    fields: ['_id', 'name', 'active']
}).then(result => {
    console.info('Only return specified fields:', result.docs);
});
```

**Note**: The `find` method uses PouchDB's Mango query syntax, supporting complex query conditions, sorting, pagination, etc.

## canbox.db.createIndex(index)

Create indexes to improve query performance.

- Parameters
  1. `object` index - Index configuration object
- Returns `object` - Index creation result

### Basic Example

```javascript
// Create single field index
canbox.db.createIndex({
    index: {
        fields: ['type']
    }
}).then(result => {
    console.info('Index created successfully:', result);
}).catch(error => {
    console.error('Index creation failed:', error);
});
/*
 * Successful return:
{
    result: 'created',
    id: '_design/index1',
    name: 'index1',
    ok: true
}
*/
```

### Composite Index Example

```javascript
// Create multi-field index
canbox.db.createIndex({
    index: {
        fields: ['type', 'active']
    }
}).then(result => {
    console.info('Composite index created successfully:', result);
});

// Create index with sorting
canbox.db.createIndex({
    index: {
        fields: [
            { type: 'asc' },
            { createTime: 'desc' }
        ]
    }
}).then(result => {
    console.info('Sorted index created successfully:', result);
});
```

**Performance Tips**:
- Creating indexes can significantly improve `find` query performance
- It's recommended to create commonly used indexes during app initialization
- Index creation is an asynchronous operation, it's recommended to complete it during app startup

# window

## canbox.win.createWindow(options, params)

- Parameters
  1. options: `object` Refer to Electron: BaseWindowsConstructorOptions
  2. params: `object`: `{url: '', title: '', devTools: true}`
     1. `url`: Window load page relative path, or routing path
     2. `title`: Window title
     3. `devTools`: Whether to enable devTools, default `false`
     4. `ecsClose`: Click `ecs` to close window, default `false`
- Returns: Encoded window id

## canbox.win.notification(options)

- Parameters
  - `options`: Refer to Electron: Notification
- Returns

```javascript
// Direct call
canbox.win.notification({ title: 'canbox', body: 'hello world' });

// If you need to handle sent business logic
canbox.win.notification({ title: 'canbox', body: 'hello world' })
    .then(() => {
        console.info('Notification sent, here is some processing logic');
    });

// The current API method will not reject, but error handling logic can be retained
canbox.win.notification(options)
    .then(() => {
        console.log('Notification sent, here is some processing logic');
    })
    .catch((error) => {
        console.error('Failed to send notification:', error);
    });
```

# sudo

Provides cross-platform elevated command execution functionality, supporting Linux, macOS, and Windows.

## canbox.sudo.exec(options)

Execute commands that require elevated privileges.

- Parameters
  1. `object` options - Elevation options
- Returns `object` - Execution result containing `stdout` and `stderr`

**Parameter Descriptions**:
- `command` - Command to execute (required)
- `name` - Operation name, used to prompt the user why elevation is needed (required)

**name Parameter Requirements**:
- Can only contain letters, numbers, and spaces (does not support non-ASCII characters like Chinese)
- Length not exceeding 70 characters
- Recommended to use English description, for example: `'Apply Hosts Config'`, `'Restart Service'`

### Basic Example

```javascript
// Modify hosts file
canbox.sudo.exec({
    command: 'echo "127.0.0.1 example.com" >> /etc/hosts',
    name: 'Apply Hosts Config'
}).then(result => {
    console.info('Execution successful, stdout:', result.stdout);
    console.info('stderr:', result.stderr);
}).catch(error => {
    console.error('Execution failed:', error);
});
```

### Advanced Example

```javascript
// Create system file
canbox.sudo.exec({
    command: 'touch /etc/hosts.d/custom-hosts',
    name: 'Create Custom Hosts File'
}).then(result => {
    console.info('File created successfully');
});

// Restart system service
canbox.sudo.exec({
    command: 'systemctl restart nginx',
    name: 'Restart Nginx Service'
}).then(result => {
    console.info('Service restarted successfully');
});

// Copy file to system directory
canbox.sudo.exec({
    command: 'cp /tmp/config.conf /etc/app/',
    name: 'Copy Config File'
}).then(result => {
    console.info('File copied successfully');
});
```

**Platform Notes**:
- **Linux/macOS** - Uses `sudo-prompt`, will pop up system elevation dialog
- **Windows** - Uses `electron-sudo`, will pop up UAC elevation dialog

**Parameter Descriptions**:
- `command` - Command to execute (required)
- `name` - Operation name, used to prompt the user why elevation is needed (required)

**Note**: Elevation operations involve system security, please use with caution. Ensure only necessary commands are executed, and clearly state the operation purpose in the `name` parameter.

# dialog

Direct wrapper without any trimming. Request parameters and responses can refer to Electron's [`dialog`](https://www.electronjs.org/zh/docs/latest/api/dialog) module

## showOpenDialog

File selection dialog

Consistent with Electron `showOpenDialog`

## showSaveDialog

File save dialog

Consistent with Electron `showSaveDialog`

## showMessageBox

Message box

Consistent with Electron `showMessageBox`

# Lifecycle

## registerCloseCallback

Register callback function when window is closing

- Parameter: `Function`

```javascript
// Register callback function when window is closing
canbox.registerCloseCallback(() => {
    console.log('Window is about to close, performing cleanup...');
    // Here you can perform some cleanup logic, such as saving data or closing resources
});

```
