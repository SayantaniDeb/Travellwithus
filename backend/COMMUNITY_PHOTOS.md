# Community photos

Photo uploads are implemented but disabled until server configuration and Firebase rules are ready. Text and poll posts continue to use the existing flow.

## Enable

1. Add `OPENAI_API_KEY` to `backend/.env` for `omni-moderation-latest`. This is separate from the Groq text-planning key. Do not put it in any `VITE_` variable.
2. Configure a Firebase server service account for the **same project as the frontend**, with Firestore and Storage access. Store the credential JSON outside the repository and set `GOOGLE_APPLICATION_CREDENTIALS=/absolute/private/path/service-account.json` in `backend/.env`.
3. Set `FIREBASE_STORAGE_BUCKET` to that project's existing bucket.
4. Merge the community-specific Firestore and Storage fragments in `backend/security/` into the existing rules; preserve unrelated rules. Remove overlapping permissive grants to these paths, including global test-mode grants. Firebase allows access when *any* matching rule allows it. A narrower `false` rule does not override a broader `true` rule. Deploy and verify rules in the Firebase console/emulator before enabling uploads. Do not overwrite unrelated project rules with these fragments.
5. After rule deployment, set `COMMUNITY_IMAGE_RULES_CONFIRMED=true` and restart the backend.

These are server settings. Never commit credentials or deploy test-mode write rules. This task has not deployed or verified the cloud rules.

## Flow

The client previews a single JPEG/PNG/WebP photo locally (5 MB maximum) and asks the author to confirm sharing permission. It uploads only on Post, with the signed-in user's Firebase ID token. The server verifies the token, applies per-user attempt limits, validates actual image bytes and image dimensions, rejects animation, and re-encodes the photo without EXIF/location metadata. Only the cleaned image and caption/poll text are sent to OpenAI's moderation endpoint. Flagged, malformed, timed-out or missing moderation responses block publication. Moderation success is never accepted from the client.

After approval the server stores the photo and creates the community post with the verified author ID. If the document write fails it attempts to remove the orphaned file. Author deletion uses the server to remove both photo and post. Reactions/replies/polls remain supported by the rules fragment.

Photos can be reported. Reports are saved as pending in `community_image_reports` and require a human administrator to review them in Firestore and remove inappropriate posts/media. Reports do not automatically take a photo down. For multiple backend workers, replace the in-process attempt limit with a shared rate limiter.

Automated moderation is not a guarantee and cannot establish ownership or consent. The app must not describe it as such. The UI discloses the OpenAI safety check before upload. Do not send real user photos during development without authorization.

Documentation: https://developers.openai.com/api/docs/guides/moderation
