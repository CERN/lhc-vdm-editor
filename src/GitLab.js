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
    constructor(token, branch="master", authorEmail="lhcvdm@cern.ch", authorUsername="lhcvdm"){
        this._auth_headers = new Headers({
            "Private-Token": token
        });
        this._branch = branch;
        this._authorEmail = authorEmail;
        this._authorUsername = authorUsername;
    }

    _getURLFileName(experimentName, ipNum, fileName) {
        return `${experimentName}/IP${ipNum}/${fileName}`;
    }

    /**
     * Returns the plaintext of the given file
     * 
     * @param {string} experimentName 
     * @param {number} ipNum 
     * @param {string} fileName 
     */
    async getFile(experimentName, ipNum, fileName){
        return await (await gFetch(
            `${URL_START}/repository/files/${
                encodeURIComponent(this._getURLFileName(experimentName, ipNum, fileName))
            }?ref=${this._branch}`,
            {
                headers: this._auth_headers
            }
        )).text()
    }

    
    /**
     * 
     * @param {string} experimentName 
     * @param {number} ipNum 
     * @param {string} fileName 
     * @param {string} commitMessage 
     * @param {string} fileText 
     */
    async writeFile(experimentName, ipNum, fileName, commitMessage, fileText){
        await gFetch(
            `${URL_START}/repository/commits`,
            {
                headers: this._auth_headers,
                method: "POST",
                body: JSON.stringify({
                    branch: this._branch,
                    commit_message: commitMessage,
                    author_email: this._authorEmail,
                    author_username: this._authorUsername,
                    actions: [
                        {
                            action: "update",
                            file_path: this._getURLFileName(experimentName, ipNum, fileName),
                            content: fileText
                        }   
                    ]
                })
            }
        )

    }
}