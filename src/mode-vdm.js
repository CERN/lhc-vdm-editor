// @ts-ignore
ace.define("ace/mode/vdm_highlight_rules", ["require", "exports", "ace/lib/oop", "ace/mode/text_highlight_rules"], (acequire, exports) => {
    const oop = acequire("ace/lib/oop");
    const TextHighlightRules = acequire("ace/mode/text_highlight_rules").TextHighlightRules;

    const VDMHighlightRules = function() {
        this.$rules = {
            start: [
                {
                    token: "keyword",
                    regex: "\\b(?:INITIALIZE_TRIM|SECONDS_WAIT|RELATIVE_TRIM|ABSOLUTE_TRIM|END_SEQUENCE|START_FIT|END_FIT)\\b",
                },
                {
                    token: "keyword",
                    regex: "\\b(?:MESSAGE)\\b",
                    next: "message"
                },
                {
                    token: "constant.numeric",
                    regex: "-?\\b\\d+((\\.|e-?)\\d*)?\\b\\.*"
                },
                {
                    token: "comment.italic",
                    regex: "#.*"
                },
            ],
            message: [
                {
                    token: "string",
                    regex: ".*",
                    next: "start"
                }
            ]
        };

        this.normalizeRules();
    };

    VDMHighlightRules.metaData = {
        fileTypes: ["vdm"],
        name: "VDM",
        scopeName: "source.vdm"
    };

    oop.inherits(VDMHighlightRules, TextHighlightRules);

    exports.vdmHighlightRules = VDMHighlightRules;
});
// @ts-ignore
ace.define("ace/mode/vdm", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/worker/worker_client"], function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var vdmHighlightRules = require("./vdm_highlight_rules").vdmHighlightRules;

    var Mode = function() {
        this.HighlightRules = vdmHighlightRules;
    };
    oop.inherits(Mode, TextMode);

    exports.Mode = Mode;
});
