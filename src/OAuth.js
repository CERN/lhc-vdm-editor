// @ts-check
import { getJSON } from "./HelperFunctions.js";

export class OAuthError extends Error { }

const clientId = "d26077e78d7fe7918a6f0e7eff276209a2b558975e34e2fa5709f4236a27d26a";
const redirectURI = "https://lhcvdm.web.cern.ch/lhcvdm/";

export class OAuth {
    async getCredentials() {
        const randomBuf = crypto.getRandomValues(new Uint8Array(32));
        const codeVerifier = btoa(randomBuf).substr(0, 100);
        const codeChallengeBuf = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier)));
        const codeChallenge = btoa(String.fromCharCode(...codeChallengeBuf)).replace(/\//g, '_').replace(/\+/g,'-').replace(/=/g, '');

        window.location.href = `https://gitlab.cern.ch/oauth/authorize?client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&state=${codeVerifier}` +
            `&scope=api&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    }

    async getAccessToken() {
        const code = window.location.href.match(/(?:&|\?)code=(.*?)(?:&|$)/)[1];
        const state = window.location.href.match(/(?:&|\?)state=(.*?)(?:&|$)/)[1];

        let token = await getJSON('https://gitlab.cern.ch/oauth/token', {
              headers: new Headers({"Content-Type": "application/x-www-form-urlencoded"}),
              method: "POST",
              body: `client_id=${clientId}&code=${code}&grant_type=authorization_code` +
                    `&redirect_uri=${encodeURIComponent(redirectURI)}&code_verifier=${state}`
        });
        
        return token.access_token;
    }
}
