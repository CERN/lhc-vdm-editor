
import GitLab from "./GitLab.js"
import { getJSON } from "./HelperFunctions.js"
import OverallEditor from "./OverallEditor.js"
import "./extern/ace.js"
$(async () => {
    const token = (await getJSON("./secrets.json")).token;
    const filePath = "201605_VdM/IP5/HobbitCrossing.txt";

    const gl = new GitLab(token, "vdm-editor-test");
    let hobbitFile = await gl.readFile(
        filePath,
    );
    if (hobbitFile.search("\r\n") != 0) {
        hobbitFile = hobbitFile.replace(/\r\n/g, "\n");
    }

    const overallEditor = new OverallEditor(gl, filePath, hobbitFile);

    document.body.appendChild(overallEditor);
})
