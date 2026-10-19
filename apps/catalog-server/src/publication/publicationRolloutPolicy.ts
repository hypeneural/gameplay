import type { CatalogRuntimeConfig } from '../runtimeConfig.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RELEASE_ACK = 'AUTORIZO_APENAS_PEDIDOS_ELEGIVEIS_CRM';

type RolloutRuntime = Pick<
  CatalogRuntimeConfig,
  'releaseStage' | 'previewAuthority' | 'crmEligibilityOrigin' | 'crmApiSecret'
  | 'publisherApiSecret' | 'serverSecret' | 'databasePath' | 'storageDir'
>;

/** Separate publication authorization from CRM order eligibility.
 *
 * Broad rollout never skips the CRM check in PublicationService (both at
 * session resolve and revision activation). Fail startup on incomplete
 * production prerequisites instead of silently becoming an open publisher.
 */
export function resolvePublicationOrderPolicy(
  runtime: RolloutRuntime,
  environment: NodeJS.ProcessEnv,
  environmentName: string,
): { mode: 'disabled' | 'single-pilot' | 'crm-eligible-rollout'; isAllowed: (uuid: string) => boolean } {
  const pilotOrderUuid = environment.CATALOG_PILOT_ORDER_UUID?.trim().toLowerCase() ?? '';
  const pilotEnabled =
    runtime.releaseStage === 'staging-demo' &&
    environment.CATALOG_CUSTOMER_PILOT_ENABLED === '1' &&
    environment.CATALOG_CUSTOMER_DATA_ALLOWED === '1' &&
    UUID.test(pilotOrderUuid);

  const releaseRequested = environment.CATALOG_CUSTOMER_RELEASE_ENABLED === '1';
  if (releaseRequested) {
    const productionAuthorityReady =
      environmentName === 'production' &&
      runtime.releaseStage === 'staging-demo' &&
      runtime.previewAuthority === 'sqlite' &&
      environment.CATALOG_CUSTOMER_DATA_ALLOWED === '1' &&
      environment.CATALOG_CUSTOMER_RELEASE_ACK === RELEASE_ACK &&
      Boolean(runtime.crmEligibilityOrigin && runtime.crmApiSecret &&
        runtime.publisherApiSecret && runtime.serverSecret &&
        runtime.databasePath && runtime.storageDir);
    if (!productionAuthorityReady) {
      throw new Error('CATALOG_CUSTOMER_RELEASE_PREREQUISITES_MISSING');
    }
    return {
      mode: 'crm-eligible-rollout',
      isAllowed: (uuid) => UUID.test(uuid),
    };
  }

  // An unpaired ACK is likely a stale or mistyped rollout configuration.
  if (environment.CATALOG_CUSTOMER_RELEASE_ACK) {
    throw new Error('CATALOG_CUSTOMER_RELEASE_ACK_WITHOUT_ENABLE');
  }

  return pilotEnabled
    ? {
        mode: 'single-pilot',
        isAllowed: (uuid: string) => UUID.test(uuid) && uuid.toLowerCase() === pilotOrderUuid,
      }
    : { mode: 'disabled', isAllowed: () => false };
}
