# Bandwidth Saver Proxy

## How it works

### Compression

It checks if any external compressor endpoints return valid image data and redirects to them if true, otherwise, it fetches the uncompressed image from the given url and uses the `sharp` library to dynamically compress it and return it.

## Hosting

You'll need to change the `DEPLOYMENT_PLATFORM` env variable depending on where you host it, to keep the proxy compatible with server-based or serverless platforms.

### Cloudflare

Ensure your **Build configuration** matches this:

- **Build command**: `bun run turbo build --filter=@bandwidth-saver/proxy`
- **Deploy command**: `cd apps/proxy && npx wrangler deploy`
- **Non-production branch deploy command**: `cd apps/proxy && npx wrangler versions upload`
- **Path**: `/`

And `DEPLOYMENT_PLATFORM` is `cloudflare`.
