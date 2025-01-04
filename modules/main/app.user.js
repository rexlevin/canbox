const Store  = require('electron-store');

const /*Types.Users*/ UsersConfig = new Store({
    cwd: 'Users',
    name: 'users'
});

module.exports = {
    info: () => {
        console.info('UsersConfig==', UsersConfig);
        if(!UsersConfig || !UsersConfig.get('repo')) {
            return null;
        }
        let users = [];
        for(const item of UsersConfig.get('repo')) {
            console.info('item={}', UsersConfig.get(item));
            const user = {
                name: item.name,
                email: item.email,
                // avatar_url: item.avatar_url,
                // bio: item.bio,
                // public_repos: item.public_repos,
                // followers: item.followers,
                token: item.token
            };
            users.push(user);
        }
        return users;
    },
    login: () => {},
    logout: () => {}
};

Types = function() {}
Types.Users = function () {
    return {
        "repo": ["default"],
        "default": {
            "name": "lizl6",
            "email": "xxxxxxxxxxxx@example.com",
            "avatar_url": "https://example.com/avatar.png",
            "bio": "This is an example bio.",
            "public_repos": 100,
            "followers": 100,
            "token": ""
        }
    }
}