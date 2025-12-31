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

        // Seed RMPObject 1 (Persona Object?)
        this.store.RMPObject[1] = {
             pObjectHead: {
                 wClass_Parent: 70, // Child of Root
                 twParentIx: 1,
                 wClass_Object: 73, // SBM_CLASS_RMPObject
                 twObjectIx: 1,
                 twEventIz: 0,
                 wFlags: 0
             },
             Name_wsRMPObjectId: 'Mock Persona',
             Owner_twRPersonaIx: 1,

             // Default values for fields required by Format functions
             Type_bType: 0,
             Type_bSubtype: 0,
             Type_bFiction: 0,
             Type_bMovable: 0,

             Resource_qwResource: 0,
             Resource_sName: '',
             Resource_sReference: '',

             Transform_Position_dX: 0.0,
             Transform_Position_dY: 0.0,
             Transform_Position_dZ: 0.0,
             Transform_Rotation_dX: 0.0,
             Transform_Rotation_dY: 0.0,
             Transform_Rotation_dZ: 0.0,
             Transform_Rotation_dW: 1.0,
             Transform_Scale_dX: 1.0,
             Transform_Scale_dY: 1.0,
             Transform_Scale_dZ: 1.0,

             Bound_dX: 0.0,
             Bound_dY: 0.0,
             Bound_dZ: 0.0
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

    // Format Helpers
    formatDouble(d) {
        // Simplistic formatting to mimic Format_Double
        if (d === undefined || d === null) return "0";
        // Handle scientific notation for very small/large numbers if needed,
        // but JS toString usually handles it reasonably well for JSON.
        // Format_Double in SQL handles scientific notation explicitly.
        // For now, standard JSON stringify of number is close enough.
        return d;
    }

    formatDouble3(dX, dY, dZ) {
        return `[${this.formatDouble(dX)},${this.formatDouble(dY)},${this.formatDouble(dZ)}]`;
    }

    formatDouble4(dX, dY, dZ, dW) {
        return `[${this.formatDouble(dX)},${this.formatDouble(dY)},${this.formatDouble(dZ)},${this.formatDouble(dW)}]`;
    }

    formatObjectHead(head, nResultSet) {
        const OBJECTHEAD_FLAG_SUBSCRIBE_PARTIAL = 0x10;
        const OBJECTHEAD_FLAG_SUBSCRIBE_FULL = 0x20;
        // Logic from call_X_Select: IF (nResultSet = 0, FULL, PARTIAL)
        // Note: bitwise OR with existing wFlags if needed, but the SQL procedure replaces?
        // Actually, in SQL: IF (nResultSet = 0, OBJECTHEAD_FLAG_SUBSCRIBE_FULL, OBJECTHEAD_FLAG_SUBSCRIBE_PARTIAL)
        // It passes this value as the 5th argument to Format_ObjectHead.
        // Format_ObjectHead takes wFlags as argument.
        // So the SQL logic *replaces* or *uses* this as wFlags?
        // Wait, call_RMPObject_Select passes: IF (nResultSet = 0, ..., ...) as the 5th arg to Format_ObjectHead.
        // Format_ObjectHead(..., wFlags, ...) -> returns { ..., "wFlags": wFlags, ... }
        // So effectively, the stored wFlags are IGNORED in the output ObjectHead?
        // Let's re-read call_RMPObject_Select.sql carefully.
        // Format_ObjectHead(..., IF(nResultSet=0, ...), p.ObjectHead_twEventIz)
        // Yes, it passes the calculated flag instead of p.ObjectHead_wFlags.

        const wFlags = (nResultSet === 0) ? OBJECTHEAD_FLAG_SUBSCRIBE_FULL : OBJECTHEAD_FLAG_SUBSCRIBE_PARTIAL;

        return {
            wClass_Parent: head.wClass_Parent,
            twParentIx: head.twParentIx,
            wClass_Object: head.wClass_Object,
            twObjectIx: head.twObjectIx,
            wFlags: wFlags,
            twEventIz: head.twEventIz
        };
    }

    formatRMPObject(id, nResultSet) {
        const p = this.store.RMPObject[id];
        if (!p) return null;

        // Count Children
        let nChildren = 0;
        // Iterate RMPObjects to find children (naive implementation)
        for (const k in this.store.RMPObject) {
             const child = this.store.RMPObject[k];
             if (child.pObjectHead.wClass_Parent === 73 && child.pObjectHead.twParentIx === id) {
                 nChildren++;
             }
        }

        const pObjectHead = this.formatObjectHead(p.pObjectHead, nResultSet);

        // Construct the JSON object directly (mimicking the JSON string construction in SQL)
        return {
            pObjectHead: pObjectHead,
            twRMPObjectIx: p.pObjectHead.twObjectIx,
            pName: { wsRMPObjectId: p.Name_wsRMPObjectId },
            pType: {
                bType: p.Type_bType,
                bSubtype: p.Type_bSubtype,
                bFiction: p.Type_bFiction,
                bMovable: p.Type_bMovable
            },
            pOwner: { twRPersonaIx: p.Owner_twRPersonaIx },
            pResource: {
                qwResource: p.Resource_qwResource,
                sName: p.Resource_sName,
                sReference: p.Resource_sReference
            },
            pTransform: {
                Position: [p.Transform_Position_dX, p.Transform_Position_dY, p.Transform_Position_dZ],
                Rotation: [p.Transform_Rotation_dX, p.Transform_Rotation_dY, p.Transform_Rotation_dZ, p.Transform_Rotation_dW],
                Scale: [p.Transform_Scale_dX, p.Transform_Scale_dY, p.Transform_Scale_dZ]
            },
            pBound: {
                Max: [p.Bound_dX, p.Bound_dY, p.Bound_dZ]
            },
            nChildren: nChildren
        };
    }

    formatRMRoot(id, nResultSet) {
        const r = this.store.RMRoot[id];
        if (!r) return null;

        const pObjectHead = this.formatObjectHead(r.pObjectHead, nResultSet);

        return {
            pObjectHead: pObjectHead,
            twRMRootIx: r.pObjectHead.twObjectIx,
            pName: { wsRMRootId: r.Name_wsRMRootId },
            pOwner: { twRPersonaIx: r.Owner_twRPersonaIx }
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

        const proc = query.proc;
        const args = query.pData;

        console.log(JSON.stringify({ at: new Date().toISOString(), ua: 'mock_svc', sys: 'db', sig: 'exec', val: { proc: proc, params: args } }));

        const returnSuccess = () => {
             result.output.nResult = 0;
             result.recordsets.push([]);
             return result;
        };

        // Helper to find ID from args
        const getArg = (name) => args[name] || 0;

        if (proc === 'get_RMPObject_Update') {
            const id = getArg('twRMPObjectIx');
            console.log(`Mock: get_RMPObject_Update for ID ${id}`);

            if (this.store.RMPObject[id]) {
                const obj = this.formatRMPObject(id, 0);
                result.recordsets.push([{ Object: JSON.stringify(obj) }]); // RS 0: Self

                // RS 1: Children (RMPObject children)
                // For now, empty or mock children if needed.
                // Let's check if there are any children in store.
                const children = [];
                // naive search
                for (const k in this.store.RMPObject) {
                     const child = this.store.RMPObject[k];
                     if (child.pObjectHead.wClass_Parent === 73 && child.pObjectHead.twParentIx === id) {
                         children.push({ Object: JSON.stringify(this.formatRMPObject(k, 1)) });
                     }
                }
                result.recordsets.push(children);

                result.output.nResult = 0;
                // console.log(`Mock: returning success with ${result.recordsets.length} recordsets.`);
                return result;
            } else {
                console.log(JSON.stringify({ at: new Date().toISOString(), ua: 'mock_svc', sys: 'db', sig: 'error', val: { proc, msg: `RMPObject ${id} not found` } }));
                result.output.nResult = -1;
                return result;
            }
        }

        if (proc === 'get_RMRoot_Update') {
            const id = getArg('twRMRootIx');
            console.log(`Mock: get_RMRoot_Update for ID ${id}`);

            if (this.store.RMRoot[id]) {
                const obj = this.formatRMRoot(id, 0);
                result.recordsets.push([{ Object: JSON.stringify(obj) }]); // RS 0: Self

                // RS 1: RMCObject Children
                result.recordsets.push([]); // TODO: implement if needed

                // RS 2: RMTObject Children
                result.recordsets.push([]); // TODO: implement if needed

                // RS 3: RMPObject Children (RMPObject 1 is child of Root 1)
                const rmpChildren = [];
                for (const k in this.store.RMPObject) {
                     const child = this.store.RMPObject[k];
                     if (child.pObjectHead.wClass_Parent === 70 && child.pObjectHead.twParentIx === id) {
                         rmpChildren.push({ Object: JSON.stringify(this.formatRMPObject(k, 3)) }); // Use nResultSet 3
                     }
                }
                result.recordsets.push(rmpChildren);

                result.output.nResult = 0;
                // console.log(`Mock: returning success with ${result.recordsets.length} recordsets.`);
                return result;
            } else {
                console.log(JSON.stringify({ at: new Date().toISOString(), ua: 'mock_svc', sys: 'db', sig: 'error', val: { proc, msg: `RMRoot ${id} not found` } }));
                result.output.nResult = -1;
                return result;
            }
        }

        // Generic get_ handler for other types if not explicitly handled above
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
                // If it wasn't handled by specific blocks above (e.g. simple get_RMPObject not Update)
                // For now, fall back to simple return or fail.
                // But wait, the Update procs are the main ones used.
                // If we get here, it might be a simple get_ that expects different format?
                // Let's just return a basic object wrapped in JSON if found, but likely will need formatting.
                if (this.store[type] && this.store[type][id]) {
                     // We should ideally use formatters here too, but for now:
                     const row = { Object: JSON.stringify(this.store[type][id]) };
                     result.recordsets.push([row]);
                     result.output.nResult = 0;
                     return result;
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
