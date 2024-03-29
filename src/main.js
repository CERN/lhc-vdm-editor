
import GitLab from "./GitLab.js";
import { getJSON } from "./HelperFunctions.js";
import OverallEditor from "./components/OverallEditor.js";
import { OAuth } from "./OAuth.js";

$(async () => {
    let token;

    let usesOAuth = false;
    if (window.location.origin == "https://lhcvdm.web.cern.ch") {
        const oa = new OAuth();
        if (window.location.href.includes("code=")) {
            token = await oa.getAccessToken();
            history.pushState({}, null, window.location.href.replace(/\?.*/,''));
        }
        else {
            await oa.getCredentials();
            return;
        }
        usesOAuth = true;
    }
    else {
        token = (await getJSON("./secrets.json")).token;
    }

    const gl = new GitLab(token, "master", usesOAuth);

    const overallEditor = new OverallEditor(gl);
    window.oe = overallEditor;

    document.body.appendChild(overallEditor);
});
