# Media Upload Verification Checklist

Status: automated contract tests are maintained; controlled Cloudinary runtime verification remains pending.

## Automated regression tests (keep enabled)

- `app/api/upload/signature/route.test.ts`: authentication, rate limit, image rejection, server-generated user-scoped public ID, signed MIME-specific formats, MIME normalization.
- `lib/media/service.test.ts`: provider ownership/type/format/size validation and completion replay validation.
- `lib/media/repository.test.ts`: conflict-safe insert and concurrent completion replay behavior under the unique index.

Do not remove or weaken these tests to make CI pass. Add regression coverage for any discovered provider or persistence behavior.

## Controlled Cloudinary test (test cloud only)

Preconditions:
- Use a designated non-production Cloudinary cloud with credentials configured as test environment secrets.
- Do not use production assets or credentials for negative tests.
- Do not print signatures, API secrets, or upload tokens in logs.

Procedure:
1. Request a signature for a small valid MP4. Confirm response returns a server-generated `users/{authenticatedUserId}/video-{UUID}` public ID and `allowedFormats=mp4`.
2. Upload a tiny valid MP4 with the exact signed `public_id`, `timestamp`, and `allowed_formats` parameters.
3. Attempt a second request with a changed public ID or allowed-formats parameter but the original signature; expect provider rejection.
4. Request QuickTime and M4V signatures; verify the expected format restriction and provider behavior for representative test fixtures.
5. Complete the valid upload twice. Confirm the same media row is returned and no duplicate row is created.
6. Record provider response codes and redacted outcomes only. Clean up test assets only after confirming they belong to the designated test cloud.

## Byte-size enforcement

Dizito enforces declared size before signing and validates Cloudinary-reported bytes before persistence. This is not proof of a provider-side pre-ingestion cap. Do not test oversized uploads against production. Determine and document the account/provider's supported enforcement mechanism in the test cloud before making any claim about blocking oversized ingestion.

## Database migration gate

The unique index migration intentionally aborts if duplicate `(user_id, cloudinary_public_id)` pairs exist. Before applying it to production:
1. run the duplicate preflight query read-only;
2. resolve any duplicates with an approved data-repair plan;
3. apply the migration through the repository migration runner;
4. verify the unique index exists;
5. run concurrent completion regression tests and inspect logs for unique-conflict failures.
