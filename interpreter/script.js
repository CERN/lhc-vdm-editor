
let source_commands = [{"index":0,"command":"INITIALIZE_TRIM","args":["IP(IP8)","BEAM(BEAM1,BEAM2)","PLANE(SEPARATION,CROSSING)","UNITS(SIGMA)"],"beamPos":{"BEAM1":{"CROSSING":0,"SEPARATION":0},"BEAM2":{"CROSSING":0,"SEPARATION":0}},"realTime":0,"stepTime":0},{"index":1,"command":"SECONDS_WAIT","args":["20"],"beamPos":{"BEAM1":{"CROSSING":0,"SEPARATION":0},"BEAM2":{"CROSSING":0,"SEPARATION":0}},"realTime":20,"stepTime":20},{"index":2,"command":"RELATIVE_TRIM","args":["IP8","BEAM1","CROSSING","-3.375","SIGMA","IP8","BEAM2","CROSSING","3.375","SIGMA"],"beamPos":{"BEAM1":{"CROSSING":-0.03375,"SEPARATION":0},"BEAM2":{"CROSSING":0.03375,"SEPARATION":0}},"realTime":21.03375,"stepTime":20},{"index":3,"command":"SECONDS_WAIT","args":["10"],"beamPos":{"BEAM1":{"CROSSING":-0.03375,"SEPARATION":0},"BEAM2":{"CROSSING":0.03375,"SEPARATION":0}},"realTime":31.03375,"stepTime":30},{"index":4,"command":"RELATIVE_TRIM","args":["IP8","BEAM1","CROSSING","0.375","SIGMA","IP8","BEAM2","CROSSING","-0.375","SIGMA"],"beamPos":{"BEAM1":{"CROSSING":-0.030000000000000002,"SEPARATION":0},"BEAM2":{"CROSSING":0.030000000000000002,"SEPARATION":0}},"realTime":32.0375,"stepTime":30},{"index":5,"command":"SECONDS_WAIT","args":["10"],"beamPos":{"BEAM1":{"CROSSING":-0.030000000000000002,"SEPARATION":0},"BEAM2":{"CROSSING":0.030000000000000002,"SEPARATION":0}},"realTime":42.0375,"stepTime":40},{"index":6,"command":"RELATIVE_TRIM","args":["IP8","BEAM1","CROSSING","0.375","SIGMA","IP8","BEAM2","CROSSING","-0.375","SIGMA"],"beamPos":{"BEAM1":{"CROSSING":-0.026250000000000002,"SEPARATION":0},"BEAM2":{"CROSSING":0.026250000000000002,"SEPARATION":0}},"realTime":43.04125,"stepTime":40},{"index":7,"command":"SECONDS_WAIT","args":["10"],"beamPos":{"BEAM1":{"CROSSING":-0.026250000000000002,"SEPARATION":0},"BEAM2":{"CROSSING":0.026250000000000002,"SEPARATION":0}},"realTime":53.04125,"stepTime":50},{"index":8,"command":"RELATIVE_TRIM","args":["IP8","BEAM1","CROSSING","0.375","SIGMA","IP8","BEAM2","CROSSING","-0.375","SIGMA"],"beamPos":{"BEAM1":{"CROSSING":-0.022500000000000003,"SEPARATION":0},"BEAM2":{"CROSSING":0.022500000000000003,"SEPARATION":0}},"realTime":54.044999999999995,"stepTime":50},{"index":9,"command":"SECONDS_WAIT","args":["10"],"beamPos":{"BEAM1":{"CROSSING":-0.022500000000000003,"SEPARATION":0},"BEAM2":{"CROSSING":0.022500000000000003,"SEPARATION":0}},"realTime":64.04499999999999,"stepTime":60}];

$(document).ready(function () {
    // Put datastructure into the veiwer
    /* let table = document.getElementById('table');
    table.content = source_commands; */

    let file = 
`0 INITIALIZE_TRIM IP(IP8) BEAM(BEAM1,BEAM2) PLANE(SEPARATION,CROSSING) UNITS(SIGMA)
1 SECONDS_WAIT 20
2 RELATIVE_TRIM IP8 BEAM1 CROSSING -3.375 SIGMA IP8 BEAM2 CROSSING 3.375 SIGMA
3 SECONDS_WAIT 10
4 RELATIVE_TRIM IP8 BEAM1 CROSSING 0.375 SIGMA IP8 BEAM2 CROSSING -0.375 SIGMA
5 SECONDS_WAIT 10`



    // Here I do stuff with the object!
    VdMObject = new VdMConstructor(file)
    console.log(VdMObject)
    VdMConstructor.addLine(VdMObject,'10 THIS_IS_AN_ADDED_LINE', 2)
    console.log(VdMObject)
});


class VdMConstructor {
    /**
     * @param {string} data
     */
    constructor(data){
        let lineArray = data.split(/\n+/);
        this.lines = [];
        for(let line of lineArray){
            let obj = this._commandlineToObject(line);
            this.lines.push(obj);
        }
    }

    /**
     * @param {string} line
     */
    _commandlineToObject(line){
        let obj = {};
        try{
            let tmp = line.trim().split(/ +/);
            if (tmp.length < 2){
                throw 'Command line has to include: "int command". Got: ' + tmp
            }
            obj.index = parseInt(tmp[0]);
            obj.command = tmp[1];
            obj.args = tmp.slice(2);
        } catch (err){
            //do something on error
            console.log(err)
        }
        return obj;
    }

    /**
     * @param {object[]} VdM
     * @param {string} newLine
     * @param {int} newLineNum
     */
    static addLine(VdM, newLine, newLineNum){
        let start = VdM.lines.slice(0,newLineNum);
        let end = VdM.lines.slice(newLineNum).map(function(obj){
            obj.index ++;
            return obj;
        });
        let res = start;
        res.push(VdM._commandlineToObject(newLine));
        res = res.concat(end);
        VdM.lines = res;

        // Here we must add stuff when the structure gets more features
    }

    /**
     * @param {object[]} VdM
     * @param {string} newLine
     * @param {int} newLineNum
     */
    static removeLine(VdM, lineNum){
        // remove line function
    }
}







let commandHandler = {
    'INITIALIZE_TRIM': function (ips, beams, planes, units) {
        
    },
    'SECONDS_WAIT': function (duration) {
        
    },
    'RELATIVE_TRIM': function (...actions) {
        
    },
    'ABSOLUTE_TRIM': function (...actions) {

    },
    'START_FIT': function (plane, type) {

    },
    'END_FIT': function (plane) {

    },
    'END_SEQUENCE': function (actions) {

    },
    'MESSAGE': function (message) {

    }
}