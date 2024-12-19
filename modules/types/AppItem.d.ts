interface AppItem {
    id: string;
    appJson: AppJson;
}

interface AppJson {
    name: string;
    description: string;
    author: string;
    homepage: string;
    main: string;
    logo: string;
    version: string;
    window: Window;
    development: Development;
}

class Window {
    minWidth: number;
    minHeight: number;
    width: number;
    height: number;
    icon: string;
    resizable?: boolean;
    webPreferences: WebPreferences;
}

class WebPreferences {
    preload: string;
}

class Development {
    main: string;
    devTools: string;
}

module.exports = AppItem;