class MVSQL_MOCK {
    constructor(config, cbReady) {
        // Simple in-memory storage
        // Structure: { "procedureName:key": { ...data... } }
        // Or better: { "RMRoot": { "id": { ... } } }
        this.store = {
            RMRoot: {},
            RMCObject: {},
            RMPObject: {},
            RMTObject: {}
        };

        console.log("MVSQL_MOCK initialized");
        if (cbReady) {
            // Simulate async connection
            setTimeout(() => cbReady(this, null), 10);
        }
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
        // Create the hybrid result object (Array + properties)
        const result = [];

        // Default success output
        result.output = { nResult: 0 };
        result.recordsets = [];

        if (query.isETL) {
             // Mock ETL behavior
             // recordsets[0]: Events (empty for now)
             // recordsets[1]: Status (nCount: 0 means no more events pending)

             const events = [];
             const status = [{ nCount: 0 }];

             result.recordsets.push(events);
             result.recordsets.push(status);

             return result;
        }

        console.log(`Mock Executing: ${query.proc}`);

        // Helper to format success return
        const returnSuccess = () => {
             result.output.nResult = 0;
             // Some handlers expect result.recordsets to be present even for updates
             result.recordsets.push([]);
             return result;
        };

        // Helper to return data
        const returnData = (dataObj) => {
             result.output.nResult = 0;
             const row = { Object: JSON.stringify(dataObj) };
             result.recordsets.push([row]);
             // Add empty child recordsets if needed (utils.js iterates children)
             // For now just one is enough for parent
             return result;
        };

        const proc = query.proc;
        const args = query.pData;

        // --- Handlers ---

        if (proc.startsWith('get_')) {
            // Extract type from proc name e.g. get_RMRoot -> RMRoot
            let type = null;
            let id = 0;

            if (proc.includes('RMRoot')) {
                type = 'RMRoot';
                id = args.twRMRootIx || 0;
            } else if (proc.includes('RMCObject')) {
                type = 'RMCObject';
                id = args.twRMCObjectIx || 0;
            } else if (proc.includes('RMPObject')) {
                type = 'RMPObject';
                id = args.twRMPObjectIx || 0;
            } else if (proc.includes('RMTObject')) {
                type = 'RMTObject';
                id = args.twRMTObjectIx || 0;
            }

            if (type) {
                // Ensure entry exists
                if (!this.store[type][id]) {
                    this.store[type][id] = {
                        pObjectHead: {
                            wClass_Object: 0, // Placeholder
                            twObjectIx: id
                        },
                        Name_wsRMRootId: "Mock " + type + " " + id
                    };
                }
                return returnData(this.store[type][id]);
            }
        }

        if (proc.startsWith('set_')) {
             // Handle Updates
             if (proc === 'set_RMRoot_Name') {
                 const id = args.twRMRootIx;
                 const name = args.Name_wsRMRootId;
                 if (this.store.RMRoot[id]) {
                     this.store.RMRoot[id].Name_wsRMRootId = name;
                 }
                 return returnSuccess();
             }
             // ... handle other setters as needed ...

             // Default fallback for any other set
             return returnSuccess();
        }

        // Fallback for unknown queries
        return returnSuccess();
    }
}

module.exports = { MVSQL_MOCK };
