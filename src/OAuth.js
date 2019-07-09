export default class OAuth {
    getCredentials (){
        window.location = `https://oauth.web.cern.ch/OAuth/Authorize?scope=read%3Auser&response_type=code&redirect_uri=${
            encodeURIComponent('http://lhcvdm.web.cern.ch/lhcvdm/oauth/&client_id=lhhvdm.cern.ch')
        }`
    }
}