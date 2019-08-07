
import GitLab from "./GitLab.js"
import { getJSON } from "./HelperFunctions.js"
import OverallEditor from "./components/OverallEditor.js"
import {OAuth} from "./OAuth.js"

$(async () => {
    let token;

    let usesOAuth = false;
    if(window.location.origin == "https://lhcvdm.web.cern.ch"){
        const oa = new OAuth();
        if(window.location.hash.includes("access_token")){
            token = oa.getAccessToken();
            window.location.hash = "#";
        }
        else{
            oa.getCredentials();
            return;
        }
        usesOAuth = true;
    }
    else{
        token = (await getJSON("./secrets.json")).token;
    }

    const gl = new GitLab(token, "vdm-editor-test", usesOAuth);

    const overallEditor = new OverallEditor(gl);

    document.body.appendChild(overallEditor);
})