const URL_START = "https://gitlab.cern.ch/api/v4/projects/72000"

function handleFetchErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}

/** @type {typeof fetch} */
const gFetch = async (...args) => handleFetchErrors(await fetch(...args));

export default class GitLab {
    /**
     * 
     * @param {string} token 
     */
    constructor(token, branch = "master", authorEmail = "lhcvdm@cern.ch", authorUsername = "lhcvdm") {
        this.token = token;
        this._branch = branch;
        this._authorEmail = authorEmail;
        this._authorUsername = authorUsername;
    }

    _getURLFileName(campain, ipNum, fileName) {
        return `${campain}/IP${ipNum}/${fileName}`;
    }

    /**
     * Returns the plaintext of the given file
     * 
     * @param {string} campain 
     * @param {number} ipNum 
     * @param {string} fileName 
     */

    async readFile(campain, ipNum, fileName){
        return await (
            await gFetch(
                `${URL_START}/repository/files/${
                    encodeURIComponent(this._getURLFileName(campain, ipNum, fileName))
                }/raw?ref=${this._branch}`, 
                {headers: new Headers({'Private-Token': this.token})}
            )
        ).text();
    };

    /**
     * 
     * @param {string} campain 
     * @param {number} ipNum 
     * @param {string} fileName 
     * @param {string} commitMessage 
     * @param {string} fileText 
     */
    async writeFile(campain, ipNum, fileName, commitMessage, fileText) {
        await gFetch(
            `${URL_START}/repository/commits`,
            {
                headers: new Headers({
                    'Private-Token': this.token,
                    'Content-Type': 'application/json'
                }),
                method: "POST",
                body: JSON.stringify({
                    branch: this._branch,
                    commit_message: commitMessage,
                    author_email: this._authorEmail,
                    author_username: this._authorUsername,
                    actions: [{
                        action: "update",
                        file_path: this._getURLFileName(campain, ipNum, fileName),
                        content: fileText
                    }]
                })
            }
        )
    }

    /**
     * 
     * @param {string} campain 
     * @param {number} ipNum 
     * @param {string} fileName 
     * @param {string} commitMessage 
     */
    async createFile(campain, ipNum, fileName, commitMessage) {
        await gFetch(
            `${URL_START}/repository/commits`,
            {
                headers: new Headers({
                    'Private-Token': this.token,
                    'Content-Type': 'application/json'
                }),
                method: "POST",
                body: JSON.stringify({
                    branch: this._branch,
                    commit_message: commitMessage,
                    author_email: this._authorEmail,
                    author_username: this._authorUsername,
                    actions: [{
                        action: "create",
                        file_path: this._getURLFileName(campain, ipNum, fileName),
                        content: ''
                    }]
                })
            }
        )
    }

    async listCampains(){
        return await this.listFiles('/');
    }
    async listIPs(campain){
        return await this.listFiles(campain);
    }

    /**
     * 
     * @param {string} path 
     */
    async listFiles(path){
        const perPage = 100;
        const page = await gFetch(
            `${URL_START}/repository/tree?ref=${this._branch}&per_page=${perPage}&page=1&path=${path}`,
            {
                headers: new Headers({'Private-Token': this.token})
            }
        )
        let campainList = (await page.json()).map(x => x.name);
        let lastPage = Math.ceil(page.headers.get('X-Total')/perPage);
        for(let i=2; i<=lastPage; i++){
            const page = await gFetch(
                `${URL_START}/repository/tree?ref=${this._branch}&per_page=${perPage}&page=${i}&path=${path}`,
                {
                    headers: new Headers({'Private-Token': this.token})
                }
            );
            let tmp = (await page.json()).map(x => x.name)
            campainList = campainList.concat(tmp);
        }
        return campainList.filter(x => x!='readme.md');
    }
}