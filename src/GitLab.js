const URL_START = "https://gitlab.cern.ch/api/v4/projects/72000/repository/files"

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
    constructor(token, branch="master"){
        this._auth_headers = new Headers({
            "Private-Token": this._token
        });
        this._branch = branch;
    }

    _getURLFileName(experimentName, ipNum, fileName) {
        return encodeURIComponent(`${experimentName}/IP${ipNum}/${fileName}`)
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
            `${URL_START}/${_getURLFileName(experimentName, ipNum, fileName)}?ref=${this._branch}`,
            {
                headers: this._auth_headers
            }
        )).text()
    }
}