const { MVSF         } = require ('@metaversalcorp/mvsf');
const { InitSQL      } = require ('../svc/utils.js');
const Settings       = require ('./settings.json');
const path           = require ('path');

const { MVSQL_MYSQL  } = require ('@metaversalcorp/mvsql_mysql');
const { MVSQL_MOCK   } = require ('./MVSQL_Mock.js');

/*******************************************************************************************************************************
**                                                     Main                                                                   **
*******************************************************************************************************************************/

class AuthSimple
{
   constructor ()
   {
   }

   Exec (bREST, sAction, pConn, Session, pData, fnRSP, fn)
   {
      if (sAction == 'login')
         this.#Login (Session, pData, fnRSP, fn);
      else if (sAction == 'logout')
         this.#Logout (Session, pData, fnRSP, fn);
      else
         fnRSP (fn, { nResult: -1 });
   }

   #Login (Session, pData, fnRSP, fn)
   {
      let pResult = { nResult: -1 };

      if (pData && pData.acToken64U_RP1 == Settings.MVSF.key)
      {
         pResult.nResult           = 0;
         pResult.sSessionToken     = Settings.MVSF.key;

         Session.twRPersonaIx      = 1;
      }

      fnRSP (fn, pResult);
   }

   #Logout (Session, pData, fnRSP, fn)
   {
      Session.twRPersonaIx     = 0;

      fnRSP (fn, { nResult: 0 });
   }
}

class MVSF_Map
{
   #pServer;
   #pSQL;

   constructor ()
   {
      console.log("CWD:", process.cwd());
      console.log("__dirname:", __dirname);

      // Fix SSL Paths to be absolute relative to this file
      // settings.json has "../temp/ssl/..." relative to mock_svc/
      if (Settings.MVSF && Settings.MVSF.SSL) {
          Settings.MVSF.SSL.key = path.resolve(__dirname, Settings.MVSF.SSL.key);
          Settings.MVSF.SSL.cert = path.resolve(__dirname, Settings.MVSF.SSL.cert);
          console.log("Resolved SSL Key Path:", Settings.MVSF.SSL.key);
      }

      this.ReadFromEnv (Settings.SQL.config, [ "host", "port", "user", "password", "database" ]);

      switch (Settings.SQL.type)
      {
      case 'MYSQL':         this.#pSQL = new MVSQL_MYSQL (Settings.SQL.config, this.onSQLReady.bind (this)); break;
      case 'MOCK':          this.#pSQL = new MVSQL_MOCK (Settings.SQL.config, this.onSQLReady.bind (this)); break;

      default:
         console.log ('No Database was configured for this service.');
         break;
      }
   }

   onSQLReady (pMVSQL, err)
   {
      if (pMVSQL)
      {
         this.ReadFromEnv (Settings.MVSF, [ "nPort", "key" ]);

         // Define paths relative to this file (mock_svc/server.js)
         const svcRoot = __dirname + '/../svc';      // Path to 'svc/'
         const repoRoot = __dirname + '/..';         // Path to repo root (where 'web/' is)

         // MVSF Constructor takes a root path (3rd arg) which is usually where it looks for resources.
         // We initialize MVSF with svcRoot so it finds anything relative to the service correctly.
         // But we use repoRoot for LoadHtmlSite.

         this.#pServer = new MVSF (Settings.MVSF, require (svcRoot + '/handler.json'), svcRoot, new AuthSimple (), 'application/json');
         this.#pServer.LoadHtmlSite (repoRoot, [ './web/admin', './web/public']);
         this.#pServer.Run ();

         console.log ('SQL Server READY');
         InitSQL (pMVSQL, this.#pServer, Settings.Info);
      }
      else
      {
         console.log ('SQL Server Connect Error: ', err);
      }
   }

   ReadFromEnv (Config, aFields)
   {
      let sValue;

      for (let i=0; i < aFields.length; i++)
      {
         if ((sValue = this.#GetToken (Config[aFields[i]])) != null)
            Config[aFields[i]] = process.env[sValue];
      }
   }

   #GetToken (sToken)
   {
      const match = sToken.match (/<([^>]+)>/);
      return match ? match[1] : null;
   }
}

const g_pServer = new MVSF_Map ();
