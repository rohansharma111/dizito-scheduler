export function buildLocationParent(account: {
  google_account_id: string;
  google_location_id: string;
}) {
  const accountId = account.google_account_id.replace("accounts/", "");

  const locationId = account.google_location_id.replace("locations/", "");

  return `accounts/${accountId}/locations/${locationId}`;
}
