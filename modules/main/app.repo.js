const Store  = require('electron-store');

const/*Types.Repo*/ RepoConfig = new Store({
    cwd: 'Users',
    name: 'repo'
});

module.exports = {
    info: () => {
        console.info('RepoConfig==', RepoConfig);
        if(!RepoConfig || !RepoConfig.get('repo')) {
            let repo = [];
            repo.push({ alias: 'default', url: 'http://localhost:12000/', sort: 0 });
            RepoConfig.set('repo', repo);
            return { repo: repo }
        }
        return {
            repo: RepoConfig.get('repo'),
            user: RepoConfig.get('developer')
        };
    },
    register: () => {},
    login: () => {},
    logout: () => {}
};

Types = function() {}
Types.Repo = function () {
    return {
        "repo": [
            {
                "alias": "default",
                "url": "",
                "sort": 0
            }
        ],
        "developer": [
            {
                "default": {
                    "name": "lizl6",
                    "email": "5646*****@example.com",
                    "avatar": "https://example.com/avatar.png",
                    "bio": "This is an example bio.",
                    "public_repos": 100,
                    "followers": 100,
                    "token": ""
                }
            }
        ]
    }
}