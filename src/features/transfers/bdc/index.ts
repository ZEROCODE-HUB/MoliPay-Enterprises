/**
 * BDC Conecta integration (Banco de Comercio).
 *
 *   import { createBdcClient } from "@/features/transfers/bdc";
 *
 *   const bdc = createBdcClient();
 *   await bdc.getAccountInfo(cbu);
 *   await bdc.transfer({ originId, from, to, amount });
 *
 * The frontend always talks to Molipay-backend. The environment
 * (sandbox / homologacion / produccion) is defined ONLY in the backend `.env`
 * (`BDC_MODE`); the browser never sees it nor can change it.
 */
export { createBdcClient, type BdcAccountInfoData } from "@/features/transfers/bdc/client";

export { canQueryBdc, canTransferBdc, type BdcAccount } from "@/features/transfers/bdc/config";
