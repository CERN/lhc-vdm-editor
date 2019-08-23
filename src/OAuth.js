// @ts-check

export class OAuthError extends Error { }

export class OAuth {
    getCredentials() {
        const clientId = "d26077e78d7fe7918a6f0e7eff276209a2b558975e34e2fa5709f4236a27d26a";
        const redirectURI = "https://lhcvdm.web.cern.ch/lhcvdm/";
        const oauthState = Math.floor(Math.random() * (2 ** 32)).toString();
        localStorage.setItem("oauth_state", oauthState);
        window.location.href = `https://gitlab.cern.ch/oauth/authorize?client_id=${clientId
            }&redirect_uri=${redirectURI}&state=${oauthState}&response_type=token`;
    }

    getAccessToken() {
        const access_token = window.location.hash.match(/(?:&|#)access_token=(.*?)(?:&|$)/)[1];
        const state = window.location.hash.match(/(?:&|#)state=(.*?)(?:&|$)/)[1];

        if (state !== localStorage.getItem("oauth_state")) {
            throw new OAuthError("OAuth state parameter doesn't match stored state");
        }

        return access_token;
    }
}
