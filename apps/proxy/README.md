# Bandwidth Saver Proxy

## How it works

### Compression

It checks if any external compressor endpoints return valid image data and redirects to them if true, otherwise, it fetches the uncompressed image from the given url and uses the `sharp` library to dynamically compress it and return it.

## Hosting

### Cloudflare

Ensure your **Build configuration** matches this:

- **Build command**: `bun run turbo build --filter=@bandwidth-saver/proxy`
- **Deploy command**: `cd apps/proxy && npx wrangler deploy`
- **Non-production branch deploy command**: `cd apps/proxy && npx wrangler versions upload`
- **Path**: `/`
