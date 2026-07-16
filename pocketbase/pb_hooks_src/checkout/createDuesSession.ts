import { createCheckoutSession } from '../stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import { getChoirNameSetting, getBaseUrl, calculateStripeFee } from './checkoutHelpers';

declare const $app: PocketBaseApp;

export function handleCreateDuesSession(e: PocketBaseRequestEvent) {
  const profileId = e.requestInfo().body.profileId;
  const seasonId = e.requestInfo().body.seasonId;
  const cancelPath = e.requestInfo().body.cancelPath || '/dashboard';

  if (!profileId || !seasonId) {
    return e.json(400, { error: 'Missing profileId or seasonId' });
  }

  if (!e.auth) {
    return e.json(401, { error: 'Unauthorized' });
  }

  const isAdmin = e.auth.get('role') === 'admin';
  let isOwnProfile = false;
  if (!isAdmin) {
    try {
      const targetProfile = $app.findRecordById('profiles', profileId);
      isOwnProfile = targetProfile.get('user') === e.auth.id;
    } catch {
      return e.json(403, { error: 'Forbidden' });
    }
  }

  if (!isAdmin && !isOwnProfile) {
    return e.json(403, { error: 'Forbidden' });
  }

  // Ensure the module is enabled
  const isModuleEnabled = (moduleName: string) => {
    try {
      const setting = $app.findFirstRecordByFilter('appSettings', `key = '${moduleName}'`);
      return setting.get('value').enabled === true;
    } catch {
      return false;
    }
  };
  if (!isModuleEnabled('roster')) {
    return e.json(404, { error: 'Module roster is disabled' });
  }

  // Find the season
  let season: PocketBaseRecord;
  try {
    season = $app.findRecordById('seasons', seasonId);
  } catch {
    return e.json(404, { error: 'Season not found' });
  }

  const duesAmountCents = Number(season.get('duesAmountCents') || 0);
  if (duesAmountCents <= 0) {
    return e.json(400, { error: 'Dues amount is not valid' });
  }

  const feeCents = calculateStripeFee(duesAmountCents);

  const appUrl = getBaseUrl();
  const successUrl = `${appUrl}/dues/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}${cancelPath}`;

  const choirName = getChoirNameSetting();
  const seasonName = season.get('name') as string;

  const lineItems = [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: `${seasonName} Dues - ${choirName}` },
        unit_amount: duesAmountCents,
      },
      quantity: 1,
    },
  ];

  if (feeCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Processing Fee' },
        unit_amount: feeCents,
      },
      quantity: 1,
    });
  }

  const metadata = {
    paymentType: 'dues',
    profileId: profileId,
    seasonId: seasonId,
    duesAmountCents: String(duesAmountCents),
    feeCents: String(feeCents),
    amountPaidCents: String(duesAmountCents + feeCents),
  };

  try {
    const sessionUrl = createCheckoutSession({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
      client_reference_id: profileId,
    });

    return e.json(200, { url: sessionUrl });
  } catch (err: unknown) {
    console.log('Error creating dues session: ' + err);
    return e.json(500, { error: 'Failed to create dues session' });
  }
}
