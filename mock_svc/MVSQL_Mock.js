class MVSQL_MOCK {
    constructor(config, cbReady) {
        // Simple in-memory storage
        this.store = {
            RMRoot: {},
            RMCObject: {},
            RMPObject: {},
            RMTObject: {}
        };

        this.seed();

        console.log("MVSQL_MOCK initialized");
        if (cbReady) {
            // Simulate async connection
            setTimeout(() => cbReady(this, null), 10);
        }
    }

    seed() {
        console.log("Seeding Mock Data...");
        // Replicate INSERT INTO RMRoot from MSF_Map.sql
        // VALUES ( 52, 1, 70, 0, 32, 'Root', 1 );
        this.store.RMRoot[1] = {
             pObjectHead: {
                 wClass_Parent: 52,
                 twParentIx: 1,
                 wClass_Object: 70, // SBM_CLASS_RMROOT
                 twObjectIx: 1,
                 twEventIz: 0,
                 wFlags: 32
             },
             Name_wsRMRootId: 'Root',
             Owner_twRPersonaIx: 1
        };

        // Seed RMPObject 1 (Persona Object?) as it is requested by default client flow
        this.store.RMPObject[1] = {
             pObjectHead: {
                 wClass_Parent: 70, // Child of Root
                 twParentIx: 1,
                 wClass_Object: 80, // Guessing Class ID for RMPObject
                 twObjectIx: 1,
                 twEventIz: 0,
                 wFlags: 0
             },
             Name_wsRMPObjectId: 'Mock Persona',
             Owner_twRPersonaIx: 1
        };
    }

    Compose(sProc, pData, aData, sIPAddress, twRPersonaIx, nType) {
        return {
            proc: sProc,
            pData: pData,
            aData: aData,
            sIPAddress: sIPAddress,
            twRPersonaIx: twRPersonaIx,
            nType: nType
        };
    }

    ComposeETL(sProc) {
        return {
            proc: sProc,
            isETL: true
        };
    }

    async Exec(query) {
        const result = [];
        result.output = { nResult: 0 };
        result.recordsets = [];

        if (query.isETL) {
             // Mock ETL behavior
             const events = [];
             const status = [{ nCount: 0 }];
             result.recordsets.push(events);
             result.recordsets.push(status);
             return result;
        }

        console.log(`Mock Executing: ${query.proc}`);

        // --- Handlers ---

        const proc = query.proc;
        const args = query.pData;

        const returnSuccess = () => {
             result.output.nResult = 0;
             result.recordsets.push([]);
             return result;
        };

        const returnData = (dataObj) => {
             result.output.nResult = 0;
             const row = { Object: JSON.stringify(dataObj) };
             result.recordsets.push([row]);
             // Add empty child recordsets if needed (some utils loops expect children)
             // RMRoot handler usually expects children?
             // Looking at utils.js: MemResult iterates children from index 1 to recordsets.length
             // If we just push one recordset, length is 1, loop 1..1 doesn't run. That's fine.
             return result;
        };

        // Helper to find ID from args
        const getArg = (name) => args[name] || 0;

        if (proc.startsWith('get_')) {
            let type = null;
            let id = 0;

            if (proc.includes('RMRoot')) {
                type = 'RMRoot';
                id = getArg('twRMRootIx');
            } else if (proc.includes('RMCObject')) {
                type = 'RMCObject';
                id = getArg('twRMCObjectIx');
            } else if (proc.includes('RMPObject')) {
                type = 'RMPObject';
                id = getArg('twRMPObjectIx');
            } else if (proc.includes('RMTObject')) {
                type = 'RMTObject';
                id = getArg('twRMTObjectIx');
            }

            if (type) {
                if (this.store[type] && this.store[type][id]) {
                    return returnData(this.store[type][id]);
                } else {
                    console.log(`Mock: ${type} ${id} not found.`);
                    result.output.nResult = -1; // Not found
                    return result;
                }
            }
        }

        if (proc.startsWith('set_')) {
             // Basic Setter Logic
             // e.g. set_RMRoot_Name
             if (proc === 'set_RMRoot_Name') {
                 const id = getArg('twRMRootIx');
                 const name = getArg('Name_wsRMRootId');
                 if (this.store.RMRoot[id]) this.store.RMRoot[id].Name_wsRMRootId = name;
             }
             // Add more setters as discovered

             return returnSuccess();
        }

        return returnSuccess();
    }
}

module.exports = { MVSQL_MOCK };
